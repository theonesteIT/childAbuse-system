import express from "express";
import pool from "../db.js";
import { authRequired } from "../middleware/auth.js";
import { upload } from "../config/cloudinary.js";

const router = express.Router();

// ─── Auth ────────────────────────────────────────────────────────────────────
router.use(authRequired);

function hospitalOnly(req, res, next) {
  if (req.auth.accountType !== "user" || req.auth.role !== "Hospital") {
    return res.status(403).json({ message: "Forbidden: Hospital access only" });
  }
  return next();
}

router.use(hospitalOnly);

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Ensure `medical_assessments` table exists.
 * Called lazily before any assessment query so we never fail on missing table.
 */
async function ensureMedicalAssessmentsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS medical_assessments (
      id                  INT AUTO_INCREMENT PRIMARY KEY,
      case_id             VARCHAR(40)   NOT NULL,
      report_id           INT           NOT NULL,
      doctor_id           INT           NOT NULL,
      doctor_name         VARCHAR(120)  NOT NULL,
      physical_injuries   TEXT,
      emotional_condition TEXT,
      signs_of_neglect    TEXT,
      signs_of_sexual_abuse TEXT,
      general_health      TEXT,
      doctor_observations TEXT,
      verification_status VARCHAR(60)   DEFAULT 'pending',
      created_at          TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
      updated_at          TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);
}

/**
 * Map a DB reporter_reports row to the client-facing shape.
 * @param {object} row - Raw DB row (may include joined fields)
 */
function toClientCase(row) {
  return {
    id:              row.id,
    caseId:          row.case_id,
    type:            row.report_type,
    child:           row.child_name,
    age:             row.child_age,
    gender:          row.child_gender,
    location:        row.last_seen_location,
    description:     row.description,
    district:        row.district,
    status:          row.status,
    priority:        row.priority,
    abuseType:       row.abuse_type,
    anonymous:       Boolean(row.is_anonymous),
    createdAt:       row.created_at,
    updatedAt:       row.updated_at,
    assignedTo:      row.assigned_to_name   ? {
      id:   row.assigned_to_id,
      name: row.assigned_to_name,
      role: row.assigned_to_role,
    } : null,
    attachmentCount: Number(row.attachment_count ?? 0),
  };
}

// ─── Routes ──────────────────────────────────────────────────────────────────

// ── 1. GET /cases ─────────────────────────────────────────────────────────────
// Returns ONLY cases specifically assigned to this health officer by admin.
router.get("/cases", async (req, res) => {
  const { status, q } = req.query;
  const uid = req.auth.id;

  try {
    let sql = `
      SELECT
        r.id, r.case_id, r.report_type, r.child_name, r.child_age, r.child_gender,
        r.last_seen_location, r.description, r.district, r.status, r.is_anonymous,
        r.priority, r.abuse_type, r.created_at, r.updated_at,
        ca.assigned_to_id, ca.assigned_to_name, ca.assigned_to_role,
        (SELECT COUNT(*) FROM attachments a WHERE a.case_id = r.case_id) AS attachment_count
      FROM reporter_reports r
      INNER JOIN case_assignments ca ON ca.report_id = r.id
      WHERE ca.assigned_to_id = ?
    `;
    const params = [uid];

    if (status && status !== "All") {
      sql += " AND r.status = ?";
      params.push(status);
    }
    if (q) {
      sql += " AND (r.case_id LIKE ? OR r.child_name LIKE ?)";
      const like = `%${q}%`;
      params.push(like, like);
    }
    sql += " ORDER BY ca.assigned_at DESC";

    const [rows] = await pool.query(sql, params);
    return res.json({ cases: rows.map(toClientCase) });
  } catch (err) {
    return res.status(500).json({ message: "Failed to fetch cases", error: err.message });
  }
});

// ── 2. GET /cases/:caseId ─────────────────────────────────────────────────────
// Full case detail — only accessible if this case is assigned to current user.
router.get("/cases/:caseId", async (req, res) => {
  const { caseId } = req.params;
  const uid = req.auth.id;

  try {
    // Verify this user is assigned to this case
    const [caseRows] = await pool.query(
      `SELECT r.*,
              ca.assigned_to_id, ca.assigned_to_name, ca.assigned_to_role,
              (SELECT COUNT(*) FROM attachments a WHERE a.case_id = r.case_id) AS attachment_count
       FROM reporter_reports r
       INNER JOIN case_assignments ca ON ca.report_id = r.id
       WHERE r.case_id = ? AND ca.assigned_to_id = ?
       LIMIT 1`,
      [caseId, uid]
    );

    if (caseRows.length === 0) {
      return res.status(404).json({ message: "Case not found or not assigned to you" });
    }

    // Attachments
    const [attachments] = await pool.query(
      `SELECT id, report_id, case_id, file_url, file_type, file_name,
              uploaded_by_id, uploaded_by_name, uploaded_at
       FROM attachments
       WHERE case_id = ?
       ORDER BY uploaded_at DESC`,
      [caseId]
    );

    // Case notes/updates
    const [notes] = await pool.query(
      `SELECT id, case_id, report_id, user_id, account_type, author_name,
              status, comment, created_at
       FROM case_updates
       WHERE case_id = ?
       ORDER BY created_at DESC`,
      [caseId]
    );

    // Assignments
    const [assignments] = await pool.query(
      `SELECT id, report_id, case_id, assigned_to_id, assigned_to_name,
              assigned_to_role, assigned_at
       FROM case_assignments
       WHERE case_id = ?
       ORDER BY assigned_at DESC`,
      [caseId]
    );

    return res.json({
      case:        toClientCase(caseRows[0]),
      attachments,
      notes,
      assignments,
    });
  } catch (err) {
    return res.status(500).json({ message: "Failed to fetch case detail", error: err.message });
  }
});

// ── 3. GET /stats ─────────────────────────────────────────────────────────────
// All counts are based on cases ASSIGNED to this officer only.
router.get("/stats", async (req, res) => {
  const uid = req.auth.id;

  try {
    const [[{ total }]] = await pool.query(
      `SELECT COUNT(DISTINCT r.id) AS total
       FROM reporter_reports r
       INNER JOIN case_assignments ca ON ca.report_id = r.id
       WHERE ca.assigned_to_id = ?`,
      [uid]
    );
    const [[{ assigned }]] = await pool.query(
      `SELECT COUNT(DISTINCT report_id) AS assigned
       FROM case_assignments WHERE assigned_to_id = ?`,
      [uid]
    );
    const [[{ pending }]] = await pool.query(
      `SELECT COUNT(*) AS pending
       FROM reporter_reports r
       INNER JOIN case_assignments ca ON ca.report_id = r.id
       WHERE ca.assigned_to_id = ? AND r.status = 'submitted'`,
      [uid]
    );
    const [[{ underExamination }]] = await pool.query(
      `SELECT COUNT(*) AS underExamination
       FROM reporter_reports r
       INNER JOIN case_assignments ca ON ca.report_id = r.id
       WHERE ca.assigned_to_id = ? AND r.status = 'under-investigation'`,
      [uid]
    );
    const [[{ completedReports }]] = await pool.query(
      `SELECT COUNT(*) AS completedReports
       FROM reporter_reports r
       INNER JOIN case_assignments ca ON ca.report_id = r.id
       WHERE ca.assigned_to_id = ? AND r.status = 'resolved'`,
      [uid]
    );
    const [[{ highPriority }]] = await pool.query(
      `SELECT COUNT(*) AS highPriority
       FROM reporter_reports r
       INNER JOIN case_assignments ca ON ca.report_id = r.id
       WHERE ca.assigned_to_id = ? AND r.priority = 'high'`,
      [uid]
    );

    return res.json({
      stats: {
        total:            Number(total),
        assigned:         Number(assigned),
        pending:          Number(pending),
        underExamination: Number(underExamination),
        completedReports: Number(completedReports),
        highPriority:     Number(highPriority),
      },
    });
  } catch (err) {
    return res.status(500).json({ message: "Failed to fetch stats", error: err.message });
  }
});

// ── 4. GET /cases/:caseId/notes ───────────────────────────────────────────────
router.get("/cases/:caseId/notes", async (req, res) => {
  const { caseId } = req.params;

  try {
    const [notes] = await pool.query(
      `SELECT id, case_id, report_id, user_id, account_type, author_name,
              status, comment, created_at
       FROM case_updates
       WHERE case_id = ?
       ORDER BY created_at DESC`,
      [caseId]
    );
    return res.json({ notes });
  } catch (err) {
    return res.status(500).json({ message: "Failed to fetch notes", error: err.message });
  }
});

// ── 5. POST /cases/:caseId/notes ──────────────────────────────────────────────
router.post("/cases/:caseId/notes", async (req, res) => {
  const { caseId } = req.params;
  const { comment, targetRole } = req.body;

  if (!comment || !comment.trim()) {
    return res.status(400).json({ message: "Comment is required" });
  }

  try {
    // Resolve numeric report id
    const [reports] = await pool.query(
      "SELECT id, status FROM reporter_reports WHERE case_id = ? LIMIT 1",
      [caseId]
    );
    if (reports.length === 0) {
      return res.status(404).json({ message: "Case not found" });
    }
    const { id: reportId, status } = reports[0];

    // Insert case update / note
    const [result] = await pool.query(
      `INSERT INTO case_updates
         (case_id, report_id, user_id, account_type, author_name, status, comment)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        caseId,
        reportId,
        req.auth.id,
        req.auth.accountType || "user",
        req.auth.fullName || req.auth.email || "Unknown",
        status,
        comment.trim(),
      ]
    );

    // Optionally notify assigned users if targetRole is specified
    if (targetRole) {
      const [assignees] = await pool.query(
        `SELECT DISTINCT assigned_to_id
         FROM case_assignments
         WHERE case_id = ? AND assigned_to_role = ?`,
        [caseId, targetRole]
      );

      if (assignees.length > 0) {
        const notifValues = assignees.map((a) => [
          a.assigned_to_id,
          "case_note",
          `New note on case ${caseId}: ${comment.trim().substring(0, 100)}`,
          reportId,
          0,
        ]);

        await pool.query(
          `INSERT INTO user_notifications (user_id, type, message, report_id, is_read)
           VALUES ?`,
          [notifValues]
        );
      }
    }

    return res.status(201).json({
      message: "Note added successfully",
      noteId: result.insertId,
    });
  } catch (err) {
    return res.status(500).json({ message: "Failed to add note", error: err.message });
  }
});

// ── 6. GET /cases/:caseId/assessments ─────────────────────────────────────────
router.get("/cases/:caseId/assessments", async (req, res) => {
  const { caseId } = req.params;

  try {
    await ensureMedicalAssessmentsTable();

    const [assessments] = await pool.query(
      `SELECT id, case_id, report_id, doctor_id, doctor_name,
              physical_injuries, emotional_condition, signs_of_neglect,
              signs_of_sexual_abuse, general_health, doctor_observations,
              verification_status, created_at, updated_at
       FROM medical_assessments
       WHERE case_id = ?
       ORDER BY created_at DESC`,
      [caseId]
    );

    return res.json({ assessments });
  } catch (err) {
    return res.status(500).json({ message: "Failed to fetch assessments", error: err.message });
  }
});

// ── 7. POST /cases/:caseId/assessments ────────────────────────────────────────
router.post("/cases/:caseId/assessments", async (req, res) => {
  const { caseId } = req.params;
  const {
    physicalInjuries,
    emotionalCondition,
    signsOfNeglect,
    signsOfSexualAbuse,
    generalHealth,
    doctorObservations,
    verificationStatus = "pending",
  } = req.body;

  try {
    await ensureMedicalAssessmentsTable();

    // Resolve report id
    const [reports] = await pool.query(
      "SELECT id FROM reporter_reports WHERE case_id = ? LIMIT 1",
      [caseId]
    );
    if (reports.length === 0) {
      return res.status(404).json({ message: "Case not found" });
    }
    const reportId = reports[0].id;

    const [result] = await pool.query(
      `INSERT INTO medical_assessments
         (case_id, report_id, doctor_id, doctor_name,
          physical_injuries, emotional_condition, signs_of_neglect,
          signs_of_sexual_abuse, general_health, doctor_observations,
          verification_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        caseId,
        reportId,
        req.auth.id,
        req.auth.fullName || req.auth.email || "Unknown",
        physicalInjuries    || null,
        emotionalCondition  || null,
        signsOfNeglect      || null,
        signsOfSexualAbuse  || null,
        generalHealth       || null,
        doctorObservations  || null,
        verificationStatus,
      ]
    );

    return res.status(201).json({
      message:      "Medical assessment created successfully",
      assessmentId: result.insertId,
    });
  } catch (err) {
    return res.status(500).json({ message: "Failed to create assessment", error: err.message });
  }
});

// ── 8. PUT /cases/:caseId/assessments/:assessmentId ───────────────────────────
router.put("/cases/:caseId/assessments/:assessmentId", async (req, res) => {
  const { caseId, assessmentId } = req.params;
  const {
    physicalInjuries,
    emotionalCondition,
    signsOfNeglect,
    signsOfSexualAbuse,
    generalHealth,
    doctorObservations,
    verificationStatus,
  } = req.body;

  try {
    await ensureMedicalAssessmentsTable();

    const [existing] = await pool.query(
      "SELECT id FROM medical_assessments WHERE id = ? AND case_id = ? LIMIT 1",
      [assessmentId, caseId]
    );
    if (existing.length === 0) {
      return res.status(404).json({ message: "Assessment not found" });
    }

    await pool.query(
      `UPDATE medical_assessments SET
         physical_injuries    = COALESCE(?, physical_injuries),
         emotional_condition  = COALESCE(?, emotional_condition),
         signs_of_neglect     = COALESCE(?, signs_of_neglect),
         signs_of_sexual_abuse = COALESCE(?, signs_of_sexual_abuse),
         general_health       = COALESCE(?, general_health),
         doctor_observations  = COALESCE(?, doctor_observations),
         verification_status  = COALESCE(?, verification_status)
       WHERE id = ? AND case_id = ?`,
      [
        physicalInjuries   ?? null,
        emotionalCondition ?? null,
        signsOfNeglect     ?? null,
        signsOfSexualAbuse ?? null,
        generalHealth      ?? null,
        doctorObservations ?? null,
        verificationStatus ?? null,
        assessmentId,
        caseId,
      ]
    );

    return res.json({ message: "Medical assessment updated successfully" });
  } catch (err) {
    return res.status(500).json({ message: "Failed to update assessment", error: err.message });
  }
});

// ── 9. PATCH /cases/:caseId/status ────────────────────────────────────────────
const ALLOWED_STATUSES = ["submitted", "verified", "under-investigation", "resolved"];

router.patch("/cases/:caseId/status", async (req, res) => {
  const { caseId } = req.params;
  const { status }  = req.body;
  const uid = req.auth.id;

  if (!ALLOWED_STATUSES.includes(status)) {
    return res.status(400).json({
      message: `Invalid status. Allowed: ${ALLOWED_STATUSES.join(", ")}`,
    });
  }

  try {
    // Verify this case is assigned to the current officer
    const [reports] = await pool.query(
      `SELECT r.id, r.user_id, r.status
       FROM reporter_reports r
       INNER JOIN case_assignments ca ON ca.report_id = r.id
       WHERE r.case_id = ? AND ca.assigned_to_id = ? LIMIT 1`,
      [caseId, uid]
    );
    if (reports.length === 0) {
      return res.status(403).json({ message: "Case not found or not assigned to you" });
    }
    const { id: reportId, user_id: reporterUserId } = reports[0];

    // Update status
    await pool.query(
      "UPDATE reporter_reports SET status = ? WHERE case_id = ?",
      [status, caseId]
    );

    // Record status-change note in case_updates
    const statusComment = `Status updated to '${status}' by ${req.auth.fullName || req.auth.email || "Health Officer"} (Hospital)`;
    await pool.query(
      `INSERT INTO case_updates
         (case_id, report_id, user_id, account_type, author_name, status, comment)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        caseId,
        reportId,
        req.auth.id,
        req.auth.accountType || "user",
        req.auth.fullName || req.auth.email || "Unknown",
        status,
        statusComment,
      ]
    );

    // Notify original reporter if user_id exists
    if (reporterUserId) {
      await pool.query(
        `INSERT INTO user_notifications (user_id, type, message, report_id, is_read)
         VALUES (?, 'status_update', ?, ?, 0)`,
        [
          reporterUserId,
          `Your case ${caseId} status has been updated to '${status}'.`,
          reportId,
        ]
      );
    }

    return res.json({ message: "Status updated successfully", status });
  } catch (err) {
    return res.status(500).json({ message: "Failed to update status", error: err.message });
  }
});

// ── 10. GET /cases/:caseId/attachments ────────────────────────────────────────
router.get("/cases/:caseId/attachments", async (req, res) => {
  const { caseId } = req.params;

  try {
    const [attachments] = await pool.query(
      `SELECT id, report_id, case_id, file_url, file_type, file_name,
              uploaded_by_id, uploaded_by_name, uploaded_at
       FROM attachments
       WHERE case_id = ?
       ORDER BY uploaded_at DESC`,
      [caseId]
    );
    return res.json({ attachments });
  } catch (err) {
    return res.status(500).json({ message: "Failed to fetch attachments", error: err.message });
  }
});

// ── 11. POST /cases/:caseId/upload ────────────────────────────────────────────
router.post("/cases/:caseId/upload", upload.single("file"), async (req, res) => {
  const { caseId } = req.params;

  if (!req.file) {
    return res.status(400).json({ message: "No file provided" });
  }

  try {
    // Resolve numeric report id
    const [reports] = await pool.query(
      "SELECT id FROM reporter_reports WHERE case_id = ? LIMIT 1",
      [caseId]
    );
    if (reports.length === 0) {
      return res.status(404).json({ message: "Case not found" });
    }
    const reportId = reports[0].id;

    const fileType = req.file.mimetype.startsWith("image/")
      ? "image"
      : req.file.mimetype.startsWith("video/")
      ? "video"
      : "document";

    await pool.query(
      `INSERT INTO attachments
         (report_id, case_id, file_url, file_type, file_name, uploaded_by_id, uploaded_by_name)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        reportId,
        caseId,
        req.file.path,   // Cloudinary secure_url
        fileType,
        req.file.originalname,
        req.auth.id,
        req.auth.fullName || req.auth.email || "Unknown",
      ]
    );

    return res.status(201).json({
      message: "File uploaded successfully",
      file: {
        url:  req.file.path,
        name: req.file.originalname,
        type: fileType,
      },
    });
  } catch (err) {
    return res.status(500).json({ message: "Upload failed", error: err.message });
  }
});

// ── 12. GET /stats/report ─────────────────────────────────────────────────────
// Monthly summary: examinations, abuse-type breakdown, totals this month.
router.get("/stats/report", async (req, res) => {
  const district = req.auth.district || "Unknown";

  try {
    await ensureMedicalAssessmentsTable();

    // Total medical assessments created this calendar month
    const [[{ monthlyExaminations }]] = await pool.query(
      `SELECT COUNT(*) AS monthlyExaminations
       FROM medical_assessments ma
       INNER JOIN reporter_reports r ON r.case_id = ma.case_id
       WHERE r.district = ?
         AND MONTH(ma.created_at) = MONTH(CURRENT_DATE())
         AND YEAR(ma.created_at)  = YEAR(CURRENT_DATE())`,
      [district]
    );

    // Abuse type breakdown for cases in this district
    const [abuseByType] = await pool.query(
      `SELECT COALESCE(abuse_type, 'Unknown') AS type, COUNT(*) AS count
       FROM reporter_reports
       WHERE district = ? AND abuse_type IS NOT NULL
       GROUP BY abuse_type
       ORDER BY count DESC`,
      [district]
    );

    // Total cases reported this month in district
    const [[{ totalThisMonth }]] = await pool.query(
      `SELECT COUNT(*) AS totalThisMonth
       FROM reporter_reports
       WHERE district = ?
         AND MONTH(created_at) = MONTH(CURRENT_DATE())
         AND YEAR(created_at)  = YEAR(CURRENT_DATE())`,
      [district]
    );

    // Resolved this month in district
    const [[{ completedThisMonth }]] = await pool.query(
      `SELECT COUNT(*) AS completedThisMonth
       FROM reporter_reports
       WHERE district = ? AND status = 'resolved'
         AND MONTH(updated_at) = MONTH(CURRENT_DATE())
         AND YEAR(updated_at)  = YEAR(CURRENT_DATE())`,
      [district]
    );

    return res.json({
      report: {
        monthlyExaminations: Number(monthlyExaminations),
        abuseByType: abuseByType.map((r) => ({ type: r.type, count: Number(r.count) })),
        totalThisMonth:    Number(totalThisMonth),
        completedThisMonth: Number(completedThisMonth),
      },
    });
  } catch (err) {
    return res.status(500).json({ message: "Failed to generate report", error: err.message });
  }
});

export default router;

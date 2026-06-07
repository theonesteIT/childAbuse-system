import express from "express";
import pool from "../db.js";
import { authRequired } from "../middleware/auth.js";

const router = express.Router();

router.use(authRequired);

function socialOnly(req, res, next) {
  if (req.auth.accountType !== "user" || req.auth.role !== "Social Worker") {
    return res.status(403).json({ message: "Forbidden: Social Worker access only" });
  }
  return next();
}

router.use(socialOnly);

/* ─── Helper: verify case is assigned to this social worker ─── */
async function isAssigned(caseId, userId) {
  const [rows] = await pool.query(
    `SELECT r.id FROM reporter_reports r
     INNER JOIN case_assignments ca ON ca.report_id = r.id
     WHERE r.case_id = ? AND ca.assigned_to_id = ? LIMIT 1`,
    [caseId, userId]
  );
  return rows.length > 0 ? rows[0].id : null;
}

function toClientCase(row) {
  return {
    id: row.id,
    caseId: row.case_id,
    type: row.report_type,
    child: row.child_name,
    age: row.child_age,
    gender: row.child_gender,
    location: row.last_seen_location,
    description: row.description,
    district: row.district,
    status: row.status,
    priority: row.priority || "medium",
    anonymous: Boolean(row.is_anonymous),
    createdAt: row.created_at,
    assignedAt: row.assigned_at,
  };
}

// ───────────────────────────────────────────────────────────────
// GET /api/social/cases — all cases assigned to this social worker
// ───────────────────────────────────────────────────────────────
router.get("/cases", async (req, res) => {
  const { filter, status, q } = req.query;
  try {
    let sql = `
      SELECT r.id, r.case_id, r.report_type, r.child_name, r.child_age, r.child_gender,
             r.last_seen_location, r.description, r.district, r.status, r.is_anonymous,
             r.priority, r.created_at, ca.assigned_at
      FROM reporter_reports r
      INNER JOIN case_assignments ca ON ca.report_id = r.id
      WHERE ca.assigned_to_id = ?
    `;
    const params = [req.auth.id];

    if (filter === "abuse") {
      sql += " AND r.report_type = 'Abuse'";
    }
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

// ───────────────────────────────────────────────────────────────
// GET /api/social/cases/:caseId — single case detail
// ───────────────────────────────────────────────────────────────
router.get("/cases/:caseId", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT r.id, r.case_id, r.report_type, r.child_name, r.child_age, r.child_gender,
              r.last_seen_location, r.description, r.district, r.status, r.is_anonymous,
              r.priority, r.created_at, ca.assigned_at
       FROM reporter_reports r
       INNER JOIN case_assignments ca ON ca.report_id = r.id
       WHERE r.case_id = ? AND ca.assigned_to_id = ? LIMIT 1`,
      [req.params.caseId, req.auth.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: "Case not found or not assigned to you" });
    }
    return res.json({ case: toClientCase(rows[0]) });
  } catch (err) {
    return res.status(500).json({ message: "Failed to fetch case", error: err.message });
  }
});

// ───────────────────────────────────────────────────────────────
// GET /api/social/stats
// ───────────────────────────────────────────────────────────────
router.get("/stats", async (req, res) => {
  const uid = req.auth.id;
  try {
    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) as total
       FROM reporter_reports r
       INNER JOIN case_assignments ca ON ca.report_id = r.id
       WHERE ca.assigned_to_id = ?`, [uid]
    );
    const [[{ highRisk }]] = await pool.query(
      `SELECT COUNT(*) as highRisk
       FROM reporter_reports r
       INNER JOIN case_assignments ca ON ca.report_id = r.id
       WHERE ca.assigned_to_id = ? AND r.priority = 'high' AND r.status != 'resolved'`, [uid]
    );
    const [[{ active }]] = await pool.query(
      `SELECT COUNT(*) as active
       FROM reporter_reports r
       INNER JOIN case_assignments ca ON ca.report_id = r.id
       WHERE ca.assigned_to_id = ? AND r.report_type = 'Abuse'
         AND r.status IN ('submitted','verified','under-investigation')`, [uid]
    );
    const [[{ resolved }]] = await pool.query(
      `SELECT COUNT(*) as resolved
       FROM reporter_reports r
       INNER JOIN case_assignments ca ON ca.report_id = r.id
       WHERE ca.assigned_to_id = ? AND r.status = 'resolved'`, [uid]
    );
    return res.json({ stats: { total, highRisk, active, resolved } });
  } catch (err) {
    return res.status(500).json({ message: "Failed to fetch stats", error: err.message });
  }
});

// ───────────────────────────────────────────────────────────────
// PATCH /api/social/cases/:id/status — update case status
// ───────────────────────────────────────────────────────────────
router.patch("/cases/:id/status", async (req, res) => {
  const { status } = req.body;
  const ALLOWED = ["submitted", "verified", "under-investigation", "resolved"];
  if (!ALLOWED.includes(status)) {
    return res.status(400).json({ message: "Invalid status value" });
  }
  try {
    const [assigned] = await pool.query(
      `SELECT r.id, r.case_id FROM reporter_reports r
       INNER JOIN case_assignments ca ON ca.report_id = r.id
       WHERE r.id = ? AND ca.assigned_to_id = ? LIMIT 1`,
      [req.params.id, req.auth.id]
    );
    if (assigned.length === 0) {
      return res.status(403).json({ message: "You are not assigned to this case" });
    }
    await pool.query("UPDATE reporter_reports SET status = ? WHERE id = ?", [status, req.params.id]);

    // Log as a case update note
    await pool.query(
      `INSERT INTO case_updates (case_id, report_id, user_id, account_type, author_name, comment)
       VALUES (?, ?, ?, 'user', ?, ?)`,
      [assigned[0].case_id, req.params.id, req.auth.id,
       req.auth.fullName || req.auth.email || "Social Worker",
       `Status updated to: ${status}`]
    ).catch(() => {}); // non-critical

    return res.json({ message: "Status updated successfully" });
  } catch (err) {
    return res.status(500).json({ message: "Failed to update status", error: err.message });
  }
});

// ───────────────────────────────────────────────────────────────
// GET /api/social/cases/:caseId/notes — load case notes/updates
// ───────────────────────────────────────────────────────────────
router.get("/cases/:caseId/notes", async (req, res) => {
  try {
    const reportId = await isAssigned(req.params.caseId, req.auth.id);
    if (!reportId) {
      return res.status(403).json({ message: "Not assigned to this case" });
    }
    const [rows] = await pool.query(
      `SELECT id, author_name, comment, note_type, created_at
       FROM case_updates
       WHERE case_id = ?
       ORDER BY created_at DESC`,
      [req.params.caseId]
    );
    return res.json({ notes: rows });
  } catch (err) {
    return res.status(500).json({ message: "Failed to fetch notes", error: err.message });
  }
});

// ───────────────────────────────────────────────────────────────
// POST /api/social/cases/:caseId/notes — add a note / visit log
// ───────────────────────────────────────────────────────────────
router.post("/cases/:caseId/notes", async (req, res) => {
  const { comment, noteType = "visit", status } = req.body;
  if (!comment?.trim()) {
    return res.status(400).json({ message: "Comment is required" });
  }
  try {
    const reportId = await isAssigned(req.params.caseId, req.auth.id);
    if (!reportId) {
      return res.status(403).json({ message: "Not assigned to this case" });
    }
    await pool.query(
      `INSERT INTO case_updates (case_id, report_id, user_id, account_type, author_name, comment, note_type)
       VALUES (?, ?, ?, 'user', ?, ?, ?)`,
      [req.params.caseId, reportId, req.auth.id,
       req.auth.fullName || req.auth.email || "Social Worker",
       comment.trim(), noteType]
    );
    // Optionally update status
    if (status) {
      const ALLOWED = ["submitted", "verified", "under-investigation", "resolved"];
      if (ALLOWED.includes(status)) {
        await pool.query("UPDATE reporter_reports SET status = ? WHERE id = ?", [status, reportId]);
      }
    }
    return res.status(201).json({ message: "Note saved successfully" });
  } catch (err) {
    return res.status(500).json({ message: "Failed to save note", error: err.message });
  }
});

// ───────────────────────────────────────────────────────────────
// GET /api/social/cases/:caseId/assessment — load last assessment
// ───────────────────────────────────────────────────────────────
router.get("/cases/:caseId/assessment", async (req, res) => {
  try {
    const reportId = await isAssigned(req.params.caseId, req.auth.id);
    if (!reportId) {
      return res.status(403).json({ message: "Not assigned to this case" });
    }
    const [rows] = await pool.query(
      `SELECT * FROM social_assessments WHERE report_id = ? ORDER BY created_at DESC LIMIT 1`,
      [reportId]
    );
    return res.json({ assessment: rows[0] || null });
  } catch (err) {
    return res.status(500).json({ message: "Failed to fetch assessment", error: err.message });
  }
});

// ───────────────────────────────────────────────────────────────
// POST /api/social/cases/:caseId/assessment — submit assessment
// ───────────────────────────────────────────────────────────────
router.post("/cases/:caseId/assessment", async (req, res) => {
  const { physicalSafety, psychologicalState, familyEnvironment, recommendation } = req.body;
  if (!physicalSafety && !recommendation) {
    return res.status(400).json({ message: "At least physical safety or recommendation is required" });
  }
  try {
    const reportId = await isAssigned(req.params.caseId, req.auth.id);
    if (!reportId) {
      return res.status(403).json({ message: "Not assigned to this case" });
    }
    await pool.query(
      `INSERT INTO social_assessments
         (report_id, case_id, social_worker_id, physical_safety, psychological_state, family_environment, recommendation)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [reportId, req.params.caseId, req.auth.id,
       physicalSafety || "", psychologicalState || "",
       familyEnvironment || "", recommendation || ""]
    );
    // Also log a case note
    await pool.query(
      `INSERT INTO case_updates (case_id, report_id, user_id, account_type, author_name, comment, note_type)
       VALUES (?, ?, ?, 'user', ?, 'Formal social assessment submitted.', 'assessment')`,
      [req.params.caseId, reportId, req.auth.id,
       req.auth.fullName || req.auth.email || "Social Worker"]
    ).catch(() => {});
    return res.status(201).json({ message: "Assessment submitted successfully" });
  } catch (err) {
    return res.status(500).json({ message: "Failed to submit assessment", error: err.message });
  }
});

// ───────────────────────────────────────────────────────────────
// POST /api/social/cases/:caseId/referral — submit referral
// ───────────────────────────────────────────────────────────────
router.post("/cases/:caseId/referral", async (req, res) => {
  const { referTo, reason } = req.body;
  const ALLOWED_REFS = ["Police", "Hospital", "NGO", "Escalate"];
  if (!ALLOWED_REFS.includes(referTo)) {
    return res.status(400).json({ message: "Invalid referral target" });
  }
  if (!reason?.trim()) {
    return res.status(400).json({ message: "Referral reason is required" });
  }
  try {
    const reportId = await isAssigned(req.params.caseId, req.auth.id);
    if (!reportId) {
      return res.status(403).json({ message: "Not assigned to this case" });
    }
    const comment = `Referred to ${referTo}. Reason: ${reason.trim()}`;
    await pool.query(
      `INSERT INTO case_updates (case_id, report_id, user_id, account_type, author_name, comment, note_type)
       VALUES (?, ?, ?, 'user', ?, ?, 'referral')`,
      [req.params.caseId, reportId, req.auth.id,
       req.auth.fullName || req.auth.email || "Social Worker", comment]
    );
    return res.status(201).json({ message: `Case referred to ${referTo} successfully` });
  } catch (err) {
    return res.status(500).json({ message: "Failed to submit referral", error: err.message });
  }
});

// ───────────────────────────────────────────────────────────────
// GET /api/social/alerts — fetch this social worker's notifications
// ───────────────────────────────────────────────────────────────
router.get("/alerts", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, type, message, is_read, created_at
       FROM user_notifications
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT 30`,
      [req.auth.id]
    );
    return res.json({ alerts: rows });
  } catch (err) {
    return res.status(500).json({ message: "Failed to fetch alerts", error: err.message });
  }
});

// ───────────────────────────────────────────────────────────────
// PATCH /api/social/alerts/:id/read — mark alert as read
// ───────────────────────────────────────────────────────────────
router.patch("/alerts/:id/read", async (req, res) => {
  try {
    await pool.query(
      "UPDATE user_notifications SET is_read = 1 WHERE id = ? AND user_id = ?",
      [req.params.id, req.auth.id]
    );
    return res.json({ message: "Marked as read" });
  } catch (err) {
    return res.status(500).json({ message: "Failed to mark as read", error: err.message });
  }
});

export default router;

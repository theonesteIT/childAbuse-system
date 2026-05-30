import express from "express";
import pool from "../db.js";
import { authRequired, userRequired } from "../middleware/auth.js";

const router = express.Router();

const STATUS_ORDER = ["submitted", "verified", "under-investigation", "resolved"];
const ALLOWED_REPORT_TYPES = ["Missing", "Abuse"];

function toClientReport(row) {
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
    anonymous: Boolean(row.is_anonymous),
    publicContact: row.public_contact || null,
    date: row.created_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function buildCaseTimeline(report) {
  const currentIndex = STATUS_ORDER.indexOf(report.status);
  const submittedAt = report.createdAt
    ? new Date(report.createdAt).toISOString().slice(0, 16).replace("T", " ")
    : "-";

  return [
    { step: "Submitted", date: submittedAt, done: currentIndex >= 0 },
    { step: "Verified", date: "-", done: currentIndex >= 1 },
    { step: "Under Investigation", date: "-", done: currentIndex >= 2 },
    { step: "Resolved", date: "-", done: currentIndex >= 3 },
  ];
}

async function createNotification(userId, reportId, type, message) {
  await pool.query(
    `INSERT INTO user_notifications (user_id, report_id, type, message, is_read)
     VALUES (?, ?, ?, ?, 0)`,
    [userId, reportId, type, message],
  );
}

function generateCaseId() {
  const year = new Date().getFullYear();
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `CW-${year}-${rand}`;
}

async function generateUniqueCaseId() {
  for (let i = 0; i < 12; i += 1) {
    const candidate = generateCaseId();
    const [rows] = await pool.query("SELECT id FROM reporter_reports WHERE case_id = ? LIMIT 1", [candidate]);
    if (rows.length === 0) return candidate;
  }
  return `CW-${Date.now()}`;
}

function normalizeAnonymous(value) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value.toLowerCase() === "true";
  if (typeof value === "number") return value === 1;
  return false;
}

function validateReportPayload(payload, { requireReporterIdentity = false } = {}) {
  const type = String(payload.type || "").trim();
  const childName = String(payload.childName || "").trim();
  const location = String(payload.location || "").trim();
  const description = String(payload.description || "").trim();
  const district = String(payload.district || "").trim();
  const reporterContact = String(payload.reporterContact || "").trim();
  const anonymous = normalizeAnonymous(payload.anonymous);
  const ageRaw = payload.age;
  const age = ageRaw === "" || ageRaw === null || ageRaw === undefined ? null : Number(ageRaw);
  const gender = String(payload.gender || "").trim() || null;

  if (!type || !childName || !location || !description) {
    return { error: "type, childName, location and description are required" };
  }

  if (!ALLOWED_REPORT_TYPES.includes(type)) {
    return { error: "type must be either Missing or Abuse" };
  }

  if (age !== null && (!Number.isFinite(age) || age < 0 || age > 120)) {
    return { error: "age must be a valid number between 0 and 120" };
  }

  if (requireReporterIdentity && !anonymous && !reporterContact) {
    return { error: "reporterContact is required when anonymous is false" };
  }

  return {
    value: {
      type,
      childName,
      location,
      description,
      district: district || "Unknown",
      reporterContact: reporterContact || null,
      anonymous,
      age,
      gender,
    },
  };
}

async function insertReport({ userId = null, report, districtFallback = "Unknown" }) {
  const caseId = await generateUniqueCaseId();
  const district = report.district || districtFallback || "Unknown";
  const publicContact = userId ? null : (report.anonymous ? null : report.reporterContact);

  const [result] = await pool.query(
    `INSERT INTO reporter_reports (
      case_id, user_id, report_type, child_name, child_age, child_gender, last_seen_location,
      description, district, status, is_anonymous, public_contact
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'submitted', ?, ?)`,
    [
      caseId,
      userId,
      report.type,
      report.childName,
      report.age,
      report.gender,
      report.location,
      report.description,
      district,
      report.anonymous ? 1 : 0,
      publicContact,
    ],
  );

  const [rows] = await pool.query(
    `SELECT id, case_id, report_type, child_name, child_age, child_gender, last_seen_location, description,
            district, status, is_anonymous, public_contact, created_at, updated_at
     FROM reporter_reports
     WHERE id = ? LIMIT 1`,
    [result.insertId],
  );

  return rows[0];
}

// Public anonymous tip line / report endpoint (no login required)
router.post("/public-reports", async (req, res) => {
  const parsed = validateReportPayload(req.body, { requireReporterIdentity: true });
  if (parsed.error) {
    return res.status(400).json({ message: parsed.error });
  }

  try {
    const created = await insertReport({
      userId: null,
      report: parsed.value,
      districtFallback: "Unknown",
    });

    return res.status(201).json({
      message: "Report submitted successfully",
      report: toClientReport(created),
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to submit public report", error: error.message });
  }
});

router.use(authRequired, userRequired);

router.get("/reports", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, case_id, report_type, child_name, child_age, child_gender, last_seen_location, description,
              district, status, is_anonymous, public_contact, created_at, updated_at
       FROM reporter_reports
       WHERE user_id = ?
       ORDER BY created_at DESC`,
      [req.auth.id],
    );

    return res.json({
      reports: rows.map(toClientReport),
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch reports", error: error.message });
  }
});

router.post("/reports", async (req, res) => {
  const parsed = validateReportPayload(req.body, { requireReporterIdentity: false });
  if (parsed.error) {
    return res.status(400).json({ message: parsed.error });
  }

  try {
    const created = await insertReport({
      userId: req.auth.id,
      report: parsed.value,
      districtFallback: req.auth.district || "Unknown",
    });

    await createNotification(
      req.auth.id,
      created.id,
      "update",
      `Your ${created.report_type.toLowerCase()} report ${created.case_id} was submitted successfully.`,
    );

    return res.status(201).json({
      message: "Report submitted successfully",
      report: toClientReport(created),
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to submit report", error: error.message });
  }
});

router.get("/reports/track/:caseId", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, case_id, report_type, child_name, child_age, child_gender, last_seen_location, description,
              district, status, is_anonymous, public_contact, created_at, updated_at
       FROM reporter_reports
       WHERE case_id = ? AND user_id = ?
       LIMIT 1`,
      [req.params.caseId.toUpperCase(), req.auth.id],
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Case not found for this account" });
    }

    const report = toClientReport(rows[0]);
    return res.json({
      case: {
        ...report,
        updates: buildCaseTimeline(report),
      },
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to track case", error: error.message });
  }
});

router.get("/notifications", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, report_id, type, message, is_read, created_at
       FROM user_notifications
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT 200`,
      [req.auth.id],
    );

    return res.json({
      notifications: rows.map((row) => ({
        id: row.id,
        reportId: row.report_id,
        type: row.type,
        msg: row.message,
        read: Boolean(row.is_read),
        time: row.created_at,
      })),
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch notifications", error: error.message });
  }
});

router.patch("/notifications/:id/read", async (req, res) => {
  try {
    const [result] = await pool.query(
      "UPDATE user_notifications SET is_read = 1 WHERE id = ? AND user_id = ?",
      [req.params.id, req.auth.id],
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Notification not found" });
    }

    return res.json({ message: "Notification marked as read" });
  } catch (error) {
    return res.status(500).json({ message: "Failed to mark notification", error: error.message });
  }
});

router.patch("/notifications/read-all", async (req, res) => {
  try {
    await pool.query("UPDATE user_notifications SET is_read = 1 WHERE user_id = ?", [req.auth.id]);
    return res.json({ message: "All notifications marked as read" });
  } catch (error) {
    return res.status(500).json({ message: "Failed to mark notifications", error: error.message });
  }
});

export default router;

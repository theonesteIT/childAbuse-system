import express from "express";
import pool from "../db.js";
import { adminRequired, authRequired } from "../middleware/auth.js";

const router = express.Router();

const ALLOWED_STATUSES = ["submitted", "verified", "under-investigation", "resolved"];

router.use(authRequired, adminRequired);

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
    reporterId: row.user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function createStatusNotification(userId, reportId, caseId, status) {
  const statusLabel = status.replace("-", " ");
  await pool.query(
    `INSERT INTO user_notifications (user_id, report_id, type, message, is_read)
     VALUES (?, ?, 'update', ?, 0)`,
    [userId, reportId, `Case ${caseId} status updated to ${statusLabel}.`],
  );
}

router.get("/", async (req, res) => {
  const status = String(req.query.status || "").trim();
  const q = String(req.query.q || "").trim();

  try {
    let sql = `SELECT id, case_id, user_id, report_type, child_name, child_age, child_gender, last_seen_location,
                      description, district, status, is_anonymous, created_at, updated_at
               FROM reporter_reports
               WHERE 1=1`;
    const params = [];

    if (status) {
      sql += " AND status = ?";
      params.push(status);
    }

    if (q) {
      sql += " AND (case_id LIKE ? OR child_name LIKE ? OR district LIKE ?)";
      const like = `%${q}%`;
      params.push(like, like, like);
    }

    sql += " ORDER BY created_at DESC";

    const [rows] = await pool.query(sql, params);
    return res.json({ reports: rows.map(toClientReport) });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch reports", error: error.message });
  }
});

router.patch("/:id/status", async (req, res) => {
  const { status } = req.body;

  if (!ALLOWED_STATUSES.includes(status)) {
    return res.status(400).json({ message: "Invalid status value" });
  }

  try {
    const [rows] = await pool.query(
      `SELECT id, case_id, user_id
       FROM reporter_reports
       WHERE id = ?
       LIMIT 1`,
      [req.params.id],
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Report not found" });
    }

    const report = rows[0];
    await pool.query("UPDATE reporter_reports SET status = ? WHERE id = ?", [status, req.params.id]);
    await createStatusNotification(report.user_id, report.id, report.case_id, status);

    const [updatedRows] = await pool.query(
      `SELECT id, case_id, user_id, report_type, child_name, child_age, child_gender, last_seen_location,
              description, district, status, is_anonymous, created_at, updated_at
       FROM reporter_reports
       WHERE id = ?
       LIMIT 1`,
      [req.params.id],
    );

    return res.json({
      message: "Report status updated successfully",
      report: toClientReport(updatedRows[0]),
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to update report status", error: error.message });
  }
});

export default router;

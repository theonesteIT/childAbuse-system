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

// GET /api/social/cases
// Returns ONLY cases specifically assigned to this social worker by admin
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

// GET /api/social/stats — based on ASSIGNED cases only
router.get("/stats", async (req, res) => {
  const uid = req.auth.id;
  try {
    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) as total
       FROM reporter_reports r
       INNER JOIN case_assignments ca ON ca.report_id = r.id
       WHERE ca.assigned_to_id = ?`,
      [uid]
    );
    const [[{ highRisk }]] = await pool.query(
      `SELECT COUNT(*) as highRisk
       FROM reporter_reports r
       INNER JOIN case_assignments ca ON ca.report_id = r.id
       WHERE ca.assigned_to_id = ? AND r.report_type = 'Abuse' AND r.status != 'resolved'`,
      [uid]
    );
    const [[{ active }]] = await pool.query(
      `SELECT COUNT(*) as active
       FROM reporter_reports r
       INNER JOIN case_assignments ca ON ca.report_id = r.id
       WHERE ca.assigned_to_id = ? AND r.report_type = 'Abuse'
         AND r.status IN ('submitted','verified','under-investigation')`,
      [uid]
    );
    const [[{ resolved }]] = await pool.query(
      `SELECT COUNT(*) as resolved
       FROM reporter_reports r
       INNER JOIN case_assignments ca ON ca.report_id = r.id
       WHERE ca.assigned_to_id = ? AND r.status = 'resolved'`,
      [uid]
    );

    return res.json({ stats: { total, highRisk, active, resolved } });
  } catch (err) {
    return res.status(500).json({ message: "Failed to fetch stats", error: err.message });
  }
});

// PATCH /api/social/cases/:id/status — only on assigned cases
router.patch("/cases/:id/status", async (req, res) => {
  const { status } = req.body;
  const ALLOWED = ["submitted", "verified", "under-investigation", "resolved"];
  if (!ALLOWED.includes(status)) {
    return res.status(400).json({ message: "Invalid status value" });
  }
  try {
    const [assigned] = await pool.query(
      `SELECT r.id FROM reporter_reports r
       INNER JOIN case_assignments ca ON ca.report_id = r.id
       WHERE r.id = ? AND ca.assigned_to_id = ? LIMIT 1`,
      [req.params.id, req.auth.id]
    );
    if (assigned.length === 0) {
      return res.status(403).json({ message: "You are not assigned to this case" });
    }
    await pool.query("UPDATE reporter_reports SET status = ? WHERE id = ?", [status, req.params.id]);
    return res.json({ message: "Status updated successfully" });
  } catch (err) {
    return res.status(500).json({ message: "Failed to update status", error: err.message });
  }
});

export default router;

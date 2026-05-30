import express from "express";
import pool from "../db.js";
import { authRequired, adminRequired } from "../middleware/auth.js";

const router = express.Router();
router.use(authRequired, adminRequired);

// POST /api/admin/assignments/:caseId  — assign case to a managed user
router.post("/:caseId", async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ message: "userId is required" });

  try {
    // Verify the case exists
    const [reports] = await pool.query(
      "SELECT id, case_id FROM reporter_reports WHERE case_id = ? LIMIT 1",
      [req.params.caseId]
    );
    if (reports.length === 0) return res.status(404).json({ message: "Case not found" });

    // Verify the target user exists
    const [users] = await pool.query(
      "SELECT id, full_name, role FROM managed_users WHERE id = ? LIMIT 1",
      [userId]
    );
    if (users.length === 0) return res.status(404).json({ message: "User not found" });

    const report = reports[0];
    const user = users[0];

    // Upsert assignment (replace existing if re-assigned)
    await pool.query(
      `INSERT INTO case_assignments
         (report_id, case_id, assigned_to_id, assigned_to_name, assigned_to_role, assigned_by_id)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         assigned_to_id = VALUES(assigned_to_id),
         assigned_to_name = VALUES(assigned_to_name),
         assigned_to_role = VALUES(assigned_to_role),
         assigned_by_id = VALUES(assigned_by_id),
         assigned_at = CURRENT_TIMESTAMP`,
      [report.id, report.case_id, user.id, user.full_name, user.role, req.auth.id]
    );

    // Add audit note
    await pool.query(
      `INSERT INTO case_updates (case_id, report_id, user_id, account_type, author_name, comment)
       VALUES (?, ?, ?, 'admin', ?, ?)`,
      [
        report.case_id,
        report.id,
        req.auth.id,
        req.auth.email || "Admin",
        `Case assigned to ${user.full_name} (${user.role})`,
      ]
    );

    return res.json({ message: `Case assigned to ${user.full_name}` });
  } catch (err) {
    return res.status(500).json({ message: "Failed to assign case", error: err.message });
  }
});

// GET /api/admin/assignments/:caseId  — get current assignment
router.get("/:caseId", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT ca.assigned_to_id, ca.assigned_to_name, ca.assigned_to_role, ca.assigned_at,
              mu.district
       FROM case_assignments ca
       LEFT JOIN managed_users mu ON mu.id = ca.assigned_to_id
       WHERE ca.case_id = ? LIMIT 1`,
      [req.params.caseId]
    );
    return res.json({ assignment: rows[0] || null });
  } catch (err) {
    return res.status(500).json({ message: "Failed to fetch assignment", error: err.message });
  }
});

// PATCH /api/admin/assignments/priority/:caseId — update priority
router.patch("/priority/:caseId", async (req, res) => {
  const { priority } = req.body;
  if (!["high", "medium", "low"].includes(priority)) {
    return res.status(400).json({ message: "Invalid priority. Use: high, medium, low" });
  }
  try {
    await pool.query(
      "UPDATE reporter_reports SET priority = ? WHERE case_id = ?",
      [priority, req.params.caseId]
    );
    return res.json({ message: "Priority updated" });
  } catch (err) {
    return res.status(500).json({ message: "Failed to update priority", error: err.message });
  }
});

export default router;

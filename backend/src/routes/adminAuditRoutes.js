import express from "express";
import pool from "../db.js";
import { adminRequired, authRequired } from "../middleware/auth.js";

const router = express.Router();
router.use(authRequired, adminRequired);

// GET /api/admin/audit-logs — latest 100 audit events
router.get("/", async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 100, 500);
  const offset = Number(req.query.offset) || 0;

  try {
    const [rows] = await pool.query(
      `SELECT id, user_id, user_name, account_type, action, table_name, record_id, details, ip_address, created_at
       FROM audit_logs
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    const [countRows] = await pool.query("SELECT COUNT(*) AS total FROM audit_logs");
    const total = countRows[0]?.total || 0;

    return res.json({
      logs: rows.map((r) => ({
        id: r.id,
        userId: r.user_id,
        user: r.user_name || "System",
        accountType: r.account_type,
        action: r.action,
        target: r.record_id || r.table_name || "—",
        details: r.details || null,
        ip: r.ip_address || null,
        time: r.created_at,
      })),
      total,
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch audit logs", error: error.message });
  }
});

export default router;

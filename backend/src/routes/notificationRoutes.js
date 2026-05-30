import express from "express";
import pool from "../db.js";
import { authRequired } from "../middleware/auth.js";

const router = express.Router();
router.use(authRequired);

// GET /api/notifications  — get current user's notifications
router.get("/", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, type, message, is_read, report_id, created_at
       FROM user_notifications
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT 30`,
      [req.auth.id]
    );
    const unread = rows.filter(n => !n.is_read).length;
    return res.json({ notifications: rows, unread });
  } catch (err) {
    return res.status(500).json({ message: "Failed to fetch notifications", error: err.message });
  }
});

// PATCH /api/notifications/:id/read  — mark one as read
router.patch("/:id/read", async (req, res) => {
  try {
    await pool.query(
      "UPDATE user_notifications SET is_read = 1 WHERE id = ? AND user_id = ?",
      [req.params.id, req.auth.id]
    );
    return res.json({ message: "Marked as read" });
  } catch (err) {
    return res.status(500).json({ message: "Failed to mark notification", error: err.message });
  }
});

// PATCH /api/notifications/read-all  — mark all as read
router.patch("/read-all", async (req, res) => {
  try {
    await pool.query(
      "UPDATE user_notifications SET is_read = 1 WHERE user_id = ?",
      [req.auth.id]
    );
    return res.json({ message: "All marked as read" });
  } catch (err) {
    return res.status(500).json({ message: "Failed to mark notifications", error: err.message });
  }
});

export default router;

// ── Shared helper: send a notification to a user ───────────────────
export async function sendNotification(userId, { type = "update", message, reportId = null }) {
  if (!userId || !message) return;
  try {
    await pool.query(
      "INSERT INTO user_notifications (user_id, type, message, report_id) VALUES (?, ?, ?, ?)",
      [userId, type, message, reportId]
    );
  } catch {
    // Non-blocking — don't crash the parent request on notification failure
  }
}

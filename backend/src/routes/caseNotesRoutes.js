import express from "express";
import pool from "../db.js";
import { authRequired } from "../middleware/auth.js";
import { sendNotification } from "./notificationRoutes.js";

const router = express.Router();
router.use(authRequired);

// GET /api/cases/:caseId/notes
router.get("/:caseId/notes", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, case_id, user_id, account_type, author_name, status, comment, created_at
       FROM case_updates WHERE case_id = ? ORDER BY created_at ASC`,
      [req.params.caseId]
    );
    return res.json({ notes: rows });
  } catch (err) {
    return res.status(500).json({ message: "Failed to fetch notes", error: err.message });
  }
});

// POST /api/cases/:caseId/notes
router.post("/:caseId/notes", async (req, res) => {
  const { comment, status } = req.body;
  if (!comment && !status) {
    return res.status(400).json({ message: "Comment or status is required" });
  }
  try {
    // Get the report's numeric ID from case_id
    const [reports] = await pool.query(
      "SELECT id FROM reporter_reports WHERE case_id = ? LIMIT 1",
      [req.params.caseId]
    );
    if (reports.length === 0) {
      return res.status(404).json({ message: "Case not found" });
    }
    const reportId = reports[0].id;

    await pool.query(
      `INSERT INTO case_updates (case_id, report_id, user_id, account_type, author_name, status, comment)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        req.params.caseId,
        reportId,
        req.auth.id,
        req.auth.accountType,
        req.auth.fullName || req.auth.email || "Unknown",
        status || null,
        comment || null,
      ]
    );

    // If status provided, update case and notify reporter
    if (status) {
      await pool.query("UPDATE reporter_reports SET status = ? WHERE case_id = ?", [
        status,
        req.params.caseId,
      ]);
      // Find the reporter to notify
      const [rep] = await pool.query(
        "SELECT user_id, report_type FROM reporter_reports WHERE case_id = ? LIMIT 1",
        [req.params.caseId]
      );
      if (rep.length > 0 && rep[0].user_id) {
        await sendNotification(rep[0].user_id, {
          type: "status_update",
          message: `Your case ${req.params.caseId} status changed to "${status}"`,
          reportId: reports[0].id,
          caseId: req.params.caseId,
          newStatus: status,
          caseType: rep[0].report_type || "case",
        });
      }
    }

    return res.status(201).json({ message: "Note added successfully" });
  } catch (err) {
    return res.status(500).json({ message: "Failed to add note", error: err.message });
  }
});

export default router;

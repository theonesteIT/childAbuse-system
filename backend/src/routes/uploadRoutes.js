import express from "express";
import pool from "../db.js";
import { authRequired } from "../middleware/auth.js";
import { upload } from "../config/cloudinary.js";

const router = express.Router();
router.use(authRequired);

// POST /api/uploads/:caseId  — upload one file for a case
router.post("/:caseId", upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No file provided" });
  }

  try {
    // Resolve report numeric ID from case_id
    const [reports] = await pool.query(
      "SELECT id FROM reporter_reports WHERE case_id = ? LIMIT 1",
      [req.params.caseId]
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
        req.params.caseId,
        req.file.path,                // Cloudinary secure_url
        fileType,
        req.file.originalname,
        req.auth.id,
        req.auth.fullName || req.auth.email || "Unknown",
      ]
    );

    // Audit log entry
    await pool.query(
      `INSERT INTO audit_logs (user_id, user_name, account_type, action, table_name, record_id, details)
       VALUES (?, ?, ?, 'upload_file', 'attachments', ?, ?)`,
      [
        req.auth.id,
        req.auth.fullName || req.auth.email || "Unknown",
        req.auth.accountType || "user",
        req.params.caseId,
        `Uploaded ${fileType}: ${req.file.originalname}`,
      ]
    );

    return res.status(201).json({
      message: "File uploaded successfully",
      file: {
        url: req.file.path,
        name: req.file.originalname,
        type: fileType,
      },
    });
  } catch (err) {
    return res.status(500).json({ message: "Upload failed", error: err.message });
  }
});

// GET /api/uploads/admin  — list ALL attachments (admin view)
router.get("/admin", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, case_id, file_url, file_type, file_name,
              uploaded_by_name, uploaded_at
       FROM attachments
       ORDER BY uploaded_at DESC
       LIMIT 200`
    );
    return res.json({ attachments: rows });
  } catch (err) {
    return res.status(500).json({ message: "Failed to fetch evidence", error: err.message });
  }
});

// DELETE /api/uploads/:id  — delete an attachment
router.delete("/:id", async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT id, file_name FROM attachments WHERE id = ? LIMIT 1",
      [req.params.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: "Attachment not found" });
    }
    await pool.query("DELETE FROM attachments WHERE id = ?", [req.params.id]);

    await pool.query(
      `INSERT INTO audit_logs (user_id, user_name, account_type, action, table_name, record_id, details)
       VALUES (?, ?, ?, 'delete_file', 'attachments', ?, ?)`,
      [
        req.auth.id,
        req.auth.fullName || req.auth.email || "Unknown",
        req.auth.accountType || "user",
        String(req.params.id),
        `Deleted file: ${rows[0].file_name}`,
      ]
    );

    return res.json({ message: "Attachment deleted successfully" });
  } catch (err) {
    return res.status(500).json({ message: "Failed to delete attachment", error: err.message });
  }
});

export default router;


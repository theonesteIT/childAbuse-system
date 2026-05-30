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

// GET /api/uploads/:caseId  — list all attachments for a case
router.get("/:caseId", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, file_url, file_type, file_name, uploaded_by_name, uploaded_at
       FROM attachments WHERE case_id = ? ORDER BY uploaded_at DESC`,
      [req.params.caseId]
    );
    return res.json({ attachments: rows });
  } catch (err) {
    return res.status(500).json({ message: "Failed to fetch attachments", error: err.message });
  }
});

export default router;

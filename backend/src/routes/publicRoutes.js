import express from "express";
import pool from "../db.js";
import { upload } from "../config/cloudinary.js";

const router = express.Router();

// GET /api/public/stats — live aggregate numbers for the landing page
router.get("/stats", async (req, res) => {
  try {
    const [[missing]] = await pool.query(
      `SELECT COUNT(*) AS total FROM reporter_reports WHERE report_type = 'Missing'`
    );
    const [[abuse]] = await pool.query(
      `SELECT COUNT(*) AS total FROM reporter_reports WHERE report_type = 'Abuse'`
    );
    const [[active]] = await pool.query(
      `SELECT COUNT(*) AS total FROM reporter_reports WHERE status IN ('submitted','verified','under-investigation')`
    );
    const [[resolved]] = await pool.query(
      `SELECT COUNT(*) AS total FROM reporter_reports WHERE status = 'resolved'`
    );
    const [[total]] = await pool.query(`SELECT COUNT(*) AS total FROM reporter_reports`);

    return res.json({
      missing: missing.total,
      abuse: abuse.total,
      active: active.total,
      resolved: resolved.total,
      total: total.total,
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch stats", error: error.message });
  }
});

// GET /api/public/reports — recent missing child cases (PII-scrubbed for public display)
router.get("/reports", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT case_id, report_type, child_name, child_age, child_gender,
              last_seen_location, district, status, created_at
       FROM reporter_reports
       WHERE report_type = 'Missing'
         AND status IN ('submitted','verified','under-investigation')
         AND is_anonymous = 0
       ORDER BY created_at DESC
       LIMIT 20`
    );

    return res.json({
      reports: rows.map((r) => ({
        caseId: r.case_id,
        type: r.report_type,
        childName: r.child_name,
        age: r.child_age,
        gender: r.child_gender,
        location: r.last_seen_location,
        district: r.district,
        status: r.status,
        reportedAt: r.created_at,
      })),
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch public reports", error: error.message });
  }
});

// GET /api/public/district-stats — cases per district for analytics bar chart
router.get("/district-stats", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT district, COUNT(*) AS total
       FROM reporter_reports
       GROUP BY district
       ORDER BY total DESC
       LIMIT 8`
    );
    return res.json({ districts: rows });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch district stats", error: error.message });
  }
});

// POST /api/public/uploads/:caseId  — public unauthenticated upload (e.g. for evidence during public reporting)
router.post("/uploads/:caseId", upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No file provided" });
  }

  try {
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
       VALUES (?, ?, ?, ?, ?, NULL, 'Public Submitter')`,
      [
        reportId,
        req.params.caseId,
        req.file.path,
        fileType,
        req.file.originalname,
      ]
    );

    return res.json({
      message: "File uploaded successfully",
      fileUrl: req.file.path,
    });
  } catch (err) {
    return res.status(500).json({ message: "Upload failed", error: err.message });
  }
});

export default router;

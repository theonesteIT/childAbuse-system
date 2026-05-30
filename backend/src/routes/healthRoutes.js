import express from "express";
import pool from "../db.js";
import { authRequired } from "../middleware/auth.js";

const router = express.Router();

router.use(authRequired);

function healthOnly(req, res, next) {
  if (req.auth.accountType !== "user" || req.auth.role !== "Hospital") {
    return res.status(403).json({ message: "Forbidden: Healthcare access only" });
  }
  return next();
}

router.use(healthOnly);

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
    anonymous: Boolean(row.is_anonymous),
    createdAt: row.created_at,
  };
}

// GET /api/health/cases — abuse cases in district
router.get("/cases", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, case_id, report_type, child_name, child_age, child_gender,
              last_seen_location, description, district, status, is_anonymous, created_at
       FROM reporter_reports
       WHERE district = ? AND report_type = 'Abuse'
       ORDER BY created_at DESC`,
      [req.auth.district || "Unknown"]
    );
    return res.json({ cases: rows.map(toClientCase) });
  } catch (err) {
    return res.status(500).json({ message: "Failed to fetch cases", error: err.message });
  }
});

// GET /api/health/stats
router.get("/stats", async (req, res) => {
  try {
    const d = req.auth.district || "Unknown";
    const [[{ total }]]     = await pool.query("SELECT COUNT(*) as total FROM reporter_reports WHERE district = ? AND report_type = 'Abuse'", [d]);
    const [[{ active }]]    = await pool.query("SELECT COUNT(*) as active FROM reporter_reports WHERE district = ? AND report_type = 'Abuse' AND status IN ('submitted','verified','under-investigation')", [d]);
    const [[{ emergency }]] = await pool.query("SELECT COUNT(*) as emergency FROM reporter_reports WHERE district = ? AND report_type = 'Abuse' AND status = 'submitted'", [d]);
    const [[{ completed }]] = await pool.query("SELECT COUNT(*) as completed FROM reporter_reports WHERE district = ? AND report_type = 'Abuse' AND status = 'resolved'", [d]);

    return res.json({ stats: { total, active, emergency, completed } });
  } catch (err) {
    return res.status(500).json({ message: "Failed to fetch stats", error: err.message });
  }
});

export default router;

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
    anonymous: Boolean(row.is_anonymous),
    createdAt: row.created_at,
  };
}

// GET /api/social/cases
router.get("/cases", async (req, res) => {
  const { filter } = req.query;
  try {
    let sql = `SELECT id, case_id, report_type, child_name, child_age, child_gender,
                      last_seen_location, description, district, status, is_anonymous, created_at
               FROM reporter_reports
               WHERE district = ?`;
    const params = [req.auth.district || "Unknown"];

    if (filter === "abuse") {
      sql += " AND report_type = 'Abuse'";
    }
    sql += " ORDER BY created_at DESC";

    const [rows] = await pool.query(sql, params);
    return res.json({ cases: rows.map(toClientCase) });
  } catch (err) {
    return res.status(500).json({ message: "Failed to fetch cases", error: err.message });
  }
});

// GET /api/social/stats
router.get("/stats", async (req, res) => {
  try {
    const d = req.auth.district || "Unknown";
    const [[{ total }]]    = await pool.query("SELECT COUNT(*) as total FROM reporter_reports WHERE district = ?", [d]);
    const [[{ highRisk }]] = await pool.query("SELECT COUNT(*) as highRisk FROM reporter_reports WHERE district = ? AND report_type = 'Abuse' AND status != 'resolved'", [d]);
    const [[{ active }]]   = await pool.query("SELECT COUNT(*) as active FROM reporter_reports WHERE district = ? AND report_type = 'Abuse' AND status IN ('submitted','verified','under-investigation')", [d]);
    const [[{ resolved }]] = await pool.query("SELECT COUNT(*) as resolved FROM reporter_reports WHERE district = ? AND status = 'resolved'", [d]);

    return res.json({ stats: { total, highRisk, active, resolved } });
  } catch (err) {
    return res.status(500).json({ message: "Failed to fetch stats", error: err.message });
  }
});

export default router;

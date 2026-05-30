import express from "express";
import pool from "../db.js";
import { authRequired } from "../middleware/auth.js";

const router = express.Router();

router.use(authRequired);

function policeOnly(req, res, next) {
  if (req.auth.accountType !== "user" || req.auth.role !== "Police") {
    return res.status(403).json({ message: "Forbidden: Police access only" });
  }
  return next();
}

router.use(policeOnly);

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
    date: row.created_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// GET /api/police/cases
router.get("/cases", async (req, res) => {
  const { status, q } = req.query;
  try {
    let sql = `SELECT id, case_id, report_type, child_name, child_age, child_gender,
                      last_seen_location, description, district, status, is_anonymous, created_at, updated_at
               FROM reporter_reports
               WHERE district = ?`;
    const params = [req.auth.district || "Unknown"];

    if (status && status !== "All") {
      sql += " AND status = ?";
      params.push(status);
    }
    if (q) {
      sql += " AND (case_id LIKE ? OR child_name LIKE ?)";
      const like = `%${q}%`;
      params.push(like, like);
    }
    sql += " ORDER BY created_at DESC";

    const [rows] = await pool.query(sql, params);
    return res.json({ cases: rows.map(toClientCase) });
  } catch (err) {
    return res.status(500).json({ message: "Failed to fetch cases", error: err.message });
  }
});

// GET /api/police/stats
router.get("/stats", async (req, res) => {
  try {
    const d = req.auth.district || "Unknown";
    const [[{ total }]]        = await pool.query("SELECT COUNT(*) as total FROM reporter_reports WHERE district = ?", [d]);
    const [[{ newCases }]]     = await pool.query("SELECT COUNT(*) as newCases FROM reporter_reports WHERE district = ? AND status = 'submitted'", [d]);
    const [[{ investigating }]]= await pool.query("SELECT COUNT(*) as investigating FROM reporter_reports WHERE district = ? AND status = 'under-investigation'", [d]);
    const [[{ resolved }]]     = await pool.query("SELECT COUNT(*) as resolved FROM reporter_reports WHERE district = ? AND status = 'resolved'", [d]);
    const [[{ missing }]]      = await pool.query("SELECT COUNT(*) as missing FROM reporter_reports WHERE district = ? AND report_type = 'Missing' AND status != 'resolved'", [d]);

    return res.json({ stats: { total, new: newCases, underInvestigation: investigating, resolved, missingNotFound: missing } });
  } catch (err) {
    return res.status(500).json({ message: "Failed to fetch stats", error: err.message });
  }
});

// PATCH /api/police/cases/:id/status
router.patch("/cases/:id/status", async (req, res) => {
  const { status } = req.body;
  const ALLOWED = ["submitted", "verified", "under-investigation", "resolved"];
  if (!ALLOWED.includes(status)) {
    return res.status(400).json({ message: "Invalid status value" });
  }
  try {
    const [rows] = await pool.query("SELECT id, district FROM reporter_reports WHERE id = ? LIMIT 1", [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ message: "Case not found" });

    await pool.query("UPDATE reporter_reports SET status = ? WHERE id = ?", [status, req.params.id]);
    return res.json({ message: "Status updated successfully" });
  } catch (err) {
    return res.status(500).json({ message: "Failed to update status", error: err.message });
  }
});

export default router;

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
    priority: row.priority || "medium",
    anonymous: Boolean(row.is_anonymous),
    date: row.created_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    assignedAt: row.assigned_at,
  };
}

// GET /api/police/cases
// Returns ONLY cases specifically assigned to this officer by admin
router.get("/cases", async (req, res) => {
  const { status, q } = req.query;
  try {
    let sql = `
      SELECT r.id, r.case_id, r.report_type, r.child_name, r.child_age, r.child_gender,
             r.last_seen_location, r.description, r.district, r.status, r.is_anonymous,
             r.priority, r.created_at, r.updated_at, ca.assigned_at
      FROM reporter_reports r
      INNER JOIN case_assignments ca ON ca.report_id = r.id
      WHERE ca.assigned_to_id = ?
    `;
    const params = [req.auth.id];

    if (status && status !== "All") {
      sql += " AND r.status = ?";
      params.push(status);
    }
    if (q) {
      sql += " AND (r.case_id LIKE ? OR r.child_name LIKE ?)";
      const like = `%${q}%`;
      params.push(like, like);
    }
    sql += " ORDER BY ca.assigned_at DESC";

    const [rows] = await pool.query(sql, params);
    return res.json({ cases: rows.map(toClientCase) });
  } catch (err) {
    return res.status(500).json({ message: "Failed to fetch cases", error: err.message });
  }
});

// GET /api/police/my-assignments — same as /cases (kept for backward compatibility)
router.get("/my-assignments", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT r.id, r.case_id, r.report_type, r.child_name, r.child_age, r.child_gender,
              r.last_seen_location, r.description, r.district, r.status, r.is_anonymous,
              r.priority, r.created_at, r.updated_at, ca.assigned_at
       FROM reporter_reports r
       INNER JOIN case_assignments ca ON ca.report_id = r.id
       WHERE ca.assigned_to_id = ?
       ORDER BY ca.assigned_at DESC`,
      [req.auth.id]
    );
    return res.json({ cases: rows.map(toClientCase), count: rows.length });
  } catch (err) {
    return res.status(500).json({ message: "Failed to fetch assignments", error: err.message });
  }
});

// GET /api/police/stats — counts based on ASSIGNED cases only
router.get("/stats", async (req, res) => {
  const uid = req.auth.id;
  try {
    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) as total
       FROM reporter_reports r
       INNER JOIN case_assignments ca ON ca.report_id = r.id
       WHERE ca.assigned_to_id = ?`,
      [uid]
    );
    const [[{ newCases }]] = await pool.query(
      `SELECT COUNT(*) as newCases
       FROM reporter_reports r
       INNER JOIN case_assignments ca ON ca.report_id = r.id
       WHERE ca.assigned_to_id = ? AND r.status = 'submitted'`,
      [uid]
    );
    const [[{ investigating }]] = await pool.query(
      `SELECT COUNT(*) as investigating
       FROM reporter_reports r
       INNER JOIN case_assignments ca ON ca.report_id = r.id
       WHERE ca.assigned_to_id = ? AND r.status = 'under-investigation'`,
      [uid]
    );
    const [[{ resolved }]] = await pool.query(
      `SELECT COUNT(*) as resolved
       FROM reporter_reports r
       INNER JOIN case_assignments ca ON ca.report_id = r.id
       WHERE ca.assigned_to_id = ? AND r.status = 'resolved'`,
      [uid]
    );
    const [[{ missing }]] = await pool.query(
      `SELECT COUNT(*) as missing
       FROM reporter_reports r
       INNER JOIN case_assignments ca ON ca.report_id = r.id
       WHERE ca.assigned_to_id = ? AND r.report_type = 'Missing' AND r.status != 'resolved'`,
      [uid]
    );

    return res.json({
      stats: {
        total,
        new: newCases,
        underInvestigation: investigating,
        resolved,
        missingNotFound: missing,
      },
    });
  } catch (err) {
    return res.status(500).json({ message: "Failed to fetch stats", error: err.message });
  }
});

// PATCH /api/police/cases/:id/status — update status on an assigned case only
router.patch("/cases/:id/status", async (req, res) => {
  const { status } = req.body;
  const ALLOWED = ["submitted", "verified", "under-investigation", "resolved"];
  if (!ALLOWED.includes(status)) {
    return res.status(400).json({ message: "Invalid status value" });
  }
  try {
    // Verify this case is assigned to the current officer
    const [assigned] = await pool.query(
      `SELECT r.id FROM reporter_reports r
       INNER JOIN case_assignments ca ON ca.report_id = r.id
       WHERE r.id = ? AND ca.assigned_to_id = ? LIMIT 1`,
      [req.params.id, req.auth.id]
    );
    if (assigned.length === 0) {
      return res.status(403).json({ message: "You are not assigned to this case" });
    }

    await pool.query("UPDATE reporter_reports SET status = ? WHERE id = ?", [status, req.params.id]);
    return res.json({ message: "Status updated successfully" });
  } catch (err) {
    return res.status(500).json({ message: "Failed to update status", error: err.message });
  }
});

// GET /api/police/alerts — alerts for assigned cases only
router.get("/alerts", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT r.case_id, r.report_type, r.incident_type, r.district, r.urgency, r.created_at, r.status
       FROM reporter_reports r
       INNER JOIN case_assignments ca ON ca.report_id = r.id
       WHERE ca.assigned_to_id = ?
         AND r.status IN ('submitted','verified','under-investigation')
       ORDER BY
         CASE r.urgency WHEN 'critical' THEN 0 WHEN 'urgent' THEN 1 ELSE 2 END,
         r.created_at DESC
       LIMIT 10`,
      [req.auth.id]
    );

    const alerts = rows.map(r => {
      const minutesAgo = Math.round((Date.now() - new Date(r.created_at).getTime()) / 60000);
      const timeLabel = minutesAgo < 60
        ? `${minutesAgo} min ago`
        : minutesAgo < 1440
        ? `${Math.round(minutesAgo / 60)}h ago`
        : `${Math.round(minutesAgo / 1440)}d ago`;

      const type = r.incident_type || r.report_type;
      const tag = r.urgency === "critical" ? "Critical"
                : r.urgency === "urgent"   ? "Urgent"
                : r.status === "submitted" ? "New"
                : "Active";

      return {
        caseId: r.case_id,
        title: `${type} report — ${r.district} district`,
        text: `Case ${r.case_id} ${r.status.replace(/-/g, " ")} · ${timeLabel}`,
        tag,
        urgency: r.urgency || "normal",
        time: r.created_at,
      };
    });

    return res.json({ alerts });
  } catch (err) {
    return res.status(500).json({ message: "Failed to fetch alerts", error: err.message });
  }
});

export default router;

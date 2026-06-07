import express from "express";
import pool from "../db.js";
import { authRequired, userRequired } from "../middleware/auth.js";

const router = express.Router();
router.use(authRequired, userRequired);

// ── GET /api/institution/stats ──────────────────────────────────
router.get("/stats", async (req, res) => {
  try {
    const district = req.auth.district || "Kigali";
    const role = req.auth.role;

    // Staff in same institution (district + role)
    const [staffRows] = await pool.query(
      `SELECT COUNT(*) AS total, SUM(is_active) AS active
       FROM managed_users
       WHERE district = ? AND role = ?`,
      [district, role]
    );

    // Cases assigned to any staff member of this institution
    const [caseRows] = await pool.query(
      `SELECT
         COUNT(*) AS total,
         SUM(r.status = 'submitted') AS open,
         SUM(r.status = 'resolved') AS closed,
         SUM(r.status = 'under-investigation') AS investigating,
         SUM(r.status = 'verified') AS verified
       FROM reporter_reports r
       INNER JOIN case_assignments ca ON ca.report_id = r.id
       INNER JOIN managed_users mu ON mu.id = ca.assigned_to_id
       WHERE mu.district = ? AND mu.role = ?`,
      [district, role]
    );

    // This month's cases assigned to institution staff
    const [monthlyRows] = await pool.query(
      `SELECT COUNT(*) AS monthly
       FROM reporter_reports r
       INNER JOIN case_assignments ca ON ca.report_id = r.id
       INNER JOIN managed_users mu ON mu.id = ca.assigned_to_id
       WHERE mu.district = ? AND mu.role = ?
         AND MONTH(r.created_at) = MONTH(CURDATE())
         AND YEAR(r.created_at) = YEAR(CURDATE())`,
      [district, role]
    );

    // Pending assigned cases (submitted but under review)
    const [pendingRows] = await pool.query(
      `SELECT COUNT(*) AS pending
       FROM reporter_reports r
       INNER JOIN case_assignments ca ON ca.report_id = r.id
       INNER JOIN managed_users mu ON mu.id = ca.assigned_to_id
       WHERE mu.district = ? AND mu.role = ? AND r.status = 'submitted'`,
      [district, role]
    );

    const staff   = staffRows[0];
    const cases   = caseRows[0];
    const monthly = monthlyRows[0];
    const pending = pendingRows[0];

    return res.json({
      stats: {
        totalStaff:         Number(staff.total  || 0),
        activeStaff:        Number(staff.active || 0),
        casesHandled:       Number(cases.total  || 0),
        openCases:          Number(cases.open   || 0) + Number(cases.investigating || 0),
        closedCases:        Number(cases.closed || 0),
        verifiedCases:      Number(cases.verified || 0),
        pendingAssignments: Number(pending.pending || 0),
        monthlyCases:       Number(monthly.monthly || 0),
      },
    });
  } catch (err) {
    return res.status(500).json({ message: "Failed to fetch stats", error: err.message });
  }
});

// ── GET /api/institution/staff ────────────────────────────────────
router.get("/staff", async (req, res) => {
  try {
    const district = req.auth.district || "Kigali";
    const role = req.auth.role;

    const [rows] = await pool.query(
      `SELECT id, full_name, email, phone, role, district, is_active, created_at
       FROM managed_users
       WHERE district = ? AND role = ?
       ORDER BY created_at DESC
       LIMIT 100`,
      [district, role]
    );

    return res.json({
      staff: rows.map(u => ({
        id: u.id,
        name: u.full_name,
        email: u.email,
        phone: u.phone,
        role: u.role,
        district: u.district,
        status: u.is_active ? "active" : "inactive",
        joinedAt: u.created_at,
      })),
    });
  } catch (err) {
    return res.status(500).json({ message: "Failed to fetch staff", error: err.message });
  }
});

// ── GET /api/institution/cases ────────────────────────────────────
// Only returns cases assigned to staff members of this institution
router.get("/cases", async (req, res) => {
  try {
    const district = req.auth.district || "Kigali";
    const role = req.auth.role;
    const { status, limit = 50 } = req.query;

    let sql = `
      SELECT DISTINCT r.id, r.case_id, r.report_type, r.incident_type, r.child_name,
                      r.district, r.sector, r.status, r.urgency, r.created_at, r.updated_at,
                      mu.full_name AS assigned_to_name, mu.role AS assigned_to_role
      FROM reporter_reports r
      INNER JOIN case_assignments ca ON ca.report_id = r.id
      INNER JOIN managed_users mu ON mu.id = ca.assigned_to_id
      WHERE mu.district = ? AND mu.role = ?`;
    const params = [district, role];

    if (status && status !== "All") {
      sql += " AND r.status = ?";
      params.push(status);
    }

    sql += " ORDER BY r.created_at DESC LIMIT ?";
    params.push(Number(limit));

    const [rows] = await pool.query(sql, params);

    return res.json({
      cases: rows.map(r => ({
        id:           r.id,
        caseId:       r.case_id,
        type:         r.incident_type || r.report_type,
        child:        r.child_name,
        district:     r.district,
        sector:       r.sector,
        status:       r.status,
        urgency:      r.urgency || "normal",
        assignedTo:   r.assigned_to_name,
        assignedRole: r.assigned_to_role,
        createdAt:    r.created_at,
        updatedAt:    r.updated_at,
      })),
    });
  } catch (err) {
    return res.status(500).json({ message: "Failed to fetch cases", error: err.message });
  }
});

// ── GET /api/institution/monthly ──────────────────────────────────
router.get("/monthly", async (req, res) => {
  try {
    const district = req.auth.district || "Kigali";

    const [rows] = await pool.query(
      `SELECT MONTH(created_at) AS month, COUNT(*) AS count
       FROM reporter_reports
       WHERE district = ?
         AND created_at >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
       GROUP BY MONTH(created_at)
       ORDER BY MONTH(created_at)`,
      [district]
    );

    // Build a 12-slot array (Jan=0..Dec=11)
    const monthly = Array(12).fill(0);
    rows.forEach(r => { monthly[Number(r.month) - 1] = Number(r.count); });

    return res.json({ monthly });
  } catch (err) {
    return res.status(500).json({ message: "Failed to fetch monthly data", error: err.message });
  }
});

// ── GET /api/institution/logs ─────────────────────────────────────
router.get("/logs", async (req, res) => {
  try {
    const district = req.auth.district || "Kigali";

    const [rows] = await pool.query(
      `SELECT al.id, al.action, al.details, al.created_at, al.user_name
       FROM audit_logs al
       WHERE al.details LIKE ?
       ORDER BY al.created_at DESC
       LIMIT 50`,
      [`%${district}%`]
    );

    // Fallback: recent report activity
    if (rows.length === 0) {
      const [reports] = await pool.query(
        `SELECT id, case_id, report_type, status, created_at
         FROM reporter_reports
         WHERE district = ?
         ORDER BY updated_at DESC
         LIMIT 20`,
        [district]
      );
      return res.json({
        logs: reports.map(r => ({
          id: r.id,
          action: `Case ${r.case_id} — ${r.status}`,
          details: `${r.report_type} report updated`,
          time: r.created_at,
        })),
      });
    }

    return res.json({
      logs: rows.map(r => ({
        id: r.id,
        action: r.action,
        details: r.details,
        user: r.user_name,
        time: r.created_at,
      })),
    });
  } catch (err) {
    return res.status(500).json({ message: "Failed to fetch logs", error: err.message });
  }
});

export default router;

import express from 'express';
import pool from '../db.js';
import { authRequired, adminRequired } from '../middleware/auth.js';

const router = express.Router();
router.use(authRequired, adminRequired);

// GET /api/admin/stats
router.get('/', async (req, res) => {
  try {
    const [[totals]] = await pool.query(`
      SELECT
        COUNT(*) AS total,
        SUM(report_type = 'Missing') AS missing,
        SUM(report_type = 'Abuse') AS abuse,
        SUM(status = 'resolved') AS resolved,
        SUM(status NOT IN ('resolved')) AS active
      FROM reporter_reports
    `);

    const [[userCount]] = await pool.query(
      `SELECT COUNT(*) AS count FROM managed_users WHERE is_active = 1`
    );

    // Monthly breakdown (last 12 months)
    const [monthly] = await pool.query(`
      SELECT MONTH(created_at) AS month, COUNT(*) AS count
      FROM reporter_reports
      WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
      GROUP BY MONTH(created_at)
      ORDER BY MONTH(created_at)
    `);

    const monthlyData = Array(12).fill(0);
    monthly.forEach(row => { monthlyData[row.month - 1] = Number(row.count); });

    // Districts breakdown
    const [districts] = await pool.query(`
      SELECT district, COUNT(*) AS cases
      FROM reporter_reports
      GROUP BY district
      ORDER BY cases DESC
      LIMIT 10
    `);

    // Recent cases
    const [recentCases] = await pool.query(`
      SELECT id, case_id, report_type, child_name, district, status, created_at
      FROM reporter_reports
      ORDER BY created_at DESC
      LIMIT 6
    `);

    return res.json({
      stats: {
        total: Number(totals.total),
        missing: Number(totals.missing || 0),
        abuse: Number(totals.abuse || 0),
        resolved: Number(totals.resolved || 0),
        active: Number(totals.active || 0),
        activeUsers: Number(userCount.count),
      },
      monthlyData,
      districts: districts.map(d => ({ name: d.district, cases: Number(d.cases) })),
      recentCases: recentCases.map(c => ({
        id: c.id,
        caseId: c.case_id,
        type: c.report_type,
        child: c.child_name,
        district: c.district,
        status: c.status,
        date: c.created_at,
      })),
    });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to fetch stats', error: err.message });
  }
});

export default router;

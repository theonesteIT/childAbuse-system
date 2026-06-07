import express from 'express';
import pool from '../db.js';
import { authRequired, adminRequired } from '../middleware/auth.js';

const router = express.Router();
router.use(authRequired, adminRequired);

// GET /api/admin/analytics
router.get('/', async (req, res) => {
  try {
    // Resolution rate
    const [[totals]] = await pool.query(`
      SELECT
        COUNT(*) AS total,
        SUM(status = 'resolved') AS resolved
      FROM reporter_reports
    `);
    const resolutionRate = totals.total > 0
      ? ((Number(totals.resolved) / Number(totals.total)) * 100).toFixed(1)
      : 0;

    // This month count
    const [[thisMonth]] = await pool.query(`
      SELECT COUNT(*) AS count FROM reporter_reports
      WHERE MONTH(created_at) = MONTH(CURDATE()) AND YEAR(created_at) = YEAR(CURDATE())
    `);

    // Active cases
    const [[active]] = await pool.query(`
      SELECT COUNT(*) AS count FROM reporter_reports WHERE status != 'resolved'
    `);

    // Monthly response trend (count by month)
    const [monthly] = await pool.query(`
      SELECT MONTH(created_at) AS month, COUNT(*) AS count
      FROM reporter_reports
      WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
      GROUP BY MONTH(created_at)
      ORDER BY MONTH(created_at)
    `);
    const monthlyData = Array(12).fill(0);
    monthly.forEach(r => { monthlyData[r.month - 1] = Number(r.count); });

    // Type distribution
    const [types] = await pool.query(`
      SELECT report_type AS type, COUNT(*) AS count
      FROM reporter_reports
      GROUP BY report_type
    `);

    // District distribution
    const [districts] = await pool.query(`
      SELECT district, COUNT(*) AS count
      FROM reporter_reports
      GROUP BY district
      ORDER BY count DESC
      LIMIT 8
    `);

    return res.json({
      kpis: {
        resolutionRate: `${resolutionRate}%`,
        reportsThisMonth: Number(thisMonth.count),
        activeCases: Number(active.count),
        totalReports: Number(totals.total),
      },
      monthlyData,
      typeDistribution: types.map(t => ({ label: t.type, value: Number(t.count) })),
      districtDistribution: districts.map(d => ({ label: d.district, value: Number(d.count) })),
    });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to fetch analytics', error: err.message });
  }
});

export default router;

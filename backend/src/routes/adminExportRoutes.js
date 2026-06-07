import express from 'express';
import pool from '../db.js';
import { authRequired, adminRequired } from '../middleware/auth.js';

const router = express.Router();
router.use(authRequired, adminRequired);

function toCSV(headers, rows) {
  const escape = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const header = headers.map(escape).join(',');
  const body = rows.map(row => headers.map(h => escape(row[h])).join(','));
  return [header, ...body].join('\n');
}

// GET /api/admin/export?type=cases&format=csv
router.get('/', async (req, res) => {
  const type = String(req.query.type || 'cases');
  const format = String(req.query.format || 'csv');
  const status = String(req.query.status || '');
  const district = String(req.query.district || '');

  try {
    let rows = [];
    let headers = [];
    let filename = '';

    if (type === 'cases' || type === 'monthly' || type === 'district' || type === 'summary') {
      let sql = `SELECT case_id, report_type, child_name, child_age, child_gender,
                        last_seen_location, description, district, status,
                        is_anonymous, created_at, updated_at
                 FROM reporter_reports WHERE 1=1`;
      const params = [];
      if (status) { sql += ' AND status = ?'; params.push(status); }
      if (district) { sql += ' AND district = ?'; params.push(district); }
      if (type === 'monthly') {
        sql += ' AND MONTH(created_at) = MONTH(CURDATE()) AND YEAR(created_at) = YEAR(CURDATE())';
      }
      sql += ' ORDER BY created_at DESC';
      [rows] = await pool.query(sql, params);
      headers = ['case_id','report_type','child_name','child_age','child_gender','last_seen_location','description','district','status','is_anonymous','created_at','updated_at'];
      filename = `childwatch_${type}_report`;
    } else if (type === 'users' || type === 'activity') {
      [rows] = await pool.query(
        `SELECT full_name, email, phone, role, district, is_active, created_at FROM managed_users ORDER BY created_at DESC`
      );
      headers = ['full_name','email','phone','role','district','is_active','created_at'];
      filename = 'childwatch_users_report';
    } else if (type === 'audit') {
      [rows] = await pool.query(
        `SELECT id, user_name, account_type, action, table_name, record_id, details, created_at
         FROM audit_logs ORDER BY created_at DESC LIMIT 500`
      );
      headers = ['id','user_name','account_type','action','table_name','record_id','details','created_at'];
      filename = 'childwatch_audit_logs';
    }

    if (format === 'csv') {
      const csv = toCSV(headers, rows);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
      return res.send(csv);
    }

    // JSON fallback
    return res.json({ type, rows, headers });
  } catch (err) {
    return res.status(500).json({ message: 'Export failed', error: err.message });
  }
});

export default router;

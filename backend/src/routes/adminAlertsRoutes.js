import express from 'express';
import pool from '../db.js';
import { authRequired, adminRequired } from '../middleware/auth.js';
import { sendNotification } from './notificationRoutes.js';
import { sendEmergencyAlertEmail } from '../services/emailService.js';

const router = express.Router();
router.use(authRequired, adminRequired);

// GET /api/admin/alerts — fetch alert history
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, sent_to, message, sent_by_name, sent_at, status
       FROM admin_alerts
       ORDER BY sent_at DESC
       LIMIT 50`
    );
    return res.json({ alerts: rows });
  } catch (err) {
    // Table may not exist yet - return empty
    return res.json({ alerts: [] });
  }
});

// POST /api/admin/alerts — broadcast alert
router.post('/', async (req, res) => {
  const { sentTo, message } = req.body;
  if (!sentTo || !message || !message.trim()) {
    return res.status(400).json({ message: 'sentTo and message are required' });
  }

  try {
    // Ensure table exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS admin_alerts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        sent_to VARCHAR(80) NOT NULL,
        message TEXT NOT NULL,
        sent_by_id INT NULL,
        sent_by_name VARCHAR(120) NOT NULL DEFAULT 'Admin',
        sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status VARCHAR(20) NOT NULL DEFAULT 'delivered'
      )
    `);

    const [result] = await pool.query(
      `INSERT INTO admin_alerts (sent_to, message, sent_by_id, sent_by_name)
       VALUES (?, ?, ?, ?)`,
      [sentTo, message.trim(), req.auth.id, req.auth.fullName || 'Admin']
    );

    // Log the action
    await pool.query(
      `INSERT INTO audit_logs (user_id, user_name, account_type, action, table_name, record_id, details)
       VALUES (?, ?, 'admin', 'broadcast_alert', 'admin_alerts', ?, ?)`,
      [req.auth.id, req.auth.fullName || 'Admin', String(result.insertId), `Alert to ${sentTo}: ${message.trim().slice(0, 80)}`]
    );

    // Broadcast logic
    let targetUsers = [];
    if (sentTo === 'All Users') {
      const [users] = await pool.query("SELECT id, full_name, email FROM managed_users");
      targetUsers = users;
    } else {
      let roleFilter = sentTo; 
      if (sentTo === 'Hospitals') roleFilter = 'Hospital';
      else if (sentTo === 'Social Workers') roleFilter = 'Social Worker';
      // 'Police' remains 'Police'
      
      const [users] = await pool.query("SELECT id, full_name, email FROM managed_users WHERE role = ?", [roleFilter]);
      targetUsers = users;
    }

    const senderName = req.auth.fullName || 'System Admin';

    // Dispatch in-app notifications and emails
    for (const u of targetUsers) {
      // 1. In-app bell notification
      await sendNotification(u.id, {
        type: 'alert',
        message: `EMERGENCY ALERT: ${message.trim()}`
      });

      // 2. Email notification (fire & forget)
      sendEmergencyAlertEmail(u.email, {
        recipientName: u.full_name,
        message: message.trim(),
        sentBy: senderName
      }).catch(err => console.error("Alert email failed for", u.email, err));
    }

    return res.status(201).json({ message: 'Alert sent successfully', id: result.insertId });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to send alert', error: err.message });
  }
});

export default router;

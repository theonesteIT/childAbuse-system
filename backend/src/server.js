import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import session from "express-session";
import passport from "./middleware/passport.js";
import pool from "./db.js";
import authRoutes from "./routes/authRoutes.js";
import adminUsersRoutes from "./routes/adminUsersRoutes.js";
import adminReportsRoutes from "./routes/adminReportsRoutes.js";
import reporterRoutes from "./routes/reporterRoutes.js";
import policeRoutes from "./routes/policeRoutes.js";
import socialRoutes from "./routes/socialRoutes.js";
import healthRoutes from "./routes/healthRoutes.js";
import caseNotesRoutes from "./routes/caseNotesRoutes.js";
import caseAssignmentRoutes from "./routes/caseAssignmentRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import publicRoutes from "./routes/publicRoutes.js";
import adminAuditRoutes from "./routes/adminAuditRoutes.js";
import adminStatsRoutes from "./routes/adminStatsRoutes.js";
import adminAnalyticsRoutes from "./routes/adminAnalyticsRoutes.js";
import adminAlertsRoutes from "./routes/adminAlertsRoutes.js";
import adminExportRoutes from "./routes/adminExportRoutes.js";
import adminInstitutionsRoutes from "./routes/adminInstitutionsRoutes.js";
import institutionRoutes from "./routes/institutionRoutes.js";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 5000);
const defaultAllowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175",
  "http://localhost:5176",
];

const envOrigins = (process.env.CORS_ORIGIN || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const allowedOrigins = envOrigins.length > 0 ? envOrigins : defaultAllowedOrigins;

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error("CORS origin not allowed"));
    },
  })
);
app.use(express.json());

app.use(
  session({
    secret: process.env.SESSION_SECRET || "fallback_secret_for_dev",
    resave: false,
    saveUninitialized: false,
  })
);
app.use(passport.initialize());
app.use(passport.session());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", authRoutes); // Moved from /api/admin
app.use("/api/admin/users", adminUsersRoutes);
app.use("/api/admin/reports", adminReportsRoutes);
app.use("/api/reporter", reporterRoutes);
app.use("/api/police", policeRoutes);
app.use("/api/social", socialRoutes);
app.use("/api/health", healthRoutes);
app.use("/api/cases", caseNotesRoutes);
app.use("/api/admin/assignments", caseAssignmentRoutes);
app.use("/api/uploads", uploadRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/public", publicRoutes);
app.use("/api/admin/audit-logs", adminAuditRoutes);
app.use("/api/admin/stats", adminStatsRoutes);
app.use("/api/admin/analytics", adminAnalyticsRoutes);
app.use("/api/admin/alerts", adminAlertsRoutes);
app.use("/api/admin/export", adminExportRoutes);
app.use("/api/admin/institutions", adminInstitutionsRoutes);
app.use("/api/institution", institutionRoutes);

app.get("/", (_req, res) => {
  res.send("Childwatch backend is running");
});

async function ensureDatabaseSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS admins (
      id INT AUTO_INCREMENT PRIMARY KEY,
      full_name VARCHAR(120) NOT NULL,
      email VARCHAR(120) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS managed_users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      full_name VARCHAR(120) NOT NULL,
      email VARCHAR(120) NOT NULL UNIQUE,
      phone VARCHAR(40),
      role VARCHAR(60) NOT NULL,
      district VARCHAR(80) NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  await pool.query("ALTER TABLE managed_users ADD COLUMN IF NOT EXISTS phone VARCHAR(40)");
  await pool.query("ALTER TABLE managed_users ADD COLUMN IF NOT EXISTS role VARCHAR(60) NOT NULL DEFAULT 'parent'");
  await pool.query("ALTER TABLE managed_users ADD COLUMN IF NOT EXISTS district VARCHAR(80) NOT NULL DEFAULT 'Kigali'");
  await pool.query("ALTER TABLE managed_users ADD COLUMN IF NOT EXISTS is_active TINYINT(1) NOT NULL DEFAULT 1");
  await pool.query("ALTER TABLE managed_users ADD COLUMN IF NOT EXISTS google_id VARCHAR(120) NULL UNIQUE");

  // Extra columns for community reports
  await pool.query("ALTER TABLE reporter_reports ADD COLUMN IF NOT EXISTS incident_type VARCHAR(120) NULL");
  await pool.query("ALTER TABLE reporter_reports ADD COLUMN IF NOT EXISTS urgency VARCHAR(20) NOT NULL DEFAULT 'normal'");
  await pool.query("ALTER TABLE reporter_reports ADD COLUMN IF NOT EXISTS sector VARCHAR(120) NULL");


  await pool.query(`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id INT AUTO_INCREMENT PRIMARY KEY,
      account_type ENUM('admin', 'user') NOT NULL,
      user_id INT NULL,
      token_hash VARCHAR(64) NOT NULL UNIQUE,
      expires_at DATETIME NOT NULL,
      used_at DATETIME NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_password_reset_lookup (account_type, user_id),
      INDEX idx_password_reset_expiry (expires_at)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS reporter_reports (
      id INT AUTO_INCREMENT PRIMARY KEY,
      case_id VARCHAR(40) NOT NULL UNIQUE,
      user_id INT NULL,
      report_type VARCHAR(20) NOT NULL,
      child_name VARCHAR(120) NOT NULL,
      child_age INT NULL,
      child_gender VARCHAR(20) NULL,
      last_seen_location VARCHAR(255) NOT NULL,
      description TEXT NOT NULL,
      district VARCHAR(80) NOT NULL,
      status VARCHAR(40) NOT NULL DEFAULT 'submitted',
      is_anonymous TINYINT(1) NOT NULL DEFAULT 0,
      public_contact VARCHAR(160) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_reporter_reports_user (user_id)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_notifications (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      report_id INT NULL,
      type VARCHAR(40) NOT NULL DEFAULT 'update',
      message VARCHAR(255) NOT NULL,
      is_read TINYINT(1) NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_user_notifications_user (user_id)
    )
  `);

  await pool.query("ALTER TABLE reporter_reports ADD COLUMN IF NOT EXISTS user_id INT NULL");
  await pool.query("ALTER TABLE reporter_reports MODIFY COLUMN user_id INT NULL");
  await pool.query("ALTER TABLE reporter_reports ADD COLUMN IF NOT EXISTS report_type VARCHAR(20) NOT NULL DEFAULT 'Missing'");
  await pool.query("ALTER TABLE reporter_reports ADD COLUMN IF NOT EXISTS child_name VARCHAR(120) NOT NULL DEFAULT 'Unknown'");
  await pool.query("ALTER TABLE reporter_reports ADD COLUMN IF NOT EXISTS child_age INT NULL");
  await pool.query("ALTER TABLE reporter_reports ADD COLUMN IF NOT EXISTS child_gender VARCHAR(20) NULL");
  await pool.query("ALTER TABLE reporter_reports ADD COLUMN IF NOT EXISTS last_seen_location VARCHAR(255) NOT NULL DEFAULT 'Unknown'");
  await pool.query("ALTER TABLE reporter_reports ADD COLUMN IF NOT EXISTS description TEXT NOT NULL");
  await pool.query("ALTER TABLE reporter_reports ADD COLUMN IF NOT EXISTS district VARCHAR(80) NOT NULL DEFAULT 'Unknown'");
  await pool.query("ALTER TABLE reporter_reports ADD COLUMN IF NOT EXISTS status VARCHAR(40) NOT NULL DEFAULT 'submitted'");
  await pool.query("ALTER TABLE reporter_reports ADD COLUMN IF NOT EXISTS is_anonymous TINYINT(1) NOT NULL DEFAULT 0");
  await pool.query("ALTER TABLE reporter_reports ADD COLUMN IF NOT EXISTS public_contact VARCHAR(160) NULL");

  await pool.query("ALTER TABLE user_notifications ADD COLUMN IF NOT EXISTS user_id INT NOT NULL");
  await pool.query("ALTER TABLE user_notifications ADD COLUMN IF NOT EXISTS report_id INT NULL");
  await pool.query("ALTER TABLE user_notifications ADD COLUMN IF NOT EXISTS type VARCHAR(40) NOT NULL DEFAULT 'update'");
  await pool.query("ALTER TABLE user_notifications ADD COLUMN IF NOT EXISTS message VARCHAR(255) NOT NULL");
  await pool.query("ALTER TABLE user_notifications ADD COLUMN IF NOT EXISTS is_read TINYINT(1) NOT NULL DEFAULT 0");

  // ── New columns on reporter_reports ───────────────────────────
  await pool.query("ALTER TABLE reporter_reports ADD COLUMN IF NOT EXISTS priority ENUM('high','medium','low') NOT NULL DEFAULT 'medium'");
  await pool.query("ALTER TABLE reporter_reports ADD COLUMN IF NOT EXISTS abuse_type VARCHAR(60) NULL");
  await pool.query("ALTER TABLE reporter_reports ADD COLUMN IF NOT EXISTS suspect_info TEXT NULL");
  await pool.query("ALTER TABLE reporter_reports ADD COLUMN IF NOT EXISTS reporter_relationship VARCHAR(80) NULL");
  await pool.query("ALTER TABLE reporter_reports ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8) NULL");
  await pool.query("ALTER TABLE reporter_reports ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8) NULL");

  // ── case_updates (notes + status history) ─────────────────────
  await pool.query(`
    CREATE TABLE IF NOT EXISTS case_updates (
      id INT AUTO_INCREMENT PRIMARY KEY,
      case_id VARCHAR(40) NOT NULL,
      report_id INT NOT NULL,
      user_id INT NOT NULL,
      account_type VARCHAR(20) NOT NULL DEFAULT 'user',
      author_name VARCHAR(120) NOT NULL DEFAULT 'System',
      status VARCHAR(40) NULL,
      comment TEXT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_case_updates_case (case_id),
      INDEX idx_case_updates_report (report_id)
    )
  `);

  // ── case_assignments ───────────────────────────────────────────
  await pool.query(`
    CREATE TABLE IF NOT EXISTS case_assignments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      report_id INT NOT NULL UNIQUE,
      case_id VARCHAR(40) NOT NULL,
      assigned_to_id INT NOT NULL,
      assigned_to_name VARCHAR(120) NOT NULL,
      assigned_to_role VARCHAR(60) NOT NULL,
      assigned_by_id INT NOT NULL,
      assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_case_assignments_report (report_id),
      INDEX idx_case_assignments_user (assigned_to_id)
    )
  `);

  // ── attachments ────────────────────────────────────────────────
  await pool.query(`
    CREATE TABLE IF NOT EXISTS attachments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      report_id INT NOT NULL,
      case_id VARCHAR(40) NOT NULL,
      file_url VARCHAR(500) NOT NULL,
      file_type VARCHAR(40) NOT NULL DEFAULT 'document',
      file_name VARCHAR(255) NOT NULL,
      uploaded_by_id INT NULL,
      uploaded_by_name VARCHAR(120) NOT NULL DEFAULT 'Unknown',
      uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_attachments_report (report_id)
    )
  `);

  await pool.query("ALTER TABLE attachments MODIFY COLUMN uploaded_by_id INT NULL");

  // ── audit_logs ─────────────────────────────────────────────────
  await pool.query(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NULL,
      user_name VARCHAR(120) NOT NULL DEFAULT 'System',
      account_type VARCHAR(20) NOT NULL DEFAULT 'system',
      action VARCHAR(80) NOT NULL,
      table_name VARCHAR(60) NULL,
      record_id VARCHAR(40) NULL,
      details TEXT NULL,
      ip_address VARCHAR(45) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_audit_logs_user (user_id),
      INDEX idx_audit_logs_action (action)
    )
  `);
}

async function start() {
  try {
    await pool.query("SELECT 1");
    await ensureDatabaseSchema();
    app.listen(PORT, () => {
      console.log(`Server listening on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Database connection failed:", error.message);
    process.exit(1);
  }
}

start();

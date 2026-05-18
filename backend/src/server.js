import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import pool from "./db.js";
import authRoutes from "./routes/authRoutes.js";
import adminUsersRoutes from "./routes/adminUsersRoutes.js";
import adminReportsRoutes from "./routes/adminReportsRoutes.js";
import reporterRoutes from "./routes/reporterRoutes.js";

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
  }),
);
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/admin", authRoutes);
app.use("/api/admin/users", adminUsersRoutes);
app.use("/api/admin/reports", adminReportsRoutes);
app.use("/api/reporter", reporterRoutes);

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

  await pool.query(`
    CREATE TABLE IF NOT EXISTS reporter_reports (
      id INT AUTO_INCREMENT PRIMARY KEY,
      case_id VARCHAR(40) NOT NULL UNIQUE,
      user_id INT NOT NULL,
      report_type VARCHAR(20) NOT NULL,
      child_name VARCHAR(120) NOT NULL,
      child_age INT NULL,
      child_gender VARCHAR(20) NULL,
      last_seen_location VARCHAR(255) NOT NULL,
      description TEXT NOT NULL,
      district VARCHAR(80) NOT NULL,
      status VARCHAR(40) NOT NULL DEFAULT 'submitted',
      is_anonymous TINYINT(1) NOT NULL DEFAULT 0,
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

  await pool.query("ALTER TABLE reporter_reports ADD COLUMN IF NOT EXISTS user_id INT NOT NULL");
  await pool.query("ALTER TABLE reporter_reports ADD COLUMN IF NOT EXISTS report_type VARCHAR(20) NOT NULL DEFAULT 'Missing'");
  await pool.query("ALTER TABLE reporter_reports ADD COLUMN IF NOT EXISTS child_name VARCHAR(120) NOT NULL DEFAULT 'Unknown'");
  await pool.query("ALTER TABLE reporter_reports ADD COLUMN IF NOT EXISTS child_age INT NULL");
  await pool.query("ALTER TABLE reporter_reports ADD COLUMN IF NOT EXISTS child_gender VARCHAR(20) NULL");
  await pool.query("ALTER TABLE reporter_reports ADD COLUMN IF NOT EXISTS last_seen_location VARCHAR(255) NOT NULL DEFAULT 'Unknown'");
  await pool.query("ALTER TABLE reporter_reports ADD COLUMN IF NOT EXISTS description TEXT NOT NULL");
  await pool.query("ALTER TABLE reporter_reports ADD COLUMN IF NOT EXISTS district VARCHAR(80) NOT NULL DEFAULT 'Unknown'");
  await pool.query("ALTER TABLE reporter_reports ADD COLUMN IF NOT EXISTS status VARCHAR(40) NOT NULL DEFAULT 'submitted'");
  await pool.query("ALTER TABLE reporter_reports ADD COLUMN IF NOT EXISTS is_anonymous TINYINT(1) NOT NULL DEFAULT 0");

  await pool.query("ALTER TABLE user_notifications ADD COLUMN IF NOT EXISTS user_id INT NOT NULL");
  await pool.query("ALTER TABLE user_notifications ADD COLUMN IF NOT EXISTS report_id INT NULL");
  await pool.query("ALTER TABLE user_notifications ADD COLUMN IF NOT EXISTS type VARCHAR(40) NOT NULL DEFAULT 'update'");
  await pool.query("ALTER TABLE user_notifications ADD COLUMN IF NOT EXISTS message VARCHAR(255) NOT NULL");
  await pool.query("ALTER TABLE user_notifications ADD COLUMN IF NOT EXISTS is_read TINYINT(1) NOT NULL DEFAULT 0");
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

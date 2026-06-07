import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "childwatch",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  ssl: (process.env.DB_HOST || "").includes("tidbcloud") 
       ? { minVersion: "TLSv1.2", rejectUnauthorized: true }
       : undefined,
});

export default pool;

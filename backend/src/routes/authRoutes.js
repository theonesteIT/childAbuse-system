import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import pool from "../db.js";
import { authRequired } from "../middleware/auth.js";

const router = express.Router();

router.post("/signup", async (req, res) => {
  const { fullName, email, password } = req.body;

  if (!fullName || !email || !password) {
    return res.status(400).json({ message: "Full name, email, and password are required" });
  }

  if (password.length < 6) {
    return res.status(400).json({ message: "Password must be at least 6 characters" });
  }

  try {
    const [rows] = await pool.query("SELECT id FROM admins WHERE email = ? LIMIT 1", [email]);

    if (rows.length > 0) {
      return res.status(409).json({ message: "Email already registered" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const [result] = await pool.query(
      "INSERT INTO admins (full_name, email, password_hash) VALUES (?, ?, ?)",
      [fullName, email, passwordHash],
    );

    return res.status(201).json({
      message: "Admin account created successfully",
      adminId: result.insertId,
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to create admin account", error: error.message });
  }
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  try {
    const [rows] = await pool.query(
      "SELECT id, full_name, email, password_hash FROM admins WHERE email = ? LIMIT 1",
      [email],
    );

    if (rows.length === 0) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const admin = rows[0];
    const passwordMatches = await bcrypt.compare(password, admin.password_hash);

    if (!passwordMatches) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = jwt.sign(
      { id: admin.id, email: admin.email, fullName: admin.full_name, accountType: "admin" },
      process.env.JWT_SECRET || "dev_secret",
      { expiresIn: "1d" },
    );

    return res.json({
      message: "Login successful",
      token,
      admin: {
        id: admin.id,
        fullName: admin.full_name,
        email: admin.email,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to login", error: error.message });
  }
});

router.post("/user-login", async (req, res) => {
  const { identifier, email, password } = req.body;
  const loginValue = (identifier || email || "").trim();

  if (!loginValue || !password) {
    return res.status(400).json({ message: "Email/phone and password are required" });
  }

  try {
    const [rows] = await pool.query(
      `SELECT id, full_name, email, phone, role, district, is_active, password_hash
       FROM managed_users
       WHERE email = ? OR phone = ? LIMIT 1`,
      [loginValue, loginValue],
    );

    if (rows.length === 0) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const user = rows[0];
    if (!user.is_active) {
      return res.status(403).json({ message: "Account is deactivated" });
    }

    const passwordMatches = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatches) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        district: user.district,
        accountType: "user",
      },
      process.env.JWT_SECRET || "dev_secret",
      { expiresIn: "1d" },
    );

    return res.json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        fullName: user.full_name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        district: user.district,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to login user", error: error.message });
  }
});

router.post("/user-register", async (req, res) => {
  const { fullName, email, phone, role, password, district } = req.body;

  if (!fullName || !email || !phone || !password) {
    return res.status(400).json({ message: "Full name, email, phone and password are required" });
  }

  if (password.length < 6) {
    return res.status(400).json({ message: "Password must be at least 6 characters" });
  }

  try {
    const [exists] = await pool.query(
      "SELECT id FROM managed_users WHERE email = ? OR phone = ? LIMIT 1",
      [email, phone],
    );

    if (exists.length > 0) {
      return res.status(409).json({ message: "Email or phone already registered" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const userRole = role || "parent";
    const userDistrict = district || "Kigali";

    const [result] = await pool.query(
      `INSERT INTO managed_users (full_name, email, phone, role, district, password_hash, is_active)
       VALUES (?, ?, ?, ?, ?, ?, 1)`,
      [fullName, email, phone, userRole, userDistrict, passwordHash],
    );

    return res.status(201).json({
      message: "Account created successfully",
      userId: result.insertId,
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to register user", error: error.message });
  }
});

router.get("/me", authRequired, async (req, res) => {
  try {
    if (req.auth.accountType === "admin") {
      const [rows] = await pool.query("SELECT id, full_name, email FROM admins WHERE id = ? LIMIT 1", [
        req.auth.id,
      ]);

      if (rows.length === 0) {
        return res.status(404).json({ message: "Admin not found" });
      }

      const admin = rows[0];
      return res.json({
        accountType: "admin",
        admin: {
          id: admin.id,
          fullName: admin.full_name,
          email: admin.email,
        },
      });
    }

    const [rows] = await pool.query(
      `SELECT id, full_name, email, phone, role, district, is_active
       FROM managed_users
       WHERE id = ? LIMIT 1`,
      [req.auth.id],
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const user = rows[0];
    return res.json({
      accountType: "user",
      user: {
        id: user.id,
        fullName: user.full_name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        district: user.district,
        status: user.is_active ? "active" : "inactive",
      },
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch profile", error: error.message });
  }
});

export default router;

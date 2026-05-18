import express from "express";
import bcrypt from "bcryptjs";
import pool from "../db.js";
import { adminRequired, authRequired } from "../middleware/auth.js";

const router = express.Router();

router.use(authRequired);

router.get("/", async (req, res) => {
  try {
    const isUserAccount = req.auth.accountType === "user";
    const [rows] = isUserAccount
      ? await pool.query(
          `SELECT id, full_name, email, phone, role, district, is_active, created_at, updated_at
           FROM managed_users
           WHERE id = ?
           LIMIT 1`,
          [req.auth.id],
        )
      : await pool.query(
          `SELECT id, full_name, email, phone, role, district, is_active, created_at, updated_at
           FROM managed_users
           ORDER BY id DESC`,
        );

    const users = rows.map((row) => ({
      id: row.id,
      fullName: row.full_name,
      email: row.email,
      phone: row.phone,
      role: row.role,
      district: row.district,
      status: row.is_active ? "active" : "inactive",
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    return res.json({ users });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch users", error: error.message });
  }
});

router.get("/:id", async (req, res) => {
  const requestedId = Number(req.params.id);
  if (req.auth.accountType === "user" && requestedId !== Number(req.auth.id)) {
    return res.status(403).json({ message: "Forbidden: you can only access your own profile" });
  }

  try {
    const [rows] = await pool.query(
      `SELECT id, full_name, email, phone, role, district, is_active, created_at, updated_at
       FROM managed_users
       WHERE id = ? LIMIT 1`,
      [req.params.id],
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const row = rows[0];
    return res.json({
      user: {
        id: row.id,
        fullName: row.full_name,
        email: row.email,
        phone: row.phone,
        role: row.role,
        district: row.district,
        status: row.is_active ? "active" : "inactive",
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch user", error: error.message });
  }
});

router.post("/", adminRequired, async (req, res) => {
  const { fullName, email, phone, role, district, password } = req.body;

  if (!fullName || !email || !role || !district || !password) {
    return res.status(400).json({ message: "fullName, email, role, district and password are required" });
  }

  if (password.length < 6) {
    return res.status(400).json({ message: "Password must be at least 6 characters" });
  }

  try {
    const [existing] = await pool.query("SELECT id FROM managed_users WHERE email = ? LIMIT 1", [email]);
    if (existing.length > 0) {
      return res.status(409).json({ message: "Email already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const [result] = await pool.query(
      `INSERT INTO managed_users (full_name, email, phone, role, district, password_hash)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [fullName, email, phone || null, role, district, passwordHash],
    );

    return res.status(201).json({ message: "User created successfully", userId: result.insertId });
  } catch (error) {
    return res.status(500).json({ message: "Failed to create user", error: error.message });
  }
});

router.put("/:id", adminRequired, async (req, res) => {
  const { fullName, email, phone, role, district, password } = req.body;

  if (!fullName || !email || !role || !district) {
    return res.status(400).json({ message: "fullName, email, role and district are required" });
  }

  try {
    const [existing] = await pool.query("SELECT id FROM managed_users WHERE id = ? LIMIT 1", [req.params.id]);
    if (existing.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const [emailOwner] = await pool.query(
      "SELECT id FROM managed_users WHERE email = ? AND id <> ? LIMIT 1",
      [email, req.params.id],
    );
    if (emailOwner.length > 0) {
      return res.status(409).json({ message: "Email already exists" });
    }

    if (password && password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    if (password) {
      const passwordHash = await bcrypt.hash(password, 10);
      await pool.query(
        `UPDATE managed_users
         SET full_name = ?, email = ?, phone = ?, role = ?, district = ?, password_hash = ?
         WHERE id = ?`,
        [fullName, email, phone || null, role, district, passwordHash, req.params.id],
      );
    } else {
      await pool.query(
        `UPDATE managed_users
         SET full_name = ?, email = ?, phone = ?, role = ?, district = ?
         WHERE id = ?`,
        [fullName, email, phone || null, role, district, req.params.id],
      );
    }

    return res.json({ message: "User updated successfully" });
  } catch (error) {
    return res.status(500).json({ message: "Failed to update user", error: error.message });
  }
});

router.patch("/:id/deactivate", adminRequired, async (req, res) => {
  const { active } = req.body;
  const nextActive = active === true ? 1 : 0;

  try {
    const [result] = await pool.query("UPDATE managed_users SET is_active = ? WHERE id = ?", [
      nextActive,
      req.params.id,
    ]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json({ message: nextActive ? "User activated" : "User deactivated" });
  } catch (error) {
    return res.status(500).json({ message: "Failed to update status", error: error.message });
  }
});

router.delete("/:id", adminRequired, async (req, res) => {
  try {
    const [result] = await pool.query("DELETE FROM managed_users WHERE id = ?", [req.params.id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json({ message: "User deleted successfully" });
  } catch (error) {
    return res.status(500).json({ message: "Failed to delete user", error: error.message });
  }
});

export default router;

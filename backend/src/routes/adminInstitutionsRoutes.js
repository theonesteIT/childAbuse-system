import express from "express";
import pool from "../db.js";
import { authRequired, adminRequired } from "../middleware/auth.js";

const router = express.Router();
router.use(authRequired, adminRequired);

// Ensure table exists helper
async function ensureTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS institutions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      type VARCHAR(50) NOT NULL,
      district VARCHAR(100) NOT NULL,
      address VARCHAR(255) NULL,
      phone VARCHAR(60) NULL,
      email VARCHAR(120) NULL,
      contact_person VARCHAR(120) NULL,
      status VARCHAR(20) DEFAULT 'active',
      users_count INT DEFAULT 0,
      cases_count INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);
  // Add columns if missing
  await pool.query("ALTER TABLE institutions ADD COLUMN IF NOT EXISTS address VARCHAR(255) NULL");
  await pool.query("ALTER TABLE institutions ADD COLUMN IF NOT EXISTS phone VARCHAR(60) NULL");
  await pool.query("ALTER TABLE institutions ADD COLUMN IF NOT EXISTS email VARCHAR(120) NULL");
  await pool.query("ALTER TABLE institutions ADD COLUMN IF NOT EXISTS contact_person VARCHAR(120) NULL");
  await pool.query("ALTER TABLE institutions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP");
}

// GET /api/admin/institutions
router.get("/", async (req, res) => {
  try {
    await ensureTable();
    const [rows] = await pool.query("SELECT * FROM institutions ORDER BY created_at DESC");

    if (rows.length === 0) {
      // Seed some initial data if empty
      const initialData = [
        ["Gasabo Central Police", "Police", "Gasabo", "active", 14, 142],
        ["Kigali City Hospital", "Hospital", "Nyarugenge", "active", 32, 89],
        ["Hope Child Center", "Social Worker", "Kicukiro", "active", 8, 45],
        ["Rubavu Child Protection", "Social Worker", "Rubavu", "maintenance", 4, 12],
      ];
      for (const inst of initialData) {
        await pool.query(
          "INSERT INTO institutions (name, type, district, status, users_count, cases_count) VALUES (?, ?, ?, ?, ?, ?)",
          inst
        );
      }
      const [newRows] = await pool.query("SELECT * FROM institutions ORDER BY created_at DESC");
      return res.json({ institutions: newRows });
    }

    return res.json({ institutions: rows });
  } catch (err) {
    return res.status(500).json({ message: "Failed to fetch institutions", error: err.message });
  }
});

// GET /api/admin/institutions/:id
router.get("/:id", async (req, res) => {
  try {
    await ensureTable();
    const [rows] = await pool.query("SELECT * FROM institutions WHERE id = ? LIMIT 1", [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ message: "Institution not found" });
    return res.json({ institution: rows[0] });
  } catch (err) {
    return res.status(500).json({ message: "Failed to fetch institution", error: err.message });
  }
});

// POST /api/admin/institutions — create
router.post("/", async (req, res) => {
  const { name, type, district, address, phone, email, contactPerson, status } = req.body;
  if (!name || !type || !district) {
    return res.status(400).json({ message: "name, type, and district are required" });
  }
  try {
    await ensureTable();
    const [result] = await pool.query(
      `INSERT INTO institutions (name, type, district, address, phone, email, contact_person, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [name.trim(), type.trim(), district.trim(), address || null, phone || null, email || null, contactPerson || null, status || "active"]
    );
    // Audit log
    await pool.query(
      `INSERT INTO audit_logs (user_id, user_name, account_type, action, table_name, record_id, details)
       VALUES (?, ?, 'admin', 'create', 'institutions', ?, ?)`,
      [req.auth.id, req.auth.email || "Admin", String(result.insertId), `Created institution: ${name}`]
    ).catch(() => {});

    const [newRows] = await pool.query("SELECT * FROM institutions WHERE id = ?", [result.insertId]);
    return res.status(201).json({ institution: newRows[0], message: "Institution created" });
  } catch (err) {
    return res.status(500).json({ message: "Failed to create institution", error: err.message });
  }
});

// PUT /api/admin/institutions/:id — update
router.put("/:id", async (req, res) => {
  const { name, type, district, address, phone, email, contactPerson, status } = req.body;
  if (!name || !type || !district) {
    return res.status(400).json({ message: "name, type, and district are required" });
  }
  try {
    await ensureTable();
    const [existing] = await pool.query("SELECT id FROM institutions WHERE id = ? LIMIT 1", [req.params.id]);
    if (existing.length === 0) return res.status(404).json({ message: "Institution not found" });

    await pool.query(
      `UPDATE institutions SET name = ?, type = ?, district = ?, address = ?, phone = ?, email = ?,
       contact_person = ?, status = ? WHERE id = ?`,
      [name.trim(), type.trim(), district.trim(), address || null, phone || null, email || null, contactPerson || null, status || "active", req.params.id]
    );

    // Audit log
    await pool.query(
      `INSERT INTO audit_logs (user_id, user_name, account_type, action, table_name, record_id, details)
       VALUES (?, ?, 'admin', 'update', 'institutions', ?, ?)`,
      [req.auth.id, req.auth.email || "Admin", req.params.id, `Updated institution: ${name}`]
    ).catch(() => {});

    const [updated] = await pool.query("SELECT * FROM institutions WHERE id = ?", [req.params.id]);
    return res.json({ institution: updated[0], message: "Institution updated" });
  } catch (err) {
    return res.status(500).json({ message: "Failed to update institution", error: err.message });
  }
});

// DELETE /api/admin/institutions/:id — soft delete (set status to inactive)
router.delete("/:id", async (req, res) => {
  try {
    await ensureTable();
    const [existing] = await pool.query("SELECT id, name FROM institutions WHERE id = ? LIMIT 1", [req.params.id]);
    if (existing.length === 0) return res.status(404).json({ message: "Institution not found" });

    await pool.query("UPDATE institutions SET status = 'inactive' WHERE id = ?", [req.params.id]);

    // Audit log
    await pool.query(
      `INSERT INTO audit_logs (user_id, user_name, account_type, action, table_name, record_id, details)
       VALUES (?, ?, 'admin', 'delete', 'institutions', ?, ?)`,
      [req.auth.id, req.auth.email || "Admin", req.params.id, `Deactivated institution: ${existing[0].name}`]
    ).catch(() => {});

    return res.json({ message: "Institution deactivated" });
  } catch (err) {
    return res.status(500).json({ message: "Failed to delete institution", error: err.message });
  }
});

export default router;

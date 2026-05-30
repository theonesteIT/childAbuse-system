import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import pool from "../db.js";
import { authRequired } from "../middleware/auth.js";

const router = express.Router();
const DEFAULT_PASSWORD_RESET_MINUTES = 30;

function getResetTtlMinutes() {
  const raw = Number(process.env.PASSWORD_RESET_TOKEN_TTL_MINUTES || DEFAULT_PASSWORD_RESET_MINUTES);
  if (!Number.isFinite(raw) || raw <= 0) return DEFAULT_PASSWORD_RESET_MINUTES;
  return Math.floor(raw);
}

function hashResetToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function createResetTokenPair() {
  const token = crypto.randomBytes(32).toString("hex");
  return { token, tokenHash: hashResetToken(token) };
}

function normalizeIdentifier(value) {
  return String(value || "").trim();
}

function normalizeEmail(value) {
  return normalizeIdentifier(value).toLowerCase();
}

function isLikelyEmail(value) {
  return /\S+@\S+\.\S+/.test(String(value || ""));
}

async function findAccountForPasswordReset(identifier) {
  const raw = normalizeIdentifier(identifier);
  if (!raw) return null;

  if (isLikelyEmail(raw)) {
    const email = normalizeEmail(raw);
    const [admins] = await pool.query(
      "SELECT id, email FROM admins WHERE LOWER(email) = ? LIMIT 1",
      [email],
    );
    if (admins.length > 0) {
      return { accountType: "admin", id: admins[0].id, contact: admins[0].email };
    }
  }

  const [users] = await pool.query(
    `SELECT id, email, phone
     FROM managed_users
     WHERE LOWER(email) = ? OR phone = ?
     LIMIT 1`,
    [normalizeEmail(raw), raw],
  );
  if (users.length > 0) {
    return {
      accountType: "user",
      id: users[0].id,
      contact: users[0].email || users[0].phone,
    };
  }

  return null;
}

async function savePasswordResetToken(account) {
  const { token, tokenHash } = createResetTokenPair();
  const ttlMinutes = getResetTtlMinutes();
  const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

  await pool.query(
    "UPDATE password_reset_tokens SET used_at = NOW() WHERE account_type = ? AND user_id = ? AND used_at IS NULL",
    [account.accountType, account.id],
  );

  await pool.query(
    `INSERT INTO password_reset_tokens (account_type, user_id, token_hash, expires_at)
     VALUES (?, ?, ?, ?)`,
    [account.accountType, account.id, tokenHash, expiresAt],
  );

  return { token, expiresAt };
}

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

router.post("/forgot-password", async (req, res) => {
  const identifier = normalizeIdentifier(req.body?.identifier);
  if (!identifier) {
    return res.status(400).json({ message: "Email or phone is required" });
  }

  try {
    const account = await findAccountForPasswordReset(identifier);

    // Always return generic success to avoid account enumeration.
    const genericResponse = {
      message: "If an account exists for this identifier, password reset instructions have been generated.",
    };

    if (!account) {
      return res.json(genericResponse);
    }

    const reset = await savePasswordResetToken(account);
    const includeDebugToken = process.env.NODE_ENV !== "production";
    const debugPayload = includeDebugToken
      ? {
          resetToken: reset.token,
          expiresAt: reset.expiresAt.toISOString(),
        }
      : {};

    return res.json({ ...genericResponse, ...debugPayload });
  } catch (error) {
    return res.status(500).json({ message: "Failed to process password reset request", error: error.message });
  }
});

router.post("/reset-password", async (req, res) => {
  const token = normalizeIdentifier(req.body?.token);
  const newPassword = String(req.body?.newPassword || "");

  if (!token || !newPassword) {
    return res.status(400).json({ message: "token and newPassword are required" });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ message: "Password must be at least 6 characters" });
  }

  try {
    const tokenHash = hashResetToken(token);
    const [tokenRows] = await pool.query(
      `SELECT id, account_type, user_id
       FROM password_reset_tokens
       WHERE token_hash = ?
         AND used_at IS NULL
         AND expires_at > NOW()
       LIMIT 1`,
      [tokenHash],
    );

    if (tokenRows.length === 0) {
      return res.status(400).json({ message: "Reset token is invalid or expired" });
    }

    const resetRow = tokenRows[0];
    const passwordHash = await bcrypt.hash(newPassword, 10);

    if (resetRow.account_type === "admin") {
      const [result] = await pool.query("UPDATE admins SET password_hash = ? WHERE id = ?", [
        passwordHash,
        resetRow.user_id,
      ]);
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "Account not found" });
      }
    } else {
      const [result] = await pool.query("UPDATE managed_users SET password_hash = ? WHERE id = ?", [
        passwordHash,
        resetRow.user_id,
      ]);
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "Account not found" });
      }
    }

    await pool.query("UPDATE password_reset_tokens SET used_at = NOW() WHERE id = ?", [resetRow.id]);
    await pool.query(
      "UPDATE password_reset_tokens SET used_at = NOW() WHERE account_type = ? AND user_id = ? AND used_at IS NULL",
      [resetRow.account_type, resetRow.user_id],
    );

    return res.json({ message: "Password has been reset successfully" });
  } catch (error) {
    return res.status(500).json({ message: "Failed to reset password", error: error.message });
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

// passport.js — Google OAuth 2.0 strategy configuration
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import jwt from "jsonwebtoken";
import pool from "../db.js";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_CALLBACK_URL =
  process.env.GOOGLE_CALLBACK_URL ||
  "http://localhost:5000/api/auth/google/callback";

// Only register the strategy if credentials are configured
if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: GOOGLE_CLIENT_ID,
        clientSecret: GOOGLE_CLIENT_SECRET,
        callbackURL: GOOGLE_CALLBACK_URL,
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value || "";
          const fullName =
            profile.displayName ||
            `${profile.name?.givenName || ""} ${profile.name?.familyName || ""}`.trim();
          const googleId = profile.id;

          // Check if user already exists by google_id or email
          const [existing] = await pool.query(
            `SELECT id, full_name, email, phone, role, district, is_active
             FROM managed_users
             WHERE google_id = ? OR (email = ? AND email != '')
             LIMIT 1`,
            [googleId, email]
          );

          let user;

          if (existing.length > 0) {
            user = existing[0];
            // Update google_id if missing
            if (!user.google_id) {
              await pool.query(
                "UPDATE managed_users SET google_id = ? WHERE id = ?",
                [googleId, user.id]
              );
            }
            if (!user.is_active) {
              return done(null, false, { message: "Account is deactivated" });
            }
          } else {
            // Create new user with default role = 'Parent/Reporter'
            const [result] = await pool.query(
              `INSERT INTO managed_users
                 (full_name, email, phone, role, district, google_id, is_active, password_hash)
               VALUES (?, ?, '', 'Parent/Reporter', 'Kigali', ?, 1, '')`,
              [fullName, email, googleId]
            );
            const [newRows] = await pool.query(
              "SELECT id, full_name, email, phone, role, district FROM managed_users WHERE id = ?",
              [result.insertId]
            );
            user = newRows[0];
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
            { expiresIn: "1d" }
          );

          return done(null, { user, token });
        } catch (err) {
          return done(err);
        }
      }
    )
  );
}

// Minimal serialization (we use JWT, not sessions for user data)
passport.serializeUser((data, done) => done(null, data));
passport.deserializeUser((data, done) => done(null, data));

export default passport;

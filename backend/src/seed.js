/**
 * seed.js — Childwatch database seeder
 * Run with: node src/seed.js
 *
 * Creates:
 *   1 admin account
 *   4 managed users (1 Police, 1 Social Worker, 1 Hospital, 1 Reporter)
 *   6 sample reporter_reports
 */

import bcrypt from "bcryptjs";
import pool from "./db.js";
import dotenv from "dotenv";

dotenv.config();

const ADMIN = {
  full_name: "System Admin",
  email: "admin@childwatch.rw",
  password: "Admin@1234",
};

const MANAGED_USERS = [
  { full_name: "Inspector Jean Habimana", email: "police@childwatch.rw", password: "Police@1234", role: "Police",         district: "Gasabo",     phone: "+250781000001" },
  { full_name: "Aline Mukamana",          email: "social@childwatch.rw",  password: "Social@1234", role: "Social Worker", district: "Kicukiro",   phone: "+250782000002" },
  { full_name: "Dr. Eric Nkurunziza",     email: "health@childwatch.rw",  password: "Health@1234", role: "Hospital",      district: "Nyarugenge", phone: "+250783000003" },
  { full_name: "Marie Claire Uwase",      email: "user@childwatch.rw",    password: "User@1234",   role: "Parent/Reporter",district:"Gasabo",     phone: "+250784000004" },
];

const CASES = [
  { case_id: "CW-2026-001", report_type: "Missing",  child_name: "Mutoni Aline",    child_age: 8,  child_gender: "Female", last_seen_location: "Gasabo Market",    description: "Child went missing after school on Friday.", district: "Gasabo",     priority: "high",   status: "under-investigation" },
  { case_id: "CW-2026-002", report_type: "Abuse",    child_name: "Keza Brian",      child_age: 11, child_gender: "Male",   last_seen_location: "Kicukiro Sector",  description: "Signs of physical abuse reported by teacher.", district: "Kicukiro",  priority: "high",   status: "verified" },
  { case_id: "CW-2026-003", report_type: "Missing",  child_name: "Irakoze Ivan",    child_age: 7,  child_gender: "Male",   last_seen_location: "Musanze Town",     description: "Child missing since Monday morning.", district: "Musanze",    priority: "medium", status: "resolved" },
  { case_id: "CW-2026-004", report_type: "Abuse",    child_name: "Uwase Clarisse",  child_age: 9,  child_gender: "Female", last_seen_location: "Nyarugenge Home",  description: "Suspected domestic abuse, referred by neighbour.", district: "Nyarugenge", priority: "high", status: "under-investigation" },
  { case_id: "CW-2026-005", report_type: "Neglect",  child_name: "Nshimiye Marc",   child_age: 5,  child_gender: "Male",   last_seen_location: "Rubavu Camp",      description: "Child found malnourished with no guardian present.", district: "Rubavu",   priority: "medium", status: "submitted" },
  { case_id: "CW-2026-006", report_type: "Abuse",    child_name: "Ingabire Diana",  child_age: 13, child_gender: "Female", last_seen_location: "Bugesera School",  description: "Student disclosed repeated abuse by family member.", district: "Bugesera", priority: "low",   status: "resolved" },
];

async function seed() {
  console.log("🌱  Starting Childwatch database seed…\n");

  try {
    // ── 1. Admin ─────────────────────────────────────────────────────
    const [existingAdmin] = await pool.query("SELECT id FROM admins WHERE email = ? LIMIT 1", [ADMIN.email]);
    if (existingAdmin.length > 0) {
      console.log(`⚠️  Admin already exists: ${ADMIN.email}`);
    } else {
      const hash = await bcrypt.hash(ADMIN.password, 10);
      await pool.query("INSERT INTO admins (full_name, email, password_hash) VALUES (?, ?, ?)", [
        ADMIN.full_name, ADMIN.email, hash,
      ]);
      console.log(`✅  Admin created:        ${ADMIN.email}  /  ${ADMIN.password}`);
    }

    // ── 2. Managed Users ─────────────────────────────────────────────
    let reporterUserId = null;
    for (const u of MANAGED_USERS) {
      const [exists] = await pool.query("SELECT id FROM managed_users WHERE email = ? LIMIT 1", [u.email]);
      if (exists.length > 0) {
        console.log(`⚠️  User already exists:  ${u.email}`);
        if (u.role === "Parent/Reporter") reporterUserId = exists[0].id;
      } else {
        const hash = await bcrypt.hash(u.password, 10);
        const [result] = await pool.query(
          "INSERT INTO managed_users (full_name, email, phone, role, district, password_hash) VALUES (?, ?, ?, ?, ?, ?)",
          [u.full_name, u.email, u.phone, u.role, u.district, hash]
        );
        console.log(`✅  User created:         ${u.email}  /  ${u.password}  (${u.role})`);
        if (u.role === "Parent/Reporter") reporterUserId = result.insertId;
      }
    }

    // ── 3. Reporter reports / cases ───────────────────────────────────
    const userId = reporterUserId || 1;
    for (const c of CASES) {
      const [exists] = await pool.query("SELECT id FROM reporter_reports WHERE case_id = ? LIMIT 1", [c.case_id]);
      if (exists.length > 0) {
        console.log(`⚠️  Case already exists:  ${c.case_id}`);
      } else {
        await pool.query(
          `INSERT INTO reporter_reports
             (case_id, user_id, report_type, child_name, child_age, child_gender,
              last_seen_location, description, district, priority, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [c.case_id, userId, c.report_type, c.child_name, c.child_age, c.child_gender,
           c.last_seen_location, c.description, c.district, c.priority, c.status]
        );
        console.log(`✅  Case created:         ${c.case_id}  ${c.child_name}  (${c.status})`);
      }
    }

    console.log("\n🎉  Seed complete!\n");
    console.log("─────────────────────────────────────────────────────────");
    console.log("  LOGIN CREDENTIALS");
    console.log("─────────────────────────────────────────────────────────");
    console.log(`  Admin (AdminDashboard):`);
    console.log(`    Email:    ${ADMIN.email}`);
    console.log(`    Password: ${ADMIN.password}`);
    console.log("");
    for (const u of MANAGED_USERS) {
      console.log(`  ${u.role.padEnd(16)} Dashboard:`);
      console.log(`    Email:    ${u.email}`);
      console.log(`    Password: ${u.password}`);
      console.log("");
    }
    console.log("─────────────────────────────────────────────────────────");

  } catch (err) {
    console.error("❌  Seed failed:", err.message);
    console.error(err.stack);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

seed();

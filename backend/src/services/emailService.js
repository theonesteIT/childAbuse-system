/**
 * emailService.js — Childwatch Email Service
 * Uses Ethereal Email (fake SMTP) for local/dev testing.
 * No real credentials needed — a test account is auto-created on first use.
 * After each send, a preview URL is logged to the console.
 */

import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

let _transporter = null;

async function getTransporter() {
  if (_transporter) return _transporter;

  // If real SMTP is configured in .env, use it
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    _transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === "true",
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
    return _transporter;
  }

  // Otherwise auto-create a free Ethereal test account
  const testAccount = await nodemailer.createTestAccount();
  _transporter = nodemailer.createTransport({
    host: "smtp.ethereal.email",
    port: 587,
    secure: false,
    auth: { user: testAccount.user, pass: testAccount.pass },
  });
  console.log("📧  Ethereal test account created:", testAccount.user);
  return _transporter;
}

/**
 * Send an email.
 * @param {string} to       - Recipient email address
 * @param {string} subject  - Email subject line
 * @param {string} html     - HTML body content
 */
export async function sendEmail(to, subject, html) {
  try {
    const transporter = await getTransporter();
    const info = await transporter.sendMail({
      from: `"Childwatch System" <noreply@childwatch.rw>`,
      to,
      subject,
      html,
    });
    // Log preview URL for Ethereal emails
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log(`📧  Email sent to ${to} — Preview: ${previewUrl}`);
    }
    return info;
  } catch (err) {
    console.error("📧  Email send error:", err.message);
  }
}

/**
 * Pre-built template: case status update notification.
 */
export async function sendStatusUpdateEmail(to, { recipientName, caseId, newStatus, caseType }) {
  const statusLabel = String(newStatus).replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden">
      <div style="background:#1e3a8a;padding:24px 32px">
        <h1 style="color:white;margin:0;font-size:20px">🛡️ Childwatch Update</h1>
      </div>
      <div style="padding:32px">
        <p style="color:#475569;margin-top:0">Hello <strong>${recipientName}</strong>,</p>
        <p style="color:#475569">Your ${caseType || "case"} report has been updated by our team.</p>
        <div style="background:#f8fafc;border-left:4px solid #2563eb;padding:16px 20px;border-radius:6px;margin:20px 0">
          <p style="margin:0;color:#64748b;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:.05em">Case ID</p>
          <p style="margin:4px 0 12px;font-size:22px;font-weight:800;color:#1e3a8a;font-family:monospace">${caseId}</p>
          <p style="margin:0;color:#64748b;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:.05em">New Status</p>
          <p style="margin:4px 0 0;font-size:16px;font-weight:700;color:#059669">${statusLabel}</p>
        </div>
        <p style="color:#475569">Log in to your Childwatch dashboard to view full case details and updates.</p>
        <a href="http://localhost:5173/login" style="display:inline-block;background:#2563eb;color:white;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:700;margin-top:8px">
          View My Cases →
        </a>
      </div>
      <div style="background:#f1f5f9;padding:16px 32px;font-size:12px;color:#94a3b8;text-align:center">
        Childwatch · Child Protection Platform · Rwanda<br/>
        You are receiving this because you submitted a case report. <a href="#" style="color:#64748b">Unsubscribe</a>
      </div>
    </div>
  `;
  return sendEmail(to, `Case ${caseId} — Status Updated: ${statusLabel}`, html);
}

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');
const { authenticate, logAudit } = require('../middleware/auth');

const router = express.Router();

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
// Validates email + password, returns a signed JWT token.
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const [rows] = await db.execute(`
    SELECT id, name, email, password_hash, role, is_active, must_change_password, mobile
    FROM users WHERE email = ?
  `, [email.toLowerCase().trim()]);
  const user = rows[0];

  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  if (!user.is_active) {
    return res.status(403).json({ error: 'Your account has been deactivated. Contact admin.' });
  }

  const isMatch = bcrypt.compareSync(password, user.password_hash);
  if (!isMatch) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  // Sign JWT — expires in 8 hours
  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '8h' }
  );

  // Audit log
  logAudit(user.id, user.name, user.email, 'LOGIN', 'user', user.id, `${user.name} logged in`, null, null, req.ip);

  res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      mobile: user.mobile,
      must_change_password: user.must_change_password
    }
  });
});

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────
// Returns the currently authenticated user's profile.
router.get('/me', authenticate, async (req, res) => {
  const [rows] = await db.execute(`
    SELECT id, name, email, role, mobile, is_active, must_change_password, created_at
    FROM users WHERE id = ?
  `, [req.user.id]);
  const user = rows[0];

  res.json(user);
});

// ─── POST /api/auth/change-password ──────────────────────────────────────────
// Logged-in user changes their own password.
router.post('/change-password', authenticate, async (req, res) => {
  const { current_password, new_password } = req.body;

  if (!current_password || !new_password) {
    return res.status(400).json({ error: 'Both current and new passwords are required.' });
  }

  if (new_password.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters.' });
  }

  const [rows] = await db.execute('SELECT password_hash FROM users WHERE id = ?', [req.user.id]);
  const user = rows[0];
  const isMatch = bcrypt.compareSync(current_password, user.password_hash);

  if (!isMatch) {
    return res.status(400).json({ error: 'Current password is incorrect.' });
  }

  const newHash = bcrypt.hashSync(new_password, 10);
  await db.execute(`
    UPDATE users SET password_hash = ?, must_change_password = 0, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `, [newHash, req.user.id]);

  logAudit(req.user.id, req.user.name, req.user.email, 'UPDATE', 'user', req.user.id, 'Password changed', null, null, req.ip);

  res.json({ message: 'Password changed successfully.' });
});

// ─── POST /api/auth/forgot-password ──────────────────────────────────────────
// Generates a reset token. Since no email server exists, admin sees the token.
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required.' });
  }

  const [rows] = await db.execute('SELECT id, name FROM users WHERE email = ? AND is_active = 1', [email.toLowerCase().trim()]);
  const user = rows[0];

  // Always return success to prevent email enumeration
  if (!user) {
    return res.json({ message: 'If this email is registered, a reset request has been created. Contact your admin for the token.' });
  }

  // Invalidate any existing tokens for this user
  await db.execute("UPDATE password_resets SET used = 1 WHERE user_id = ? AND used = 0", [user.id]);

  // Generate a short readable token (6 chars uppercase)
  const token = uuidv4().replace(/-/g, '').substring(0, 8).toUpperCase();

  // Token expires in 1 hour
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  await db.execute(`
    INSERT INTO password_resets (user_id, token, expires_at, used)
    VALUES (?, ?, ?, 0)
  `, [user.id, token, expiresAt]);

  res.json({ message: 'Reset request created. Contact your admin to get the token.' });
});

// ─── POST /api/auth/reset-password ───────────────────────────────────────────
// Employee provides their token + new password to reset.
router.post('/reset-password', async (req, res) => {
  const { email, token, new_password } = req.body;

  if (!email || !token || !new_password) {
    return res.status(400).json({ error: 'Email, token, and new password are required.' });
  }

  if (new_password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  }

  const [userRows] = await db.execute('SELECT id FROM users WHERE email = ? AND is_active = 1', [email.toLowerCase().trim()]);
  const user = userRows[0];
  if (!user) {
    return res.status(400).json({ error: 'Invalid email or token.' });
  }

  const [resetRows] = await db.execute(`
    SELECT id FROM password_resets
    WHERE user_id = ? AND token = ? AND used = 0 AND expires_at > NOW()
  `, [user.id, token.toUpperCase()]);
  const reset = resetRows[0];

  if (!reset) {
    return res.status(400).json({ error: 'Invalid or expired token. Please request a new one.' });
  }

  const newHash = bcrypt.hashSync(new_password, 10);
  await db.execute(`
    UPDATE users SET password_hash = ?, must_change_password = 0, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `, [newHash, user.id]);

  await db.execute('UPDATE password_resets SET used = 1 WHERE id = ?', [reset.id]);

  logAudit(user.id, null, email, 'UPDATE', 'user', user.id, 'Password reset via token', null, null, req.ip);

  res.json({ message: 'Password reset successfully. You can now log in.' });
});

// ─── GET /api/auth/reset-requests ────────────────────────────────────────────
// Admin only: view all pending reset tokens to share with employees.
router.get('/reset-requests', authenticate, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin only.' });
  }

  const [requests] = await db.execute(`
    SELECT pr.id, pr.token, pr.expires_at, pr.created_at,
           u.name as user_name, u.email as user_email
    FROM password_resets pr
    JOIN users u ON pr.user_id = u.id
    WHERE pr.used = 0 AND pr.expires_at > NOW()
    ORDER BY pr.created_at DESC
  `);

  res.json(requests);
});

module.exports = router;

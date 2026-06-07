const jwt = require('jsonwebtoken');
const db = require('../db/database');

// ─── Verify JWT token ──────────────────────────────────────────────────────────
// Attached as middleware on all protected routes.
// Decodes the token and attaches user info to req.user.
const authenticate = (req, res, next) => {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Re-fetch user from DB to ensure they are still active
    const user = db.prepare('SELECT id, name, email, role, is_active, must_change_password FROM users WHERE id = ?').get(decoded.id);

    if (!user || !user.is_active) {
      return res.status(401).json({ error: 'Account is inactive or not found.' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
};

// ─── Admin-only guard ──────────────────────────────────────────────────────────
const adminOnly = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied. Admins only.' });
  }
  next();
};

// ─── Helper: log every action to audit_log ────────────────────────────────────
const logAudit = (userId, userName, userEmail, action, entityType, entityId, description, oldValues, newValues, ip) => {
  try {
    db.prepare(`
      INSERT INTO audit_log (user_id, user_name, user_email, action, entity_type, entity_id, description, old_values, new_values, ip_address)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      userId,
      userName,
      userEmail,
      action,
      entityType,
      entityId || null,
      description || null,
      oldValues ? JSON.stringify(oldValues) : null,
      newValues ? JSON.stringify(newValues) : null,
      ip || null
    );
  } catch (e) {
    console.error('Audit log error:', e.message);
  }
};

// ─── Helper: create notification for a user ───────────────────────────────────
const createNotification = (userId, title, message, type = 'info', link = null) => {
  try {
    db.prepare(`
      INSERT INTO notifications (user_id, title, message, type, link)
      VALUES (?, ?, ?, ?, ?)
    `).run(userId, title, message, type, link);
  } catch (e) {
    console.error('Notification creation error:', e.message);
  }
};

module.exports = { authenticate, adminOnly, logAudit, createNotification };

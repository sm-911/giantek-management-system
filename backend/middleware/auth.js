const jwt = require('jsonwebtoken');
const db = require('../db/database');

// ─── Verify JWT token ──────────────────────────────────────────────────────────
// Attached as middleware on all protected routes.
// Decodes the token and attaches user info to req.user.
const authenticate = async (req, res, next) => {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Re-fetch user from DB to ensure they are still active
    const [rows] = await db.execute(
      'SELECT id, name, email, role, is_active, must_change_password FROM users WHERE id = ?',
      [decoded.id]
    );
    const user = rows[0];

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
const logAudit = async (userId, userName, userEmail, action, entityType, entityId, description, oldValues, newValues, ip) => {
  try {
    await db.execute(`
      INSERT INTO audit_log (user_id, user_name, user_email, action, entity_type, entity_id, description, old_values, new_values, ip_address)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
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
    ]);
  } catch (e) {
    console.error('Audit log error:', e.message);
  }
};

// ─── Helper: create notification for a user ───────────────────────────────────
const createNotification = async (userId, title, message, type = 'info', link = null) => {
  try {
    await db.execute(`
      INSERT INTO notifications (user_id, title, message, type, link)
      VALUES (?, ?, ?, ?, ?)
    `, [userId, title, message, type, link]);
  } catch (e) {
    console.error('Notification creation error:', e.message);
  }
};

module.exports = { authenticate, adminOnly, logAudit, createNotification };

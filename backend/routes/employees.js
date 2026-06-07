const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db/database');
const { authenticate, adminOnly, logAudit, createNotification } = require('../middleware/auth');

const router = express.Router();

// All employee routes require login AND admin role
router.use(authenticate, adminOnly);

// ─── GET /api/employees ───────────────────────────────────────────────────────
// Default: only non-deleted employees.
// Pass ?include_removed=true to also get removed employees.
router.get('/', (req, res) => {
  try {
    const includeRemoved = req.query.include_removed === 'true';
    const employees = db.prepare(`
      SELECT id, name, email, mobile, role, is_active, is_deleted, created_at, updated_at
      FROM users
      WHERE role = 'employee' ${includeRemoved ? '' : 'AND is_deleted = 0'}
      ORDER BY is_deleted ASC, name ASC
    `).all();
    res.json(employees);
  } catch (err) {
    console.error('GET /employees error:', err);
    res.status(500).json({ error: 'Failed to fetch employees.' });
  }
});

// ─── GET /api/employees/:id ───────────────────────────────────────────────────
router.get('/:id', (req, res) => {
  try {
    const emp = db.prepare(`
      SELECT id, name, email, mobile, role, is_active, is_deleted, created_at, updated_at
      FROM users WHERE id = ? AND role = 'employee'
    `).get(parseInt(req.params.id));

    if (!emp) return res.status(404).json({ error: 'Employee not found.' });
    res.json(emp);
  } catch (err) {
    console.error('GET /employees/:id error:', err);
    res.status(500).json({ error: 'Failed to fetch employee.' });
  }
});

// ─── GET /api/employees/:id/history ──────────────────────────────────────────
// Full work + revenue history for a specific employee — useful for reviewing
// a removed employee's contributions.
router.get('/:id/history', (req, res) => {
  try {
    const empId = parseInt(req.params.id);
    const emp = db.prepare('SELECT id, name, email, role, is_deleted FROM users WHERE id = ?').get(empId);
    if (!emp) return res.status(404).json({ error: 'Employee not found.' });

    const workEntries = db.prepare(`
      SELECT we.id, c.name AS client_name, we.work_type, we.misc_description,
             we.status, we.time_taken, we.priority, we.work_date
      FROM work_entries we
      JOIN work_entry_employees wee ON wee.work_entry_id = we.id
      JOIN clients c ON c.id = we.client_id
      WHERE wee.employee_id = ?
      ORDER BY we.work_date DESC
    `).all(empId);

    const revenue = db.prepare(`
      SELECT r.id, c.name AS client_name, r.work_type, r.value, r.notes, r.created_at
      FROM revenue r
      JOIN clients c ON c.id = r.client_id
      WHERE r.employee_id = ?
      ORDER BY r.created_at DESC
    `).all(empId);

    const stats = db.prepare(`
      SELECT
        COUNT(DISTINCT wee.work_entry_id) AS total_tasks,
        SUM(CASE WHEN we.status = 'completed' THEN 1 ELSE 0 END) AS completed_tasks,
        SUM(we.time_taken) AS total_hours
      FROM work_entries we
      JOIN work_entry_employees wee ON wee.work_entry_id = we.id
      WHERE wee.employee_id = ?
    `).get(empId);

    const totalRevenue = db.prepare(
      'SELECT COALESCE(SUM(value), 0) AS total FROM revenue WHERE employee_id = ?'
    ).get(empId);

    res.json({
      employee: emp,
      stats: { ...stats, total_revenue: totalRevenue.total },
      work_entries: workEntries,
      revenue
    });
  } catch (err) {
    console.error('GET /employees/:id/history error:', err);
    res.status(500).json({ error: 'Failed to fetch employee history.' });
  }
});

// ─── POST /api/employees ──────────────────────────────────────────────────────
router.post('/', (req, res) => {
  try {
    const { name, email, mobile, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase().trim());
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const passwordHash = bcrypt.hashSync(password, 10);
    const safeMobile = mobile ? String(mobile).trim() : '';

    const result = db.prepare(`
      INSERT INTO users (name, email, password_hash, mobile, role, is_active, is_deleted, must_change_password)
      VALUES (?, ?, ?, ?, 'employee', 1, 0, 1)
    `).run(name.trim(), email.toLowerCase().trim(), passwordHash, safeMobile);

    const newEmployee = db.prepare(
      'SELECT id, name, email, mobile, role, is_active, is_deleted, created_at FROM users WHERE id = ?'
    ).get(result.lastInsertRowid);

    logAudit(req.user.id, req.user.name, req.user.email, 'CREATE', 'user', newEmployee.id,
      `Created employee: ${name}`, null, { name, email }, req.ip);

    createNotification(newEmployee.id, 'Welcome to Giantek Portal! 🎉',
      'Your account has been created. Please change your password after first login.', 'success');

    res.status(201).json(newEmployee);
  } catch (err) {
    console.error('POST /employees error:', err);
    res.status(500).json({ error: 'Failed to create employee. ' + err.message });
  }
});

// ─── PUT /api/employees/:id ───────────────────────────────────────────────────
router.put('/:id', (req, res) => {
  try {
    const empId = parseInt(req.params.id);
    const { name, mobile, is_active } = req.body;

    const emp = db.prepare("SELECT * FROM users WHERE id = ? AND role = 'employee'").get(empId);
    if (!emp) return res.status(404).json({ error: 'Employee not found.' });

    const oldValues = { name: emp.name, mobile: emp.mobile, is_active: emp.is_active };

    const newName     = name     !== undefined && name     !== null ? String(name).trim()   : emp.name;
    const newMobile   = mobile   !== undefined && mobile   !== null ? String(mobile).trim() : (emp.mobile || '');
    const newIsActive = is_active !== undefined && is_active !== null
                          ? (is_active ? 1 : 0)
                          : emp.is_active;

    db.prepare(`
      UPDATE users
      SET name = ?, mobile = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(newName, newMobile, newIsActive, empId);

    const updated = db.prepare(
      'SELECT id, name, email, mobile, role, is_active, is_deleted FROM users WHERE id = ?'
    ).get(empId);

    logAudit(req.user.id, req.user.name, req.user.email, 'UPDATE', 'user', empId,
      `Updated employee: ${emp.name}`, oldValues,
      { name: newName, mobile: newMobile, is_active: newIsActive }, req.ip);

    if (newIsActive === 0 && emp.is_active === 1) {
      createNotification(empId, 'Account Deactivated',
        'Your account has been deactivated. Contact admin for more info.', 'warning');
    }

    res.json(updated);
  } catch (err) {
    console.error('PUT /employees/:id error:', err);
    res.status(500).json({ error: 'Failed to update employee. ' + err.message });
  }
});

// ─── DELETE /api/employees/:id ────────────────────────────────────────────────
// Marks the employee as REMOVED (is_deleted = 1) and deactivates their account.
// All work entries, revenue, and audit history are fully preserved and reviewable.
// This is NOT a hard delete — the user row is kept so all foreign keys remain intact.
router.delete('/:id', (req, res) => {
  try {
    const empId = parseInt(req.params.id);

    const emp = db.prepare("SELECT id, name FROM users WHERE id = ? AND role = 'employee'").get(empId);
    if (!emp) return res.status(404).json({ error: 'Employee not found.' });

    db.prepare(`
      UPDATE users
      SET is_deleted = 1, is_active = 0, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(empId);

    logAudit(req.user.id, req.user.name, req.user.email, 'DELETE', 'user', empId,
      `Removed employee: ${emp.name} (data preserved)`,
      { is_deleted: 0, is_active: 1 }, { is_deleted: 1, is_active: 0 }, req.ip);

    res.json({ message: `${emp.name} has been removed. All their work data is preserved.` });
  } catch (err) {
    console.error('DELETE /employees/:id error:', err);
    res.status(500).json({ error: 'Failed to remove employee. ' + err.message });
  }
});

// ─── POST /api/employees/:id/restore ─────────────────────────────────────────
// Restores a previously removed employee — sets is_deleted back to 0.
router.post('/:id/restore', (req, res) => {
  try {
    const empId = parseInt(req.params.id);

    const emp = db.prepare("SELECT id, name, is_deleted FROM users WHERE id = ? AND role = 'employee'").get(empId);
    if (!emp) return res.status(404).json({ error: 'Employee not found.' });
    if (!emp.is_deleted) return res.status(400).json({ error: 'Employee is not removed.' });

    db.prepare(`
      UPDATE users
      SET is_deleted = 0, is_active = 1, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(empId);

    logAudit(req.user.id, req.user.name, req.user.email, 'UPDATE', 'user', empId,
      `Restored employee: ${emp.name}`,
      { is_deleted: 1 }, { is_deleted: 0, is_active: 1 }, req.ip);

    createNotification(empId, 'Account Restored ✅',
      'Your account has been restored by the admin. You can now log in again.', 'success');

    res.json({ message: `${emp.name} has been restored successfully.` });
  } catch (err) {
    console.error('POST /employees/:id/restore error:', err);
    res.status(500).json({ error: 'Failed to restore employee. ' + err.message });
  }
});

// ─── POST /api/employees/:id/reset-password ───────────────────────────────────
router.post('/:id/reset-password', (req, res) => {
  try {
    const { new_password } = req.body;
    const empId = parseInt(req.params.id);

    if (!new_password || new_password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    const emp = db.prepare("SELECT id, name FROM users WHERE id = ? AND role = 'employee'").get(empId);
    if (!emp) return res.status(404).json({ error: 'Employee not found.' });

    const hash = bcrypt.hashSync(new_password, 10);
    db.prepare(`
      UPDATE users SET password_hash = ?, must_change_password = 1, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(hash, empId);

    logAudit(req.user.id, req.user.name, req.user.email, 'UPDATE', 'user', empId,
      `Admin reset password for: ${emp.name}`, null, null, req.ip);

    createNotification(empId, 'Password Reset by Admin',
      'Your password has been reset by the admin. Please log in with the new password.', 'warning');

    res.json({ message: `Password reset for ${emp.name} successfully.` });
  } catch (err) {
    console.error('POST /employees/:id/reset-password error:', err);
    res.status(500).json({ error: 'Failed to reset password. ' + err.message });
  }
});

module.exports = router;

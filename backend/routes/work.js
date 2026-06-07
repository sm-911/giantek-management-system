const express = require('express');
const db = require('../db/database');
const { authenticate, adminOnly, logAudit, createNotification } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

const VALID_WORK_TYPES = ['Accounts', 'TDS', 'GST', 'Income Tax', 'Miscellaneous'];
const VALID_PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'];
const VALID_STATUSES = ['in_progress', 'completed'];
const VALID_TIME = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8];

// ─── Helper: get full work entry with employees and client ────────────────────
const getFullWorkEntry = (id) => {
  const entry = db.prepare(`
    SELECT we.*,
           c.name as client_name,
           u.name as created_by_name
    FROM work_entries we
    JOIN clients c ON we.client_id = c.id
    JOIN users u ON we.created_by = u.id
    WHERE we.id = ?
  `).get(id);

  if (!entry) return null;

  // Attach assigned employees
  entry.employees = db.prepare(`
    SELECT u.id, u.name, u.email
    FROM work_entry_employees wee
    JOIN users u ON wee.employee_id = u.id
    WHERE wee.work_entry_id = ?
  `).all(id);

  return entry;
};

// ─── GET /api/work ────────────────────────────────────────────────────────────
// Admin: all entries. Employee: only entries they are assigned to.
router.get('/', (req, res) => {
  const { status, client_id, work_type, priority, employee_id, date_from, date_to, search } = req.query;

  let query = `
    SELECT DISTINCT we.*,
           c.name as client_name,
           u.name as created_by_name
    FROM work_entries we
    JOIN clients c ON we.client_id = c.id
    JOIN users u ON we.created_by = u.id
  `;

  const params = [];
  const conditions = [];

  // Employees only see their own entries
  if (req.user.role === 'employee') {
    query += ` JOIN work_entry_employees wee_filter ON we.id = wee_filter.work_entry_id `;
    conditions.push(`wee_filter.employee_id = ?`);
    params.push(req.user.id);
  }

  if (status) { conditions.push(`we.status = ?`); params.push(status); }
  if (client_id) { conditions.push(`we.client_id = ?`); params.push(client_id); }
  if (work_type) { conditions.push(`we.work_type = ?`); params.push(work_type); }
  if (priority) { conditions.push(`we.priority = ?`); params.push(priority); }
  if (date_from) { conditions.push(`we.work_date >= ?`); params.push(date_from); }
  if (date_to) { conditions.push(`we.work_date <= ?`); params.push(date_to); }
  if (search) {
    conditions.push(`(c.name LIKE ? OR we.misc_description LIKE ?)`);
    params.push(`%${search}%`, `%${search}%`);
  }

  // Admin filter by specific employee
  if (req.user.role === 'admin' && employee_id) {
    query += ` JOIN work_entry_employees wee_emp ON we.id = wee_emp.work_entry_id `;
    conditions.push(`wee_emp.employee_id = ?`);
    params.push(employee_id);
  }

  if (conditions.length > 0) {
    query += ` WHERE ` + conditions.join(' AND ');
  }

  query += ` ORDER BY we.work_date DESC, we.created_at DESC`;

  const entries = db.prepare(query).all(...params);

  // Attach employees for each entry
  const result = entries.map(entry => ({
    ...entry,
    employees: db.prepare(`
      SELECT u.id, u.name, u.email
      FROM work_entry_employees wee
      JOIN users u ON wee.employee_id = u.id
      WHERE wee.work_entry_id = ?
    `).all(entry.id)
  }));

  res.json(result);
});

// ─── GET /api/work/:id ────────────────────────────────────────────────────────
router.get('/:id', (req, res) => {
  const entry = getFullWorkEntry(parseInt(req.params.id));
  if (!entry) return res.status(404).json({ error: 'Work entry not found.' });

  // Employees can only view entries they are assigned to
  if (req.user.role === 'employee') {
    const assigned = entry.employees.find(e => e.id === req.user.id);
    if (!assigned) return res.status(403).json({ error: 'Access denied.' });
  }

  res.json(entry);
});

// ─── POST /api/work ───────────────────────────────────────────────────────────
// Employees and admin can create work entries.
router.post('/', (req, res) => {
  const { client_id, status, work_type, misc_description, time_taken,
          priority, work_date, employee_ids } = req.body;

  // Validation
  if (!client_id) return res.status(400).json({ error: 'Client is required.' });
  if (!work_type || !VALID_WORK_TYPES.includes(work_type))
    return res.status(400).json({ error: `work_type must be one of: ${VALID_WORK_TYPES.join(', ')}` });
  if (!VALID_TIME.includes(parseFloat(time_taken)))
    return res.status(400).json({ error: 'time_taken must be 0.5 to 8 in 0.5-hour steps.' });
  if (priority && !VALID_PRIORITIES.includes(priority))
    return res.status(400).json({ error: `priority must be one of: ${VALID_PRIORITIES.join(', ')}` });
  if (work_type === 'Miscellaneous' && (!misc_description || !misc_description.trim()))
    return res.status(400).json({ error: 'Please describe the miscellaneous work.' });
  if (misc_description && misc_description.trim().length > 100)
    return res.status(400).json({ error: 'Miscellaneous description must be under 100 characters.' });

  const client = db.prepare('SELECT id FROM clients WHERE id = ?').get(client_id);
  if (!client) return res.status(400).json({ error: 'Client not found.' });

  const entryStatus = status && VALID_STATUSES.includes(status) ? status : 'in_progress';
  const entryDate = work_date || new Date().toISOString().split('T')[0];

  const result = db.prepare(`
    INSERT INTO work_entries
      (client_id, status, work_type, misc_description, time_taken, priority, work_date, created_by, is_locked)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    client_id,
    entryStatus,
    work_type,
    work_type === 'Miscellaneous' ? misc_description.trim() : null,
    parseFloat(time_taken),
    priority || 'Medium',
    entryDate,
    req.user.id,
    entryStatus === 'completed' ? 1 : 0
  );

  const newEntryId = result.lastInsertRowid;

  // Assign employees — always include creator, plus any extras specified
  const assignedIds = new Set([req.user.id]);
  if (Array.isArray(employee_ids)) {
    employee_ids.forEach(id => assignedIds.add(parseInt(id)));
  }

  const insertEmployee = db.prepare(`
    INSERT OR IGNORE INTO work_entry_employees (work_entry_id, employee_id) VALUES (?, ?)
  `);
  assignedIds.forEach(empId => insertEmployee.run(newEntryId, empId));

  // Set completed_at if already marked completed
  if (entryStatus === 'completed') {
    db.prepare('UPDATE work_entries SET completed_at = CURRENT_TIMESTAMP WHERE id = ?').run(newEntryId);
  }

  const newEntry = getFullWorkEntry(newEntryId);

  logAudit(req.user.id, req.user.name, req.user.email, 'CREATE', 'work_entry', newEntryId,
    `Created work entry for client ${newEntry.client_name}`, null, { client_id, work_type, status: entryStatus }, req.ip);

  // Notify admin when a new entry is created by employee
  if (req.user.role === 'employee') {
    const admins = db.prepare("SELECT id FROM users WHERE role = 'admin' AND is_active = 1").all();
    admins.forEach(admin => {
      createNotification(admin.id, 'New Work Entry',
        `${req.user.name} added work for client "${newEntry.client_name}" — ${work_type}`, 'info');
    });
  }

  res.status(201).json(newEntry);
});

// ─── PUT /api/work/:id ────────────────────────────────────────────────────────
// Employees can edit their own entries IF not locked.
// Admin can edit any entry.
router.put('/:id', (req, res) => {
  const entryId = parseInt(req.params.id);
  const entry = db.prepare('SELECT * FROM work_entries WHERE id = ?').get(entryId);

  if (!entry) return res.status(404).json({ error: 'Work entry not found.' });

  // Employee access check
  if (req.user.role === 'employee') {
    const isAssigned = db.prepare(`
      SELECT 1 FROM work_entry_employees WHERE work_entry_id = ? AND employee_id = ?
    `).get(entryId, req.user.id);

    if (!isAssigned) return res.status(403).json({ error: 'You are not assigned to this work entry.' });
    if (entry.is_locked) return res.status(403).json({ error: 'This entry is locked. Contact admin to unlock.' });
  }

  const { status, work_type, misc_description, time_taken, priority, work_date, employee_ids } = req.body;

  // Validation
  if (work_type && !VALID_WORK_TYPES.includes(work_type))
    return res.status(400).json({ error: 'Invalid work type.' });
  if (time_taken && !VALID_TIME.includes(parseFloat(time_taken)))
    return res.status(400).json({ error: 'time_taken must be 0.5 to 8 in 0.5-hour steps.' });
  if (priority && !VALID_PRIORITIES.includes(priority))
    return res.status(400).json({ error: 'Invalid priority.' });

  const newStatus = status || entry.status;
  const isNowCompleted = newStatus === 'completed' && entry.status !== 'completed';

  const oldValues = {
    status: entry.status,
    work_type: entry.work_type,
    time_taken: entry.time_taken,
    priority: entry.priority
  };

  db.prepare(`
    UPDATE work_entries SET
      status = ?,
      work_type = ?,
      misc_description = ?,
      time_taken = ?,
      priority = ?,
      work_date = ?,
      is_locked = ?,
      completed_at = CASE WHEN ? = 'completed' AND completed_at IS NULL THEN CURRENT_TIMESTAMP ELSE completed_at END,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    newStatus,
    work_type || entry.work_type,
    work_type === 'Miscellaneous' ? (misc_description || entry.misc_description) : null,
    time_taken ? parseFloat(time_taken) : entry.time_taken,
    priority || entry.priority,
    work_date || entry.work_date,
    newStatus === 'completed' ? 1 : entry.is_locked,
    newStatus,
    entryId
  );

  // Update assigned employees if provided (admin only)
  if (req.user.role === 'admin' && Array.isArray(employee_ids)) {
    db.prepare('DELETE FROM work_entry_employees WHERE work_entry_id = ?').run(entryId);
    const insertEmp = db.prepare(`
      INSERT OR IGNORE INTO work_entry_employees (work_entry_id, employee_id) VALUES (?, ?)
    `);
    employee_ids.forEach(empId => insertEmp.run(entryId, parseInt(empId)));
  }

  const updated = getFullWorkEntry(entryId);

  logAudit(req.user.id, req.user.name, req.user.email, 'UPDATE', 'work_entry', entryId,
    `Updated work entry #${entryId}`, oldValues, { status: newStatus, work_type }, req.ip);

  // Notify admin when employee completes work
  if (isNowCompleted && req.user.role === 'employee') {
    const admins = db.prepare("SELECT id FROM users WHERE role = 'admin' AND is_active = 1").all();
    admins.forEach(admin => {
      createNotification(admin.id, 'Work Completed ✅',
        `${req.user.name} marked work for "${updated.client_name}" as completed.`, 'success');
    });
  }

  res.json(updated);
});

// ─── POST /api/work/:id/unlock ────────────────────────────────────────────────
// Admin unlocks a completed entry so employee can edit it again.
router.post('/:id/unlock', adminOnly, (req, res) => {
  const entryId = parseInt(req.params.id);

  const entry = db.prepare('SELECT * FROM work_entries WHERE id = ?').get(entryId);
  if (!entry) return res.status(404).json({ error: 'Work entry not found.' });

  db.prepare('UPDATE work_entries SET is_locked = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(entryId);

  logAudit(req.user.id, req.user.name, req.user.email, 'UNLOCK', 'work_entry', entryId,
    `Admin unlocked work entry #${entryId}`, { is_locked: 1 }, { is_locked: 0 }, req.ip);

  // Notify assigned employees
  const assignedEmps = db.prepare(`
    SELECT u.id FROM work_entry_employees wee JOIN users u ON wee.employee_id = u.id
    WHERE wee.work_entry_id = ?
  `).all(entryId);
  const clientName = db.prepare('SELECT c.name FROM clients c JOIN work_entries we ON we.client_id = c.id WHERE we.id = ?').get(entryId);

  assignedEmps.forEach(emp => {
    createNotification(emp.id, 'Work Entry Unlocked',
      `Admin unlocked work entry for "${clientName?.name}". You can now edit it.`, 'info');
  });

  res.json({ message: 'Work entry unlocked successfully.' });
});

// ─── DELETE /api/work/:id ─────────────────────────────────────────────────────
// Admin only.
router.delete('/:id', adminOnly, (req, res) => {
  const entryId = parseInt(req.params.id);

  const entry = db.prepare(`
    SELECT we.*, c.name as client_name FROM work_entries we
    JOIN clients c ON we.client_id = c.id WHERE we.id = ?
  `).get(entryId);

  if (!entry) return res.status(404).json({ error: 'Work entry not found.' });

  db.prepare('DELETE FROM work_entries WHERE id = ?').run(entryId);

  logAudit(req.user.id, req.user.name, req.user.email, 'DELETE', 'work_entry', entryId,
    `Deleted work entry for client "${entry.client_name}"`, entry, null, req.ip);

  res.json({ message: 'Work entry deleted.' });
});

module.exports = router;

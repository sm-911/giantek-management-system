const express = require('express');
const db = require('../db/database');
const { authenticate, adminOnly, logAudit } = require('../middleware/auth');

const router = express.Router();

// All revenue routes: authenticated + admin only
router.use(authenticate, adminOnly);

// ─── GET /api/revenue ─────────────────────────────────────────────────────────
router.get('/', (req, res) => {
  const { employee_id, client_id, work_type } = req.query;

  let query = `
    SELECT r.*,
           u.name as employee_name,
           c.name as client_name,
           cb.name as created_by_name
    FROM revenue r
    JOIN users u ON r.employee_id = u.id
    JOIN clients c ON r.client_id = c.id
    JOIN users cb ON r.created_by = cb.id
    WHERE 1=1
  `;

  const params = [];
  if (employee_id) { query += ' AND r.employee_id = ?'; params.push(employee_id); }
  if (client_id) { query += ' AND r.client_id = ?'; params.push(client_id); }
  if (work_type) { query += ' AND r.work_type = ?'; params.push(work_type); }

  query += ' ORDER BY r.created_at DESC';

  const records = db.prepare(query).all(...params);
  res.json(records);
});

// ─── GET /api/revenue/:id ─────────────────────────────────────────────────────
router.get('/:id', (req, res) => {
  const record = db.prepare(`
    SELECT r.*, u.name as employee_name, c.name as client_name
    FROM revenue r
    JOIN users u ON r.employee_id = u.id
    JOIN clients c ON r.client_id = c.id
    WHERE r.id = ?
  `).get(req.params.id);

  if (!record) return res.status(404).json({ error: 'Revenue record not found.' });
  res.json(record);
});

// ─── POST /api/revenue ────────────────────────────────────────────────────────
router.post('/', (req, res) => {
  const { employee_id, client_id, work_entry_id, work_type, value, notes } = req.body;

  if (!employee_id || !client_id || !work_type || value === undefined || value === null) {
    return res.status(400).json({ error: 'employee_id, client_id, work_type, and value are required.' });
  }

  if (isNaN(parseFloat(value)) || parseFloat(value) < 0) {
    return res.status(400).json({ error: 'Value must be a positive number.' });
  }

  const employee = db.prepare("SELECT id, name FROM users WHERE id = ? AND role = 'employee'").get(employee_id);
  if (!employee) return res.status(400).json({ error: 'Employee not found.' });

  const client = db.prepare('SELECT id FROM clients WHERE id = ?').get(client_id);
  if (!client) return res.status(400).json({ error: 'Client not found.' });

  const result = db.prepare(`
    INSERT INTO revenue (employee_id, client_id, work_entry_id, work_type, value, notes, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    employee_id,
    client_id,
    work_entry_id || null,
    work_type,
    parseFloat(value),
    notes || null,
    req.user.id
  );

  const newRecord = db.prepare(`
    SELECT r.*, u.name as employee_name, c.name as client_name
    FROM revenue r
    JOIN users u ON r.employee_id = u.id
    JOIN clients c ON r.client_id = c.id
    WHERE r.id = ?
  `).get(result.lastInsertRowid);

  logAudit(req.user.id, req.user.name, req.user.email, 'CREATE', 'revenue', newRecord.id,
    `Revenue entry ₹${value} for ${employee.name}`, null, { employee_id, client_id, work_type, value }, req.ip);

  res.status(201).json(newRecord);
});

// ─── PUT /api/revenue/:id ─────────────────────────────────────────────────────
router.put('/:id', (req, res) => {
  const revenueId = parseInt(req.params.id);
  const { employee_id, client_id, work_entry_id, work_type, value, notes } = req.body;

  const record = db.prepare('SELECT * FROM revenue WHERE id = ?').get(revenueId);
  if (!record) return res.status(404).json({ error: 'Revenue record not found.' });

  const oldValues = { employee_id: record.employee_id, value: record.value, work_type: record.work_type };

  db.prepare(`
    UPDATE revenue SET
      employee_id = ?, client_id = ?, work_entry_id = ?, work_type = ?, value = ?, notes = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    employee_id || record.employee_id,
    client_id || record.client_id,
    work_entry_id !== undefined ? work_entry_id : record.work_entry_id,
    work_type || record.work_type,
    value !== undefined ? parseFloat(value) : record.value,
    notes !== undefined ? notes : record.notes,
    revenueId
  );

  const updated = db.prepare(`
    SELECT r.*, u.name as employee_name, c.name as client_name
    FROM revenue r JOIN users u ON r.employee_id = u.id JOIN clients c ON r.client_id = c.id
    WHERE r.id = ?
  `).get(revenueId);

  logAudit(req.user.id, req.user.name, req.user.email, 'UPDATE', 'revenue', revenueId,
    `Updated revenue entry #${revenueId}`, oldValues, { value }, req.ip);

  res.json(updated);
});

// ─── DELETE /api/revenue/:id ──────────────────────────────────────────────────
router.delete('/:id', (req, res) => {
  const revenueId = parseInt(req.params.id);

  const record = db.prepare('SELECT * FROM revenue WHERE id = ?').get(revenueId);
  if (!record) return res.status(404).json({ error: 'Revenue record not found.' });

  db.prepare('DELETE FROM revenue WHERE id = ?').run(revenueId);

  logAudit(req.user.id, req.user.name, req.user.email, 'DELETE', 'revenue', revenueId,
    `Deleted revenue entry #${revenueId}`, record, null, req.ip);

  res.json({ message: 'Revenue record deleted.' });
});

module.exports = router;

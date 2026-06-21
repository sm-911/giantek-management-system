const express = require('express');
const db = require('../db/database');
const { authenticate, adminOnly, logAudit } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

// ─── GET /api/clients ─────────────────────────────────────────────────────────
// All authenticated users can view clients.
router.get('/', async (req, res) => {
  const [clients] = await db.execute(`
    SELECT c.*, u.name as created_by_name
    FROM clients c
    LEFT JOIN users u ON c.created_by = u.id
    ORDER BY c.name ASC
  `);

  res.json(clients);
});

// ─── GET /api/clients/:id ─────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  const [rows] = await db.execute(`
    SELECT c.*, u.name as created_by_name
    FROM clients c
    LEFT JOIN users u ON c.created_by = u.id
    WHERE c.id = ?
  `, [req.params.id]);
  const client = rows[0];

  if (!client) return res.status(404).json({ error: 'Client not found.' });
  res.json(client);
});

// ─── POST /api/clients ────────────────────────────────────────────────────────
// Both employees and admin can create clients.
router.post('/', async (req, res) => {
  const { name, contact_number, email, company_name, notes } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Client name is required.' });
  }

  // Check for duplicate client name (case-insensitive)
  const [existingRows] = await db.execute("SELECT id FROM clients WHERE lower(name) = lower(?)", [name.trim()]);
  const existing = existingRows[0];
  if (existing) {
    return res.status(409).json({ error: 'A client with this name already exists.' });
  }

  const [result] = await db.execute(`
    INSERT INTO clients (name, contact_number, email, company_name, notes, created_by)
    VALUES (?, ?, ?, ?, ?, ?)
  `, [
    name.trim(),
    contact_number || null,
    email || null,
    company_name || null,
    notes || null,
    req.user.id
  ]);

  const [newClientRows] = await db.execute('SELECT * FROM clients WHERE id = ?', [result.insertId]);
  const newClient = newClientRows[0];

  logAudit(req.user.id, req.user.name, req.user.email, 'CREATE', 'client', newClient.id,
    `Created client: ${name}`, null, { name }, req.ip);

  res.status(201).json(newClient);
});

// ─── PUT /api/clients/:id ─────────────────────────────────────────────────────
// Admin can edit any client. Employees cannot edit client details.
router.put('/:id', adminOnly, async (req, res) => {
  const { name, contact_number, email, company_name, notes } = req.body;
  const clientId = parseInt(req.params.id);

  const [clientRows] = await db.execute('SELECT * FROM clients WHERE id = ?', [clientId]);
  const client = clientRows[0];
  if (!client) return res.status(404).json({ error: 'Client not found.' });

  const oldValues = { name: client.name, contact_number: client.contact_number };

  await db.execute(`
    UPDATE clients
    SET name = ?, contact_number = ?, email = ?, company_name = ?, notes = ?, updated_at = NOW()
    WHERE id = ?
  `, [
    name || client.name,
    contact_number !== undefined ? contact_number : client.contact_number,
    email !== undefined ? email : client.email,
    company_name !== undefined ? company_name : client.company_name,
    notes !== undefined ? notes : client.notes,
    clientId
  ]);

  const [updatedRows] = await db.execute('SELECT * FROM clients WHERE id = ?', [clientId]);
  const updated = updatedRows[0];

  logAudit(req.user.id, req.user.name, req.user.email, 'UPDATE', 'client', clientId,
    `Updated client: ${client.name}`, oldValues, { name }, req.ip);

  res.json(updated);
});

// ─── DELETE /api/clients/:id ──────────────────────────────────────────────────
// Admin only. Cannot delete if the client has work entries.
router.delete('/:id', adminOnly, async (req, res) => {
  const clientId = parseInt(req.params.id);

  const [clientRows] = await db.execute('SELECT * FROM clients WHERE id = ?', [clientId]);
  const client = clientRows[0];
  if (!client) return res.status(404).json({ error: 'Client not found.' });

  // Prevent deletion if work entries exist for this client
  const [workCountRows] = await db.execute('SELECT COUNT(*) as cnt FROM work_entries WHERE client_id = ?', [clientId]);
  const workCount = workCountRows[0];
  if (workCount.cnt > 0) {
    return res.status(400).json({ error: `Cannot delete. Client has ${workCount.cnt} work entry/entries linked.` });
  }

  await db.execute('DELETE FROM clients WHERE id = ?', [clientId]);

  logAudit(req.user.id, req.user.name, req.user.email, 'DELETE', 'client', clientId,
    `Deleted client: ${client.name}`, { name: client.name }, null, req.ip);

  res.json({ message: `Client "${client.name}" deleted.` });
});

module.exports = router;

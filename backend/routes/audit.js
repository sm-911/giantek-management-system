const express = require('express');
const db = require('../db/database');
const { authenticate, adminOnly } = require('../middleware/auth');

const router = express.Router();

// Audit log is admin-only
router.use(authenticate, adminOnly);

// ─── GET /api/audit ───────────────────────────────────────────────────────────
// Returns paginated audit log with optional filters.
router.get('/', (req, res) => {
  const { user_id, action, entity_type, date_from, date_to, page = 1, limit = 50 } = req.query;

  let query = `
    SELECT al.*, u.name as actor_name
    FROM audit_log al
    LEFT JOIN users u ON al.user_id = u.id
    WHERE 1=1
  `;

  const params = [];

  if (user_id)    { query += ' AND al.user_id = ?';       params.push(user_id); }
  if (action)     { query += ' AND al.action = ?';        params.push(action); }
  if (entity_type){ query += ' AND al.entity_type = ?';   params.push(entity_type); }
  if (date_from)  { query += ' AND al.created_at >= ?';   params.push(date_from); }
  if (date_to)    { query += ' AND al.created_at <= ?';   params.push(date_to + ' 23:59:59'); }

  // Total count for pagination
  const countQuery = query.replace('SELECT al.*, u.name as actor_name', 'SELECT COUNT(*) as cnt');
  const total = db.prepare(countQuery).get(...params).cnt;

  // Paginate
  const offset = (parseInt(page) - 1) * parseInt(limit);
  query += ` ORDER BY al.created_at DESC LIMIT ? OFFSET ?`;
  params.push(parseInt(limit), offset);

  const logs = db.prepare(query).all(...params);

  // Parse JSON strings back to objects
  const result = logs.map(log => ({
    ...log,
    old_values: log.old_values ? JSON.parse(log.old_values) : null,
    new_values: log.new_values ? JSON.parse(log.new_values) : null
  }));

  res.json({
    data: result,
    total,
    page: parseInt(page),
    limit: parseInt(limit),
    totalPages: Math.ceil(total / parseInt(limit))
  });
});

module.exports = router;

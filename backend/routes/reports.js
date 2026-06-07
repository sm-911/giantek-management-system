const express = require('express');
const db = require('../db/database');
const { authenticate, adminOnly } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate, adminOnly);

// ─── GET /api/reports/summary ─────────────────────────────────────────────────
// Dashboard summary cards data.
router.get('/summary', (req, res) => {
  const totalWork       = db.prepare("SELECT COUNT(*) as cnt FROM work_entries").get().cnt;
  const completedWork   = db.prepare("SELECT COUNT(*) as cnt FROM work_entries WHERE status = 'completed'").get().cnt;
  const inProgressWork  = db.prepare("SELECT COUNT(*) as cnt FROM work_entries WHERE status = 'in_progress'").get().cnt;
  const totalEmployees  = db.prepare("SELECT COUNT(*) as cnt FROM users WHERE role = 'employee' AND is_active = 1").get().cnt;
  const totalClients    = db.prepare("SELECT COUNT(*) as cnt FROM clients").get().cnt;
  const totalRevenue    = db.prepare("SELECT COALESCE(SUM(value), 0) as total FROM revenue").get().total;
  const todayWork       = db.prepare("SELECT COUNT(*) as cnt FROM work_entries WHERE work_date = date('now','localtime')").get().cnt;
  const totalHours      = db.prepare("SELECT COALESCE(SUM(time_taken), 0) as total FROM work_entries").get().total;

  res.json({
    totalWork,
    completedWork,
    inProgressWork,
    totalEmployees,
    totalClients,
    totalRevenue,
    todayWork,
    totalHours
  });
});

// ─── GET /api/reports/employee-stats ──────────────────────────────────────────
// Per-employee: total hours, total tasks, completed tasks, revenue.
router.get('/employee-stats', (req, res) => {
  const stats = db.prepare(`
    SELECT
      u.id,
      u.name,
      u.email,
      COUNT(DISTINCT wee.work_entry_id) as total_tasks,
      SUM(CASE WHEN we.status = 'completed' THEN 1 ELSE 0 END) as completed_tasks,
      SUM(CASE WHEN we.status = 'in_progress' THEN 1 ELSE 0 END) as pending_tasks,
      COALESCE(SUM(we.time_taken), 0) as total_hours,
      COALESCE((
        SELECT SUM(r.value) FROM revenue r WHERE r.employee_id = u.id
      ), 0) as total_revenue
    FROM users u
    LEFT JOIN work_entry_employees wee ON u.id = wee.employee_id
    LEFT JOIN work_entries we ON wee.work_entry_id = we.id
    WHERE u.role = 'employee' AND u.is_active = 1
    GROUP BY u.id, u.name, u.email
    ORDER BY u.name ASC
  `).all();

  res.json(stats);
});

// ─── GET /api/reports/client-stats ────────────────────────────────────────────
// Per-client: total work entries, hours, completed, revenue.
router.get('/client-stats', (req, res) => {
  const stats = db.prepare(`
    SELECT
      c.id,
      c.name,
      c.company_name,
      COUNT(we.id) as total_tasks,
      SUM(CASE WHEN we.status = 'completed' THEN 1 ELSE 0 END) as completed_tasks,
      SUM(CASE WHEN we.status = 'in_progress' THEN 1 ELSE 0 END) as pending_tasks,
      COALESCE(SUM(we.time_taken), 0) as total_hours,
      COALESCE((SELECT SUM(r.value) FROM revenue r WHERE r.client_id = c.id), 0) as total_revenue
    FROM clients c
    LEFT JOIN work_entries we ON c.id = we.client_id
    GROUP BY c.id, c.name, c.company_name
    ORDER BY total_tasks DESC
  `).all();

  res.json(stats);
});

// ─── GET /api/reports/work-type-stats ─────────────────────────────────────────
// Breakdown by work type.
router.get('/work-type-stats', (req, res) => {
  const stats = db.prepare(`
    SELECT
      work_type,
      COUNT(*) as total,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
      SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as pending,
      COALESCE(SUM(time_taken), 0) as total_hours
    FROM work_entries
    GROUP BY work_type
    ORDER BY total DESC
  `).all();

  res.json(stats);
});

// ─── GET /api/reports/daily-work ──────────────────────────────────────────────
// Last 30 days of work entry counts (for trend chart).
router.get('/daily-work', (req, res) => {
  const data = db.prepare(`
    SELECT
      work_date as date,
      COUNT(*) as total,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
      SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
      COALESCE(SUM(time_taken), 0) as hours
    FROM work_entries
    WHERE work_date >= date('now', 'localtime', '-30 days')
    GROUP BY work_date
    ORDER BY work_date ASC
  `).all();

  res.json(data);
});

// ─── GET /api/reports/revenue-trend ───────────────────────────────────────────
// Monthly revenue totals for the last 12 months.
router.get('/revenue-trend', (req, res) => {
  const data = db.prepare(`
    SELECT
      strftime('%Y-%m', created_at) as month,
      COALESCE(SUM(value), 0) as total_revenue,
      COUNT(*) as entries
    FROM revenue
    WHERE created_at >= date('now', 'localtime', '-12 months')
    GROUP BY strftime('%Y-%m', created_at)
    ORDER BY month ASC
  `).all();

  res.json(data);
});

// ─── GET /api/reports/priority-stats ─────────────────────────────────────────
// Work entry counts by priority level.
router.get('/priority-stats', (req, res) => {
  const data = db.prepare(`
    SELECT priority, COUNT(*) as total,
           SUM(CASE WHEN status='completed' THEN 1 ELSE 0 END) as completed
    FROM work_entries
    GROUP BY priority
  `).all();

  res.json(data);
});

// ─── GET /api/reports/client-history/:id ─────────────────────────────────────
// Full work history for a specific client.
router.get('/client-history/:id', (req, res) => {
  const entries = db.prepare(`
    SELECT we.*, c.name as client_name,
           u.name as created_by_name
    FROM work_entries we
    JOIN clients c ON we.client_id = c.id
    JOIN users u ON we.created_by = u.id
    WHERE we.client_id = ?
    ORDER BY we.work_date DESC, we.created_at DESC
  `).all(req.params.id);

  const result = entries.map(e => ({
    ...e,
    employees: db.prepare(`
      SELECT u.id, u.name FROM work_entry_employees wee JOIN users u ON wee.employee_id = u.id
      WHERE wee.work_entry_id = ?
    `).all(e.id)
  }));

  res.json(result);
});

module.exports = router;

const express = require('express');
const db = require('../db/database');
const { authenticate, adminOnly } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate, adminOnly);

// ─── GET /api/reports/summary ─────────────────────────────────────────────────
// Dashboard summary cards data.
router.get('/summary', async (req, res) => {
  const [[{ cnt: totalWork }]] = await db.execute("SELECT COUNT(*) as cnt FROM work_entries");
  const [[{ cnt: completedWork }]] = await db.execute("SELECT COUNT(*) as cnt FROM work_entries WHERE status = 'completed'");
  const [[{ cnt: inProgressWork }]] = await db.execute("SELECT COUNT(*) as cnt FROM work_entries WHERE status = 'in_progress'");
  const [[{ cnt: totalEmployees }]] = await db.execute("SELECT COUNT(*) as cnt FROM users WHERE role = 'employee' AND is_active = 1");
  const [[{ cnt: totalClients }]] = await db.execute("SELECT COUNT(*) as cnt FROM clients");
  const [[{ total: totalRevenue }]] = await db.execute("SELECT COALESCE(SUM(value), 0) as total FROM revenue");
  const [[{ cnt: todayWork }]] = await db.execute("SELECT COUNT(*) as cnt FROM work_entries WHERE work_date = CURDATE()");
  const [[{ total: totalHours }]] = await db.execute("SELECT COALESCE(SUM(time_taken), 0) as total FROM work_entries");

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
router.get('/employee-stats', async (req, res) => {
  const [stats] = await db.execute(`
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
  `);

  res.json(stats);
});

// ─── GET /api/reports/client-stats ────────────────────────────────────────────
// Per-client: total work entries, hours, completed, revenue.
router.get('/client-stats', async (req, res) => {
  const [stats] = await db.execute(`
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
  `);

  res.json(stats);
});

// ─── GET /api/reports/work-type-stats ─────────────────────────────────────────
// Breakdown by work type.
router.get('/work-type-stats', async (req, res) => {
  const [stats] = await db.execute(`
    SELECT
      work_type,
      COUNT(*) as total,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
      SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as pending,
      COALESCE(SUM(time_taken), 0) as total_hours
    FROM work_entries
    GROUP BY work_type
    ORDER BY total DESC
  `);

  res.json(stats);
});

// ─── GET /api/reports/daily-work ──────────────────────────────────────────────
// Last 30 days of work entry counts (for trend chart).
router.get('/daily-work', async (req, res) => {
  const [data] = await db.execute(`
    SELECT
      work_date as date,
      COUNT(*) as total,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
      SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
      COALESCE(SUM(time_taken), 0) as hours
    FROM work_entries
    WHERE work_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
    GROUP BY work_date
    ORDER BY work_date ASC
  `);

  res.json(data);
});

// ─── GET /api/reports/revenue-trend ───────────────────────────────────────────
// Monthly revenue totals for the last 12 months.
router.get('/revenue-trend', async (req, res) => {
  const [data] = await db.execute(`
    SELECT
      DATE_FORMAT(created_at, '%Y-%m') as month,
      COALESCE(SUM(value), 0) as total_revenue,
      COUNT(*) as entries
    FROM revenue
    WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
    GROUP BY DATE_FORMAT(created_at, '%Y-%m')
    ORDER BY month ASC
  `);

  res.json(data);
});

// ─── GET /api/reports/priority-stats ─────────────────────────────────────────
// Work entry counts by priority level.
router.get('/priority-stats', async (req, res) => {
  const [data] = await db.execute(`
    SELECT priority, COUNT(*) as total,
           SUM(CASE WHEN status='completed' THEN 1 ELSE 0 END) as completed
    FROM work_entries
    GROUP BY priority
  `);

  res.json(data);
});

// ─── GET /api/reports/client-history/:id ─────────────────────────────────────
// Full work history for a specific client.
router.get('/client-history/:id', async (req, res) => {
  const [entries] = await db.execute(`
    SELECT we.*, c.name as client_name,
           u.name as created_by_name
    FROM work_entries we
    JOIN clients c ON we.client_id = c.id
    JOIN users u ON we.created_by = u.id
    WHERE we.client_id = ?
    ORDER BY we.work_date DESC, we.created_at DESC
  `, [req.params.id]);

  const result = await Promise.all(entries.map(async e => {
    const [employees] = await db.execute(`
      SELECT u.id, u.name FROM work_entry_employees wee JOIN users u ON wee.employee_id = u.id
      WHERE wee.work_entry_id = ?
    `, [e.id]);
    return {
      ...e,
      employees
    };
  }));

  res.json(result);
});

// ─── GET /api/reports/hours-by-employee ──────────────────────────────────────
// Hours logged per employee, filtered by period: daily | weekly | monthly
router.get('/hours-by-employee', async (req, res) => {
  const { period = 'weekly' } = req.query;

  let dateFilter;
  let periodLabel;
  if (period === 'daily') {
    dateFilter = 'AND we.work_date = CURDATE()';
    periodLabel = 'Today';
  } else if (period === 'monthly') {
    dateFilter = 'AND we.work_date >= DATE_FORMAT(CURDATE(), \'%Y-%m-01\')';
    periodLabel = 'This Month';
  } else {
    // weekly — last 7 days including today
    dateFilter = 'AND we.work_date >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)';
    periodLabel = 'This Week (Last 7 Days)';
  }

  const [rows] = await db.execute(`
    SELECT
      u.id,
      u.name,
      COALESCE(SUM(we.time_taken), 0) as hours_logged,
      COUNT(DISTINCT we.id) as entry_count
    FROM users u
    LEFT JOIN work_entry_employees wee ON u.id = wee.employee_id
    LEFT JOIN work_entries we ON wee.work_entry_id = we.id ${dateFilter}
    WHERE u.role = 'employee' AND u.is_active = 1
    GROUP BY u.id, u.name
    ORDER BY hours_logged DESC
  `);

  res.json({ period, periodLabel, employees: rows });
});

module.exports = router;

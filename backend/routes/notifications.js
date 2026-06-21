const express = require('express');
const db = require('../db/database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

// ─── GET /api/notifications ───────────────────────────────────────────────────
// Returns notifications for the currently logged-in user.
router.get('/', async (req, res) => {
  const [notifications] = await db.execute(`
    SELECT * FROM notifications
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT 50
  `, [req.user.id]);

  const [unreadRows] = await db.execute(`
    SELECT COUNT(*) as cnt FROM notifications WHERE user_id = ? AND is_read = 0
  `, [req.user.id]);
  const unreadCount = unreadRows[0].cnt;

  res.json({ notifications, unreadCount });
});

// ─── PUT /api/notifications/:id/read ─────────────────────────────────────────
// Mark a single notification as read.
router.put('/:id/read', async (req, res) => {
  const [notifRows] = await db.execute('SELECT id FROM notifications WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
  const notif = notifRows[0];

  if (!notif) return res.status(404).json({ error: 'Notification not found.' });

  await db.execute('UPDATE notifications SET is_read = 1 WHERE id = ?', [req.params.id]);
  res.json({ message: 'Marked as read.' });
});

// ─── PUT /api/notifications/read-all ─────────────────────────────────────────
// Mark all notifications for the user as read.
router.put('/read-all', async (req, res) => {
  await db.execute('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [req.user.id]);
  res.json({ message: 'All notifications marked as read.' });
});

// ─── DELETE /api/notifications/:id ───────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  await db.execute('DELETE FROM notifications WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
  res.json({ message: 'Notification dismissed.' });
});

module.exports = router;

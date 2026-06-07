const express = require('express');
const db = require('../db/database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

// ─── GET /api/notifications ───────────────────────────────────────────────────
// Returns notifications for the currently logged-in user.
router.get('/', (req, res) => {
  const notifications = db.prepare(`
    SELECT * FROM notifications
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT 50
  `).all(req.user.id);

  const unreadCount = db.prepare(`
    SELECT COUNT(*) as cnt FROM notifications WHERE user_id = ? AND is_read = 0
  `).get(req.user.id).cnt;

  res.json({ notifications, unreadCount });
});

// ─── PUT /api/notifications/:id/read ─────────────────────────────────────────
// Mark a single notification as read.
router.put('/:id/read', (req, res) => {
  const notif = db.prepare('SELECT id FROM notifications WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.user.id);

  if (!notif) return res.status(404).json({ error: 'Notification not found.' });

  db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ?').run(req.params.id);
  res.json({ message: 'Marked as read.' });
});

// ─── PUT /api/notifications/read-all ─────────────────────────────────────────
// Mark all notifications for the user as read.
router.put('/read-all', (req, res) => {
  db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(req.user.id);
  res.json({ message: 'All notifications marked as read.' });
});

// ─── DELETE /api/notifications/:id ───────────────────────────────────────────
router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM notifications WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
  res.json({ message: 'Notification dismissed.' });
});

module.exports = router;

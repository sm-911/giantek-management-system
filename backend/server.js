require('dotenv').config();
require('express-async-errors'); // Catch all unhandled promise rejections
const express = require('express');
const cors = require('cors');

// ─── Import database pool ─────────────────────────────────────────────────────
const db = require('./db/database');

// ─── Import all route handlers ────────────────────────────────────────────────
const authRoutes          = require('./routes/auth');
const employeeRoutes      = require('./routes/employees');
const clientRoutes        = require('./routes/clients');
const workRoutes          = require('./routes/work');
const revenueRoutes       = require('./routes/revenue');
const reportRoutes        = require('./routes/reports');
const auditRoutes         = require('./routes/audit');
const notificationRoutes  = require('./routes/notifications');

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Global Middleware ────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Mount Routes ─────────────────────────────────────────────────────────────
app.use('/api/auth',          authRoutes);
app.use('/api/employees',     employeeRoutes);
app.use('/api/clients',       clientRoutes);
app.use('/api/work',          workRoutes);
app.use('/api/revenue',       revenueRoutes);
app.use('/api/reports',       reportRoutes);
app.use('/api/audit',         auditRoutes);
app.use('/api/notifications', notificationRoutes);

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/api/health', async (req, res) => {
  try {
    const [result] = await db.query('SELECT NOW() as time');
    res.json({ 
      status: 'ok', 
      server: 'Giantek API', 
      timestamp: new Date().toISOString(),
      db_time: result[0].time
    });
  } catch (err) {
    res.status(500).json({ status: 'error', error: err.message });
  }
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(500).json({ error: 'Internal server error. Please try again.' });
});

// ─── Start Server (DB init first, then listen) ────────────────────────────────
db.initDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log('');
      console.log('  ██████╗ ██╗ █████╗ ███╗   ██╗████████╗███████╗██╗  ██╗');
      console.log('  ██╔════╝ ██║██╔══██╗████╗  ██║╚══██╔══╝██╔════╝██║ ██╔╝');
      console.log('  ██║  ███╗██║███████║██╔██╗ ██║   ██║   █████╗  █████╔╝ ');
      console.log('  ██║   ██║██║██╔══██║██║╚██╗██║   ██║   ██╔══╝  ██╔═██╗ ');
      console.log('  ╚██████╔╝██║██║  ██║██║ ╚████║   ██║   ███████╗██║  ██╗');
      console.log('   ╚═════╝ ╚═╝╚═╝  ╚═╝╚═╝  ╚═══╝   ╚═╝   ╚══════╝╚═╝  ╚═╝');
      console.log('');
      console.log(`  🚀 Server running at  http://localhost:${PORT}`);
      console.log(`  📦 Database           MySQL — Render Ready`);
      console.log(`  🔗 Frontend origin    ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
      console.log(`  👤 Admin login        admin@giantek.com / Admin@123`);
      console.log('');
    });
  })
  .catch((err) => {
    console.error('❌ Failed to initialize database. Server not started.', err);
    process.exit(1);
  });

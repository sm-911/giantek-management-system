// Node.js 24 has a built-in SQLite module — no native compilation required!
// This replaces better-sqlite3 with the same synchronous API.
const { DatabaseSync } = require('node:sqlite');
const bcrypt = require('bcryptjs');
const path = require('path');

// Database file stored inside the backend folder
const DB_PATH = path.join(__dirname, '..', 'giantek.db');

const db = new DatabaseSync(DB_PATH);

// Enable WAL mode for better concurrency and performance
db.exec('PRAGMA journal_mode = WAL');
// Enforce foreign key constraints
db.exec('PRAGMA foreign_keys = ON');

// ─── CREATE ALL TABLES ─────────────────────────────────────────────────────────

const createTables = () => {
  db.exec(`
    -- ── Users: both admin and employees ──────────────────────────────────
    CREATE TABLE IF NOT EXISTS users (
      id                   INTEGER PRIMARY KEY AUTOINCREMENT,
      name                 TEXT    NOT NULL,
      email                TEXT    UNIQUE NOT NULL,
      password_hash        TEXT    NOT NULL,
      mobile               TEXT,
      role                 TEXT    NOT NULL DEFAULT 'employee',
      is_active            INTEGER NOT NULL DEFAULT 1,
      must_change_password INTEGER NOT NULL DEFAULT 0,
      created_at           DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at           DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- ── Clients ───────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS clients (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      name           TEXT    NOT NULL,
      contact_number TEXT,
      email          TEXT,
      company_name   TEXT,
      notes          TEXT,
      created_by     INTEGER REFERENCES users(id),
      created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at     DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- ── Work Entries ──────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS work_entries (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id        INTEGER NOT NULL REFERENCES clients(id),
      status           TEXT    NOT NULL DEFAULT 'in_progress',
      work_type        TEXT    NOT NULL,
      misc_description TEXT,
      time_taken       REAL    NOT NULL,
      priority         TEXT    NOT NULL DEFAULT 'Medium',
      work_date        DATE    NOT NULL DEFAULT (date('now', 'localtime')),
      created_by       INTEGER NOT NULL REFERENCES users(id),
      completed_at     DATETIME,
      is_locked        INTEGER NOT NULL DEFAULT 0,
      created_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at       DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- ── Work Entry Employees: many-to-many ────────────────────────────────
    CREATE TABLE IF NOT EXISTS work_entry_employees (
      work_entry_id INTEGER NOT NULL REFERENCES work_entries(id) ON DELETE CASCADE,
      employee_id   INTEGER NOT NULL REFERENCES users(id),
      PRIMARY KEY (work_entry_id, employee_id)
    );

    -- ── Revenue ───────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS revenue (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id   INTEGER NOT NULL REFERENCES users(id),
      client_id     INTEGER NOT NULL REFERENCES clients(id),
      work_entry_id INTEGER REFERENCES work_entries(id),
      work_type     TEXT    NOT NULL,
      value         REAL    NOT NULL,
      notes         TEXT,
      created_by    INTEGER NOT NULL REFERENCES users(id),
      created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- ── Password Reset Tokens ─────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS password_resets (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    INTEGER NOT NULL REFERENCES users(id),
      token      TEXT    NOT NULL UNIQUE,
      expires_at DATETIME NOT NULL,
      used       INTEGER  DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- ── Audit Log ─────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS audit_log (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id     INTEGER REFERENCES users(id),
      user_name   TEXT,
      user_email  TEXT,
      action      TEXT    NOT NULL,
      entity_type TEXT    NOT NULL,
      entity_id   INTEGER,
      old_values  TEXT,
      new_values  TEXT,
      description TEXT,
      ip_address  TEXT,
      created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- ── Notifications ─────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS notifications (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    INTEGER NOT NULL REFERENCES users(id),
      title      TEXT    NOT NULL,
      message    TEXT    NOT NULL,
      type       TEXT    DEFAULT 'info',
      link       TEXT,
      is_read    INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
};

// ─── SEED DEFAULT ADMIN ────────────────────────────────────────────────────────

const seedAdmin = () => {
  const admin = db.prepare("SELECT id FROM users WHERE role = 'admin' LIMIT 1").get();
  if (!admin) {
    const passwordHash = bcrypt.hashSync('Admin@123', 10);
    db.prepare(`
      INSERT INTO users (name, email, password_hash, mobile, role, is_active, must_change_password)
      VALUES (?, ?, ?, ?, 'admin', 1, 0)
    `).run('Admin', 'admin@giantek.com', passwordHash, '');
    console.log('✅ Admin seeded — Email: admin@giantek.com | Password: Admin@123');
  }
};

createTables();

// ─── MIGRATIONS (idempotent — safe to run on every startup) ───────────────────

const runMigrations = () => {
  // v1: Add is_deleted flag to users so removed employees keep all their data
  try {
    db.exec('ALTER TABLE users ADD COLUMN is_deleted INTEGER NOT NULL DEFAULT 0');
    console.log('✅ Migration: added is_deleted column to users');
  } catch {
    // Column already exists — expected on subsequent runs, safe to ignore
  }
};

runMigrations();
seedAdmin();

module.exports = db;

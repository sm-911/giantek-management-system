const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

const dbUri = process.env.MYSQL_URL || process.env.DATABASE_URL || 'mysql://root:password@localhost:3306/giantek';

const pool = mysql.createPool({
  uri: dbUri,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  ssl: dbUri.includes('aiven') || dbUri.includes('ssl') ? { rejectUnauthorized: false } : undefined
});

// ─── CREATE ALL TABLES ─────────────────────────────────────────────────────────

const createTables = async () => {
  const statements = [
    `CREATE TABLE IF NOT EXISTS users (
      id                   INT AUTO_INCREMENT PRIMARY KEY,
      name                 VARCHAR(255) NOT NULL,
      email                VARCHAR(255) UNIQUE NOT NULL,
      password_hash        VARCHAR(255) NOT NULL,
      mobile               VARCHAR(50),
      role                 VARCHAR(50) NOT NULL DEFAULT 'employee',
      is_active            TINYINT(1) NOT NULL DEFAULT 1,
      must_change_password TINYINT(1) NOT NULL DEFAULT 0,
      is_deleted           TINYINT(1) NOT NULL DEFAULT 0,
      created_at           DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at           DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS clients (
      id             INT AUTO_INCREMENT PRIMARY KEY,
      name           VARCHAR(255) NOT NULL,
      contact_number VARCHAR(50),
      email          VARCHAR(255),
      company_name   VARCHAR(255),
      notes          TEXT,
      created_by     INT,
      created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at     DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
    )`,
    `CREATE TABLE IF NOT EXISTS work_entries (
      id               INT AUTO_INCREMENT PRIMARY KEY,
      client_id        INT NOT NULL,
      status           VARCHAR(50) NOT NULL DEFAULT 'in_progress',
      work_type        VARCHAR(255) NOT NULL,
      misc_description TEXT,
      time_taken       FLOAT NOT NULL,
      priority         VARCHAR(50) NOT NULL DEFAULT 'Medium',
      work_date        DATE NOT NULL,
      created_by       INT NOT NULL,
      completed_at     DATETIME NULL,
      is_locked        TINYINT(1) NOT NULL DEFAULT 0,
      created_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at       DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS work_entry_employees (
      work_entry_id INT NOT NULL,
      employee_id   INT NOT NULL,
      PRIMARY KEY (work_entry_id, employee_id),
      FOREIGN KEY (work_entry_id) REFERENCES work_entries(id) ON DELETE CASCADE,
      FOREIGN KEY (employee_id) REFERENCES users(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS revenue (
      id            INT AUTO_INCREMENT PRIMARY KEY,
      employee_id   INT NOT NULL,
      client_id     INT NOT NULL,
      work_entry_id INT NULL,
      work_type     VARCHAR(255) NOT NULL,
      value         FLOAT NOT NULL,
      notes         TEXT,
      created_by    INT NOT NULL,
      created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (employee_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
      FOREIGN KEY (work_entry_id) REFERENCES work_entries(id) ON DELETE SET NULL,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS password_resets (
      id         INT AUTO_INCREMENT PRIMARY KEY,
      user_id    INT NOT NULL,
      token      VARCHAR(255) NOT NULL UNIQUE,
      expires_at DATETIME NOT NULL,
      used       TINYINT(1) DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS audit_log (
      id          INT AUTO_INCREMENT PRIMARY KEY,
      user_id     INT NULL,
      user_name   VARCHAR(255),
      user_email  VARCHAR(255),
      action      VARCHAR(255) NOT NULL,
      entity_type VARCHAR(255) NOT NULL,
      entity_id   INT,
      old_values  TEXT,
      new_values  TEXT,
      description TEXT,
      ip_address  VARCHAR(255),
      created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    )`,
    `CREATE TABLE IF NOT EXISTS notifications (
      id         INT AUTO_INCREMENT PRIMARY KEY,
      user_id    INT NOT NULL,
      title      VARCHAR(255) NOT NULL,
      message    TEXT NOT NULL,
      type       VARCHAR(50) DEFAULT 'info',
      link       TEXT,
      is_read    TINYINT(1) DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`
  ];

  for (const sql of statements) {
    await pool.query(sql);
  }
};

// ─── SEED DEFAULT ADMIN ────────────────────────────────────────────────────────

const seedAdmin = async () => {
  const [rows] = await pool.query("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
  if (rows.length === 0) {
    const passwordHash = bcrypt.hashSync('Admin@123', 10);
    await pool.execute(`
      INSERT INTO users (name, email, password_hash, mobile, role, is_active, must_change_password)
      VALUES (?, ?, ?, ?, 'admin', 1, 0)
    `, ['Admin', 'mukherjeenassociates@gmail.com', passwordHash, '']);
    console.log('✅ Admin seeded — Email: mukherjeenassociates@gmail.com | Password: Admin@123');
  } else {
    // Force update the existing admin to the new email
    await pool.execute(`
      UPDATE users SET email = ? WHERE role = 'admin'
    `, ['mukherjeenassociates@gmail.com']);
    console.log('✅ Admin email verified/updated to mukherjeenassociates@gmail.com');
  }
};

const initDB = async () => {
  try {
    await createTables();
    await seedAdmin();
    console.log('✅ Database initialized successfully');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
};

// Attach initDB to the pool so it can be called explicitly
pool.initDB = initDB;

module.exports = pool;

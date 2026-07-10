require('dotenv').config();
const db = require('./db/database');
const { logAudit } = require('./middleware/auth');

async function test() {
  try {
    console.log('Testing audit log insert...');
    await db.execute(`
      INSERT INTO audit_log (user_id, user_name, user_email, action, entity_type, entity_id, description, old_values, new_values, ip_address)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      1,
      'Test User',
      'test@example.com',
      'CREATE',
      'test_entity',
      null,
      'Test description',
      null,
      JSON.stringify({ a: 1 }),
      '127.0.0.1'
    ]);
    console.log('Insert successful!');
  } catch (err) {
    console.error('Test insert failed:', err.message);
  } finally {
    process.exit(0);
  }
}

test();

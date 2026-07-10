require('dotenv').config();
const db = require('./db/database');

(async () => {
  try {
    const [rows] = await db.execute("SELECT r.*, u.name as employee_name FROM revenue r JOIN users u ON r.employee_id = u.id WHERE u.name LIKE '%Sohini%'");
    console.log("REVENUE FOR SOHINI:");
    console.log(rows);
    
    // Also fetch the user id directly
    const [users] = await db.execute("SELECT id, name FROM users WHERE name LIKE '%Sohini%'");
    console.log("SOHINI USERS:");
    console.log(users);
  } catch(e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
})();

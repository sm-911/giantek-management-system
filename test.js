require('dotenv').config();
const db = require('./backend/db/database');

(async () => {
  try {
    const [rows] = await db.execute("SELECT r.*, u.name as employee_name FROM revenue r JOIN users u ON r.employee_id = u.id WHERE u.name LIKE '%Sohini%'");
    console.log("REVENUE FOR SOHINI:");
    console.log(rows);
  } catch(e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
})();


import { initDb, getDb, saveDb } from './db.js';
import { queryAll, queryOne, runSql, lastInsertId } from './db-helper.js';

await initDb();

// Test insert
runSql("INSERT INTO rooms (room_no, floor, room_type, price, status) VALUES (?, ?, ?, ?, ?)", ["TEST", 9, "测试房", 100, "空房"]);
const id = lastInsertId();
console.log("lastInsertId after INSERT:", id);

// Check what's in the DB
const row = queryOne("SELECT * FROM rooms WHERE room_no = 'TEST'");
console.log("Inserted row:", JSON.stringify(row));

// Cleanup
runSql("DELETE FROM rooms WHERE room_no = 'TEST'");
console.log("Cleaned up");

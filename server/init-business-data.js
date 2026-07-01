import { initDb, getDb, saveDb } from './db.js'

await initDb()
const db = getDb()

console.log('🔧 初始化业务数据 — 仅保留房间、客人、菜品...')

// 临时关闭外键约束，方便批量删除
db.run('PRAGMA foreign_keys = OFF')

// ── 按依赖顺序清空所有业务表 ──
const tablesToClear = [
  'incense_sales',      // 依赖 incense_products, bookings
  'catering_orders',    // 依赖 menu_items, bookings
  'deposit_records',    // 依赖 bookings
  'cleaning',           // 依赖 rooms
  'maintenance',        // 依赖 rooms
  'todos',
  'booking_guests',     // 依赖 bookings, guests
  'bookings',           // 依赖 rooms, guests
  'revenue_details',
  'incense_revenue',
  'daily_reports',
  'expenses',
  'shift_reports',
  'price_calendar',
  'incense_products',   // 请香商品 — 清空
]

for (const table of tablesToClear) {
  try {
    db.run(`DELETE FROM ${table}`)
    console.log(`  ✓ 清空 ${table}`)
  } catch (e) {
    console.log(`  - 跳过 ${table}（表不存在）`)
  }
}

// 重新启用外键
db.run('PRAGMA foreign_keys = ON')

// ── 重置所有房间状态为空房 ──
db.run("UPDATE rooms SET status = '空房', updated_at = datetime('now','localtime')")
console.log('  ✓ 所有房间重置为"空房"')

saveDb()

// ── 统计保留的数据 ──
const roomCount = db.exec('SELECT COUNT(*) FROM rooms')[0].values[0][0]
const guestCount = db.exec('SELECT COUNT(*) FROM guests')[0].values[0][0]
const menuCount = db.exec('SELECT COUNT(*) FROM menu_items')[0].values[0][0]

console.log('\n✅ 初始化完成！保留数据：')
console.log(`  🏨 房间：${roomCount} 间`)
console.log(`  👤 客人：${guestCount} 位`)
console.log(`  🍽️  菜品：${menuCount} 道`)
console.log('  📋 其余业务数据（订单、餐饮、请香、支出等）已全部清空')

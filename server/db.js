import initSqlJs from 'sql.js'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import fs from 'fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DB_PATH = process.env.DB_PATH || join(__dirname, '..', 'data', 'hotel.db')
const DATA_DIR = process.env.DATA_DIR || join(__dirname, '..', 'data')

let db = null
let SQL = null

export async function initDb() {
  SQL = await initSqlJs()

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true })
  }

  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH)
    db = new SQL.Database(buffer)
  } else {
    db = new SQL.Database()
  }

  db.run('PRAGMA foreign_keys = ON')
  initSchema()
  saveDb()
  return db
}

export function getDb() {
  if (!db) throw new Error('数据库未初始化，请先调用 initDb()')
  return db
}

export function saveDb() {
  if (!db) return
  const data = db.export()
  const buffer = Buffer.from(data)
  fs.writeFileSync(DB_PATH, buffer)
}

function initSchema() {
  db.run(`
    CREATE TABLE IF NOT EXISTS rooms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_no TEXT NOT NULL UNIQUE,
      floor INTEGER NOT NULL DEFAULT 1,
      room_type TEXT NOT NULL DEFAULT '标准房',
      price REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT '空房' CHECK(status IN ('空房','已入住','清洁中','维修中','已预订')),
      description TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now','localtime')),
      updated_at TEXT DEFAULT (datetime('now','localtime'))
    )
  `)
  db.run(`
    CREATE TABLE IF NOT EXISTS guests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT DEFAULT '',
      id_card TEXT DEFAULT '',
      gender TEXT DEFAULT '未设置' CHECK(gender IN ('男','女','未设置')),
      vip_level INTEGER DEFAULT 0,
      notes TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now','localtime'))
    )
  `)
  db.run(`
    CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_id INTEGER NOT NULL REFERENCES rooms(id),
      guest_id INTEGER REFERENCES guests(id),
      guest_name TEXT NOT NULL,
      guest_phone TEXT DEFAULT '',
      channel TEXT DEFAULT '散客',
      check_in TEXT NOT NULL,
      check_out TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT '已预订' CHECK(status IN ('已预订','已入住','已完成','已取消')),
      amount REAL DEFAULT 0,
      deposit REAL DEFAULT 0,
      notes TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now','localtime')),
      updated_at TEXT DEFAULT (datetime('now','localtime'))
    )
  `)
  // 兼容旧数据库字段
  try { db.run("ALTER TABLE bookings ADD COLUMN channel TEXT DEFAULT '散客'") } catch(e) {}
  try { db.run("ALTER TABLE bookings ADD COLUMN price_per_night REAL DEFAULT 0") } catch(e) {}
  try { db.run("ALTER TABLE bookings ADD COLUMN payment_method TEXT DEFAULT '现金'") } catch(e) {}
  try { db.run("ALTER TABLE bookings ADD COLUMN updated_at TEXT DEFAULT (datetime('now','localtime'))") } catch(e) {}
  try { db.run("ALTER TABLE revenue_details ADD COLUMN updated_at TEXT DEFAULT (datetime('now','localtime'))") } catch(e) {}
  try { db.run("ALTER TABLE incense_revenue ADD COLUMN updated_at TEXT DEFAULT (datetime('now','localtime'))") } catch(e) {}
  try { db.run("ALTER TABLE expenses ADD COLUMN updated_at TEXT DEFAULT (datetime('now','localtime'))") } catch(e) {}
  try { db.run("ALTER TABLE rooms ADD COLUMN price REAL NOT NULL DEFAULT 0") } catch(e) {}
  try { db.run("ALTER TABLE expenses ADD COLUMN receipt_image TEXT DEFAULT ''") } catch(e) {}

  db.run(`
    CREATE TABLE IF NOT EXISTS todos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      priority INTEGER DEFAULT 0,
      due_time TEXT DEFAULT '',
      completed INTEGER DEFAULT 0,
      related_type TEXT DEFAULT '',
      related_id INTEGER DEFAULT NULL,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    )
  `)
  db.run(`
    CREATE TABLE IF NOT EXISTS maintenance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_id INTEGER NOT NULL REFERENCES rooms(id),
      description TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT '待维修' CHECK(status IN ('待维修','维修中','已完成')),
      reported_at TEXT DEFAULT (datetime('now','localtime')),
      resolved_at TEXT DEFAULT NULL
    )
  `)
  db.run(`
    CREATE TABLE IF NOT EXISTS cleaning (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_id INTEGER NOT NULL REFERENCES rooms(id),
      status TEXT NOT NULL DEFAULT '待清洁' CHECK(status IN ('待清洁','清洁中','已完成')),
      assigned_to TEXT DEFAULT '',
      scheduled_at TEXT DEFAULT '',
      completed_at TEXT DEFAULT NULL
    )
  `)
  // 财务模块（旧表，保持兼容）
  db.run(`
    CREATE TABLE IF NOT EXISTS revenue_details (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      report_date TEXT NOT NULL,
      seq INTEGER DEFAULT 0,
      time TEXT DEFAULT '',
      room_no TEXT DEFAULT '',
      price REAL DEFAULT 0,
      channel_type TEXT DEFAULT '',
      channel_source TEXT DEFAULT '',
      amount REAL DEFAULT 0,
      payment_method TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now','localtime'))
    )
  `)
  db.run(`
    CREATE TABLE IF NOT EXISTS incense_revenue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      report_date TEXT NOT NULL,
      seq INTEGER DEFAULT 0,
      time TEXT DEFAULT '',
      amount REAL DEFAULT 0,
      has_commission INTEGER DEFAULT 0,
      commission_rate REAL DEFAULT 0,
      commission_amount REAL DEFAULT 0,
      net_amount REAL DEFAULT 0,
      payment_method TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now','localtime'))
    )
  `)
  // ---- 新增阶段1 表 ----

  // 支出（含图片字段）
  db.run(`
    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      report_date TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT '日常耗材',
      amount REAL DEFAULT 0,
      note TEXT DEFAULT '',
      receipt_image TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now','localtime')),
      updated_at TEXT DEFAULT (datetime('now','localtime'))
    )
  `)

  // 押金记录
  db.run(`
    CREATE TABLE IF NOT EXISTS deposit_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      booking_id INTEGER NOT NULL REFERENCES bookings(id),
      type TEXT NOT NULL CHECK(type IN ('收押金','退押金','扣款')),
      amount REAL NOT NULL DEFAULT 0,
      method TEXT DEFAULT '现金' CHECK(method IN ('现金','微信','支付宝')),
      operator TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now','localtime'))
    )
  `)

  // 菜品
  db.run(`
    CREATE TABLE IF NOT EXISTS menu_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT '热菜' CHECK(category IN ('热菜','凉菜','主食','酒水','汤品')),
      price REAL NOT NULL DEFAULT 0,
      is_available INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    )
  `)

  // 餐饮订单
  db.run(`
    CREATE TABLE IF NOT EXISTS catering_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_no TEXT UNIQUE,
      booking_id INTEGER REFERENCES bookings(id),
      guest_name TEXT NOT NULL,
      guest_phone TEXT DEFAULT '',
      order_type TEXT DEFAULT '堂食' CHECK(order_type IN ('堂食','外卖')),
      items TEXT NOT NULL DEFAULT '[]',
      total REAL DEFAULT 0,
      payment_method TEXT DEFAULT '' CHECK(payment_method IN ('','现金','微信','支付宝','挂房账')),
      status TEXT DEFAULT '就餐中' CHECK(status IN ('就餐中','已结账','已取消')),
      paid_at TEXT,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      updated_at TEXT DEFAULT (datetime('now','localtime'))
    )
  `)

  // 请香商品
  db.run(`
    CREATE TABLE IF NOT EXISTS incense_products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      price REAL NOT NULL DEFAULT 0,
      stock INTEGER NOT NULL DEFAULT 0,
      unit TEXT DEFAULT '份' CHECK(unit IN ('份','套','个')),
      is_available INTEGER NOT NULL DEFAULT 1
    )
  `)

  // 请香销售
  db.run(`
    CREATE TABLE IF NOT EXISTS incense_sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      report_date TEXT NOT NULL,
      booking_id INTEGER REFERENCES bookings(id),
      product_id INTEGER NOT NULL REFERENCES incense_products(id),
      product_name TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      amount REAL NOT NULL DEFAULT 0,
      has_commission INTEGER NOT NULL DEFAULT 0,
      commission_rate REAL DEFAULT 0,
      commission_amount REAL DEFAULT 0,
      net_amount REAL DEFAULT 0,
      payment_method TEXT DEFAULT '现金' CHECK(payment_method IN ('现金','微信','支付宝','挂房账')),
      guest_name TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now','localtime'))
    )
  `)

  // 日报汇总
  db.run(`
    CREATE TABLE IF NOT EXISTS daily_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      report_date TEXT UNIQUE NOT NULL,
      room_revenue REAL DEFAULT 0,
      catering_revenue REAL DEFAULT 0,
      incense_revenue REAL DEFAULT 0,
      total_expense REAL DEFAULT 0,
      net_cashflow REAL DEFAULT 0,
      reporter TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now','localtime')),
      updated_at TEXT DEFAULT (datetime('now','localtime'))
    )
  `)

  // 房价日历
  db.run(`
    CREATE TABLE IF NOT EXISTS price_calendar (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      target_date TEXT NOT NULL,
      room_type TEXT NOT NULL DEFAULT '全部' CHECK(room_type IN ('全部','标准大床房','标准双床房','豪华大床房','豪华双床房','豪华套房')),
      price REAL NOT NULL DEFAULT 0,
      is_weekend INTEGER DEFAULT 0,
      is_holiday INTEGER DEFAULT 0,
      label TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now','localtime'))
    )
  `)
  // 兼容旧库
  try { db.run("CREATE UNIQUE INDEX IF NOT EXISTS idx_price_calendar ON price_calendar(target_date, room_type)") } catch(e) {}

  // 交班报表
  db.run(`
    CREATE TABLE IF NOT EXISTS shift_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      report_date TEXT NOT NULL,
      shift_type TEXT NOT NULL CHECK(shift_type IN ('早班','中班','晚班','全天')),
      reporter TEXT DEFAULT '',
      receiver TEXT DEFAULT '',
      snappy_data TEXT DEFAULT '{}',
      notes TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now','localtime'))
    )
  `)

  // 用户
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      display_name TEXT NOT NULL DEFAULT '',
      role TEXT NOT NULL DEFAULT '前台' CHECK(role IN ('管理员','前台','餐厅','财务')),
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    )
  `)

  // 入住客人明细（支持多位客人）
  db.run(`
    CREATE TABLE IF NOT EXISTS booking_guests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      booking_id INTEGER NOT NULL REFERENCES bookings(id),
      guest_id INTEGER REFERENCES guests(id),
      name TEXT NOT NULL,
      id_card TEXT DEFAULT '',
      phone TEXT DEFAULT '',
      gender TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now','localtime'))
    )
  `)

  // 客人表补充字段
  try { db.run("ALTER TABLE guests ADD COLUMN gender TEXT DEFAULT ''") } catch(e) {}
}

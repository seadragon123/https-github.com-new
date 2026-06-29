import { Router } from 'express'
import { getDb, saveDb } from '../db.js'

const router = Router()

router.post('/', (req, res) => {
  if (req.query.token !== 'seednow') {
    return res.status(403).json({ error: 'Invalid token' })
  }

  const db = getDb()

  // Clear all tables (order by dependency) + reset auto-increment
  db.run('DELETE FROM incense_sales')
  db.run('DELETE FROM catering_orders')
  db.run('DELETE FROM deposit_records')
  db.run('DELETE FROM cleaning')
  db.run('DELETE FROM maintenance')
  db.run('DELETE FROM todos')
  db.run('DELETE FROM bookings')
  db.run('DELETE FROM guests')
  db.run('DELETE FROM rooms')
  db.run('DELETE FROM menu_items')
  db.run('DELETE FROM incense_products')
  db.run('DELETE FROM expenses')
  db.run('DELETE FROM revenue_details')
  db.run('DELETE FROM incense_revenue')
  db.run('DELETE FROM daily_reports')
  db.run('DELETE FROM price_calendar')
  db.run('DELETE FROM shift_reports')
  // Reset auto-increment counters
  db.run("DELETE FROM sqlite_sequence")

  // ─── Rooms (42 rooms) ───
  const roomData = [
    ['101',1,'标准大床房',268,'空房','1楼朝南，采光好'],['102',1,'标准双床房',298,'清洁中',''],
    ['103',1,'标准大床房',268,'空房',''],['104',1,'标准双床房',298,'空房',''],
    ['105',1,'标准大床房',268,'维修中','空调漏水需维修'],['106',1,'豪华大床房',368,'已入住',''],
    ['107',1,'豪华双床房',398,'空房',''],['108',1,'标准大床房',268,'已入住',''],
    ['109',1,'标准双床房',298,'空房',''],['110',1,'豪华大床房',368,'已入住',''],
    ['111',1,'标准大床房',268,'空房',''],['112',1,'标准双床房',298,'空房',''],
    ['113',1,'豪华双床房',398,'空房',''],['114',1,'标准大床房',268,'已入住',''],
    ['115',1,'标准大床房',268,'空房',''],['116',1,'豪华大床房',368,'已入住',''],
    ['117',1,'标准双床房',298,'空房',''],['118',1,'豪华套房',588,'空房',''],
    ['201',2,'标准大床房',268,'已入住',''],['202',2,'标准双床房',298,'已入住',''],
    ['203',2,'标准大床房',268,'空房',''],['204',2,'豪华大床房',368,'已入住','VIP长包房'],
    ['205',2,'豪华套房',588,'已预订',''],['206',2,'标准双床房',298,'空房',''],
    ['207',2,'标准大床房',268,'清洁中',''],['208',2,'豪华大床房',368,'空房',''],
    ['209',2,'标准双床房',298,'空房',''],['210',2,'豪华套房',588,'已入住',''],
    ['211',2,'标准大床房',268,'空房',''],['212',2,'标准双床房',298,'空房',''],
    ['213',2,'豪华大床房',368,'空房',''],['214',2,'标准大床房',268,'已入住',''],
    ['215',2,'豪华双床房',398,'空房',''],['216',2,'豪华大床房',368,'空房',''],
    ['217',2,'标准双床房',298,'空房',''],['218',2,'豪华套房',588,'已入住',''],
    ['301',3,'豪华套房',588,'空房',''],['302',3,'豪华大床房',368,'清洁中','退房待清洁'],
    ['303',3,'豪华双床房',398,'已入住',''],['304',3,'标准大床房',268,'空房',''],
    ['305',3,'豪华套房',588,'已入住',''],['306',3,'标准双床房',298,'空房',''],
  ]
  for (const r of roomData) {
    db.run('INSERT INTO rooms (room_no, floor, room_type, price, status, description) VALUES (?, ?, ?, ?, ?, ?)', r)
  }

  // ─── Guests ───
  const guestData = [
    ['张先生','13800138001','110101199001011234',1,'商务旅客，偏好高层'],['李明','13900139002','110101198505152345',0,''],
    ['王总','13600136003','110101197803033456',2,'VIP客户，公司协议价'],['赵女士','13700137004','110101199212124567',0,'带小孩，需要婴儿床'],
    ['陈先生','13500135005','110101198808085678',1,'长住客，每周一入住'],['刘先生','13300133006','',0,''],
    ['周女士','13200132007','',0,''],['吴总','13100131008','',1,'携程常客'],
    ['杨先生','13000130009','',0,''],['黄女士','18800188010','',0,'喜欢安静，高楼层'],
  ]
  for (const g of guestData) {
    db.run('INSERT INTO guests (name, phone, id_card, vip_level, notes) VALUES (?, ?, ?, ?, ?)', g)
  }

  // ─── Bookings ───
  const bookingData = [
    [1,1,'张先生','13800138001','散客','2026-06-26','2026-06-28','已入住',536,200,''],
    [6,4,'赵女士','13700137004','携程','2026-06-25','2026-06-27','已入住',736,300,'需要婴儿床，今日退房'],
    [8,2,'李明','13900139002','散客','2026-06-26','2026-06-27','已入住',536,200,'今日退房'],
    [9,3,'王总','13600136003','协议','2026-06-24','2026-06-28','已入住',2144,500,'VIP长住'],
    [10,5,'陈先生','13500135005','美团','2026-06-27','2026-06-28','已入住',298,100,'今日入住'],
    [14,3,'王总','13600136003','协议','2026-06-28','2026-07-01','已预订',1764,500,'续订'],
    [18,null,'刘先生','13300133006','携程','2026-06-26','2026-06-28','已入住',536,400,''],
    [23,null,'周女士','13200132007','飞猪','2026-06-26','2026-06-27','已入住',368,200,'今日退房'],
    [16,null,'吴总','13100131008','携程','2026-06-27','2026-06-29','已入住',796,300,'今日入住，携程超级会员'],
    [24,null,'杨先生','13000130009','美团','2026-06-27','2026-06-28','已入住',298,100,'今日入住'],
    [20,null,'黄女士','18800188010','陪护','2026-06-21','2026-06-24','已完成',1072,500,'已退房'],
  ]
  for (const b of bookingData) {
    db.run('INSERT INTO bookings (room_id, guest_id, guest_name, guest_phone, channel, check_in, check_out, status, amount, deposit, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', b)
  }

  // ─── Deposit Records ───
  const depositData = [
    [1,'收押金',200,'现金','前台'],[6,'收押金',300,'微信','前台'],[8,'收押金',200,'现金','前台'],
    [9,'收押金',500,'支付宝','前台'],[10,'收押金',100,'微信','前台'],[18,'收押金',400,'现金','前台'],
    [23,'收押金',200,'现金','前台'],[16,'收押金',300,'微信','前台'],[24,'收押金',100,'现金','前台'],
    [20,'收押金',500,'现金','前台'],[20,'退押金',500,'现金','前台'],
  ]
  for (const d of depositData) {
    db.run('INSERT INTO deposit_records (booking_id, type, amount, method, operator) VALUES (?, ?, ?, ?, ?)', d)
  }

  // ─── Menu Items ───
  const menuData = [
    ['回锅肉','热菜',38,1,1],['宫保鸡丁','热菜',36,1,2],['鱼香肉丝','热菜',32,1,3],
    ['麻婆豆腐','热菜',28,1,4],['酸辣土豆丝','热菜',22,1,5],['清蒸鲈鱼','热菜',68,1,6],
    ['蒜蓉西兰花','热菜',26,1,7],['西红柿炒蛋','热菜',24,1,8],['凉拌黄瓜','凉菜',16,1,1],
    ['凉拌木耳','凉菜',18,1,2],['皮蛋豆腐','凉菜',20,1,3],['米饭','主食',3,1,1],
    ['馒头','主食',2,1,2],['蛋炒饭','主食',15,1,3],['面条','主食',12,1,4],
    ['可乐','酒水',5,1,1],['雪碧','酒水',5,1,2],['矿泉水','酒水',3,1,3],
    ['啤酒','酒水',8,1,4],['酸辣汤','汤品',24,1,1],['紫菜蛋花汤','汤品',18,1,2],
    ['西红柿蛋汤','汤品',16,1,3],
  ]
  for (const m of menuData) {
    db.run('INSERT INTO menu_items (name, category, price, is_available, sort_order) VALUES (?, ?, ?, ?, ?)', m)
  }

  // ─── Incense Products ───
  const ip = [
    ['平安香',88,50,'份',1],['财运香',168,30,'份',1],['许愿香',128,40,'份',1],
    ['全家福套装',388,15,'套',1],['祈福香礼盒',588,10,'套',1],['花果供品',68,25,'份',1],
    ['祈福灯',98,20,'个',1],['平安灯',138,20,'个',1],
  ]
  for (const p of ip) {
    db.run('INSERT INTO incense_products (name, price, stock, unit, is_available) VALUES (?, ?, ?, ?, ?)', p)
  }

  // ─── Incense Sales ───
  const incSales = [
    ['2026-06-27',1,1,'平安香',2,176,1,5,8.80,167.20,'现金','张先生'],
    ['2026-06-27',null,4,'全家福套装',1,388,0,0,0,388,'微信','李女士'],
    ['2026-06-27',9,6,'花果供品',1,68,0,0,0,68,'挂房账','王总'],
  ]
  for (const s of incSales) {
    db.run('INSERT INTO incense_sales (report_date, booking_id, product_id, product_name, quantity, amount, has_commission, commission_rate, commission_amount, net_amount, payment_method, guest_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', s)
  }

  // ─── Catering Orders ───
  const catOrders = [
    ['CY20260627001',1,'张先生','13800138001','堂食',JSON.stringify([{id:1,name:'回锅肉',qty:1,price:38},{id:12,name:'米饭',qty:2,price:3}]),44,'挂房账','已结账','2026-06-27 12:30:00'],
    ['CY20260627002',null,'李女士','13900139002','堂食',JSON.stringify([{id:4,name:'麻婆豆腐',qty:1,price:28},{id:20,name:'酸辣汤',qty:1,price:24},{id:12,name:'米饭',qty:1,price:3}]),55,'微信','已结账','2026-06-27 12:15:00'],
    ['CY20260627003',null,'外卖客人','','外卖',JSON.stringify([{id:2,name:'宫保鸡丁',qty:1,price:36},{id:12,name:'米饭',qty:1,price:3}]),39,'支付宝','已结账','2026-06-27 11:45:00'],
    ['CY20260627004',null,'王先生','13500135005','堂食',JSON.stringify([{id:5,name:'酸辣土豆丝',qty:1,price:22},{id:12,name:'米饭',qty:1,price:3}]),25,'','就餐中',''],
  ]
  for (const o of catOrders) {
    db.run("INSERT INTO catering_orders (order_no, booking_id, guest_name, guest_phone, order_type, items, total, payment_method, status, paid_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", o)
  }

  // ─── Expenses ───
  const expenseData = [
    ['2026-06-27','日常耗材',150,'买纸巾、洗浴用品'],['2026-06-27','餐饮成本',320,'蔬菜肉类采购'],
    ['2026-06-27','维修杂费',50,'灯泡更换'],['2026-06-26','日常耗材',200,'床单换新'],
  ]
  for (const e of expenseData) {
    db.run('INSERT INTO expenses (report_date, category, amount, note) VALUES (?, ?, ?, ?)', e)
  }

  // ─── Todos ───
  const todoData = [
    ['VIP客户王总 15:00到达，准备接待',2,'2026-06-27 15:00',0,'guest',3],
    ['检查 102 房清洁结果',1,'2026-06-27 12:00',1,'room',2],
    ['确认赵女士、李明、周女士退房结账',2,'2026-06-27 12:00',0,'',null],
    ['补货 2楼mini吧饮品',0,'2026-06-27 18:00',0,'',null],
    ['维修师傅检查105空调',1,'2026-06-27 14:00',0,'room',5],
    ['确认206退房结账',2,'2026-06-27 11:00',0,'booking',7],
  ]
  for (const t of todoData) {
    db.run('INSERT INTO todos (title, priority, due_time, completed, related_type, related_id) VALUES (?, ?, ?, ?, ?, ?)', t)
  }

  // ─── Maintenance & Cleaning ───
  db.run('INSERT INTO maintenance (room_id, description, status) VALUES (?, ?, ?)', [5, '空调漏水，需更换排水管', '维修中'])
  db.run('INSERT INTO maintenance (room_id, description, status, reported_at, resolved_at) VALUES (?, ?, ?, ?, ?)', [8, '门锁故障，感应不灵敏', '已完成', '2026-06-22', '2026-06-23'])
  db.run('INSERT INTO cleaning (room_id, status, assigned_to, scheduled_at) VALUES (?, ?, ?, ?)', [2, '清洁中', '李阿姨', '2026-06-24 10:00'])
  db.run('INSERT INTO cleaning (room_id, status, assigned_to, scheduled_at) VALUES (?, ?, ?, ?)', [18, '清洁中', '王阿姨', '2026-06-24 11:00'])
  db.run('INSERT INTO cleaning (room_id, status, assigned_to, scheduled_at) VALUES (?, ?, ?, ?)', [13, '待清洁', '', '2026-06-24 14:00'])
  db.run('INSERT INTO cleaning (room_id, status, assigned_to, scheduled_at) VALUES (?, ?, ?, ?)', [27, '待清洁', '', '2026-06-24 15:00'])

  saveDb()
  res.json({ success: true, message: '全量种子数据已导入' })
})

export default router

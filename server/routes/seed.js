import { Router } from 'express'
import { getDb, saveDb } from '../db.js'

const router = Router()

router.post('/', (req, res) => {
  if (req.query.token !== 'seednow') {
    return res.status(403).json({ error: 'Invalid token' })
  }

  const db = getDb()

  // Clear all tables (order by dependency)
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

  // Rooms (42 rooms)
  const roomData = [
    ['101', 1, '标准大床房', 268, '空房', '1楼朝南，采光好'],
    ['102', 1, '标准双床房', 298, '清洁中', ''],
    ['103', 1, '标准大床房', 268, '空房', ''],
    ['104', 1, '标准双床房', 298, '空房', ''],
    ['105', 1, '标准大床房', 268, '维修中', '空调漏水需维修'],
    ['106', 1, '豪华大床房', 368, '已入住', ''],
    ['107', 1, '豪华双床房', 398, '空房', ''],
    ['108', 1, '标准大床房', 268, '已入住', ''],
    ['109', 1, '标准双床房', 298, '空房', ''],
    ['110', 1, '豪华大床房', 368, '已入住', ''],
    ['111', 1, '标准大床房', 268, '空房', ''],
    ['112', 1, '标准双床房', 298, '空房', ''],
    ['113', 1, '豪华双床房', 398, '空房', ''],
    ['114', 1, '标准大床房', 268, '已入住', ''],
    ['115', 1, '标准大床房', 268, '空房', ''],
    ['116', 1, '豪华大床房', 368, '已入住', ''],
    ['117', 1, '标准双床房', 298, '空房', ''],
    ['118', 1, '豪华套房', 588, '空房', ''],
    ['201', 2, '标准大床房', 268, '已入住', ''],
    ['202', 2, '标准双床房', 298, '已入住', ''],
    ['203', 2, '标准大床房', 268, '空房', ''],
    ['204', 2, '豪华大床房', 368, '已入住', 'VIP长包房'],
    ['205', 2, '豪华套房', 588, '已预订', ''],
    ['206', 2, '标准双床房', 298, '空房', ''],
    ['207', 2, '标准大床房', 268, '清洁中', ''],
    ['208', 2, '豪华大床房', 368, '空房', ''],
    ['209', 2, '标准双床房', 298, '空房', ''],
    ['210', 2, '豪华套房', 588, '已入住', ''],
    ['211', 2, '标准大床房', 268, '空房', ''],
    ['212', 2, '标准双床房', 298, '空房', ''],
    ['213', 2, '豪华大床房', 368, '空房', ''],
    ['214', 2, '标准大床房', 268, '已入住', ''],
    ['215', 2, '豪华双床房', 398, '空房', ''],
    ['216', 2, '豪华大床房', 368, '空房', ''],
    ['217', 2, '标准双床房', 298, '空房', ''],
    ['218', 2, '豪华套房', 588, '已入住', ''],
    ['301', 3, '豪华套房', 588, '空房', ''],
    ['302', 3, '豪华大床房', 368, '清洁中', '退房待清洁'],
    ['303', 3, '豪华双床房', 398, '已入住', ''],
    ['304', 3, '标准大床房', 268, '空房', ''],
    ['305', 3, '豪华套房', 588, '已入住', ''],
    ['306', 3, '标准双床房', 298, '空房', ''],
  ]
  for (const r of roomData) {
    db.run('INSERT INTO rooms (room_no, floor, room_type, price, status, description) VALUES (?, ?, ?, ?, ?, ?)', r)
  }

  // Guests
  const guestData = [
    ['张先生', '13800138001', '110101199001011234', 1, '商务旅客，偏好高层'],
    ['李明', '13900139002', '110101198505152345', 0, ''],
    ['王总', '13600136003', '110101197803033456', 2, 'VIP客户，公司协议价'],
    ['赵女士', '13700137004', '110101199212124567', 0, '带小孩，需要婴儿床'],
    ['陈先生', '13500135005', '110101198808085678', 1, '长住客，每周一入住'],
    ['刘先生', '13300133006', '', 0, ''],
    ['周女士', '13200132007', '', 0, ''],
    ['吴总', '13100131008', '', 1, '携程常客'],
    ['杨先生', '13000130009', '', 0, ''],
    ['黄女士', '18800188010', '', 0, '喜欢安静，高楼层'],
  ]
  for (const g of guestData) {
    db.run('INSERT INTO guests (name, phone, id_card, vip_level, notes) VALUES (?, ?, ?, ?, ?)', g)
  }

  saveDb()
  res.json({ success: true, rooms: roomData.length, guests: guestData.length })

  // Mini seed: also populate menu, incense, etc in background
  try {
    // Menus
    const menuData = [
      ['回锅肉', '热菜', 38, 1, 1], ['宫保鸡丁', '热菜', 36, 1, 2],
      ['鱼香肉丝', '热菜', 32, 1, 3], ['麻婆豆腐', '热菜', 28, 1, 4],
      ['酸辣土豆丝', '热菜', 22, 1, 5], ['清蒸鲈鱼', '热菜', 68, 1, 6],
      ['蒜蓉西兰花', '热菜', 26, 1, 7], ['西红柿炒蛋', '热菜', 24, 1, 8],
      ['凉拌黄瓜', '凉菜', 16, 1, 1], ['凉拌木耳', '凉菜', 18, 1, 2],
      ['皮蛋豆腐', '凉菜', 20, 1, 3], ['米饭', '主食', 3, 1, 1],
      ['馒头', '主食', 2, 1, 2], ['蛋炒饭', '主食', 15, 1, 3],
      ['面条', '主食', 12, 1, 4], ['可乐', '酒水', 5, 1, 1],
      ['雪碧', '酒水', 5, 1, 2], ['矿泉水', '酒水', 3, 1, 3],
      ['啤酒', '酒水', 8, 1, 4], ['酸辣汤', '汤品', 24, 1, 1],
      ['紫菜蛋花汤', '汤品', 18, 1, 2], ['西红柿蛋汤', '汤品', 16, 1, 3],
    ]
    for (const m of menuData) {
      db.run('INSERT OR IGNORE INTO menu_items (name, category, price, is_available, sort_order) VALUES (?, ?, ?, ?, ?)', m)
    }
    // Incense products
    const ip = [
      ['平安香', 88, 50, '份', 1], ['财运香', 168, 30, '份', 1],
      ['许愿香', 128, 40, '份', 1], ['全家福套装', 388, 15, '套', 1],
      ['祈福香礼盒', 588, 10, '套', 1], ['花果供品', 68, 25, '份', 1],
      ['祈福灯', 98, 20, '个', 1], ['平安灯', 138, 20, '个', 1],
    ]
    for (const p of ip) {
      db.run('INSERT OR IGNORE INTO incense_products (name, price, stock, unit, is_available) VALUES (?, ?, ?, ?, ?)', p)
    }
    saveDb()
  } catch(e) { console.error('extra seed error:', e.message) }
})

export default router

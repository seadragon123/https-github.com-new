import { Router } from 'express'
import { queryAll, queryOne, runSql, insertAndGetId } from '../db-helper.js'

const router = Router()

// 获取所有房间（支持筛选）
router.get('/', (req, res) => {
  const { status } = req.query
  let sql = `SELECT r.*,
    (SELECT guest_name FROM bookings WHERE room_id = r.id AND status = '已入住' LIMIT 1) as current_guest,
    (SELECT check_in FROM bookings WHERE room_id = r.id AND status = '已入住' LIMIT 1) as check_in_date
    FROM rooms r`
  const params = []
  if (status && status !== '全部房间') {
    sql += ` WHERE r.status = ?`
    params.push(status)
  }
  sql += ` ORDER BY r.floor, r.room_no`
  res.json(queryAll(sql, params))
})

// 获取单个房间详情
router.get('/:id', (req, res) => {
  const room = queryOne(`SELECT * FROM rooms WHERE id = ?`, [req.params.id])
  if (!room) return res.status(404).json({ error: '房间不存在' })

  const currentBooking = queryOne(
    `SELECT * FROM bookings WHERE room_id = ? AND status = '已入住' ORDER BY check_in DESC LIMIT 1`, [req.params.id]
  )

  // 入住客人明细
  let bookingGuests = []
  if (currentBooking) {
    bookingGuests = queryAll('SELECT * FROM booking_guests WHERE booking_id = ? ORDER BY id', [currentBooking.id])
  }

  const history = queryAll(
    `SELECT b.*, COALESCE(g.name, b.guest_name) as guest_name FROM bookings b
     LEFT JOIN guests g ON b.guest_id = g.id
     WHERE b.room_id = ? ORDER BY b.created_at DESC LIMIT 10`, [req.params.id]
  )

  res.json({ room, currentBooking, bookingGuests, history })
})

// 更新房间状态
router.patch('/:id', (req, res) => {
  const { status } = req.body
  runSql(`UPDATE rooms SET status = ?, updated_at = datetime('now','localtime') WHERE id = ?`, [status, req.params.id])
  res.json({ success: true })
})

// 更新房间信息
router.put('/:id', (req, res) => {
  const { room_no, floor, room_type, description } = req.body
  const room = queryOne(`SELECT * FROM rooms WHERE id = ?`, [req.params.id])
  if (!room) return res.status(404).json({ error: '房间不存在' })
  runSql(
    `UPDATE rooms SET room_no=?, floor=?, room_type=?, description=?, updated_at=datetime('now','localtime') WHERE id=?`,
    [room_no || room.room_no, floor ?? room.floor, room_type || room.room_type, description ?? room.description, req.params.id]
  )
  res.json({ success: true })
})

// 新增房间
router.post('/', (req, res) => {
  const { room_no, floor, room_type, description } = req.body
  if (!room_no) return res.status(400).json({ error: '房号不能为空' })
  // 检查重复
  const existing = queryOne(`SELECT id FROM rooms WHERE room_no = ?`, [room_no])
  if (existing) return res.status(409).json({ error: `房号 ${room_no} 已存在` })
  const id = insertAndGetId(
    `INSERT INTO rooms (room_no, floor, room_type, status, description) VALUES (?, ?, ?, '空房', ?)`,
    [room_no, floor || 1, room_type || '标准大床房', description || '']
  )
  res.json({ id, success: true })
})

// 删除房间
router.delete('/:id', (req, res) => {
  const room = queryOne(`SELECT * FROM rooms WHERE id = ?`, [req.params.id])
  if (!room) return res.status(404).json({ error: '房间不存在' })
  const active = queryOne(`SELECT COUNT(*) as cnt FROM bookings WHERE room_id = ? AND status IN ('已入住','已预订')`, [req.params.id])
  if (active.cnt > 0) return res.status(400).json({ error: '该房间有活跃订单，不能删除' })
  runSql(`DELETE FROM rooms WHERE id = ?`, [req.params.id])
  res.json({ success: true })
})

// 获取可选房间（用于入住）
router.get('/available/list', (req, res) => {
  const { checkIn, checkOut } = req.query
  let sql = `SELECT * FROM rooms WHERE status IN ('空房','清洁中')`
  const params = []
  if (checkIn && checkOut) {
    sql += ` AND id NOT IN (
      SELECT room_id FROM bookings WHERE status IN ('已入住','已预订')
      AND check_out > ? AND check_in < ?
    )`
    params.push(checkIn, checkOut)
  }
  sql += ` ORDER BY floor, room_no`
  res.json(queryAll(sql, params))
})

export default router

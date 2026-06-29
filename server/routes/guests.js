import { Router } from 'express'
import { queryAll, queryOne, runSql, insertAndGetId } from '../db-helper.js'

const router = Router()

// 获取客人列表
router.get('/', (req, res) => {
  const { search } = req.query
  let sql = `SELECT g.*,
    (SELECT COUNT(*) FROM bookings WHERE guest_id = g.id) as booking_count,
    (SELECT COALESCE(SUM(amount), 0) FROM bookings WHERE guest_id = g.id) as total_spent,
    (SELECT MAX(check_out) FROM bookings WHERE guest_id = g.id AND status = '已完成') as last_visit
    FROM guests g`
  const params = []
  if (search) {
    sql += ` WHERE g.name LIKE ? OR g.phone LIKE ?`
    params.push(`%${search}%`, `%${search}%`)
  }
  sql += ` ORDER BY g.vip_level DESC, g.name`
  res.json(queryAll(sql, params))
})

// 获取单个客人详情
router.get('/:id', (req, res) => {
  const guest = queryOne(`SELECT * FROM guests WHERE id = ?`, [req.params.id])
  if (!guest) return res.status(404).json({ error: '客人不存在' })
  const bookings = queryAll(
    `SELECT b.*, r.room_no, r.room_type FROM bookings b
     JOIN rooms r ON b.room_id = r.id
     WHERE b.guest_id = ? ORDER BY b.created_at DESC LIMIT 20`, [req.params.id]
  )
  res.json({ guest, bookings })
})

// 新增客人
router.post('/', (req, res) => {
  const { name, phone, id_card, gender, vip_level, notes } = req.body
  if (!name) return res.status(400).json({ error: '姓名不能为空' })
  const id = insertAndGetId(
    `INSERT INTO guests (name, phone, id_card, gender, vip_level, notes) VALUES (?, ?, ?, ?, ?, ?)`,
    [name, phone || '', id_card || '', gender || '未设置', vip_level || 0, notes || '']
  )
  res.json({ id, success: true })
})

// 编辑客人
router.put('/:id', (req, res) => {
  const { name, phone, id_card, gender, vip_level, notes } = req.body
  const guest = queryOne(`SELECT * FROM guests WHERE id = ?`, [req.params.id])
  if (!guest) return res.status(404).json({ error: '客人不存在' })
  runSql(
    `UPDATE guests SET name=?, phone=?, id_card=?, gender=?, vip_level=?, notes=? WHERE id=?`,
    [name ?? guest.name, phone ?? guest.phone, id_card ?? guest.id_card, gender ?? guest.gender, vip_level ?? guest.vip_level, notes ?? guest.notes, req.params.id]
  )
  res.json({ success: true })
})

// 删除客人
router.delete('/:id', (req, res) => {
  runSql(`DELETE FROM guests WHERE id = ?`, [req.params.id])
  res.json({ success: true })
})

export default router

import { Router } from 'express'
import { queryAll, queryOne, runSql, insertAndGetId } from '../db-helper.js'

const router = Router()

// ─── 维修报修 ───

router.get('/', (req, res) => {
  const { status } = req.query
  let sql = `SELECT m.*, r.room_no, r.floor
    FROM maintenance m JOIN rooms r ON m.room_id = r.id`
  const params = []
  if (status && status !== '全部') {
    sql += ` WHERE m.status = ?`
    params.push(status)
  }
  sql += ` ORDER BY m.reported_at DESC`
  res.json(queryAll(sql, params))
})

router.get('/:id', (req, res) => {
  const item = queryOne(`SELECT m.*, r.room_no, r.floor FROM maintenance m JOIN rooms r ON m.room_id = r.id WHERE m.id = ?`, [req.params.id])
  if (!item) return res.status(404).json({ error: '不存在' })
  res.json(item)
})

router.post('/', (req, res) => {
  const { room_id, description } = req.body
  if (!room_id || !description) return res.status(400).json({ error: '缺少必填字段' })
  const id = insertAndGetId(`INSERT INTO maintenance (room_id, description, status) VALUES (?, ?, '待维修')`, [room_id, description])
  runSql(`UPDATE rooms SET status = '维修中', updated_at = datetime('now','localtime') WHERE id = ?`, [room_id])
  res.json({ id, success: true })
})

router.put('/:id', (req, res) => {
  const { description, status } = req.body
  const item = queryOne(`SELECT * FROM maintenance WHERE id = ?`, [req.params.id])
  if (!item) return res.status(404).json({ error: '不存在' })
  const newStatus = status || item.status
  runSql(`UPDATE maintenance SET description=?, status=?, resolved_at=CASE WHEN ?='已完成' THEN datetime('now','localtime') ELSE resolved_at END WHERE id=?`,
    [description ?? item.description, newStatus, newStatus, req.params.id])
  // 维修完成 → 房间恢复空房
  if (newStatus === '已完成') {
    runSql(`UPDATE rooms SET status = '空房', updated_at = datetime('now','localtime') WHERE id = ?`, [item.room_id])
  }
  res.json({ success: true })
})

router.delete('/:id', (req, res) => {
  runSql(`DELETE FROM maintenance WHERE id = ?`, [req.params.id])
  res.json({ success: true })
})

export default router

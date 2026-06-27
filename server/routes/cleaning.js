import { Router } from 'express'
import { queryAll, queryOne, runSql, insertAndGetId } from '../db-helper.js'

const router = Router()

// ─── 清洁管理 ───

router.get('/', (req, res) => {
  const { status } = req.query
  let sql = `SELECT c.*, r.room_no, r.floor, r.room_type
    FROM cleaning c JOIN rooms r ON c.room_id = r.id`
  const params = []
  if (status && status !== '全部') {
    sql += ` WHERE c.status = ?`
    params.push(status)
  }
  sql += ` ORDER BY c.scheduled_at ASC`
  res.json(queryAll(sql, params))
})

router.post('/', (req, res) => {
  const { room_id, assigned_to, scheduled_at } = req.body
  if (!room_id) return res.status(400).json({ error: '缺少房间' })
  const id = insertAndGetId(
    `INSERT INTO cleaning (room_id, status, assigned_to, scheduled_at) VALUES (?, '待清洁', ?, ?)`,
    [room_id, assigned_to || '', scheduled_at || '']
  )
  runSql(`UPDATE rooms SET status = '清洁中', updated_at = datetime('now','localtime') WHERE id = ?`, [room_id])
  res.json({ id, success: true })
})

router.put('/:id', (req, res) => {
  const { status, assigned_to } = req.body
  const item = queryOne(`SELECT * FROM cleaning WHERE id = ?`, [req.params.id])
  if (!item) return res.status(404).json({ error: '不存在' })
  const newStatus = status || item.status
  runSql(`UPDATE cleaning SET status=?, assigned_to=?, completed_at=CASE WHEN ?='已完成' THEN datetime('now','localtime') ELSE completed_at END WHERE id=?`,
    [newStatus, assigned_to ?? item.assigned_to, newStatus, req.params.id])
  if (newStatus === '已完成') {
    runSql(`UPDATE rooms SET status = '空房', updated_at = datetime('now','localtime') WHERE id = ?`, [item.room_id])
  }
  res.json({ success: true })
})

router.delete('/:id', (req, res) => {
  runSql(`DELETE FROM cleaning WHERE id = ?`, [req.params.id])
  res.json({ success: true })
})

export default router

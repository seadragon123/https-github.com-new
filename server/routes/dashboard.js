import { Router } from 'express'
import { queryAll, queryOne, runSql, insertAndGetId } from '../db-helper.js'

const router = Router()

// 今日概览数据
router.get('/overview', (req, res) => {
  const today = new Date().toISOString().slice(0, 10)

  const checkInToday = queryOne(
    `SELECT COUNT(*) as count FROM bookings WHERE check_in = ? AND status IN ('已入住','已预订')`, [today]
  )
  const checkOutToday = queryOne(
    `SELECT COUNT(*) as count FROM bookings WHERE check_out = ? AND status = '已入住'`, [today]
  )
  const emptyRooms = queryOne(`SELECT COUNT(*) as count FROM rooms WHERE status = '空房'`)
  const todoCount = queryOne(`SELECT COUNT(*) as count FROM todos WHERE completed = 0`)
  const occupied = queryOne(`SELECT COUNT(*) as count FROM rooms WHERE status = '已入住'`)
  const maintenance = queryOne(`SELECT COUNT(*) as count FROM rooms WHERE status = '维修中'`)
  const totalRooms = queryOne(`SELECT COUNT(*) as count FROM rooms`)

  res.json({
    checkIn: checkInToday.count,
    checkOut: checkOutToday.count,
    emptyRooms: emptyRooms.count,
    occupied: occupied.count,
    maintenance: maintenance.count,
    todoCount: todoCount.count,
    totalRooms: totalRooms.count
  })
})

// 待办列表
router.get('/todos', (req, res) => {
  const { completed } = req.query
  let rows
  if (completed === 'all') {
    rows = queryAll(`SELECT * FROM todos ORDER BY priority DESC, completed ASC, due_time ASC`)
  } else {
    rows = queryAll(`SELECT * FROM todos WHERE completed = ? ORDER BY priority DESC, due_time ASC`, [completed || 0])
  }
  res.json(rows)
})

// 切换待办完成状态
router.patch('/todos/:id/toggle', (req, res) => {
  const todo = queryOne(`SELECT * FROM todos WHERE id = ?`, [req.params.id])
  if (!todo) return res.status(404).json({ error: '待办不存在' })
  runSql(`UPDATE todos SET completed = ? WHERE id = ?`, [todo.completed ? 0 : 1, req.params.id])
  res.json({ success: true })
})

// 新增待办
router.post('/todos', (req, res) => {
  const { title, priority, due_time } = req.body
  if (!title) return res.status(400).json({ error: '标题不能为空' })
  const result = insertAndGetId(`INSERT INTO todos (title, priority, due_time) VALUES (?, ?, ?)`, [title, priority || 0, due_time || ''])
  res.json({ id: result, success: true })
})

// 删除待办
router.delete('/todos/:id', (req, res) => {
  runSql(`DELETE FROM todos WHERE id = ?`, [req.params.id])
  res.json({ success: true })
})

export default router

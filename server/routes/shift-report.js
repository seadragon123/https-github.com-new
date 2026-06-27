import { Router } from 'express'
import { queryAll, queryOne, runSql, insertAndGetId } from '../db-helper.js'

const router = Router()

// ─── 生成交班快照 ───

function generateSnapshot(reportDate) {
  const d = reportDate || new Date().toISOString().slice(0, 10)

  // 房态统计
  const rooms = queryAll('SELECT status, COUNT(*) as count FROM rooms GROUP BY status')
  const roomStats = {}
  let totalRooms = 0
  for (const r of rooms) {
    roomStats[r.status] = r.count
    totalRooms += r.count
  }

  // 今日入住/退房
  const todayCheckins = queryAll(
    "SELECT COUNT(*) as count FROM bookings WHERE check_in = ? AND status IN ('已入住','已完成')", [d]
  )[0]?.count || 0
  const todayCheckouts = queryAll(
    "SELECT COUNT(*) as count FROM bookings WHERE check_out = ? AND status = '已完成'", [d]
  )[0]?.count || 0

  // 今日收入汇总
  const roomRevenue = queryAll(
    "SELECT COALESCE(SUM(amount),0) as total FROM bookings WHERE status='已完成' AND date(updated_at)=?", [d]
  )[0]?.total || 0
  const cateringRevenue = queryAll(
    "SELECT COALESCE(SUM(total),0) as total FROM catering_orders WHERE status='已结账' AND date(paid_at)=?", [d]
  )[0]?.total || 0
  const incenseRevenue = queryAll(
    "SELECT COALESCE(SUM(net_amount),0) as total FROM incense_sales WHERE report_date=?", [d]
  )[0]?.total || 0
  const totalExpense = queryAll(
    "SELECT COALESCE(SUM(amount),0) as total FROM expenses WHERE report_date=?", [d]
  )[0]?.total || 0

  // 押金概况
  const depositTotal = queryAll(
    "SELECT COALESCE(SUM(amount),0) as total FROM deposit_records WHERE type='收押金' AND date(created_at)=?", [d]
  )[0]?.total || 0

  // 待办
  const pendingTodos = queryAll("SELECT COUNT(*) as count FROM todos WHERE completed=0")[0]?.count || 0

  // 今日餐饮概况
  const cateringOrders = queryAll("SELECT COUNT(*) as count FROM catering_orders WHERE date(created_at)=?", [d])[0]?.count || 0
  const pendingCatering = queryAll("SELECT COUNT(*) as count FROM catering_orders WHERE date(created_at)=? AND status='就餐中'", [d])[0]?.count || 0

  return {
    date: d,
    roomStats,
    totalRooms,
    todayCheckins,
    todayCheckouts,
    revenue: { room: roomRevenue, catering: cateringRevenue, incense: incenseRevenue, totalExpense },
    depositTotal,
    pendingTodos,
    cateringOrders,
    pendingCatering
  }
}

// ─── 创建交班报表 ───

router.post('/', (req, res) => {
  const { report_date, shift_type, reporter, receiver, notes } = req.body
  if (!shift_type) return res.status(400).json({ error: '缺少班次' })

  const d = report_date || new Date().toISOString().slice(0, 10)
  const snapshot = generateSnapshot(d)

  const id = insertAndGetId(
    'INSERT INTO shift_reports (report_date, shift_type, reporter, receiver, snappy_data, notes) VALUES (?, ?, ?, ?, ?, ?)',
    [d, shift_type, reporter || '', receiver || '', JSON.stringify(snapshot), notes || '']
  )
  res.json({ id, snapshot, success: true })
})

// ─── 获取交班报表列表 ───

router.get('/', (req, res) => {
  const { date, shift_type } = req.query
  let sql = 'SELECT * FROM shift_reports'
  const params = []
  const conditions = []
  if (date) {
    conditions.push('report_date = ?')
    params.push(date)
  }
  if (shift_type) {
    conditions.push('shift_type = ?')
    params.push(shift_type)
  }
  if (conditions.length > 0) sql += ' WHERE ' + conditions.join(' AND ')
  sql += ' ORDER BY created_at DESC'

  const rows = queryAll(sql, params)
  const reports = rows.map(r => ({
    ...r,
    snappy_data: typeof r.snappy_data === 'string' ? JSON.parse(r.snappy_data) : r.snappy_data
  }))
  res.json(reports)
})

// ─── 获取单个交班报表详情 ───

router.get('/:id', (req, res) => {
  const r = queryOne('SELECT * FROM shift_reports WHERE id = ?', [req.params.id])
  if (!r) return res.status(404).json({ error: '交班报表不存在' })
  r.snappy_data = typeof r.snappy_data === 'string' ? JSON.parse(r.snappy_data) : r.snappy_data
  res.json(r)
})

// ─── 删除交班报表 ───

router.delete('/:id', (req, res) => {
  runSql('DELETE FROM shift_reports WHERE id = ?', [req.params.id])
  res.json({ success: true })
})

// ─── 预览今日交班快照（不保存） ───

router.get('/preview/today', (req, res) => {
  const snapshot = generateSnapshot()
  res.json(snapshot)
})

export default router

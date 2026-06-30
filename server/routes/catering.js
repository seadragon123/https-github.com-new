import { Router } from 'express'
import { queryAll, queryOne, runSql, insertAndGetId } from '../db-helper.js'

const router = Router()

// ─── 菜品管理 ───

// 菜品列表
router.get('/menus', (req, res) => {
  const rows = queryAll('SELECT * FROM menu_items ORDER BY sort_order, id')
  res.json(rows)
})

// 新增菜品
router.post('/menus', (req, res) => {
  const { name, category, price, is_available, sort_order } = req.body
  if (!name || !price) return res.status(400).json({ error: '缺少必填字段' })
  const id = insertAndGetId(
    'INSERT INTO menu_items (name, category, price, is_available, sort_order) VALUES (?, ?, ?, ?, ?)',
    [name, category || '热菜', price, is_available !== undefined ? (is_available ? 1 : 0) : 1, sort_order || 0]
  )
  res.json({ id, success: true })
})

// 编辑菜品
router.put('/menus/:id', (req, res) => {
  const { name, category, price, is_available, sort_order } = req.body
  const item = queryOne('SELECT * FROM menu_items WHERE id = ?', [req.params.id])
  if (!item) return res.status(404).json({ error: '菜品不存在' })
  runSql(
    'UPDATE menu_items SET name=?, category=?, price=?, is_available=?, sort_order=? WHERE id=?',
    [
      name ?? item.name,
      category ?? item.category,
      price ?? item.price,
      is_available !== undefined ? (is_available ? 1 : 0) : item.is_available,
      sort_order ?? item.sort_order,
      req.params.id
    ]
  )
  res.json({ success: true })
})

// 删除菜品
router.delete('/menus/:id', (req, res) => {
  runSql('DELETE FROM menu_items WHERE id = ?', [req.params.id])
  res.json({ success: true })
})

// ─── 餐饮订单 ───

// 生成订单号
function generateOrderNo() {
  const now = new Date()
  const date = now.toISOString().slice(0, 10).replace(/-/g, '')
  const seq = Math.floor(Math.random() * 900) + 100
  return `CY${date}${seq}`
}

// 订单列表
router.get('/orders', (req, res) => {
  const { date, status, start_date, end_date } = req.query
  const today = new Date().toISOString().slice(0, 10)

  let sql = `SELECT * FROM catering_orders WHERE 1=1`
  const params = []

  if (start_date && end_date) {
    sql += ` AND date(created_at) >= ? AND date(created_at) <= ?`
    params.push(start_date, end_date)
  } else {
    const d = date || today
    sql += ` AND date(created_at) = ?`
    params.push(d)
  }
  if (status && status !== '全部') {
    sql += ` AND status = ?`
    params.push(status)
  }
  sql += ` ORDER BY created_at DESC`
  const rows = queryAll(sql, params)

  // 解析 items JSON
  const orders = rows.map(o => ({
    ...o,
    items: typeof o.items === 'string' ? JSON.parse(o.items) : (o.items || [])
  }))

  // 今日汇总（基于筛选范围）
  const summaryOrders = start_date && end_date ? rows : queryAll(`SELECT * FROM catering_orders WHERE date(created_at) = ?`, [date || today])
  const totalOrders = summaryOrders.length
  const totalRevenue = summaryOrders.reduce((s, o) => s + (o.status === '已结账' ? (o.total || 0) : 0), 0)
  const dineIn = summaryOrders.filter(o => o.order_type === '堂食' && o.status !== '已取消').length
  const takeout = summaryOrders.filter(o => o.order_type === '外卖' && o.status !== '已取消').length
  const linked = summaryOrders.filter(o => o.booking_id && o.status !== '已取消').length

  res.json({
    date: date || today,
    start_date, end_date,
    summary: { totalOrders, totalRevenue, dineIn, takeout, linked },
    orders
  })
})

// 创建订单（点单）
router.post('/orders', (req, res) => {
  const { booking_id, guest_name, guest_phone, order_type, items } = req.body
  if (!guest_name || !items || !items.length) return res.status(400).json({ error: '缺少必填字段' })

  const total = items.reduce((s, i) => s + (i.price * i.qty), 0)
  const orderNo = generateOrderNo()
  const itemsJson = JSON.stringify(items.map(i => ({ id: i.id, name: i.name, qty: i.qty || 1, price: i.price })))

  const id = insertAndGetId(
    `INSERT INTO catering_orders (order_no, booking_id, guest_name, guest_phone, order_type, items, total, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, '就餐中')`,
    [orderNo, booking_id || null, guest_name, guest_phone || '', order_type || '堂食', itemsJson, total]
  )
  res.json({ id, order_no: orderNo, success: true })
})

// 编辑订单（加菜/退菜）
router.put('/orders/:id', (req, res) => {
  const { items, guest_name, guest_phone, order_type } = req.body
  const order = queryOne('SELECT * FROM catering_orders WHERE id = ?', [req.params.id])
  if (!order) return res.status(404).json({ error: '订单不存在' })
  if (order.status !== '就餐中') return res.status(400).json({ error: '已结账订单不可修改' })

  const newItems = items ? JSON.stringify(items) : order.items
  const newTotal = items ? items.reduce((s, i) => s + (i.price * i.qty), 0) : order.total
  runSql(
    `UPDATE catering_orders SET items=?, total=?, guest_name=?, guest_phone=?, order_type=?, updated_at=datetime('now','localtime') WHERE id=?`,
    [newItems, newTotal, guest_name ?? order.guest_name, guest_phone ?? order.guest_phone, order_type ?? order.order_type, req.params.id]
  )
  res.json({ success: true })
})

// 结账
router.post('/orders/:id/pay', (req, res) => {
  const { payment_method, booking_id } = req.body
  const order = queryOne('SELECT * FROM catering_orders WHERE id = ?', [req.params.id])
  if (!order) return res.status(404).json({ error: '订单不存在' })
  if (order.status === '已结账') return res.status(400).json({ error: '已结账' })

  runSql(
    `UPDATE catering_orders SET status='已结账', payment_method=?, booking_id=?, paid_at=datetime('now','localtime'), updated_at=datetime('now','localtime') WHERE id=?`,
    [payment_method || '现金', booking_id || order.booking_id, req.params.id]
  )
  res.json({ success: true, total: order.total })
})

// 取消订单
router.delete('/orders/:id', (req, res) => {
  const order = queryOne('SELECT * FROM catering_orders WHERE id = ?', [req.params.id])
  if (!order) return res.status(404).json({ error: '订单不存在' })
  runSql(`UPDATE catering_orders SET status='已取消', updated_at=datetime('now','localtime') WHERE id=?`, [req.params.id])
  res.json({ success: true })
})

// ─── 菜品销量排行 ───

router.get('/ranking', (req, res) => {
  const { period } = req.query // week / month / all
  const today = new Date().toISOString().slice(0, 10)
  let dateFilter = ''
  const params = []
  if (period === 'week') {
    dateFilter = ' AND date(created_at) >= ?'
    params.push(new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10))
  } else if (period === 'month') {
    dateFilter = ' AND date(created_at) >= ?'
    params.push(new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10))
  }

  // 获取符合条件的订单
  const orders = queryAll(
    `SELECT * FROM catering_orders WHERE status IN ('已结账', '就餐中')${dateFilter} ORDER BY created_at DESC`,
    params
  )
  // 获取所有菜品
  const menus = queryAll('SELECT * FROM menu_items ORDER BY sort_order, id')

  // JS 端统计每个菜品的销量
  const salesMap = {}
  for (const order of orders) {
    const items = typeof order.items === 'string' ? JSON.parse(order.items) : (order.items || [])
    for (const item of items) {
      if (!salesMap[item.id]) {
        salesMap[item.id] = { total_qty: 0, total_revenue: 0 }
      }
      salesMap[item.id].total_qty += (item.qty || 1)
      salesMap[item.id].total_revenue += (item.price || 0) * (item.qty || 1)
    }
  }

  // 按销量排序
  const ranking = menus
    .map(m => ({
      menu_id: m.id,
      name: m.name,
      category: m.category,
      price: m.price,
      total_qty: salesMap[m.id]?.total_qty || 0,
      total_revenue: salesMap[m.id]?.total_revenue || 0
    }))
    .sort((a, b) => b.total_qty - a.total_qty || b.total_revenue - a.total_revenue)

  res.json({
    period: period || 'all',
    items: ranking.map((r, i) => ({ ...r, rank: i + 1 }))
  })
})

export default router

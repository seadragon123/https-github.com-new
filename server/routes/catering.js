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
  const { date, status } = req.query
  const today = new Date().toISOString().slice(0, 10)
  const d = date || today
  let sql = `SELECT * FROM catering_orders WHERE date(created_at) = ?`
  const params = [d]
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

  // 今日汇总
  const todayOrders = queryAll(`SELECT * FROM catering_orders WHERE date(created_at) = ?`, [d])
  const totalOrders = todayOrders.length
  const totalRevenue = todayOrders.reduce((s, o) => s + (o.status === '已结账' ? (o.total || 0) : 0), 0)
  const dineIn = todayOrders.filter(o => o.order_type === '堂食' && o.status !== '已取消').length
  const takeout = todayOrders.filter(o => o.order_type === '外卖' && o.status !== '已取消').length
  const linked = todayOrders.filter(o => o.booking_id && o.status !== '已取消').length

  res.json({
    date: d,
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
  if (period === 'week') {
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10)
    dateFilter = ` AND date(co.created_at) >= '${weekAgo}'`
  } else if (period === 'month') {
    const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)
    dateFilter = ` AND date(co.created_at) >= '${monthAgo}'`
  }

  // 从已结账和就餐中的订单中统计菜品销量
  const rows = queryAll(`
    SELECT
      mi.id as menu_id,
      mi.name,
      mi.category,
      mi.price,
      COUNT(*) as order_count,
      SUM(item_qty.qty) as total_qty,
      SUM(item_qty.qty * mi.price) as total_revenue
    FROM menu_items mi
    LEFT JOIN (
      SELECT co.id as order_id, json_each.value as item_json
      FROM catering_orders co, json_each(co.items)
      WHERE co.status IN ('已结账', '就餐中')${dateFilter}
    ) o ON 1=1
    CROSS JOIN (
      SELECT
        o2.order_id,
        json_extract(o2.item_json, '$.id') as item_id,
        CAST(json_extract(o2.item_json, '$.qty') AS INTEGER) as qty
      FROM (
        SELECT co2.id as order_id, json_each.value as item_json
        FROM catering_orders co2, json_each(co2.items)
        WHERE co2.status IN ('已结账', '就餐中')${dateFilter}
      ) o2
    ) item_qty ON item_qty.item_id = mi.id
    GROUP BY mi.id
    ORDER BY total_qty DESC, total_revenue DESC
  `)

  res.json({
    period: period || 'all',
    items: rows.map((r, i) => ({ ...r, rank: i + 1 }))
  })
})

export default router

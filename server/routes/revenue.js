import { Router } from 'express'
import { queryAll, queryOne, runSql, insertAndGetId } from '../db-helper.js'

const router = Router()

// ─── 经营汇总（自动从各模块拉取） ───

router.get('/summary', (req, res) => {
  const { date, month } = req.query
  const today = new Date().toISOString().slice(0, 10)
  const d = date || today
  const m = month || d.slice(0, 7)

  // 当日客房收入：已完成订单的金额
  const roomRows = queryAll(
    `SELECT COALESCE(SUM(amount), 0) as total FROM bookings WHERE status = '已完成' AND date(updated_at) = ?`,
    [d]
  )
  const roomRevenue = roomRows[0]?.total || 0

  // 当日餐饮收入：已结账订单
  const catRows = queryAll(
    `SELECT COALESCE(SUM(total), 0) as total FROM catering_orders WHERE status = '已结账' AND date(paid_at) = ?`,
    [d]
  )
  const cateringRevenue = catRows[0]?.total || 0

  // 当日请香收入
  const incRows = queryAll(
    `SELECT COALESCE(SUM(net_amount), 0) as total FROM incense_sales WHERE report_date = ?`,
    [d]
  )
  const incenseRevenue = incRows[0]?.total || 0

  // 当日总支出（按 expense_date 查询，空时回退 report_date）
  const expRows = queryAll(
    `SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE COALESCE(NULLIF(expense_date, ''), report_date) = ?`,
    [d]
  )
  const totalExpense = expRows[0]?.total || 0

  const totalRevenue = roomRevenue + cateringRevenue + incenseRevenue
  const netCashflow = Math.round((totalRevenue - totalExpense) * 100) / 100

  // 月度累计
  const mRoom = queryAll(`SELECT COALESCE(SUM(amount), 0) as total FROM bookings WHERE status = '已完成' AND date(updated_at) LIKE ?`, [m + '%'])
  const mCat = queryAll(`SELECT COALESCE(SUM(total), 0) as total FROM catering_orders WHERE status = '已结账' AND date(paid_at) LIKE ?`, [m + '%'])
  const mInc = queryAll(`SELECT COALESCE(SUM(net_amount), 0) as total FROM incense_sales WHERE report_date LIKE ?`, [m + '%'])
  const mExp = queryAll(`SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE COALESCE(NULLIF(expense_date, ''), report_date) LIKE ?`, [m + '%'])
  const monthlyRevenue = (mRoom[0]?.total || 0) + (mCat[0]?.total || 0) + (mInc[0]?.total || 0)
  const monthlyExpense = mExp[0]?.total || 0
  const monthlyNet = Math.round((monthlyRevenue - monthlyExpense) * 100) / 100

  // 写入日报表
  runSql(
    `INSERT OR REPLACE INTO daily_reports (report_date, room_revenue, catering_revenue, incense_revenue, total_expense, net_cashflow, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, datetime('now','localtime'))`,
    [d, roomRevenue, cateringRevenue, incenseRevenue, totalExpense, netCashflow]
  )

  res.json({
    date: d,
    daily: { roomRevenue, cateringRevenue, incenseRevenue, totalRevenue, totalExpense, netCashflow },
    monthly: { totalRevenue: monthlyRevenue, totalExpense: monthlyExpense, netBalance: monthlyNet }
  })
})

// ─── GET 日报明细 ───

router.get('/daily', (req, res) => {
  const { date } = req.query
  const today = new Date().toISOString().slice(0, 10)
  const d = date || today

  // 已完成订单（客房收入明细）
  const checkouts = queryAll(`
    SELECT b.id, b.guest_name, b.check_in, b.check_out, b.amount, b.price_per_night, r.room_no, r.room_type
    FROM bookings b JOIN rooms r ON b.room_id = r.id
    WHERE b.status = '已完成' AND date(b.updated_at) = ?
    ORDER BY b.updated_at
  `, [d])

  // 已结账餐饮订单
  const cateringItems = queryAll(`
    SELECT * FROM catering_orders WHERE status = '已结账' AND date(paid_at) = ?
    ORDER BY paid_at
  `, [d])

  // 请香销售
  const incenseItems = queryAll(`
    SELECT * FROM incense_sales WHERE report_date = ?
    ORDER BY created_at
  `, [d])

  // 支出
  const expenseItems = queryAll(`
    SELECT * FROM expenses WHERE COALESCE(NULLIF(expense_date, ''), report_date) = ?
    ORDER BY created_at
  `, [d])

  res.json({
    date: d,
    revenue_details: (checkouts || []).map(c => ({
      type: '退房',
      room_no: c.room_no,
      guest: c.guest_name,
      amount: c.amount,
      note: `${c.room_type} ${c.check_in}~${c.check_out}`
    })),
    catering_items: (cateringItems || []).map(c => ({
      type: '餐饮',
      guest: c.guest_name,
      amount: c.total,
      note: `${c.order_type} · ${c.payment_method}`
    })),
    incense_items: (incenseItems || []).map(i => ({
      type: '请香',
      guest: i.guest_name,
      product: i.product_name,
      quantity: i.quantity,
      amount: i.net_amount,
      note: i.has_commission ? `返佣${i.commission_rate}%` : ''
    })),
    expense_items: (expenseItems || []).map(e => ({
      type: '支出',
      category: e.category,
      amount: e.amount,
      note: e.note
    }))
  })
})

// ─── 自动生成客房收入（从已完成订单拉取） ───

router.post('/auto-generate', (req, res) => {
  const { date } = req.body
  const today = new Date().toISOString().slice(0, 10)
  const d = date || today

  // 查询今日退房（已完成订单）
  const checkouts = queryAll(`
    SELECT b.id, b.room_id, b.guest_name, b.check_in, b.check_out, b.amount as booking_amount, b.price_per_night, b.channel, b.payment_method,
           r.room_no, r.price, r.room_type
    FROM bookings b JOIN rooms r ON b.room_id = r.id
    WHERE b.status = '已完成' AND (b.check_out = ? OR date(b.updated_at) = ?)
    ORDER BY b.check_in
  `, [d, d])

  // 查询今日新入住的
  const checkoutRoomIds = checkouts.map(c => c.room_id)
  const checkins = queryAll(`
    SELECT b.id, b.room_id, b.guest_name, b.check_in, b.check_out, b.amount as booking_amount, b.price_per_night, b.channel, b.payment_method,
           r.room_no, r.price, r.room_type
    FROM bookings b JOIN rooms r ON b.room_id = r.id
    WHERE b.status = '已入住' AND b.check_in = ?
    ORDER BY b.check_in
  `, [d]).filter(b => !checkoutRoomIds.includes(b.room_id))

  // 清空当日已有客房收入（旧缓存表，保留向前兼容）
  runSql('DELETE FROM revenue_details WHERE report_date = ?', [d])

  // 退房收入（直接返回 bookings 数据，不再依赖缓存表）
  const checkoutItems = []
  for (const b of checkouts) {
    const nights = Math.max(1, Math.ceil((new Date(b.check_out) - new Date(b.check_in)) / 86400000))
    const ppn = b.price_per_night > 0 ? b.price_per_night : b.price
    const amount = ppn * nights
    checkoutItems.push({
      room_no: b.room_no, time: '退房', price: ppn,
      channel_type: b.channel || '散客', channel_source: `${b.guest_name}(退房)`,
      amount, payment_method: b.payment_method || '现金'
    })
  }

  // 新入住收入
  const checkinItems = []
  for (const b of checkins) {
    const nights = Math.max(1, Math.ceil((new Date(b.check_out) - new Date(b.check_in)) / 86400000))
    const ppn = b.price_per_night > 0 ? b.price_per_night : b.price
    const amount = ppn * nights
    checkinItems.push({
      room_no: b.room_no, time: '入住', price: ppn,
      channel_type: b.channel || '散客', channel_source: `${b.guest_name}(入住)`,
      amount, payment_method: b.payment_method || '未付'
    })
  }

  const items = [...checkoutItems, ...checkinItems]

  res.json({
    success: true,
    date: d,
    total: items.reduce((s, r) => s + (r.amount || 0), 0),
    items,
    message: `从 ${checkouts.length} 笔退房 + ${checkins.length} 笔入住 自动生成了 ${items.length} 条收入记录`
  })
})

// ─── 自动生成请香收入（从 incense_sales 拉取） ───

router.post('/auto-incense', (req, res) => {
  const { date } = req.body
  const today = new Date().toISOString().slice(0, 10)
  const d = date || today

  const sales = queryAll('SELECT * FROM incense_sales WHERE report_date = ? ORDER BY created_at', [d])

  // 清空当日旧数据
  runSql('DELETE FROM incense_revenue WHERE report_date = ?', [d])

  let seq = 0
  for (const s of sales) {
    seq++
    runSql(
      `INSERT INTO incense_revenue (report_date, seq, time, amount, has_commission, commission_rate, commission_amount, net_amount, payment_method)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [d, seq, s.created_at?.slice(11, 16) || '', s.amount, s.has_commission, s.commission_rate || 0,
       s.commission_amount || 0, s.net_amount || s.amount, s.payment_method || '']
    )
  }

  res.json({
    success: true,
    date: d,
    total: sales.reduce((s, r) => s + (r.net_amount || r.amount || 0), 0),
    count: sales.length,
    message: `从 ${sales.length} 笔请香销售自动生成了请香收入`
  })
})

// ─── 自动生成支出明细（从 expenses 表拉取） ───

router.post('/auto-expenses', (req, res) => {
  const { date } = req.body
  const today = new Date().toISOString().slice(0, 10)
  const d = date || today

  // 直接加载当月支出数据到前端视图（已经是独立 expenses 表的数据）
  const rows = queryAll("SELECT * FROM expenses WHERE COALESCE(NULLIF(expense_date, ''), report_date) = ? ORDER BY created_at", [d])

  res.json({
    success: true,
    date: d,
    total: rows.reduce((s, r) => s + (r.amount || 0), 0),
    items: rows,
    message: `已加载 ${rows.length} 笔支出记录`
  })
})

// ─── 旧 API 兼容 ───

router.get('/details', (req, res) => {
  const { date } = req.query
  const today = new Date().toISOString().slice(0, 10)
  const d = date || today
  const rows = queryAll('SELECT * FROM revenue_details WHERE report_date = ? ORDER BY seq, id', [d])
  const roomTotal = rows.reduce((s, r) => s + (r.amount || 0), 0)
  res.json({ date: d, items: rows, total: roomTotal, total: roomTotal })
})

router.post('/details', (req, res) => {
  const { report_date, time, room_no, price, channel_type, channel_source, amount, payment_method } = req.body
  if (!report_date) return res.status(400).json({ error: '缺少日期' })
  const id = insertAndGetId(
    'INSERT INTO revenue_details (report_date, time, room_no, price, channel_type, channel_source, amount, payment_method) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [report_date, time || '', room_no || '', price || 0, channel_type || '', channel_source || '', amount || 0, payment_method || '']
  )
  res.json({ id, success: true })
})

router.put('/details/:id', (req, res) => {
  const { time, room_no, price, channel_type, channel_source, amount, payment_method } = req.body
  runSql('UPDATE revenue_details SET time=?, room_no=?, price=?, channel_type=?, channel_source=?, amount=?, payment_method=? WHERE id=?',
    [time || '', room_no || '', price || 0, channel_type || '', channel_source || '', amount || 0, payment_method || '', req.params.id])
  res.json({ success: true })
})

router.delete('/details/:id', (req, res) => {
  runSql('DELETE FROM revenue_details WHERE id = ?', [req.params.id])
  res.json({ success: true })
})

router.delete('/details', (req, res) => {
  const { date } = req.query
  if (!date) return res.status(400).json({ error: '缺少日期' })
  runSql('DELETE FROM revenue_details WHERE report_date = ?', [date])
  res.json({ success: true })
})

// ─── 请香旧 API 兼容 ───

router.get('/incense', (req, res) => {
  const { date } = req.query
  const today = new Date().toISOString().slice(0, 10)
  const d = date || today
  const rows = queryAll('SELECT * FROM incense_revenue WHERE report_date = ? ORDER BY seq, id', [d])
  const total = rows.reduce((s, r) => s + (r.net_amount || r.amount || 0), 0)
  res.json({ date: d, items: rows, total })
})

router.post('/incense', (req, res) => {
  const { report_date, time, amount, has_commission, commission_rate, commission_amount, net_amount, payment_method } = req.body
  if (!report_date) return res.status(400).json({ error: '缺少日期' })
  const hc = has_commission ? 1 : 0
  const cr = commission_rate || 0
  const ca = commission_amount || 0
  const na = net_amount ?? (hc ? (amount || 0) - ca : (amount || 0))
  const id = insertAndGetId(
    'INSERT INTO incense_revenue (report_date, time, amount, has_commission, commission_rate, commission_amount, net_amount, payment_method) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [report_date, time || '', amount || 0, hc, cr, ca, na, payment_method || '']
  )
  res.json({ id, success: true })
})

router.put('/incense/:id', (req, res) => {
  const { time, amount, has_commission, commission_rate, commission_amount, net_amount, payment_method } = req.body
  const hc = has_commission ? 1 : 0
  const cr = commission_rate || 0
  const ca = commission_amount || 0
  const na = net_amount ?? (hc ? (amount || 0) - ca : (amount || 0))
  runSql('UPDATE incense_revenue SET time=?, amount=?, has_commission=?, commission_rate=?, commission_amount=?, net_amount=?, payment_method=? WHERE id=?',
    [time || '', amount || 0, hc, cr, ca, na, payment_method || '', req.params.id])
  res.json({ success: true })
})

router.delete('/incense/:id', (req, res) => {
  runSql('DELETE FROM incense_revenue WHERE id = ?', [req.params.id])
  res.json({ success: true })
})

router.delete('/incense', (req, res) => {
  const { date } = req.query
  if (!date) return res.status(400).json({ error: '缺少日期' })
  runSql('DELETE FROM incense_revenue WHERE report_date = ?', [date])
  res.json({ success: true })
})

// ─── 支出旧 API 兼容 ───

const EXPENSE_CATEGORIES = ['日常耗材', '维修杂费', '营销费用', '水电费用', '其他支出']

router.get('/expenses', (req, res) => {
  const { date, month } = req.query
  const today = new Date().toISOString().slice(0, 10)
  const d = date || today

  const dailyRows = queryAll("SELECT * FROM expenses WHERE COALESCE(NULLIF(expense_date, ''), report_date) = ? ORDER BY category, id", [d])

  const byCategory = {}
  for (const cat of EXPENSE_CATEGORIES) {
    const items = dailyRows.filter(r => r.category === cat)
    byCategory[cat] = { items, total: items.reduce((s, r) => s + (r.amount || 0), 0) }
  }
  const dailyTotal = dailyRows.reduce((s, r) => s + (r.amount || 0), 0)

  let monthlyTotal = 0
  const monthlyByCategory = {}
  if (month) {
    for (const cat of EXPENSE_CATEGORIES) {
      const mRows = queryAll("SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE category = ? AND COALESCE(NULLIF(expense_date, ''), report_date) LIKE ?", [cat, month + '%'])
      monthlyByCategory[cat] = mRows[0]?.total || 0
      monthlyTotal += monthlyByCategory[cat]
    }
  }

  res.json({ date: d, categories: byCategory, dailyTotal, monthlyByCategory, monthlyTotal })
})

router.post('/expenses', (req, res) => {
  const { report_date, category, amount, note } = req.body
  if (!report_date || !category) return res.status(400).json({ error: '缺少必填字段' })
  if (!EXPENSE_CATEGORIES.includes(category)) return res.status(400).json({ error: '无效支出类别' })
  const id = insertAndGetId('INSERT INTO expenses (report_date, category, amount, note) VALUES (?, ?, ?, ?)',
    [report_date, category, amount || 0, note || ''])
  res.json({ id, success: true })
})

router.put('/expenses/:id', (req, res) => {
  const { category, amount, note } = req.body
  runSql('UPDATE expenses SET category=?, amount=?, note=? WHERE id=?', [category, amount || 0, note || '', req.params.id])
  res.json({ success: true })
})

router.delete('/expenses/:id', (req, res) => {
  runSql('DELETE FROM expenses WHERE id = ?', [req.params.id])
  res.json({ success: true })
})

router.delete('/expenses', (req, res) => {
  const { date } = req.query
  if (!date) return res.status(400).json({ error: '缺少日期' })
  runSql('DELETE FROM expenses WHERE report_date = ?', [date])
  res.json({ success: true })
})

export { EXPENSE_CATEGORIES }
export default router

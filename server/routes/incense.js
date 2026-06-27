import { Router } from 'express'
import { queryAll, queryOne, runSql, insertAndGetId } from '../db-helper.js'

const router = Router()

// ─── 商品管理 ───

// 商品列表
router.get('/products', (req, res) => {
  const rows = queryAll('SELECT * FROM incense_products ORDER BY id')
  res.json(rows)
})

// 新增商品
router.post('/products', (req, res) => {
  const { name, price, stock, unit, is_available } = req.body
  if (!name || price === undefined) return res.status(400).json({ error: '缺少必填字段' })
  const id = insertAndGetId(
    'INSERT INTO incense_products (name, price, stock, unit, is_available) VALUES (?, ?, ?, ?, ?)',
    [name, price, stock || 0, unit || '份', is_available !== undefined ? (is_available ? 1 : 0) : 1]
  )
  res.json({ id, success: true })
})

// 编辑商品
router.put('/products/:id', (req, res) => {
  const { name, price, stock, unit, is_available } = req.body
  const item = queryOne('SELECT * FROM incense_products WHERE id = ?', [req.params.id])
  if (!item) return res.status(404).json({ error: '商品不存在' })
  runSql(
    'UPDATE incense_products SET name=?, price=?, stock=?, unit=?, is_available=? WHERE id=?',
    [
      name ?? item.name,
      price ?? item.price,
      stock !== undefined ? stock : item.stock,
      unit ?? item.unit,
      is_available !== undefined ? (is_available ? 1 : 0) : item.is_available,
      req.params.id
    ]
  )
  res.json({ success: true })
})

// 删除商品
router.delete('/products/:id', (req, res) => {
  runSql('DELETE FROM incense_products WHERE id = ?', [req.params.id])
  res.json({ success: true })
})

// ─── 销售管理 ───

// 销售记录
router.get('/sales', (req, res) => {
  const { date } = req.query
  const today = new Date().toISOString().slice(0, 10)
  const d = date || today
  const rows = queryAll('SELECT * FROM incense_sales WHERE report_date = ? ORDER BY created_at DESC', [d])
  const totalRevenue = rows.reduce((s, r) => s + (r.net_amount || r.amount || 0), 0)
  const totalCommission = rows.reduce((s, r) => s + (r.commission_amount || 0), 0)
  res.json({ date: d, items: rows, totalRevenue, totalCommission })
})

// 新增销售
router.post('/sales', (req, res) => {
  const { report_date, booking_id, product_id, quantity, amount, has_commission, commission_rate,
          commission_amount, payment_method, guest_name } = req.body
  if (!product_id || !quantity) return res.status(400).json({ error: '缺少必填字段' })

  const product = queryOne('SELECT * FROM incense_products WHERE id = ?', [product_id])
  if (!product) return res.status(404).json({ error: '商品不存在' })

  const qty = quantity || 1
  const amt = amount || (product.price * qty)
  const hc = has_commission ? 1 : 0
  const cr = commission_rate || 0
  const ca = commission_amount || (hc ? amt * cr / 100 : 0)
  const na = amt - ca

  const today = new Date().toISOString().slice(0, 10)

  const id = insertAndGetId(
    `INSERT INTO incense_sales (report_date, booking_id, product_id, product_name, quantity, amount,
     has_commission, commission_rate, commission_amount, net_amount, payment_method, guest_name)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [report_date || today, booking_id || null, product_id, product.name, qty, amt,
     hc, cr, ca, na, payment_method || '现金', guest_name || '']
  )

  // 扣减库存
  runSql('UPDATE incense_products SET stock = MAX(0, stock - ?) WHERE id = ?', [qty, product_id])

  res.json({ id, product_name: product.name, amount: amt, net_amount: na, success: true })
})

// 删除销售记录
router.delete('/sales/:id', (req, res) => {
  const sale = queryOne('SELECT * FROM incense_sales WHERE id = ?', [req.params.id])
  if (!sale) return res.status(404).json({ error: '记录不存在' })
  // 恢复库存
  runSql('UPDATE incense_products SET stock = stock + ? WHERE id = ?', [sale.quantity, sale.product_id])
  runSql('DELETE FROM incense_sales WHERE id = ?', [req.params.id])
  res.json({ success: true })
})

export default router

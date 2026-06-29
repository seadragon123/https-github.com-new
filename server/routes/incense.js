import { Router } from 'express'
import { queryAll, queryOne, runSql, insertAndGetId } from '../db-helper.js'

const router = Router()

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
  const { report_date, booking_id, product_name, price, quantity, amount, has_commission, commission_rate,
          commission_amount, payment_method, guest_name } = req.body
  if (!product_name || !price) return res.status(400).json({ error: '缺少商品名称或价格' })

  const pName = product_name || ''
  const pPrice = Number(price) || 0
  const qty = Number(quantity) || 1
  const amt = amount || (pPrice * qty)
  const hc = has_commission ? 1 : 0
  const cr = commission_rate || 0
  const ca = commission_amount || (hc ? amt * cr / 100 : 0)
  const na = amt - ca

  const today = new Date().toISOString().slice(0, 10)

  const id = insertAndGetId(
    `INSERT INTO incense_sales (report_date, booking_id, product_id, product_name, quantity, amount,
     has_commission, commission_rate, commission_amount, net_amount, payment_method, guest_name)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [report_date || today, booking_id || null, 0, pName, qty, amt,
     hc, cr, ca, na, payment_method || '现金', guest_name || '']
  )

  res.json({ id, product_name: pName, amount: amt, net_amount: na, success: true })
})

// 删除销售记录
router.delete('/sales/:id', (req, res) => {
  const sale = queryOne('SELECT * FROM incense_sales WHERE id = ?', [req.params.id])
  if (!sale) return res.status(404).json({ error: '记录不存在' })
  runSql('DELETE FROM incense_sales WHERE id = ?', [req.params.id])
  res.json({ success: true })
})

export default router

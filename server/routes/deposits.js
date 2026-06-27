import { Router } from 'express'
import { queryAll, queryOne, runSql, insertAndGetId } from '../db-helper.js'

const router = Router()

// 押金记录（按订单）
router.get('/', (req, res) => {
  const { booking_id } = req.query
  let sql = 'SELECT * FROM deposit_records'
  const params = []
  if (booking_id) {
    sql += ' WHERE booking_id = ?'
    params.push(booking_id)
  }
  sql += ' ORDER BY created_at DESC'
  const rows = queryAll(sql, params)
  const totalDeposit = rows.filter(r => r.type === '收押金').reduce((s, r) => s + r.amount, 0)
  const totalRefund = rows.filter(r => r.type === '退押金').reduce((s, r) => s + r.amount, 0)
  const totalDeduct = rows.filter(r => r.type === '扣款').reduce((s, r) => s + r.amount, 0)
  const balance = totalDeposit - totalRefund - totalDeduct
  res.json({ records: rows, summary: { totalDeposit, totalRefund, totalDeduct, balance } })
})

// 收押金
router.post('/', (req, res) => {
  const { booking_id, amount, method, operator } = req.body
  if (!booking_id || !amount || amount <= 0) return res.status(400).json({ error: '参数无效' })
  const booking = queryOne('SELECT * FROM bookings WHERE id = ?', [booking_id])
  if (!booking) return res.status(404).json({ error: '订单不存在' })

  const id = insertAndGetId(
    'INSERT INTO deposit_records (booking_id, type, amount, method, operator) VALUES (?, ?, ?, ?, ?)',
    [booking_id, '收押金', amount, method || '现金', operator || '']
  )
  // 更新订单押金总额
  const total = queryAll('SELECT COALESCE(SUM(amount),0) as total FROM deposit_records WHERE booking_id=? AND type=?', [booking_id, '收押金'])
  const refunds = queryAll('SELECT COALESCE(SUM(amount),0) as total FROM deposit_records WHERE booking_id=? AND type=?', [booking_id, '退押金'])
  const deducts = queryAll('SELECT COALESCE(SUM(amount),0) as total FROM deposit_records WHERE booking_id=? AND type=?', [booking_id, '扣款'])
  const balance = (total[0]?.total || 0) - (refunds[0]?.total || 0) - (deducts[0]?.total || 0)
  runSql('UPDATE bookings SET deposit = ? WHERE id = ?', [balance, booking_id])
  res.json({ id, balance, success: true })
})

// 退押金
router.post('/:id/refund', (req, res) => {
  const deposit = queryOne('SELECT * FROM deposit_records WHERE id = ?', [req.params.id])
  if (!deposit) return res.status(404).json({ error: '押金记录不存在' })
  if (deposit.type !== '收押金') return res.status(400).json({ error: '只能退还已收押金' })

  const { amount, method, operator } = req.body
  const refundAmount = amount || deposit.amount

  insertAndGetId(
    'INSERT INTO deposit_records (booking_id, type, amount, method, operator) VALUES (?, ?, ?, ?, ?)',
    [deposit.booking_id, '退押金', refundAmount, method || '现金', operator || '']
  )

  // 更新订单押金余额
  const total = queryAll('SELECT COALESCE(SUM(amount),0) as total FROM deposit_records WHERE booking_id=? AND type=?', [deposit.booking_id, '收押金'])
  const refunds = queryAll('SELECT COALESCE(SUM(amount),0) as total FROM deposit_records WHERE booking_id=? AND type=?', [deposit.booking_id, '退押金'])
  const deducts = queryAll('SELECT COALESCE(SUM(amount),0) as total FROM deposit_records WHERE booking_id=? AND type=?', [deposit.booking_id, '扣款'])
  const balance = (total[0]?.total || 0) - (refunds[0]?.total || 0) - (deducts[0]?.total || 0)
  runSql('UPDATE bookings SET deposit = ? WHERE id = ?', [balance, deposit.booking_id])
  res.json({ refund_amount: refundAmount, balance, success: true })
})

// 扣款（损坏赔偿等）
router.post('/:id/deduct', (req, res) => {
  const deposit = queryOne('SELECT * FROM deposit_records WHERE id = ?', [req.params.id])
  if (!deposit) return res.status(404).json({ error: '押金记录不存在' })
  if (deposit.type !== '收押金') return res.status(400).json({ error: '只能对已收押金扣款' })

  const { amount, note, operator } = req.body
  if (!amount || amount <= 0) return res.status(400).json({ error: '扣款金额无效' })

  insertAndGetId(
    'INSERT INTO deposit_records (booking_id, type, amount, method, operator) VALUES (?, ?, ?, ?, ?)',
    [deposit.booking_id, '扣款', Math.min(amount, deposit.amount), note || '损坏赔偿', operator || '']
  )

  const total = queryAll('SELECT COALESCE(SUM(amount),0) as total FROM deposit_records WHERE booking_id=? AND type=?', [deposit.booking_id, '收押金'])
  const refunds = queryAll('SELECT COALESCE(SUM(amount),0) as total FROM deposit_records WHERE booking_id=? AND type=?', [deposit.booking_id, '退押金'])
  const deducts = queryAll('SELECT COALESCE(SUM(amount),0) as total FROM deposit_records WHERE booking_id=? AND type=?', [deposit.booking_id, '扣款'])
  const balance = (total[0]?.total || 0) - (refunds[0]?.total || 0) - (deducts[0]?.total || 0)
  runSql('UPDATE bookings SET deposit = ? WHERE id = ?', [balance, deposit.booking_id])
  res.json({ deduct_amount: amount, balance, success: true })
})

export default router

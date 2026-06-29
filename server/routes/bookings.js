import { Router } from 'express'
import { queryAll, queryOne, runSql, insertAndGetId } from '../db-helper.js'

const router = Router()

// 获取所有订单
router.get('/', (req, res) => {
  const { status } = req.query
  let sql = `SELECT b.*, r.room_no, r.room_type, r.price as room_price
    FROM bookings b JOIN rooms r ON b.room_id = r.id`
  const params = []
  if (status && status !== '全部') {
    sql += ` WHERE b.status = ?`
    params.push(status)
  }
  sql += ` ORDER BY b.check_in DESC, b.created_at DESC`
  res.json(queryAll(sql, params))
})

// 获取单个订单
router.get('/:id', (req, res) => {
  const booking = queryOne(
    `SELECT b.*, r.room_no, r.room_type, r.price as room_price FROM bookings b JOIN rooms r ON b.room_id = r.id WHERE b.id = ?`,
    [req.params.id]
  )
  if (!booking) return res.status(404).json({ error: '订单不存在' })
  // 返回入住客人明细
  const guests = queryAll('SELECT * FROM booking_guests WHERE booking_id = ? ORDER BY id', [req.params.id])
  res.json({ ...booking, guests })
})

// 新建订单（入住 / 预订）
router.post('/', (req, res) => {
  const { room_id, guests, check_in, check_out, amount, deposit, notes, channel, price_per_night, _is_reserve } = req.body
  if (!room_id || !guests || guests.length === 0 || !check_in || !check_out) {
    return res.status(400).json({ error: '缺少必填字段（房间、客人信息、入住/退房日期）' })
  }

  const primary = guests[0]
  const status = _is_reserve ? '已预订' : '已入住'

  // 计算房价：没有录入则取房间默认定价
  let ppn = Number(price_per_night) || 0
  if (ppn <= 0) {
    const room = queryOne('SELECT price FROM rooms WHERE id = ?', [room_id])
    ppn = room?.price || 0
  }
  const nights = Math.max(1, Math.ceil((new Date(check_out) - new Date(check_in)) / 86400000))
  const computedAmount = ppn * nights

  const id = insertAndGetId(
    `INSERT INTO bookings (room_id, guest_name, guest_phone, channel, check_in, check_out, status, amount, deposit, notes, price_per_night)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [room_id, primary.name || '', primary.phone || '', channel || '散客', check_in, check_out, status, computedAmount, deposit || 0, notes || '', ppn]
  )

  // 为每位客人创建/更新客人记录 + 写入 booking_guests
  for (const g of guests) {
    if (!g.name) continue
    let guestId = null
    // 按身份证号查找
    let existing = null
    if (g.id_card && g.id_card.trim()) {
      existing = queryOne('SELECT id FROM guests WHERE id_card = ?', [g.id_card.trim()])
    }
    if (!existing) {
      existing = queryOne('SELECT id FROM guests WHERE name = ? AND phone = ?', [g.name, g.phone || ''])
    }
    if (existing) {
      guestId = existing.id
      runSql('UPDATE guests SET id_card=COALESCE(NULLIF(?,\'\'),id_card), gender=COALESCE(NULLIF(?,\'\'),gender) WHERE id=?',
        [g.id_card || '', g.gender || '', existing.id])
    } else {
      guestId = insertAndGetId(
        'INSERT INTO guests (name, phone, id_card, gender, notes) VALUES (?, ?, ?, ?, ?)',
        [g.name, g.phone || '', g.id_card || '', g.gender || '', notes || '']
      )
    }
    insertAndGetId(
      'INSERT INTO booking_guests (booking_id, guest_id, name, id_card, phone, gender) VALUES (?, ?, ?, ?, ?, ?)',
      [id, guestId, g.name, g.id_card || '', g.phone || '', g.gender || '']
    )
  }

  // 第一位客人关联到订单（用于客人管理统计）
  const firstGuestId = queryOne('SELECT guest_id FROM booking_guests WHERE booking_id = ? ORDER BY id LIMIT 1', [id])
  if (firstGuestId?.guest_id) {
    runSql('UPDATE bookings SET guest_id = ? WHERE id = ?', [firstGuestId.guest_id, id])
  }

  // 更新房间状态
  const roomStatus = _is_reserve ? '已预订' : '已入住'
  runSql("UPDATE rooms SET status = ?, updated_at = datetime('now','localtime') WHERE id = ?", [roomStatus, room_id])

  // 正常入住才产生押金记录（预订不收押金）
  if (!_is_reserve && deposit > 0) {
    insertAndGetId(
      'INSERT INTO deposit_records (booking_id, type, amount, method, operator) VALUES (?, ?, ?, ?, ?)',
      [id, '收押金', deposit, '现金', '前台']
    )
  }

  res.json({ id, success: true })
})

// 退房结账（含合并结算）
router.post('/:id/checkout', (req, res) => {
  const booking = queryOne('SELECT * FROM bookings WHERE id = ?', [req.params.id])
  if (!booking) return res.status(404).json({ error: '订单不存在' })

  const { final_amount, payment_method, deposit_handling, deposit_deduct_amount, notes } = req.body

  // 1. 计算挂账消费（餐饮+请香）
  const cateringOrders = queryAll(
    'SELECT * FROM catering_orders WHERE booking_id = ? AND status = \'就餐中\'',
    [req.params.id]
  )
  const cateringTotal = cateringOrders.reduce((s, o) => s + (o.total || 0), 0)

  const incenseSales = queryAll(
    'SELECT * FROM incense_sales WHERE booking_id = ?',
    [req.params.id]
  )
  const incenseTotal = incenseSales.reduce((s, i) => s + (i.net_amount || i.amount || 0), 0)

  // 2. 挂账订单标记已结算
  for (const o of cateringOrders) {
    runSql('UPDATE catering_orders SET status=\'已结账\', payment_method=\'挂房账\', paid_at=datetime(\'now\',\'localtime\') WHERE id=?',
      [o.id])
  }

  // 3. 押金处理
  const totalDeposit = queryAll(
    'SELECT COALESCE(SUM(amount),0) as total FROM deposit_records WHERE booking_id=? AND type=\'收押金\'',
    [req.params.id]
  )[0]?.total || 0
  const totalRefund = queryAll(
    'SELECT COALESCE(SUM(amount),0) as total FROM deposit_records WHERE booking_id=? AND type=\'退押金\'',
    [req.params.id]
  )[0]?.total || 0
  const totalDeduct = queryAll(
    'SELECT COALESCE(SUM(amount),0) as total FROM deposit_records WHERE booking_id=? AND type=\'扣款\'',
    [req.params.id]
  )[0]?.total || 0
  const depositBalance = totalDeposit - totalRefund - totalDeduct

  if (deposit_handling === 'deduct' && deposit_deduct_amount > 0) {
    // 从押金抵扣消费
    runSql(
      "INSERT INTO deposit_records (booking_id, type, amount, method, operator) VALUES (?, ?, ?, ?, ?)",
      [req.params.id, '扣款', Math.min(deposit_deduct_amount, depositBalance), '抵扣消费', '系统']
    )
  } else if (deposit_handling === 'partial_refund') {
    const keepAmount = deposit_deduct_amount || 0
    const refundAmt = Math.max(0, depositBalance - keepAmount)
    if (refundAmt > 0) {
      runSql(
        "INSERT INTO deposit_records (booking_id, type, amount, method, operator) VALUES (?, ?, ?, ?, ?)",
        [req.params.id, '退押金', refundAmt, '现金', '前台']
      )
    }
    if (keepAmount > 0) {
      runSql(
        "INSERT INTO deposit_records (booking_id, type, amount, method, operator) VALUES (?, ?, ?, ?, ?)",
        [req.params.id, '扣款', keepAmount, '抵扣消费', '系统']
      )
    }
  } else if (deposit_handling === 'full_refund' && depositBalance > 0) {
    runSql(
      "INSERT INTO deposit_records (booking_id, type, amount, method, operator) VALUES (?, ?, ?, ?, ?)",
      [req.params.id, '退押金', depositBalance, '现金', '前台']
    )
  }

  // 4. 更新订单状态
  runSql(
    `UPDATE bookings SET status='已完成', amount=?, payment_method=?, notes=?, updated_at=datetime('now','localtime') WHERE id=?`,
    [final_amount || booking.amount, payment_method || '现金', notes || booking.notes, req.params.id]
  )
  runSql('UPDATE rooms SET status=\'清洁中\', updated_at=datetime(\'now\',\'localtime\') WHERE id=?', [booking.room_id])
  runSql('INSERT INTO cleaning (room_id, status, scheduled_at) VALUES (?, \'待清洁\', datetime(\'now\',\'localtime\'))', [booking.room_id])

  res.json({
    success: true,
    roomTotal: booking.amount,
    cateringTotal,
    incenseTotal,
    grandTotal: (booking.amount || 0) + cateringTotal + incenseTotal,
    depositBalance
  })
})

// 取消订单
router.patch('/:id/cancel', (req, res) => {
  const booking = queryOne('SELECT * FROM bookings WHERE id = ?', [req.params.id])
  if (!booking) return res.status(404).json({ error: '订单不存在' })
  runSql('UPDATE bookings SET status = \'已取消\' WHERE id = ?', [req.params.id])

  const room = queryOne('SELECT * FROM rooms WHERE id = ?', [booking.room_id])
  if (room && (room.status === '已入住' || room.status === '已预订')) {
    runSql('UPDATE rooms SET status = \'空房\', updated_at = datetime(\'now\',\'localtime\') WHERE id = ?', [booking.room_id])
  }
  res.json({ success: true })
})

// 直接入住（预订转入住，可更新客人信息）
router.post('/:id/direct-checkin', (req, res) => {
  const booking = queryOne('SELECT * FROM bookings WHERE id = ?', [req.params.id])
  if (!booking) return res.status(404).json({ error: '订单不存在' })
  const { guests, amount, deposit, price_per_night } = req.body
  if (!guests || guests.length === 0) return res.status(400).json({ error: '请至少填写一位客人姓名' })

  const primary = guests[0]

  // 计算房价
  let ppn = Number(price_per_night) || Number(booking.price_per_night) || 0
  if (ppn <= 0) {
    const room = queryOne('SELECT price FROM rooms WHERE id = ?', [booking.room_id])
    ppn = room?.price || 0
  }
  const nights = Math.max(1, Math.ceil((new Date(booking.check_out) - new Date(booking.check_in)) / 86400000))
  const computedAmount = ppn * nights

  // 1. 更新订单主表信息
  runSql(
    `UPDATE bookings SET guest_name=?, guest_phone=?, amount=?, deposit=?, price_per_night=?, status='已入住', updated_at=datetime('now','localtime') WHERE id=?`,
    [primary.name || booking.guest_name, primary.phone || booking.guest_phone, computedAmount, deposit ?? booking.deposit, ppn, req.params.id]
  )

  // 2. 删除旧客人明细，插入新客人
  runSql('DELETE FROM booking_guests WHERE booking_id = ?', [req.params.id])
  for (const g of guests) {
    if (!g.name) continue
    let guestId = null
    // 按身份证号查找
    let existing = null
    if (g.id_card && g.id_card.trim()) {
      existing = queryOne('SELECT id FROM guests WHERE id_card = ?', [g.id_card.trim()])
    }
    if (!existing) {
      existing = queryOne('SELECT id FROM guests WHERE name = ? AND phone = ?', [g.name, g.phone || ''])
    }
    if (existing) {
      guestId = existing.id
      runSql('UPDATE guests SET id_card=COALESCE(NULLIF(?,\'\'),id_card), gender=COALESCE(NULLIF(?,\'\'),gender) WHERE id=?',
        [g.id_card || '', g.gender || '', existing.id])
    } else {
      guestId = insertAndGetId(
        'INSERT INTO guests (name, phone, id_card, gender) VALUES (?, ?, ?, ?)',
        [g.name, g.phone || '', g.id_card || '', g.gender || '']
      )
    }
    insertAndGetId(
      'INSERT INTO booking_guests (booking_id, guest_id, name, id_card, phone, gender) VALUES (?, ?, ?, ?, ?, ?)',
      [req.params.id, guestId, g.name, g.id_card || '', g.phone || '', g.gender || '']
    )
  }

  // 3. 更新房间状态
  runSql("UPDATE rooms SET status = '已入住', updated_at = datetime('now','localtime') WHERE id = ?", [booking.room_id])

  // 4. 如有押金自动创建押金记录
  const depositVal = deposit ?? booking.deposit
  if (depositVal > 0) {
    const existingDeposits = queryAll('SELECT COUNT(*) as cnt FROM deposit_records WHERE booking_id=? AND type=\'收押金\'', [req.params.id])
    if (!existingDeposits[0]?.cnt) {
      insertAndGetId(
        'INSERT INTO deposit_records (booking_id, type, amount, method, operator) VALUES (?, ?, ?, ?, ?)',
        [req.params.id, '收押金', depositVal, '现金', '前台']
      )
    }
  }

  res.json({ success: true })
})

// 获取所有客人
router.get('/guests/list', (req, res) => {
  const rows = queryAll('SELECT * FROM guests ORDER BY vip_level DESC, name')
  res.json(rows)
})

// 更新订单状态
router.patch('/:id', (req, res) => {
  const { status } = req.body
  const booking = queryOne('SELECT * FROM bookings WHERE id = ?', [req.params.id])
  if (!booking) return res.status(404).json({ error: '订单不存在' })

  runSql('UPDATE bookings SET status = ? WHERE id = ?', [status, req.params.id])

  if (status === '已入住') {
    runSql('UPDATE rooms SET status = \'已入住\', updated_at = datetime(\'now\',\'localtime\') WHERE id = ?', [booking.room_id])
  } else if (status === '已预订') {
    runSql('UPDATE rooms SET status = \'已预订\', updated_at = datetime(\'now\',\'localtime\') WHERE id = ?', [booking.room_id])
  }

  res.json({ success: true })
})

// 更新订单详情
router.put('/:id', (req, res) => {
  const { guest_name, guest_phone, check_in, check_out, amount, deposit, notes, channel, price_per_night } = req.body
  const booking = queryOne('SELECT * FROM bookings WHERE id = ?', [req.params.id])
  if (!booking) return res.status(404).json({ error: '订单不存在' })

  // 如果传了 price_per_night 或日期有变化，自动重算金额
  let newPpn = price_per_night !== undefined ? Number(price_per_night) : Number(booking.price_per_night)
  const ci = check_in || booking.check_in
  const co = check_out || booking.check_out
  const nights = Math.max(1, Math.ceil((new Date(co) - new Date(ci)) / 86400000))
  const computedAmount = newPpn > 0 ? newPpn * nights : (amount ?? booking.amount)

  runSql(
    'UPDATE bookings SET guest_name=?, guest_phone=?, channel=?, check_in=?, check_out=?, amount=?, deposit=?, price_per_night=?, notes=?, updated_at=datetime(\'now\',\'localtime\') WHERE id=?',
    [
      guest_name ?? booking.guest_name,
      guest_phone ?? booking.guest_phone,
      channel ?? booking.channel,
      ci,
      co,
      computedAmount,
      deposit ?? booking.deposit,
      newPpn,
      notes ?? booking.notes,
      req.params.id
    ]
  )
  res.json({ success: true })
})

export default router

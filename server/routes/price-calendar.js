import { Router } from 'express'
import { queryAll, queryOne, runSql, insertAndGetId } from '../db-helper.js'

const router = Router()

const ROOM_TYPES = ['全部', '标准大床房', '标准双床房', '豪华大床房', '豪华双床房', '豪华套房']
const DEFAULT_PRICES = { '标准大床房': 268, '标准双床房': 298, '豪华大床房': 368, '豪华双床房': 398, '豪华套房': 588 }

// ─── 获取某月房价日历 ───

router.get('/', (req, res) => {
  const { year, month, room_type } = req.query
  const now = new Date()
  const y = parseInt(year) || now.getFullYear()
  const m = parseInt(month) || (now.getMonth() + 1)
  const prefix = `${y}-${String(m).padStart(2, '0')}`

  const dayCount = new Date(y, m, 0).getDate()
  const type = room_type || '全部'

  // 获取已有价格记录
  const records = queryAll(
    'SELECT * FROM price_calendar WHERE target_date LIKE ? AND room_type = ? ORDER BY target_date',
    [prefix + '%', type]
  )
  const recordMap = {}
  for (const r of records) {
    recordMap[r.target_date] = r
  }

  // 生成日历数据
  const days = []
  const weekDayNames = ['日', '一', '二', '三', '四', '五', '六']
  for (let d = 1; d <= dayCount; d++) {
    const dateStr = `${prefix}-${String(d).padStart(2, '0')}`
    const dt = new Date(y, m - 1, d)
    const weekDay = dt.getDay()
    const isWeekend = weekDay === 0 || weekDay === 6
    const existing = recordMap[dateStr]

    const showPrice = type !== '全部'
    days.push({
      date: dateStr,
      day: d,
      weekDay: weekDayNames[weekDay],
      isWeekend,
      price: existing ? existing.price : (isWeekend ? (DEFAULT_PRICES[type] || 268) + 100 : DEFAULT_PRICES[type] || 268),
      is_holiday: existing ? existing.is_holiday : 0,
      label: existing ? existing.label : (isWeekend ? '周末' : ''),
      _showPrice: showPrice
    })
  }

  res.json({ year: y, month: m, room_type: type, days })
})

// ─── 更新某日价格 ───

router.put('/:date', (req, res) => {
  const { date } = req.params
  const { room_type, price, is_holiday, label } = req.body
  const type = room_type || '全部'

  const existing = queryOne(
    'SELECT * FROM price_calendar WHERE target_date = ? AND room_type = ?',
    [date, type]
  )

  if (existing) {
    runSql(
      'UPDATE price_calendar SET price=?, is_holiday=?, label=? WHERE target_date=? AND room_type=?',
      [price ?? existing.price, is_holiday !== undefined ? (is_holiday ? 1 : 0) : existing.is_holiday,
       label ?? existing.label, date, type]
    )
  } else {
    const dt = new Date(date)
    const isWeekend = dt.getDay() === 0 || dt.getDay() === 6
    insertAndGetId(
      'INSERT INTO price_calendar (target_date, room_type, price, is_weekend, is_holiday, label) VALUES (?, ?, ?, ?, ?, ?)',
      [date, type, price || DEFAULT_PRICES[type] || 268, isWeekend ? 1 : 0,
       is_holiday ? 1 : 0, label || '']
    )
  }
  res.json({ success: true })
})

// ─── 批量调价 ───

router.post('/batch', (req, res) => {
  const { year, month, room_type, weekend_increment, holiday_increment, holiday_dates } = req.body
  const y = parseInt(year) || new Date().getFullYear()
  const m = parseInt(month) || (new Date().getMonth() + 1)
  const dayCount = new Date(y, m, 0).getDate()
  const type = room_type || '全部'
  const basePrice = DEFAULT_PRICES[type] || 268

  let updated = 0
  for (let d = 1; d <= dayCount; d++) {
    const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    const dt = new Date(y, m - 1, d)
    const isWeekend = dt.getDay() === 0 || dt.getDay() === 6
    const isHoliday = holiday_dates && holiday_dates.includes(Number(d))

    let price = basePrice
    if (isHoliday && holiday_increment) {
      price = basePrice + Number(holiday_increment)
    } else if (isWeekend && weekend_increment) {
      price = basePrice + Number(weekend_increment)
    }

    const existing = queryOne('SELECT * FROM price_calendar WHERE target_date = ? AND room_type = ?', [dateStr, type])
    if (existing) {
      runSql(
        'UPDATE price_calendar SET price=?, is_weekend=?, is_holiday=? WHERE target_date=? AND room_type=?',
        [price, isWeekend ? 1 : 0, isHoliday ? 1 : 0, dateStr, type]
      )
    } else {
      insertAndGetId(
        'INSERT INTO price_calendar (target_date, room_type, price, is_weekend, is_holiday, label) VALUES (?, ?, ?, ?, ?, ?)',
        [dateStr, type, price, isWeekend ? 1 : 0, isHoliday ? 1 : 0, isHoliday ? '节假日' : isWeekend ? '周末' : '']
      )
    }
    updated++
  }
  res.json({ success: true, updated, message: `已更新 ${updated} 天的 ${type} 价格` })
})

// ─── 获取特定日期所有房型价格（供预订/入住时使用） ───

router.get('/rates', (req, res) => {
  const { date } = req.query
  const d = date || new Date().toISOString().slice(0, 10)

  const rates = {}
  for (const type of ROOM_TYPES) {
    if (type === '全部') continue
    const record = queryOne('SELECT * FROM price_calendar WHERE target_date = ? AND room_type = ?', [d, type])
    if (record) {
      rates[type] = record.price
    } else {
      const dt = new Date(d)
      const isWeekend = dt.getDay() === 0 || dt.getDay() === 6
      rates[type] = isWeekend ? (DEFAULT_PRICES[type] || 268) + 100 : DEFAULT_PRICES[type] || 268
    }
  }
  res.json({ date: d, rates })
})

export default router

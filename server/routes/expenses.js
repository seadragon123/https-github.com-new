import { Router } from 'express'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'
import multer from 'multer'
import { queryAll, queryOne, runSql, insertAndGetId } from '../db-helper.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const router = Router()

const EXPENSE_CATEGORIES = ['日常耗材', '餐饮成本', '维修杂费', '营销费用', '水电费用', '其他支出']

// ─── 图片上传配置 ───

const uploadBaseDir = process.env.UPLOADS_DIR || join(__dirname, '..', 'uploads')
const uploadsDir = join(uploadBaseDir, 'receipts')
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true })
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const random = Math.random().toString(36).slice(2, 8)
    const ext = file.originalname.split('.').pop() || 'jpg'
    cb(null, `${date}_${random}.${ext}`)
  }
})
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } }) // 10MB

// ─── 支出管理 ───

// 支出列表（按日期/日期范围筛选）
router.get('/', (req, res) => {
  const { date, month, category, start_date, end_date } = req.query
  const today = new Date().toISOString().slice(0, 10)

  // 构建当日/日期范围筛选条件
  let dailySql, dailyParams
  if (start_date && end_date) {
    dailySql = "SELECT * FROM expenses WHERE COALESCE(NULLIF(expense_date, ''), report_date) >= ? AND COALESCE(NULLIF(expense_date, ''), report_date) <= ?"
    dailyParams = [start_date, end_date]
  } else {
    const d = date || today
    dailySql = "SELECT * FROM expenses WHERE COALESCE(NULLIF(expense_date, ''), report_date) = ?"
    dailyParams = [d]
  }
  if (category && category !== '全部') {
    dailySql += ' AND category = ?'
    dailyParams.push(category)
  }
  dailySql += ' ORDER BY created_at DESC'
  const dailyRows = queryAll(dailySql, dailyParams)

  // 当日按类别汇总
  const byCategory = {}
  for (const cat of EXPENSE_CATEGORIES) {
    const items = dailyRows.filter(r => r.category === cat)
    byCategory[cat] = { items, total: items.reduce((s, r) => s + (r.amount || 0), 0) }
  }
  const dailyTotal = dailyRows.reduce((s, r) => s + (r.amount || 0), 0)

  // 月度汇总
  const m = month || (date || today).slice(0, 7)
  const monthlyByCategory = {}
  let monthlyTotal = 0
  for (const cat of EXPENSE_CATEGORIES) {
    const mRows = queryAll(
      "SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE category = ? AND COALESCE(NULLIF(expense_date, ''), report_date) LIKE ?",
      [cat, m + '%']
    )
    monthlyByCategory[cat] = mRows[0]?.total || 0
    monthlyTotal += monthlyByCategory[cat]
  }

  res.json({
    date: date || today,
    start_date, end_date,
    categories: byCategory,
    dailyTotal,
    items: dailyRows,
    monthlyByCategory,
    monthlyTotal
  })
})

// 新增支出（支持图片上传）
router.post('/', upload.single('receipt_image'), (req, res) => {
  const { report_date, category, amount, note, expense_date, reimbursement_person } = req.body
  if (!report_date || !amount) return res.status(400).json({ error: '缺少必填字段' })
  if (!EXPENSE_CATEGORIES.includes(category)) return res.status(400).json({ error: '无效支出类别' })

  const receiptImage = req.file ? `/uploads/receipts/${req.file.filename}` : ''

  const id = insertAndGetId(
    'INSERT INTO expenses (report_date, category, amount, note, expense_date, reimbursement_person, receipt_image) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [report_date, category, amount, note || '', expense_date || '', reimbursement_person || '', receiptImage]
  )
  res.json({ id, receipt_image: receiptImage, success: true })
})

// 编辑支出
router.put('/:id', upload.single('receipt_image'), (req, res) => {
  const exp = queryOne('SELECT * FROM expenses WHERE id = ?', [req.params.id])
  if (!exp) return res.status(404).json({ error: '支出记录不存在' })

  const { category, amount, note, expense_date, reimbursement_person } = req.body
  let receiptImage = exp.receipt_image
  if (req.file) {
    receiptImage = `/uploads/receipts/${req.file.filename}`
  } else if (req.body.receipt_image === '') {
    receiptImage = ''
  }

  runSql(
    'UPDATE expenses SET category=?, amount=?, note=?, expense_date=?, reimbursement_person=?, receipt_image=?, updated_at=datetime(\'now\',\'localtime\') WHERE id=?',
    [category ?? exp.category, amount ?? exp.amount, note ?? exp.note, expense_date ?? exp.expense_date, reimbursement_person ?? exp.reimbursement_person, receiptImage, req.params.id]
  )
  res.json({ success: true })
})

// 删除支出
router.delete('/:id', (req, res) => {
  const exp = queryOne('SELECT * FROM expenses WHERE id = ?', [req.params.id])
  if (!exp) return res.status(404).json({ error: '支出记录不存在' })
  // 删除关联图片文件
  if (exp.receipt_image) {
    const imgPath = join(__dirname, '..', exp.receipt_image)
    try { if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath) } catch(e) {}
  }
  runSql('DELETE FROM expenses WHERE id = ?', [req.params.id])
  res.json({ success: true })
})

// 月度汇总
router.get('/summary', (req, res) => {
  const { month } = req.query
  const today = new Date().toISOString().slice(0, 7)
  const m = month || today
  const byCategory = {}
  let total = 0
  for (const cat of EXPENSE_CATEGORIES) {
    const rows = queryAll(
      "SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE category = ? AND COALESCE(NULLIF(expense_date, ''), report_date) LIKE ?",
      [cat, m + '%']
    )
    byCategory[cat] = rows[0]?.total || 0
    total += byCategory[cat]
  }
  res.json({ month: m, categories: byCategory, total })
})

export { EXPENSE_CATEGORIES }
export default router

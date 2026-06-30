import { Router } from 'express'
import multer from 'multer'
import fs from 'fs'
import jwt from 'jsonwebtoken'
import { getDb, initDb, saveDb } from '../db.js'

const JWT_SECRET = 'hotel-manager-secret-key-2026'
const router = Router()
const upload = multer({ dest: '/tmp/', limits: { fileSize: 50 * 1024 * 1024 } })

// 验证 token（支持 header 和 query）
function verifyToken(req, res, next) {
  let token = null
  const auth = req.headers.authorization
  if (auth && auth.startsWith('Bearer ')) token = auth.slice(7)
  if (!token) token = req.query.token
  if (!token) return res.status(401).json({ error: '未登录' })
  try {
    req.user = jwt.verify(token, JWT_SECRET)
    next()
  } catch (e) {
    return res.status(401).json({ error: '登录已过期' })
  }
}

// ─── 导出数据库 ───
router.get('/export', verifyToken, (req, res) => {
  try {
    const db = getDb()
    const data = db.export()
    const buffer = Buffer.from(data)
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    res.setHeader('Content-Type', 'application/octet-stream')
    res.setHeader('Content-Disposition', `attachment; filename=hotel-backup-${today}.db`)
    res.setHeader('Content-Length', buffer.length)
    res.send(buffer)
  } catch (err) {
    res.status(500).json({ error: '导出失败: ' + err.message })
  }
})

// ─── 导入数据库 ───
router.post('/import', verifyToken, upload.single('db_file'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: '请上传数据库文件' })

    const filePath = req.file.path
    const buffer = fs.readFileSync(filePath)

    // 验证是否为有效的 SQLite 数据库
    if (buffer.length < 100 || buffer.slice(0, 16).toString() !== 'SQLite format 3\u0000') {
      fs.unlinkSync(filePath)
      return res.status(400).json({ error: '无效的数据库文件' })
    }

    // 覆盖当前数据库
    const db = getDb()
    db.close()

    // 写入新数据库文件
    const DB_PATH = process.env.DB_PATH
    if (!DB_PATH) {
      return res.status(500).json({ error: 'DB_PATH 未配置' })
    }

    // 先备份当前数据库
    const backupPath = DB_PATH + '.backup'
    if (fs.existsSync(DB_PATH)) {
      fs.copyFileSync(DB_PATH, backupPath)
    }

    // 写入新数据库
    fs.writeFileSync(DB_PATH, buffer)
    fs.unlinkSync(filePath)

    // 重新初始化数据库连接
    initDb().then(() => {
      saveDb()
      res.json({ success: true, message: '数据导入成功！请刷新页面' })
    }).catch(err => {
      // 恢复备份
      if (fs.existsSync(backupPath)) {
        fs.copyFileSync(backupPath, DB_PATH)
        fs.unlinkSync(backupPath)
        initDb().then(() => saveDb())
      }
      res.status(500).json({ error: '导入失败，已恢复原数据: ' + err.message })
    })

  } catch (err) {
    res.status(500).json({ error: '导入失败: ' + err.message })
  }
})

export default router

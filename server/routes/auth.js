import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { queryAll, queryOne, runSql, insertAndGetId } from '../db-helper.js'
import { requireAuth, requireRole } from '../middleware.js'

const router = Router()
const JWT_SECRET = 'hotel-manager-secret-key-2026'
const JWT_EXPIRES = '24h'

// ─── 初始化管理员（无用户时自动创建） ───

export function initAdminUser() {
  const existing = queryOne('SELECT id FROM users WHERE role = ?', ['管理员'])
  if (!existing) {
    const hash = bcrypt.hashSync('admin123', 10)
    insertAndGetId(
      'INSERT INTO users (username, password, display_name, role) VALUES (?, ?, ?, ?)',
      ['admin', hash, '系统管理员', '管理员']
    )
    console.log('👤 已创建默认管理员: admin / admin123')
  }
}

// ─── 登录 ───

router.post('/login', (req, res) => {
  const { username, password } = req.body
  if (!username || !password) return res.status(400).json({ error: '请输入用户名和密码' })

  const user = queryOne('SELECT * FROM users WHERE username = ? AND is_active = 1', [username])
  if (!user) return res.status(401).json({ error: '用户名或密码错误' })

  if (!bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: '用户名或密码错误' })
  }

  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role, display_name: user.display_name },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES }
  )

  res.json({
    token,
    user: { id: user.id, username: user.username, display_name: user.display_name, role: user.role }
  })
})

// ─── 获取当前用户 ───

router.get('/me', (req, res) => {
  const auth = req.headers.authorization
  if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ error: '未登录' })

  try {
    const decoded = jwt.verify(auth.slice(7), JWT_SECRET)
    const user = queryOne('SELECT id, username, display_name, role FROM users WHERE id = ? AND is_active = 1', [decoded.id])
    if (!user) return res.status(401).json({ error: '用户不存在' })
    res.json(user)
  } catch (e) {
    res.status(401).json({ error: '登录已过期，请重新登录' })
  }
})

// ─── 修改密码 ───

router.put('/password', (req, res) => {
  const auth = req.headers.authorization
  if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ error: '未登录' })

  try {
    const decoded = jwt.verify(auth.slice(7), JWT_SECRET)
    const { old_password, new_password } = req.body
    if (!old_password || !new_password) return res.status(400).json({ error: '缺少必填字段' })
    if (new_password.length < 6) return res.status(400).json({ error: '密码至少6位' })

    const user = queryOne('SELECT * FROM users WHERE id = ?', [decoded.id])
    if (!bcrypt.compareSync(old_password, user.password)) {
      return res.status(400).json({ error: '原密码错误' })
    }

    const hash = bcrypt.hashSync(new_password, 10)
    runSql('UPDATE users SET password = ? WHERE id = ?', [hash, decoded.id])
    res.json({ success: true })
  } catch (e) {
    res.status(401).json({ error: '登录已过期' })
  }
})

// ─── 用户管理（管理员专用） ───

router.get('/', requireAuth, requireRole('管理员'), (req, res) => {
  const rows = queryAll('SELECT id, username, display_name, role, is_active, created_at FROM users ORDER BY role, id')
  res.json(rows)
})

router.post('/', requireAuth, requireRole('管理员'), (req, res) => {
  const { username, password, display_name, role } = req.body
  if (!username || !password) return res.status(400).json({ error: '缺少必填字段' })
  const existing = queryOne('SELECT id FROM users WHERE username = ?', [username])
  if (existing) return res.status(400).json({ error: '用户名已存在' })

  const hash = bcrypt.hashSync(password, 10)
  const id = insertAndGetId(
    'INSERT INTO users (username, password, display_name, role) VALUES (?, ?, ?, ?)',
    [username, hash, display_name || '', role || '前台']
  )
  res.json({ id, success: true })
})

router.put('/:id', requireAuth, requireRole('管理员'), (req, res) => {
  const { display_name, role, is_active, password } = req.body
  const user = queryOne('SELECT * FROM users WHERE id = ?', [req.params.id])
  if (!user) return res.status(404).json({ error: '用户不存在' })

  if (password) {
    const hash = bcrypt.hashSync(password, 10)
    runSql('UPDATE users SET password=?, display_name=?, role=?, is_active=? WHERE id=?',
      [hash, display_name ?? user.display_name, role ?? user.role, is_active !== undefined ? (is_active ? 1 : 0) : user.is_active, req.params.id])
  } else {
    runSql('UPDATE users SET display_name=?, role=?, is_active=? WHERE id=?',
      [display_name ?? user.display_name, role ?? user.role, is_active !== undefined ? (is_active ? 1 : 0) : user.is_active, req.params.id])
  }
  res.json({ success: true })
})

router.delete('/:id', requireAuth, requireRole('管理员'), (req, res) => {
  const user = queryOne('SELECT * FROM users WHERE id = ?', [req.params.id])
  if (!user) return res.status(404).json({ error: '用户不存在' })
  if (user.role === '管理员') return res.status(400).json({ error: '不能删除管理员' })
  runSql('DELETE FROM users WHERE id = ?', [req.params.id])
  res.json({ success: true })
})

export default router
export { JWT_SECRET }

import jwt from 'jsonwebtoken'

// JWT_SECRET is shared with auth.js - keep in sync!
const JWT_SECRET = 'hotel-manager-secret-key-2026'

// 必须登录
export function requireAuth(req, res, next) {
  const auth = req.headers.authorization
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未登录' })
  }

  try {
    req.user = jwt.verify(auth.slice(7), JWT_SECRET)
    next()
  } catch (e) {
    res.status(401).json({ error: '登录已过期' })
  }
}

// 可选登录（有token就解析，没有也不拦截）
export function optionalAuth(req, res, next) {
  const auth = req.headers.authorization
  if (auth && auth.startsWith('Bearer ')) {
    try {
      req.user = jwt.verify(auth.slice(7), JWT_SECRET)
    } catch (e) {}
  }
  next()
}

// 角色校验
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: '未登录' })
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: `无权操作，需要角色: ${roles.join('/')}` })
    }
    next()
  }
}

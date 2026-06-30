import express from 'express'
import cors from 'cors'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { initDb } from './db.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.PORT || 3000

// 中间件
app.use(cors())
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ extended: true, limit: '50mb' }))

// 静态文件：上传的图片
const UPLOADS_STATIC = process.env.UPLOADS_STATIC || join(__dirname, 'uploads')
app.use('/uploads', express.static(UPLOADS_STATIC))

// API 路由
import dashboardRoutes from './routes/dashboard.js'
import roomRoutes from './routes/rooms.js'
import bookingRoutes from './routes/bookings.js'
import revenueRoutes from './routes/revenue.js'
import maintenanceRoutes from './routes/maintenance.js'
import cleaningRoutes from './routes/cleaning.js'
import guestRoutes from './routes/guests.js'
import cateringRoutes from './routes/catering.js'
import incenseRoutes from './routes/incense.js'
import expenseRoutes from './routes/expenses.js'
import depositRoutes from './routes/deposits.js'
import shiftReportRoutes from './routes/shift-report.js'
import authRoutes, { initAdminUser } from './routes/auth.js'
import seedRoutes from './routes/seed.js'
import dataRoutes from './routes/data.js'

app.use('/api/dashboard', dashboardRoutes)
app.use('/api/rooms', roomRoutes)
app.use('/api/bookings', bookingRoutes)
app.use('/api/revenue', revenueRoutes)
app.use('/api/maintenance', maintenanceRoutes)
app.use('/api/cleaning', cleaningRoutes)
app.use('/api/guests', guestRoutes)
app.use('/api/catering', cateringRoutes)
app.use('/api/incense', incenseRoutes)
app.use('/api/expenses', expenseRoutes)
app.use('/api/deposits', depositRoutes)
app.use('/api/shift-report', shiftReportRoutes)
app.use('/api/auth', authRoutes)
app.use('/api/seed', seedRoutes)
app.use('/api/data', dataRoutes)

// 生产环境托管静态文件
const distPath = join(__dirname, '..', 'dist')
app.use(express.static(distPath))

// SPA fallback
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api') && !req.path.startsWith('/uploads')) {
    res.sendFile(join(distPath, 'index.html'))
  }
})

// 初始化数据库后启动服务
initDb().then(() => {
  initAdminUser()
  app.listen(PORT, () => {
    console.log(`🏨 酒店管家 API 服务运行中: http://localhost:${PORT}`)
    console.log(`📦 数据库: ${join(__dirname, '..', 'data', 'hotel.db')}`)
  })
}).catch(err => {
  console.error('❌ 数据库初始化失败:', err)
  process.exit(1)
})

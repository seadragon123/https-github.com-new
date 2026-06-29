import { createRouter, createWebHashHistory } from 'vue-router'
import Home from '../views/Home.vue'
import Rooms from '../views/Rooms.vue'
import RoomDetail from '../views/RoomDetail.vue'
import Bookings from '../views/Bookings.vue'
import Checkout from '../views/Checkout.vue'
import Todos from '../views/Todos.vue'
import Revenue from '../views/Revenue.vue'
import Cleaning from '../views/Cleaning.vue'
import Maintenance from '../views/Maintenance.vue'
import Guests from '../views/Guests.vue'
import Profile from '../views/Profile.vue'
import Catering from '../views/Catering.vue'
import Incense from '../views/Incense.vue'
import Expenses from '../views/Expenses.vue'
import ShiftReport from '../views/ShiftReport.vue'
import Login from '../views/Login.vue'

const routes = [
  { path: '/login', name: 'Login', component: Login, meta: { public: true } },
  { path: '/', name: 'Home', component: Home, meta: { title: '首页', nav: true, icon: '🏠' } },
  { path: '/rooms', name: 'Rooms', component: Rooms, meta: { title: '房间', nav: true, icon: '🚪' } },
  { path: '/rooms/:id', name: 'RoomDetail', component: RoomDetail },
  { path: '/bookings', name: 'Bookings', component: Bookings, meta: { title: '订单', nav: true, icon: '📋' } },
  { path: '/checkout/:id', name: 'Checkout', component: Checkout },
  { path: '/todos', name: 'Todos', component: Todos },
  { path: '/revenue', name: 'Revenue', component: Revenue, meta: { title: '收入', nav: true, icon: '💰' } },
  { path: '/catering', name: 'Catering', component: Catering, meta: { title: '餐厅', nav: true, icon: '🍜' } },
  { path: '/incense', name: 'Incense', component: Incense, meta: { title: '请香', nav: true, icon: '🪷' } },
  { path: '/expenses', name: 'Expenses', component: Expenses, meta: { title: '支出', nav: true, icon: '💸' } },
  { path: '/shift-report', name: 'ShiftReport', component: ShiftReport, meta: { title: '交班', nav: true, icon: '📋' } },
  { path: '/guests', name: 'Guests', component: Guests, meta: { title: '客人', nav: true, icon: '👤' } },
  { path: '/cleaning', name: 'Cleaning', component: Cleaning },
  { path: '/maintenance', name: 'Maintenance', component: Maintenance },
  { path: '/profile', name: 'Profile', component: Profile, meta: { title: '我的', nav: true, icon: '👤' } },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

// 路由守卫：未登录跳登录页
router.beforeEach((to, from, next) => {
  if (to.meta.public) return next()
  const token = localStorage.getItem('token')
  if (!token) return next('/login')

  // 角色路由守卫
  const roleRoutes = {
    '管理员': ['/', '/rooms', '/bookings', '/checkout', '/guests', '/catering', '/incense', '/expenses',
               '/revenue', '/shift-report', '/cleaning', '/maintenance', '/todos', '/profile'],
    '前台': ['/', '/rooms', '/bookings', '/checkout', '/guests', '/incense', '/expenses',
            '/shift-report', '/cleaning', '/maintenance', '/todos', '/profile'],
    '餐厅': ['/catering', '/profile'],
    '财务': ['/revenue', '/expenses', '/shift-report', '/profile'],
  }
  try {
    const u = JSON.parse(localStorage.getItem('user') || '{}')
    const allowed = roleRoutes[u.role] || roleRoutes['前台']
    const path = '/' + to.path.split('/').filter(Boolean)[0] // match top-level route
    if (!allowed.some(p => to.path === p || to.path.startsWith(p + '/'))) {
      return next(allowed[0] || '/')
    }
  } catch {}
  next()
})

export default router

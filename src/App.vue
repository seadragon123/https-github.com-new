<template>
  <div id="hotel-app">
    <!-- 桌面版侧边栏 -->
    <aside class="desktop-sidebar" v-if="isDesktop">
      <div class="sidebar-header" @click="$router.push('/')">
        <span class="sidebar-logo">🏨</span>
        <span class="sidebar-title">酒店管家</span>
      </div>
      <nav class="sidebar-nav">
        <div v-for="item in navItems" :key="item.path"
             class="sidebar-item"
             :class="{ active: $route.path === item.path }"
             @click="navTo(item.path)">
          <span class="si-icon">{{ item.icon }}</span>
          <span class="si-label">{{ item.label }}</span>
        </div>
      </nav>
      <div class="sidebar-footer">
        <div class="sidebar-user" @click="$router.push('/profile')">
          <span>👤 {{ currentUser }}</span>
        </div>
        <div class="sidebar-item" @click="logout" style="color:var(--danger)">
          <span class="si-icon">🚪</span>
          <span class="si-label">退出</span>
        </div>
      </div>
    </aside>

    <!-- 主内容区 -->
    <main class="main-content" :class="{ 'has-sidebar': isDesktop }">
      <SideDrawer :visible="drawerOpen" @close="drawerOpen = false" />
      <router-view v-slot="{ Component }">
        <transition name="page" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>

    <!-- 底部导航（手机/平板） -->
    <BottomNav v-if="$route.meta.nav !== false && !isDesktop" />

    <!-- 回到顶部 -->
    <div v-if="showScrollTop" class="scroll-top" @click="scrollToTop">↑</div>
  </div>
</template>

<script setup>
import { ref, provide, onMounted, onUnmounted, computed, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import BottomNav from './components/BottomNav.vue'
import SideDrawer from './components/SideDrawer.vue'

const router = useRouter()
const route = useRoute()
const drawerOpen = ref(false)
const showScrollTop = ref(false)
const isDesktop = ref(window.innerWidth >= 768)
let scrollHandler = null
let resizeHandler = null

const currentUser = ref('用户')
const currentRole = ref('')

function loadUserFromStorage() {
  try {
    const u = JSON.parse(localStorage.getItem('user') || '{}')
    currentUser.value = u.display_name || u.username || '用户'
    currentRole.value = u.role || ''
  } catch {
    currentUser.value = '用户'
    currentRole.value = ''
  }
}

// 首次加载 + 每次路由变化时更新
loadUserFromStorage()

const roleNavMap = {
  '管理员': [
    { path: '/', icon: '🏠', label: '首页' },
    { path: '/rooms', icon: '🚪', label: '房间管理' },
    { path: '/bookings', icon: '📋', label: '订单管理' },
    { path: '/guests', icon: '👤', label: '客人管理' },
    { path: '/catering', icon: '🍜', label: '餐厅管理' },
    { path: '/incense', icon: '🪷', label: '请香管理' },
    { path: '/expenses', icon: '💸', label: '支出管理' },
    { path: '/revenue', icon: '💰', label: '营业日报' },
    { path: '/price-calendar', icon: '🗓️', label: '房价日历' },
    { path: '/shift-report', icon: '📋', label: '交班报表' },
    { path: '/cleaning', icon: '🧹', label: '清洁管理' },
    { path: '/maintenance', icon: '🔧', label: '维修管理' },
    { path: '/todos', icon: '✅', label: '待办事项' },
  ],
  '前台': [
    { path: '/', icon: '🏠', label: '首页' },
    { path: '/rooms', icon: '🚪', label: '房间管理' },
    { path: '/bookings', icon: '📋', label: '订单管理' },
    { path: '/guests', icon: '👤', label: '客人管理' },
    { path: '/incense', icon: '🪷', label: '请香管理' },
    { path: '/expenses', icon: '💸', label: '支出管理' },
    { path: '/price-calendar', icon: '🗓️', label: '房价日历' },
    { path: '/shift-report', icon: '📋', label: '交班报表' },
    { path: '/cleaning', icon: '🧹', label: '清洁管理' },
    { path: '/maintenance', icon: '🔧', label: '维修管理' },
    { path: '/todos', icon: '✅', label: '待办事项' },
  ],
  '餐厅': [
    { path: '/catering', icon: '🍜', label: '餐厅管理' },
  ],
  '财务': [
    { path: '/revenue', icon: '💰', label: '营业日报' },
    { path: '/expenses', icon: '💸', label: '支出管理' },
    { path: '/shift-report', icon: '📋', label: '交班报表' },
  ],
}

const navItems = computed(() => roleNavMap[currentRole.value] || roleNavMap['前台'])

provide('drawer', drawerOpen)
function toggleDrawer() { drawerOpen.value = !drawerOpen.value }
provide('toggleDrawer', toggleDrawer)

function navTo(path) { if (route.path !== path) router.push(path) }

function scrollToTop() {
  document.getElementById('hotel-app')?.scrollIntoView({ behavior: 'smooth' })
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function logout() {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
  router.push('/login')
}

onMounted(() => {
  scrollHandler = () => { showScrollTop.value = window.scrollY > 400 }
  resizeHandler = () => { isDesktop.value = window.innerWidth >= 768 }
  window.addEventListener('scroll', scrollHandler, { passive: true })
  window.addEventListener('resize', resizeHandler, { passive: true })
})

// 路由变化时重新读取用户信息（切换账号后刷新菜单）
watch(() => route.path, loadUserFromStorage)

onUnmounted(() => {
  if (scrollHandler) window.removeEventListener('scroll', scrollHandler)
  if (resizeHandler) window.removeEventListener('resize', resizeHandler)
})
</script>

<style scoped>
#hotel-app {
  min-height: 100vh;
  background: var(--gray-50);
  position: relative;
}

/* ===== 桌面侧边栏 ===== */
.desktop-sidebar {
  display: none;
}
@media (min-width: 768px) {
  .desktop-sidebar {
    display: flex;
    flex-direction: column;
    position: fixed;
    left: 0;
    top: 0;
    width: 200px;
    height: 100vh;
    background: #fff;
    border-right: 1px solid var(--gray-200);
    z-index: 50;
    overflow-y: auto;
  }
  .sidebar-header {
    padding: 20px 16px 12px;
    display: flex;
    align-items: center;
    gap: 8px;
    border-bottom: 1px solid var(--gray-100);
    cursor: pointer;
  }
  .sidebar-logo { font-size: 24px; }
  .sidebar-title { font-size: 16px; font-weight: 700; }
  .sidebar-nav { flex: 1; padding: 8px 0; overflow-y: auto; }
  .sidebar-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 16px;
    cursor: pointer;
    font-size: 14px;
    color: var(--gray-700);
    transition: all .15s;
    border-left: 3px solid transparent;
  }
  .sidebar-item:hover { background: var(--gray-50); }
  .sidebar-item.active { background: var(--primary-light); color: var(--primary); font-weight: 600; border-left-color: var(--primary); }
  .si-icon { font-size: 16px; width: 22px; text-align: center; }
  .sidebar-footer { border-top: 1px solid var(--gray-100); padding: 8px 0; }
  .sidebar-user { padding: 10px 16px; font-size: 13px; color: var(--gray-500); cursor: pointer; }
  .sidebar-user:hover { background: var(--gray-50); }
}

/* ===== 主内容区 ===== */
.main-content {
  max-width: 480px;
  margin: 0 auto;
  min-height: 100vh;
  background: var(--gray-50);
}
@media (min-width: 768px) {
  .main-content.has-sidebar {
    max-width: none;
    margin-left: 200px;
  }
}
@media (min-width: 1024px) {
  .main-content.has-sidebar {
    max-width: calc(100% - 200px);
  }
}

/* ===== 回到顶部 ===== */
.scroll-top {
  position: fixed;
  bottom: 80px;
  right: 16px;
  width: 40px; height: 40px;
  background: var(--primary);
  color: #fff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  box-shadow: 0 2px 8px rgba(139,94,60,.3);
  z-index: 60;
  cursor: pointer;
  animation: fadeIn .2s;
}
.scroll-top:active { transform: scale(.9); }
@media (min-width: 768px) {
  .scroll-top { bottom: 24px; right: 24px; }
}
</style>

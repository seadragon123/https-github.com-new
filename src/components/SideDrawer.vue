<template>
  <div class="drawer-overlay" v-if="visible" @click.self="$emit('close')">
    <div class="drawer">
      <div class="drawer-header">
        <span style="font-size:24px">🏨</span>
        <span class="drawer-title">酒店管家</span>
        <span class="drawer-role badge" :class="roleBadge(currentRole)">{{ currentRole }}</span>
      </div>
      <div class="drawer-body">
        <div v-for="item in menuItems" :key="item.path" class="drawer-item" @click="nav(item.path)">
          <span class="drawer-icon">{{ item.icon }}</span>
          <span>{{ item.label }}</span>
        </div>
      </div>
      <div class="drawer-footer">
        <div class="drawer-item" @click="navToProfile">
          <span class="drawer-icon">👤</span>
          <span>{{ currentUser }}</span>
        </div>
        <div class="drawer-item" @click="logout" style="color:var(--danger)">
          <span class="drawer-icon">🚪</span>
          <span>退出登录</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const props = defineProps({ visible: Boolean })
const emit = defineEmits(['close'])
const router = useRouter()

const currentUser = ref('用户')
const currentRole = ref('')
const menuItems = ref([])

const roleMenus = {
  '管理员': [
    { path: '/', icon: '🏠', label: '首页' }, { path: '/rooms', icon: '🚪', label: '房间管理' },
    { path: '/guests', icon: '👤', label: '客人管理' }, { path: '/bookings', icon: '📋', label: '订单管理' },
    { path: '/catering', icon: '🍜', label: '餐厅管理' }, { path: '/incense', icon: '🪷', label: '请香管理' },
    { path: '/expenses', icon: '💸', label: '支出管理' }, { path: '/revenue', icon: '💰', label: '营业日报' },
    { path: '/price-calendar', icon: '🗓️', label: '房价日历' }, { path: '/shift-report', icon: '📋', label: '交班报表' },
    { path: '/cleaning', icon: '🧹', label: '清洁管理' }, { path: '/maintenance', icon: '🔧', label: '维修管理' },
    { path: '/todos', icon: '✅', label: '待办事项' },
  ],
  '前台': [
    { path: '/', icon: '🏠', label: '首页' }, { path: '/rooms', icon: '🚪', label: '房间管理' },
    { path: '/guests', icon: '👤', label: '客人管理' }, { path: '/bookings', icon: '📋', label: '订单管理' },
    { path: '/incense', icon: '🪷', label: '请香管理' }, { path: '/expenses', icon: '💸', label: '支出管理' },
    { path: '/price-calendar', icon: '🗓️', label: '房价日历' }, { path: '/shift-report', icon: '📋', label: '交班报表' },
    { path: '/cleaning', icon: '🧹', label: '清洁管理' },
    { path: '/maintenance', icon: '🔧', label: '维修管理' }, { path: '/todos', icon: '✅', label: '待办事项' },
  ],
  '餐厅': [ { path: '/catering', icon: '🍜', label: '餐厅管理' } ],
  '财务': [ { path: '/revenue', icon: '💰', label: '营业日报' }, { path: '/expenses', icon: '💸', label: '支出管理' }, { path: '/shift-report', icon: '📋', label: '交班报表' } ],
}

function loadRole() {
  try {
    const u = JSON.parse(localStorage.getItem('user') || '{}')
    currentUser.value = u.display_name || u.username || '用户'
    currentRole.value = u.role || ''
    menuItems.value = roleMenus[currentRole.value] || roleMenus['前台']
  } catch {
    currentUser.value = '用户'
    currentRole.value = ''
    menuItems.value = roleMenus['前台']
  }
}

onMounted(loadRole)

function roleBadge(role) {
  const map = { '管理员': 'badge-red', '前台': 'badge-blue', '餐厅': 'badge-orange', '财务': 'badge-green' }
  return map[role] || 'badge-gray'
}

function nav(path) { emit('close'); router.push(path) }
function navToProfile() { emit('close'); router.push('/profile') }

function logout() {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
  emit('close')
  router.push('/login')
}
</script>

<style scoped>
.drawer-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,.4); z-index: 100; animation: fadeIn .2s; }
.drawer { width: 280px; max-width: 80%; height: 100%; background: #fff; display: flex; flex-direction: column; animation: slideIn .25s; }
.drawer-header { padding: 24px 20px 16px; border-bottom: 1px solid var(--gray-200); display: flex; align-items: center; gap: 10px; }
.drawer-title { font-size: 18px; font-weight: 700; }
.drawer-role { font-size: 10px; margin-left: auto; }
.drawer-body { flex: 1; overflow-y: auto; padding: 8px 0; }
.drawer-footer { border-top: 1px solid var(--gray-200); padding: 8px 0; }
.drawer-item { display: flex; align-items: center; gap: 12px; padding: 14px 20px; cursor: pointer; font-size: 15px; transition: background .15s; }
.drawer-item:active { background: var(--gray-100); }
.drawer-icon { font-size: 20px; width: 28px; text-align: center; }
@keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
@keyframes slideIn { from { transform: translateX(-100%) } to { transform: translateX(0) } }
</style>

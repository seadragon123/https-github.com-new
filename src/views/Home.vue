<template>
  <div class="page">
    <!-- 顶部 -->
    <header class="page-header" style="padding-bottom:8px">
      <div class="flex-between">
        <div class="flex-center" style="gap:4px">
          <button class="btn-icon header-btn" @click="toggleDrawer">☰</button>
          <div>
            <h1 style="font-size:18px">福源登山酒店</h1>
            <div class="subtitle">{{ today }}</div>
          </div>
        </div>
        <div class="flex-center">
          <button class="btn-icon header-btn" @click="$router.push('/todos')" style="position:relative">
            🔔
            <span v-if="todoCount > 0" class="bell-badge">{{ todoCount }}</span>
          </button>
        </div>
      </div>
    </header>

    <div class="page-body">
      <!-- 今日概览 -->
      <div class="card">
        <div class="card-header">📊 今日概览</div>
        <div class="card-body">
          <div class="stats-grid">
            <div class="stat-item" @click="filterRooms('已入住')">
              <div class="stat-value">{{ overview.checkIn }}</div>
              <div class="stat-label">今日入住</div>
              <div class="stat-trend up">↑</div>
              <div class="stat-progress"><div class="stat-bar" :style="'width:' + (overview.totalRooms > 0 ? (overview.checkIn / overview.totalRooms * 100) : 0) + '%'"></div></div>
            </div>
            <div class="stat-item" @click="filterRooms('空房')">
              <div class="stat-value">{{ overview.checkOut }}</div>
              <div class="stat-label">今日退房</div>
              <div class="stat-trend down">↓</div>
              <div class="stat-progress"><div class="stat-bar bar-orange" :style="'width:' + (overview.totalRooms > 0 ? (overview.checkOut / overview.totalRooms * 100) : 0) + '%'"></div></div>
            </div>
            <div class="stat-item" @click="filterRooms('空房')">
              <div class="stat-value">{{ overview.emptyRooms }}</div>
              <div class="stat-label">空房数量</div>
              <div class="stat-progress"><div class="stat-bar bar-green" :style="'width:' + (overview.totalRooms > 0 ? (overview.emptyRooms / overview.totalRooms * 100) : 0) + '%'"></div></div>
            </div>
            <div class="stat-item" @click="$router.push('/todos')">
              <div class="stat-value">{{ overview.todoCount }}</div>
              <div class="stat-label">待办事项</div>
              <div class="stat-progress"><div class="stat-bar bar-red" :style="'width:' + (overview.todoCount > 0 ? Math.min(overview.todoCount * 20, 100) : 0) + '%'"></div></div>
            </div>
          </div>
          <div class="room-summary">
            <span>总客房 {{ overview.totalRooms }} | 已入住 {{ overview.occupied }} | 维修 {{ overview.maintenance }}</span>
          </div>
          <div class="status-distribution">
            <div v-for="s in statusList" :key="s.label" class="dist-row">
              <span class="dist-label">{{ s.label }}</span>
              <div class="dist-bar-wrap">
                <div class="dist-bar" :class="s.color" :style="'width:' + s.percent + '%'"></div>
              </div>
              <span class="dist-count">{{ s.count }}间</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 快速操作 -->
      <div class="card">
        <div class="card-header">⚡ 快速操作</div>
        <div class="card-body">
          <div class="quick-grid">
            <div class="quick-btn" @click="showCheckin = true">
              <span class="qb-icon">🛎️</span>
              <span class="qb-label">办理入住</span>
            </div>
            <div class="quick-btn" @click="showCheckoutList = true">
              <span class="qb-icon">💰</span>
              <span class="qb-label">退房结账</span>
            </div>
            <div class="quick-btn" @click="$router.push('/catering')">
              <span class="qb-icon">🍜</span>
              <span class="qb-label">餐厅点单</span>
            </div>
            <div class="quick-btn" @click="$router.push('/incense')">
              <span class="qb-icon">🪷</span>
              <span class="qb-label">请香销售</span>
            </div>
            <div class="quick-btn" @click="$router.push('/expenses')">
              <span class="qb-icon">💸</span>
              <span class="qb-label">支出管理</span>
            </div>
            <div class="quick-btn" @click="showMore = true">
              <span class="qb-icon">➕</span>
              <span class="qb-label">更多服务</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 房间状态 -->
      <div class="card">
        <div class="card-header">
          <span>🏠 客房状态</span>
          <button class="btn btn-sm btn-outline" @click="$router.push('/rooms')">查看全部</button>
        </div>
        <div class="card-body">
          <div class="tabs">
            <div class="tab" :class="{ active: roomFilter === '' }" @click="roomFilter = ''">全部房间</div>
            <div class="tab" :class="{ active: roomFilter === '清洁中' }" @click="roomFilter = '清洁中'">清洁中</div>
            <div class="tab" :class="{ active: roomFilter === '维修中' }" @click="roomFilter = '维修中'">维修中</div>
            <div class="tab" :class="{ active: roomFilter === '已预订' }" @click="roomFilter = '已预订'">已预订</div>
            <div class="tab" :class="{ active: roomFilter === '空房' }" @click="roomFilter = '空房'">空房</div>
          </div>
          <div class="room-list">
            <div v-for="room in filteredRooms" :key="room.id"
                 class="room-item" @click="$router.push(`/rooms/${room.id}`)">
              <div class="room-left">
                <span class="room-no">{{ room.room_no }}</span>
                <span class="room-type">{{ room.room_type }}</span>
              </div>
              <div class="room-center">
                <span v-if="room.current_guest" class="guest-name">{{ room.current_guest }}</span>
                <span v-else class="text-muted text-sm">空房</span>
              </div>
              <div class="room-right">
                <span class="badge" :class="statusBadge(room.status)">{{ room.status }}</span>
                <span v-if="room.status === '空房'" class="btn btn-sm btn-success" @click.stop="quickCheckin(room)">入住</span>
              </div>
            </div>
            <van-empty v-if="filteredRooms.length === 0" description="暂无符合条件的房间" />
          </div>
        </div>
      </div>

      <!-- 今日待办 -->
      <div class="card">
        <div class="card-header">
          <span>✅ 今日待办</span>
          <button class="btn btn-sm btn-outline" @click="$router.push('/todos')">查看全部</button>
        </div>
        <div class="card-body">
          <div v-for="todo in todos" :key="todo.id" class="todo-item">
            <div class="todo-check" :class="{ checked: todo.completed }"
                 @click="toggleTodo(todo.id)">
              {{ todo.completed ? '✓' : '' }}
            </div>
            <div class="todo-content">
              <span :class="{ 'todo-done': todo.completed }">{{ todo.title }}</span>
              <span v-if="todo.due_time" class="todo-time">{{ formatTime(todo.due_time) }}</span>
            </div>
            <span v-if="todo.priority >= 2" class="badge badge-red">VIP</span>
          </div>
          <van-empty v-if="todos.length === 0" description="暂无待办事项" />
          <div v-if="incompleteCount > 0" class="todo-footer">
            还有 {{ incompleteCount }} 项未完成，<a @click="$router.push('/todos')">点击查看全部</a>
          </div>
        </div>
      </div>
    </div>

    <!-- 办理入住 Modal（多客人 + 房价） -->
    <div v-if="showCheckin" class="modal-overlay" @click.self="showCheckin = false">
      <div class="modal-content" style="max-width:420px">
        <div class="modal-title">🛎️ 办理入住</div>

        <div class="form-group">
          <label>选择房间</label>
          <select v-model="checkinForm.room_id" class="form-input form-select">
            <option value="">-- 请选择房间 --</option>
            <option v-for="r in availableRooms" :key="r.id" :value="r.id">
              {{ r.room_no }} - {{ r.room_type }} (¥{{ r.price }})
            </option>
          </select>
        </div>

        <!-- 多客人卡片 -->
        <div v-for="(g, i) in checkinForm.guests" :key="i" class="guest-card">
          <div class="guest-card-header">
            <span class="guest-card-num">👤 客人 {{ i + 1 }}</span>
            <button v-if="checkinForm.guests.length > 1" class="btn btn-sm btn-danger" @click="removeGuest(i)">✕</button>
          </div>
          <div class="guest-card-body">
            <div class="form-group">
              <label>姓名 *</label>
              <input v-model="g.name" class="form-input" placeholder="输入姓名" />
            </div>
            <div class="form-group">
              <label>身份证号</label>
              <input v-model="g.id_card" class="form-input" placeholder="选填" />
            </div>
            <div class="form-row">
              <div class="form-group" style="flex:1">
                <label>联系电话</label>
                <input v-model="g.phone" class="form-input" placeholder="选填" />
              </div>
              <div class="form-group" style="flex:0 0 90px">
                <label>性别</label>
                <select v-model="g.gender" class="form-input form-select">
                  <option value="">—</option>
                  <option value="男">男</option>
                  <option value="女">女</option>
                </select>
              </div>
            </div>
          </div>
        </div>
        <button class="btn btn-sm btn-outline btn-block mb-8" @click="addGuest">➕ 添加客人</button>

        <div class="flex-between gap-4">
          <div class="form-group" style="flex:1">
            <label>入住日期</label>
            <input v-model="checkinForm.check_in" type="date" class="form-input" />
          </div>
          <div class="form-group" style="flex:1">
            <label>退房日期</label>
            <input v-model="checkinForm.check_out" type="date" class="form-input" />
          </div>
        </div>
        <div class="form-group">
          <label>房价 (¥)</label>
          <input v-model="checkinForm.amount" type="number" class="form-input" placeholder="0" />
        </div>
        <div class="form-group">
          <label>押金 (¥)</label>
          <input v-model="checkinForm.deposit" type="number" class="form-input" placeholder="0" />
        </div>
        <div class="flex-between mt-8 gap-4" style="flex-direction:column">
          <div style="display:flex;gap:8px;width:100%">
            <button class="btn btn-outline btn-block" @click="showCheckin = false">取消</button>
            <button class="btn btn-primary btn-block" @click="doCheckin">🛎️ 立即入住</button>
          </div>
          <button class="btn btn-sm btn-outline btn-block" style="border-color:var(--primary);color:var(--primary);font-size:12px" @click="doReserve">📅 仅预订（不到店，先占房号）</button>
        </div>
      </div>
    </div>

    <!-- 退房列表 Modal -->
    <div v-if="showCheckoutList" class="modal-overlay" @click.self="showCheckoutList = false">
      <div class="modal-content">
        <div class="modal-title">💰 退房结账</div>
        <div v-for="b in checkoutList" :key="b.id" class="room-item" @click="goCheckout(b)">
          <div class="room-left">
            <span class="room-no">{{ b.room_no }}</span>
          </div>
          <div class="room-center">
            <span class="guest-name">{{ b.guest_name }}</span>
            <span class="text-sm text-muted">{{ b.check_in }} ~ {{ b.check_out }}</span>
          </div>
          <div class="room-right">
            <span class="text-sm">¥{{ b.amount }}</span>
            <span class="btn btn-sm btn-success">结账</span>
          </div>
        </div>
        <van-empty v-if="checkoutList.length === 0" description="今日没有退房客人" />
        <button class="btn btn-outline btn-block mt-8" @click="showCheckoutList = false">关闭</button>
      </div>

      <!-- 更多服务弹窗 -->
    <div v-if="showMore" class="modal-overlay" @click.self="showMore = false">
      <div class="modal-content">
        <div class="modal-title">➕ 更多服务</div>
        <div class="grid-3">
          <div class="quick-btn" @click="showMore=false;$router.push('/cleaning')">
            <span class="qb-icon">🧹</span><span class="qb-label">客房清洁</span>
          </div>
          <div class="quick-btn" @click="showMore=false;$router.push('/maintenance')">
            <span class="qb-icon">🔧</span><span class="qb-label">维修报修</span>
          </div>
          <div class="quick-btn" @click="showMore=false;$router.push('/revenue')">
            <span class="qb-icon">💰</span><span class="qb-label">营业日报</span>
          </div>
          <div class="quick-btn" @click="showMore=false;$router.push('/rooms')">
            <span class="qb-icon">🚪</span><span class="qb-label">全部房间</span>
          </div>
          <div class="quick-btn" @click="showMore=false;$router.push('/todos')">
            <span class="qb-icon">✅</span><span class="qb-label">待办事项</span>
          </div>
          <div class="quick-btn" @click="showMore=false;$router.push('/profile')">
            <span class="qb-icon">👤</span><span class="qb-label">系统设置</span>
          </div>
        </div>
        <button class="btn btn-outline btn-block mt-8" @click="showMore = false">关闭</button>
      </div>
    </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, inject, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import api from '../api/index.js'
import { showToast, showFailToast, showConfirmDialog } from 'vant'

const router = useRouter()
const toggleDrawer = inject('toggleDrawer')

const today = new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })

// 概览
const overview = ref({ checkIn: 0, checkOut: 0, emptyRooms: 0, occupied: 0, maintenance: 0, todoCount: 0, totalRooms: 0, booked: 0 })
const todos = ref([])
const rooms = ref([])
const roomFilter = ref('')

const todoCount = computed(() => overview.value.todoCount)
const incompleteCount = computed(() => todos.value.filter(t => !t.completed).length)

const filteredRooms = computed(() => {
  if (!roomFilter.value) return rooms.value.slice(0, 6)
  return rooms.value.filter(r => r.status === roomFilter.value)
})


// 确认弹窗
async function showConfirm(msg) {
  try {
    await showConfirmDialog({ message: msg })
    return true
  } catch {
    return false
  }
}

const loadData = async () => {
  const [ov, td, rm] = await Promise.all([
    api.getOverview(), api.getTodos(0), api.getRooms()
  ])
  overview.value = ov
  todos.value = td
  rooms.value = rm
}

// 待办操作
const toggleTodo = async (id) => {
  await api.toggleTodo(id)
  loadData()
}

const formatTime = (t) => t ? t.slice(11, 16) : ''

// 入住操作
const showCheckin = ref(false)
const checkinForm = ref({ room_id: '', guests: [{ name: '', id_card: '', phone: '', gender: '' }], check_in: '', check_out: '', amount: 0, deposit: 0 })
const availableRooms = ref([])

function addGuest() {
  checkinForm.value.guests.push({ name: '', id_card: '', phone: '', gender: '' })
}
function removeGuest(i) {
  checkinForm.value.guests.splice(i, 1)
}

watch(showCheckin, async (v) => {
  if (v) {
    const today = new Date().toISOString().slice(0, 10)
    const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10)
    checkinForm.value = { room_id: '', guests: [{ name: '', id_card: '', phone: '', gender: '' }], check_in: today, check_out: tomorrow, amount: 0, deposit: 0 }
    availableRooms.value = await api.getAvailableRooms()
  }
})

const doCheckin = async () => {
  if (!checkinForm.value.room_id) {
    showToast('请选择房间')
    return
  }
  const validGuests = checkinForm.value.guests.filter(g => g.name?.trim())
  if (validGuests.length === 0) {
    showToast('请至少填写一位客人姓名')
    return
  }
  await api.createBooking({ ...checkinForm.value, guests: validGuests })
  showCheckin.value = false
  showToast('入住办理成功！')
  loadData()
}

const quickCheckin = (room) => {
  const today = new Date().toISOString().slice(0, 10)
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10)
  checkinForm.value = {
    room_id: room.id,
    guests: [{ name: '', id_card: '', phone: '', gender: '' }],
    check_in: today,
    check_out: tomorrow,
    amount: room.price || 0,
    deposit: 0
  }
  showCheckin.value = true
}

const doReserve = async () => {
  if (!checkinForm.value.room_id) {
    showToast('请选择房间')
    return
  }
  const validGuests = checkinForm.value.guests.filter(g => g.name?.trim())
  if (validGuests.length === 0) {
    showToast('请至少填写一位客人姓名')
    return
  }
  // 先创建入住订单
  const result = await api.createBooking({ ...checkinForm.value, guests: validGuests })
  // 更新为预订状态（不到店，房间标记已预订）
  await api.updateBookingStatus(result.id, '已预订')
  showCheckin.value = false
  showToast('预订成功！已占用房号')
  loadData()
}

// 退房操作
const showCheckoutList = ref(false)
const checkoutList = ref([])
watch(showCheckoutList, async (v) => {
  if (v) {
    const all = await api.getBookings('已入住')
    checkoutList.value = all.filter(b => b.check_out <= new Date().toISOString().slice(0, 10))
  }
})

const goCheckout = (booking) => {
  showCheckoutList.value = false
  router.push(`/checkout/${booking.id}`)
}

// 房间筛选跳转
const filterRooms = (status) => {
  router.push({ path: '/rooms', query: { status } })
}

// 更多服务
const showMore = ref(false)

const statusList = computed(() => {
  const total = overview.totalRooms || 1
  return [
    { label: '已入住', count: overview.occupied, color: 'bar-green', percent: (overview.occupied / total * 100).toFixed(0) },
    { label: '空房', count: overview.emptyRooms, color: 'bar-blue', percent: (overview.emptyRooms / total * 100).toFixed(0) },
    { label: '清洁中', count: total - overview.occupied - overview.emptyRooms - overview.maintenance - (overview.booked||0), color: 'bar-orange', percent: 0 },
    { label: '维修中', count: overview.maintenance, color: 'bar-red', percent: (overview.maintenance / total * 100).toFixed(0) },
  ].filter(s => s.count > 0)
})

const statusBadge = (s) => {
  const map = { '已入住': 'badge-green', '清洁中': 'badge-orange', '维修中': 'badge-red', '已预订': 'badge-blue', '空房': 'badge-gray' }
  return map[s] || 'badge-gray'
}

onMounted(loadData)
</script>

<style scoped>
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}
.stat-item {
  text-align: center;
  padding: 12px 4px;
  background: var(--gray-50);
  border-radius: var(--radius-sm);
  cursor: pointer;
  position: relative;
  transition: background .15s;
}
.stat-item:active { background: var(--gray-200); }

/* 客人搜索 */
.guest-search-wrap { position: relative; }
.guest-results {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: #fff;
  border: 1px solid var(--gray-200);
  border-radius: var(--radius-sm);
  box-shadow: var(--shadow-lg);
  z-index: 50;
  max-height: 240px;
  overflow-y: auto;
}
.guest-result-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  cursor: pointer;
  font-size: 14px;
  transition: background .1s;
}
.guest-result-item:active { background: var(--gray-50); }
.guest-result-item + .guest-result-item { border-top: 1px solid var(--gray-100); }
.gr-name { font-weight: 500; }
.gr-phone { font-size: 12px; color: var(--gray-500); }
.gr-vip { font-size: 10px; color: var(--warning); font-weight: 600; margin-left: auto; }
.stat-value { font-size: 24px; font-weight: 700; color: var(--gray-900); }
.stat-label { font-size: 11px; color: var(--gray-500); margin-top: 2px; }
.stat-trend { font-size: 12px; font-weight: 600; }
.stat-trend.up { color: var(--success); }
.stat-trend.down { color: var(--danger); }
.stat-badge {
  position: absolute;
  top: 4px; right: 4px;
  background: var(--danger);
  color: #fff;
  font-size: 10px;
  width: 18px; height: 18px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
}
.room-summary {
  text-align: center;
  font-size: 12px;
  color: var(--gray-500);
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid var(--gray-100);
}

.quick-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}
.quick-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 14px 8px;
  background: var(--gray-50);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: background .15s;
}
.quick-btn:active { background: var(--gray-200); }
.qb-icon { font-size: 24px; }
.qb-label { font-size: 12px; color: var(--gray-700); font-weight: 500; }

.room-list { display: flex; flex-direction: column; gap: 0; }
.room-item {
  display: flex;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid var(--gray-100);
  cursor: pointer;
  gap: 8px;
}
.room-item:last-child { border-bottom: none; }
.room-left { display: flex; align-items: center; gap: 8px; min-width: 80px; }
.room-no { font-size: 16px; font-weight: 600; }
.room-type { font-size: 11px; color: var(--gray-500); }
.room-center { flex: 1; }
.guest-name { font-size: 14px; font-weight: 500; }
.room-right { display: flex; align-items: center; gap: 8px; }

.todo-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 8px 0;
  border-bottom: 1px solid var(--gray-100);
}
.todo-item:last-child { border-bottom: none; }
.todo-check {
  width: 20px; height: 20px;
  border: 2px solid var(--gray-300);
  border-radius: 50%;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  color: transparent;
  transition: all .15s;
  margin-top: 2px;
}
.todo-check.checked { background: var(--success); border-color: var(--success); color: #fff; }
.todo-content { flex: 1; font-size: 14px; }
.todo-done { text-decoration: line-through; color: var(--gray-500); }
.todo-time { display: block; font-size: 12px; color: var(--gray-500); margin-top: 2px; }
.todo-footer {
  text-align: center;
  font-size: 13px;
  color: var(--gray-500);
  padding-top: 10px;
  border-top: 1px solid var(--gray-100);
  margin-top: 4px;
}
.todo-footer a { color: var(--primary); cursor: pointer; text-decoration: none; }

.stat-progress { height: 3px; background: var(--gray-100); border-radius: 2px; margin-top: 8px; overflow: hidden; }
.stat-bar { height: 100%; background: var(--primary); border-radius: 2px; transition: width .5s ease; }
.bar-green { background: var(--success); }
.bar-orange { background: var(--warning); }
.bar-red { background: var(--danger); }
.bar-blue { background: var(--primary); }
.bar-purple { background: #8B6FAF; }
.status-distribution { margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--gray-100); }
.dist-row { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
.dist-label { font-size: 12px; color: var(--gray-700); width: 48px; flex-shrink: 0; }
.dist-bar-wrap { flex: 1; height: 8px; background: var(--gray-100); border-radius: 4px; overflow: hidden; }
.dist-bar { height: 100%; border-radius: 4px; transition: width .5s ease; }
.dist-count { font-size: 11px; color: var(--gray-500); width: 32px; text-align: right; }
.header-btn { border: none; background: none; cursor: pointer; font-size: 20px; padding: 6px 8px; border-radius: 8px; }
.header-btn:active { background: var(--gray-100); }
.bell-badge {
  position: absolute; top: 0; right: 0;
  background: var(--danger); color: #fff;
  font-size: 10px; min-width: 16px; height: 16px;
  border-radius: 8px; display: flex; align-items: center; justify-content: center;
  font-weight: 600; padding: 0 4px;
}

/* 多客人卡片 */
.guest-card { background: var(--gray-50); border-radius: var(--radius-sm); padding: 12px; margin-bottom: 10px; }
.guest-card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.guest-card-num { font-weight: 600; font-size: 13px; }
.guest-card-body { display: flex; flex-direction: column; gap: 8px; }
.form-row { display: flex; gap: 10px; }
.mb-8 { margin-bottom: 8px; }
</style>

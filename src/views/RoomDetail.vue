<template>
  <div class="page">
    <header class="page-header">
      <div class="flex-between">
        <div class="flex-center">
          <button class="btn-back" @click="$router.back()">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
          <h1 style="font-size:18px;margin-left:4px">{{ room.room_no }} 详情</h1>
        </div>
        <button v-if="!editing" class="btn btn-sm btn-primary" @click="startEdit">✏️ 编辑</button>
        <div v-else class="flex-center gap-4">
          <button class="btn btn-sm btn-outline" @click="cancelEdit">取消</button>
          <button class="btn btn-sm btn-success" @click="saveRoom">保存</button>
        </div>
      </div>
    </header>

    <div class="page-body">
      <!-- 房间信息（查看/编辑模式） -->
      <div class="card">
        <div class="card-header">🏠 房间信息</div>
        <div class="card-body">
          <!-- 查看模式 -->
          <template v-if="!editing">
            <div class="detail-grid">
              <div class="detail-item">
                <div class="detail-label">房号</div>
                <div class="detail-value">{{ room.room_no }}</div>
              </div>
              <div class="detail-item">
                <div class="detail-label">楼层</div>
                <div class="detail-value">{{ room.floor }}F</div>
              </div>
              <div class="detail-item">
                <div class="detail-label">房型</div>
                <div class="detail-value">{{ room.room_type }}</div>
              </div>
              <div class="detail-item">
                <div class="detail-label">房价</div>
                <div class="detail-value price-text" v-if="room.price">¥{{ Number(room.price).toFixed(0) }}<span class="text-sm text-muted">/晚</span></div>
                <div class="detail-value text-muted" v-else>未设置</div>
              </div>
              <div class="detail-item" style="grid-column: span 2;">
                <div class="detail-label">状态</div>
                <span class="badge" :class="statusBadge(room.status)">{{ room.status }}</span>
              </div>
            </div>
            <div v-if="room.description" class="desc-box">{{ room.description }}</div>
          </template>

          <!-- 编辑模式 -->
          <template v-else>
            <div class="edit-grid">
              <div class="form-group">
                <label>房号</label>
                <input v-model="editForm.room_no" class="form-input" />
              </div>
              <div class="form-group">
                <label>楼层</label>
                <input v-model.number="editForm.floor" type="number" min="1" max="20" class="form-input" />
              </div>
              <div class="form-group">
                <label>房型</label>
                <select v-model="editForm.room_type" class="form-input form-select">
                  <option v-for="t in roomTypes" :key="t.id" :value="t.name">{{ t.name }}</option>
                </select>
              </div>
              <div class="form-group">
                <label>房价 (元/晚)</label>
                <input v-model.number="editForm.price" type="number" min="0" class="form-input" placeholder="如 288" />
              </div>
              <div class="form-group" style="grid-column: span 2;">
                <label>备注描述</label>
                <input v-model="editForm.description" class="form-input" placeholder="选填" />
              </div>
            </div>
          </template>
        </div>

        <!-- 删除（编辑模式） -->
        <div v-if="editing" class="card-footer">
          <button class="btn btn-danger btn-block" @click="deleteRoom">删除此房间</button>
        </div>

        <!-- 操作按钮（查看模式） -->
        <template v-if="!editing">
          <div class="card-footer flex-between" v-if="room.status === '已入住'">
            <button class="btn btn-success" @click="$router.push(`/checkout/${currentBooking.id}`)">退房结账</button>
          </div>
          <div class="card-footer flex-between" v-if="room.status === '已预订'">
            <button class="btn btn-primary" @click="directCheckin">直接入住</button>
            <button class="btn btn-outline" @click="cancelReserve">🗑️ 取消预订</button>
          </div>
          <div class="card-footer" v-if="room.status === '空房'">
            <button class="btn btn-primary btn-block" @click="showCheckinModal = true">办理入住</button>
          </div>
          <div class="card-footer" v-if="room.status === '维修中'">
            <button class="btn btn-outline btn-block" @click="markFixed">✓ 标记已修复</button>
          </div>
          <div class="card-footer" v-if="room.status === '清洁中'">
            <button class="btn btn-outline btn-block" @click="markClean">✓ 标记已完成</button>
          </div>
        </template>
      </div>

      <!-- 当前入住 -->
      <div v-if="currentBooking && !editing" class="card">
        <div class="card-header">👥 入住客人（{{ bookingGuests.length || 1 }} 位）</div>
        <div class="card-body">
          <div v-for="(g, i) in (bookingGuests.length > 0 ? bookingGuests : [{ name: currentBooking.guest_name, phone: currentBooking.guest_phone }])" :key="i" class="guest-info-item">
            <div class="guest-info-main">{{ g.name }}</div>
            <div class="guest-info-meta">
              <span v-if="g.phone">{{ g.phone }}</span>
              <span v-if="g.id_card">· {{ g.id_card }}</span>
              <span v-if="g.gender">· {{ g.gender }}</span>
            </div>
          </div>
          <div class="flex-between mt-8">
            <span class="text-sm text-muted">{{ currentBooking.check_in }} 入住</span>
            <span class="text-sm text-muted">{{ currentBooking.check_out }} 退房</span>
          </div>
        </div>
      </div>

      <!-- 历史记录 -->
      <div v-if="!editing" class="card">
        <div class="card-header">📜 历史记录</div>
        <div class="card-body">
          <div v-for="h in history" :key="h.id" class="history-item">
            <span class="guest-name">{{ h.guest_name }}</span>
            <span class="text-sm text-muted">{{ h.check_in }} ~ {{ h.check_out }}</span>
            <span class="badge" :class="statusBadge(h.status)">{{ h.status }}</span>
          </div>
          <van-empty v-if="history.length === 0" description="暂无历史记录" />
        </div>
      </div>
    </div>

    <!-- 入住 Modal -->
    <div v-if="showCheckinModal" class="modal-overlay" @click.self="showCheckinModal = false">
      <div class="modal-content" style="max-width:420px">
        <div class="modal-title">🛎️ {{ room.room_no }} 入住登记</div>

        <!-- 客人列表 -->
        <div v-for="(g, i) in form.guests" :key="i" class="guest-card">
          <div class="guest-card-header">
            <span class="guest-card-num">👤 客人 {{ i + 1 }}</span>
            <button v-if="form.guests.length > 1" class="btn btn-sm btn-danger" @click="removeGuest(i)">✕</button>
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
            <input v-model="form.check_in" type="date" class="form-input" />
          </div>
          <div class="form-group" style="flex:1">
            <label>退房日期</label>
            <input v-model="form.check_out" type="date" class="form-input" />
          </div>
        </div>
        <div class="flex-between gap-4">
          <div class="form-group" style="flex:1">
            <label>房价 (元/晚)</label>
            <input v-model.number="form.price_per_night" type="number" min="0" class="form-input" :placeholder="String(room.price || 0)" />
          </div>
          <div class="form-group" style="flex:1">
            <label>订单金额</label>
            <div class="form-amount-readonly">¥{{ computedAmount }}</div>
          </div>
        </div>
        <div class="flex-between gap-4">
          <div class="form-group" style="flex:1">
            <label>押金 (¥)</label>
            <input v-model.number="form.deposit" type="number" class="form-input" placeholder="0" />
          </div>
        </div>
        <div class="flex-between mt-8 gap-4">
          <button class="btn btn-outline btn-block" @click="showCheckinModal = false">取消</button>
          <button class="btn btn-primary btn-block" @click="doCheckin">确认入住</button>
          <button class="btn btn-sm btn-outline" style="border-color:var(--primary);color:var(--primary);font-size:12px" @click="doReserve">📅 仅预订</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '../api/index.js'
import { showToast, showFailToast, showConfirmDialog } from 'vant'

const route = useRoute()
const router = useRouter()

const room = ref({})
const roomTypes = ref([])
const currentBooking = ref(null)
const bookingGuests = ref([])
const history = ref([])
const editing = ref(false)
const editForm = ref({})
const showCheckinModal = ref(false)
const _checkinBookingId = ref(null)
const form = ref({ guests: [{ name: '', id_card: '', phone: '', gender: '' }], check_in: '', check_out: '', price_per_night: 0, deposit: 0 })

const computedAmount = computed(() => {
  const ppn = Number(form.value.price_per_night) || 0
  if (!form.value.check_in || !form.value.check_out) return 0
  const start = new Date(form.value.check_in)
  const end = new Date(form.value.check_out)
  const nights = Math.max(1, Math.ceil((end - start) / 86400000))
  return ppn * nights
})

function addGuest() {
  form.value.guests.push({ name: '', id_card: '', phone: '', gender: '' })
}
function removeGuest(i) {
  form.value.guests.splice(i, 1)
}

const statusBadge = (s) => {
  const map = { '已入住': 'badge-green', '清洁中': 'badge-orange', '维修中': 'badge-red', '已预订': 'badge-blue', '空房': 'badge-gray', '已完成': 'badge-gray', '已取消': 'badge-gray' }
  return map[s] || 'badge-gray'
}

const loadRoom = async () => {
  const data = await api.getRoom(route.params.id)
  room.value = data.room
  currentBooking.value = data.currentBooking
  bookingGuests.value = data.bookingGuests || []
  history.value = data.history
  const today = new Date().toISOString().slice(0, 10)
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10)
  form.value = { guests: [{ name: '', id_card: '', phone: '', gender: '' }], check_in: today, check_out: tomorrow, price_per_night: room.value.price || 0, deposit: 0 }
  _checkinBookingId.value = null
}

// 编辑功能

// 确认弹窗
async function showConfirm(msg) {
  try {
    await showConfirmDialog({ message: msg })
    return true
  } catch {
    return false
  }
}

function startEdit() {
  editForm.value = {
    room_no: room.value.room_no,
    floor: room.value.floor,
    room_type: room.value.room_type,
    description: room.value.description || '',
    price: room.value.price || 0
  }
  editing.value = true
}

function cancelEdit() {
  editing.value = false
}

async function deleteRoom() {
  if (!await showConfirm('确定要删除房间 ' + room.value.room_no + ' 吗？\n此操作不可恢复。')) return
  try {
    await api.deleteRoom(room.value.id)
    showToast('已删除')
    setTimeout(() => router.push('/rooms'), 500)
  } catch (err) {
    showToast('删除失败: ' + err.message)
  }
}

async function saveRoom() {
  try {
    await api.updateRoom(room.value.id, editForm.value)
    editing.value = false
    loadRoom()
    showToast('✅ 房间信息已更新')
  } catch (err) {
    showToast('保存失败: ' + err.message)
  }
}

// 状态操作
const doCheckin = async () => {
  const validGuests = form.value.guests.filter(g => g.name?.trim())
  if (validGuests.length === 0) { showToast('请至少填写一位客人姓名'); return }
  if (_checkinBookingId.value) {
    // 预订 → 直接入住（更新客人信息）
    await api.directCheckin(_checkinBookingId.value, { guests: validGuests, price_per_night: form.value.price_per_night, deposit: form.value.deposit })
    _checkinBookingId.value = null
  } else {
    // 空房 → 新建入住
    await api.createBooking({ ...form.value, price_per_night: form.value.price_per_night, guests: validGuests, room_id: room.value.id })
  }
  showCheckinModal.value = false
  showToast('✅ 入住成功')
  loadRoom()
}

const doReserve = async () => {
  const validGuests = form.value.guests.filter(g => g.name?.trim())
  if (validGuests.length === 0) { showToast('请至少填写一位客人姓名'); return }
  const result = await api.createBooking({ ...form.value, price_per_night: form.value.price_per_night, guests: validGuests, room_id: room.value.id, _is_reserve: true })
  showCheckinModal.value = false
  showToast('预订成功！已占用房号')
  loadRoom()
}

const markFixed = async () => {
  await api.updateRoomStatus(room.value.id, '空房')
  loadRoom()
}

const markClean = async () => {
  await api.updateRoomStatus(room.value.id, '空房')
  loadRoom()
}

// 已预订操作
const directCheckin = async () => {
  // 查找当前房间的已预订订单
  const all = await api.getBookings('已预订')
  const booking = all.find(b => b.room_id === room.value.id)
  if (!booking) { showToast('未找到预订订单'); return }
  // 预填表单
  const today = new Date().toISOString().slice(0, 10)
  form.value = {
    guests: [{ name: booking.guest_name || '', id_card: '', phone: booking.guest_phone || '', gender: '' }],
    check_in: booking.check_in,
    check_out: booking.check_out,
    price_per_night: booking.price_per_night || room.value.price || 0,
    amount: booking.amount || 0,
    deposit: booking.deposit || 0
  }
  _checkinBookingId.value = booking.id
  showCheckinModal.value = true
}

const cancelReserve = async () => {
  if (!await showConfirm('确定取消此房间的预订吗？房间将恢复空房状态。')) return
  const all = await api.getBookings('已预订')
  const booking = all.find(b => b.room_id === room.value.id)
  if (!booking) { showToast('未找到预订订单'); return }
  await api.cancelBooking(booking.id)
  showToast('已取消预订')
  loadRoom()
}

onMounted(async () => {
  // 加载房型列表
  try {
    roomTypes.value = await api.getRoomTypes()
  } catch (e) { /* ignore */ }
  loadRoom()
})
</script>

<style scoped>
.detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.detail-item {}
.detail-label { font-size: 12px; color: var(--gray-500); margin-bottom: 2px; }
.detail-value { font-size: 15px; font-weight: 500; }
.price-text { font-size: 17px; font-weight: 700; color: var(--danger, #e74c3c); }
.edit-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.desc-box { font-size: 13px; color: var(--gray-700); background: var(--gray-50); padding: 10px; border-radius: 6px; margin-top: 10px; }
.btn-danger { background: var(--danger); color: #fff; }
.btn-danger:active { background: #a33; }
.card-footer { padding: 12px 16px; border-top: 1px solid var(--gray-100); gap: 8px; }
.history-item { display: flex; align-items: center; gap: 10px; padding: 8px 0; border-bottom: 1px solid var(--gray-100); font-size: 13px; }
.history-item:last-child { border-bottom: none; }

/* 客人搜索 */
.guest-search-wrap { position: relative; }
.guest-results { position: absolute; top: 100%; left: 0; right: 0; background: #fff; border: 1px solid var(--gray-200); border-radius: var(--radius-sm); box-shadow: var(--shadow-lg); z-index: 50; max-height: 240px; overflow-y: auto; }
.guest-result-item { display: flex; align-items: center; gap: 8px; padding: 10px 14px; cursor: pointer; font-size: 14px; }
.guest-result-item:active { background: var(--gray-50); }
.guest-result-item + .guest-result-item { border-top: 1px solid var(--gray-100); }
.gr-name { font-weight: 500; }
.gr-phone { font-size: 12px; color: var(--gray-500); }
.gr-vip { font-size: 10px; color: var(--warning); font-weight: 600; margin-left: auto; }

/* 多客人卡片 */
.guest-card { background: var(--gray-50); border-radius: var(--radius-sm); padding: 12px; margin-bottom: 10px; }
.guest-card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.guest-card-num { font-weight: 600; font-size: 13px; }
.guest-card-body { display: flex; flex-direction: column; gap: 8px; }
.guest-info-item { padding: 6px 0; border-bottom: 1px solid var(--gray-100); }
.guest-info-item:last-child { border-bottom: none; }
.guest-info-main { font-size: 14px; font-weight: 500; }
.guest-info-meta { font-size: 12px; color: var(--gray-500); margin-top: 2px; }
.form-row { display: flex; gap: 10px; }
.mb-8 { margin-bottom: 8px; }
.form-amount-readonly { font-size: 16px; font-weight: 700; color: var(--danger, #e74c3c); padding: 6px 0; }
.input-hint { font-size: 11px; color: var(--gray-500); margin-bottom: 2px; font-style: italic; }
</style>

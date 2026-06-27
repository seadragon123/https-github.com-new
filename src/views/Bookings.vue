<template>
  <div class="page">
    <header class="page-header">
      <button class="btn-back" @click="$router.back()">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>
      <h1>📋 订单管理</h1>
    </header>

    <div class="page-body">
      <div class="card">
        <div class="card-body">
          <div class="tabs">
            <div class="tab" :class="{ active: activeTab === '' }" @click="activeTab = ''">全部</div>
            <div class="tab" :class="{ active: activeTab === '已入住' }" @click="activeTab = '已入住'">已入住</div>
            <div class="tab" :class="{ active: activeTab === '已预订' }" @click="activeTab = '已预订'">已预订</div>
            <div class="tab" :class="{ active: activeTab === '已完成' }" @click="activeTab = '已完成'">已完成</div>
          </div>
          <div class="tabs mt-4" v-if="showChannelTabs">
            <div class="tab tab-sm" :class="{ active: channelFilter === '' }" @click="channelFilter = ''">全部渠道</div>
            <div class="tab tab-sm" :class="{ active: channelFilter === c }" @click="channelFilter = c" v-for="c in channelList" :key="c">{{ c }}</div>
          </div>
        </div>
      </div>

      <div v-for="b in filtered" :key="b.id" class="card">
        <div class="card-body">
          <div class="flex-between">
            <div class="flex-center">
              <span class="room-label">{{ b.room_no }}</span>
              <span class="badge" :class="statusBadge(b.status)">{{ b.status }}</span>
              <span v-if="b.channel" class="badge badge-blue text-xs">{{ b.channel }}</span>
            </div>
            <div class="flex-center">
              <span class="text-sm text-muted">¥{{ b.amount }}</span>
              <button class="btn-icon" @click.stop="openEdit(b)" title="编辑订单">✏️</button>
            </div>
          </div>
          <div class="flex-between mt-4">
            <span class="guest-name">{{ b.guest_name }}</span>
            <span class="text-sm text-muted">{{ b.guest_phone }}</span>
          </div>
          <div class="flex-between mt-4 text-sm text-muted">
            <span>{{ b.check_in }} → {{ b.check_out }}</span>
            <span>{{ b.room_type }}</span>
          </div>
          <div v-if="b.status === '已入住'" class="flex-between mt-8">
            <button class="btn btn-sm btn-success" @click.stop="$router.push(`/checkout/${b.id}`)">退房结账</button>
            <button class="btn btn-sm btn-outline" @click.stop="cancelBooking(b)">取消订单</button>
          </div>
          <div v-if="b.status === '已预订'" class="flex-between mt-8">
            <button class="btn btn-sm btn-primary" @click.stop="directCheckin(b)">直接入住</button>
            <button class="btn btn-sm btn-outline" @click.stop="cancelBooking(b)">取消</button>
          </div>
        </div>
      </div>
      <van-empty v-if="filtered.length === 0" description="暂无订单" />
    </div>

    <!-- 编辑订单弹窗 -->
    <div v-if="editTarget" class="modal-overlay" @click.self="editTarget = null">
      <div class="modal-content">
        <div class="modal-title">✏️ 编辑订单 #{{ editTarget.id }}（{{ editTarget.room_no }}）</div>
        <div class="form-group">
          <label>客人姓名</label>
          <input v-model="editForm.guest_name" class="form-input" />
        </div>
        <div class="form-group">
          <label>联系电话</label>
          <input v-model="editForm.guest_phone" class="form-input" />
        </div>
        <div class="form-group">
          <label>渠道</label>
          <select v-model="editForm.channel" class="form-input form-select">
            <option value="散客">散客</option>
            <option value="携程">携程</option>
            <option value="美团">美团</option>
            <option value="飞猪">飞猪</option>
            <option value="协议">协议</option>
            <option value="陪护">陪护</option>
          </select>
        </div>
        <div class="flex-between gap-4">
          <div class="form-group" style="flex:1">
            <label>入住日期</label>
            <input v-model="editForm.check_in" type="date" class="form-input" />
          </div>
          <div class="form-group" style="flex:1">
            <label>退房日期</label>
            <input v-model="editForm.check_out" type="date" class="form-input" />
          </div>
        </div>
        <div class="flex-between gap-4">
          <div class="form-group" style="flex:1">
            <label>金额 (¥)</label>
            <input v-model.number="editForm.amount" type="number" class="form-input" />
          </div>
          <div class="form-group" style="flex:1">
            <label>押金 (¥)</label>
            <input v-model.number="editForm.deposit" type="number" class="form-input" />
          </div>
        </div>
        <div class="form-group">
          <label>备注</label>
          <input v-model="editForm.notes" class="form-input" placeholder="选填" />
        </div>
        <div class="flex-between mt-8 gap-4">
          <button class="btn btn-outline btn-block" @click="editTarget = null">取消</button>
          <button class="btn btn-primary btn-block" @click="doEdit">💾 保存修改</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import api from '../api/index.js'
import { showToast, showFailToast, showConfirmDialog } from 'vant'

const router = useRouter()
const bookings = ref([])
const activeTab = ref('')
const editTarget = ref(null)
const editForm = ref({})
const channelFilter = ref('')
const channelList = computed(() => [...new Set(bookings.value.map(b => b.channel).filter(Boolean))])
const showChannelTabs = computed(() => channelList.value.length > 0)

const filtered = computed(() => {
  let list = bookings.value
  if (activeTab.value) list = list.filter(b => b.status === activeTab.value)
  if (channelFilter.value) list = list.filter(b => b.channel === channelFilter.value)
  return list
})

const checkinBooking = async (b) => {
  try {
    await api.updateBookingStatus(b.id, '已入住')
    await api.updateRoomStatus(b.room_id, '已入住')
    showToast('入住成功')
    loadBookings()
  } catch (err) {
    showFailToast(err.message)
  }
}

const statusBadge = (s) => {
  const map = { '已入住': 'badge-green', '清洁中': 'badge-orange', '维修中': 'badge-red', '已预订': 'badge-blue', '已完成': 'badge-gray', '已取消': 'badge-gray' }
  return map[s] || 'badge-gray'
}

const cancelBooking = async (b) => {
  if (!await showConfirm(`确定取消 ${b.room_no} 的订单吗？`)) return
  await api.cancelBooking(b.id)
  loadBookings()
}

const directCheckin = async (b) => {
  await api.updateBookingStatus(b.id, '已入住')
  loadBookings()
}

const openEdit = (b) => {
  editTarget.value = b
  editForm.value = {
    guest_name: b.guest_name,
    guest_phone: b.guest_phone,
    channel: b.channel || '',
    check_in: b.check_in,
    check_out: b.check_out,
    amount: b.amount,
    deposit: b.deposit,
    notes: b.notes || ''
  }
}

const doEdit = async () => {
  if (!editTarget.value) return
  try {
    await api.updateBooking(editTarget.value.id, editForm.value)
    editTarget.value = null
    loadBookings()
  } catch (err) {
    showToast('保存失败: ' + err.message)
  }
}


// 确认弹窗
async function showConfirm(msg) {
  try {
    await showConfirmDialog({ message: msg })
    return true
  } catch {
    return false
  }
}

const loadBookings = async () => {
  bookings.value = await api.getBookings()
}

onMounted(loadBookings)
</script>

<style scoped>
.room-label { font-size: 16px; font-weight: 600; margin-right: 8px; }
.guest-name { font-size: 14px; font-weight: 500; }
.btn-icon { border: none; background: none; cursor: pointer; font-size: 14px; padding: 4px 6px; border-radius: 4px; }
.btn-icon:hover { background: var(--gray-100); }
.tab-sm { font-size: 11px; padding: 4px 10px; }
.text-xs { font-size: 11px; }
@media (prefers-color-scheme: dark) {
  .tab-sm { background: var(--gray-100); }
}
</style>

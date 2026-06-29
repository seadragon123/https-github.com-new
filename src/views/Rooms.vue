<template>
  <div class="page">
    <header class="page-header">
      <div class="flex-between">
        <div>
          <h1>🚪 房间管理</h1>
          <div class="subtitle">{{ rooms.length }} 间客房</div>
        </div>
        <button class="btn btn-sm btn-primary" @click="showAdd = true">+ 新增房间</button>
      </div>
    </header>

    <div class="page-body">
      <div class="card">
        <div class="card-body">
          <div class="tabs">
            <div class="tab" :class="{ active: activeTab === '' }" @click="activeTab = ''">全部房间</div>
            <div class="tab" :class="{ active: activeTab === '已入住' }" @click="activeTab = '已入住'">已入住</div>
            <div class="tab" :class="{ active: activeTab === '清洁中' }" @click="activeTab = '清洁中'">清洁中</div>
            <div class="tab" :class="{ active: activeTab === '维修中' }" @click="activeTab = '维修中'">维修中</div>
            <div class="tab" :class="{ active: activeTab === '已预订' }" @click="activeTab = '已预订'">已预订</div>
            <div class="tab" :class="{ active: activeTab === '空房' }" @click="activeTab = '空房'">空房</div>
          </div>
        </div>
      </div>

      <div v-for="room in filteredRooms" :key="room.id" class="card" @click="$router.push(`/rooms/${room.id}`)">
        <div class="card-body" style="position:relative">
          <div class="flex-between">
            <div class="room-info">
              <span class="room-no">{{ room.room_no }}</span>
              <span class="room-detail">{{ room.floor }}F · {{ room.room_type }}</span>
            </div>
            <div class="flex-center">
              <span class="badge" :class="statusBadge(room.status)">{{ room.status }}</span>
              <button class="btn-del-icon" @click.stop="deleteRoom(room)">✕</button>
            </div>
          </div>
          <div class="room-meta mt-8">
            <span v-if="room.current_guest" class="guest-name">{{ room.current_guest }}</span>
            <span v-else class="text-muted text-sm">空闲</span>
          </div>
          <div class="room-price mt-4" v-if="room.price">
            <span>💰 ¥{{ Number(room.price).toFixed(0) }}</span>
            <span class="text-muted text-sm">/晚</span>
          </div>
          <div v-if="room.status === '维修中' && room.description" class="room-desc">
            ⚠️ {{ room.description }}
          </div>
        </div>
      </div>
      <van-empty v-if="filteredRooms.length === 0" description="暂无符合条件的房间" />
    </div>

    <!-- 新增房间弹窗 -->
    <div v-if="showAdd" class="modal-overlay" @click.self="showAdd = false">
      <div class="modal-content">
        <div class="modal-title">➕ 新增房间</div>
        <div class="form-group"><label>房号 *</label><input v-model="form.room_no" class="form-input" placeholder="如 401" /></div>
        <div class="form-group"><label>楼层</label><input v-model.number="form.floor" type="number" class="form-input" placeholder="4" /></div>
        <div class="form-group"><label>房型</label>
          <select v-model="form.room_type" class="form-input form-select">
            <option>标准大床房</option><option>标准双床房</option>
            <option>豪华大床房</option><option>豪华双床房</option><option>豪华套房</option>
          </select>
        </div>
        <div class="form-group"><label>房价 (元/晚)</label><input v-model.number="form.price" type="number" class="form-input" placeholder="如 288" /></div>
        <div class="form-group"><label>备注</label><input v-model="form.description" class="form-input" placeholder="选填" /></div>
        <div class="flex-between mt-8 gap-4">
          <button class="btn btn-outline btn-block" @click="showAdd = false">取消</button>
          <button class="btn btn-primary btn-block" @click="doAdd">确认添加</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import api from '../api/index.js'
import { showToast, showFailToast, showConfirmDialog } from 'vant'

const route = useRoute()
const rooms = ref([])
const activeTab = ref('')
const showAdd = ref(false)
const form = ref({ room_no: '', floor: 1, room_type: '标准大床房', description: '', price: 0 })

const filteredRooms = computed(() => {
  if (!activeTab.value) return rooms.value
  return rooms.value.filter(r => r.status === activeTab.value)
})

const statusBadge = (s) => {
  const map = { '已入住': 'badge-green', '清洁中': 'badge-orange', '维修中': 'badge-red', '已预订': 'badge-blue', '空房': 'badge-gray' }
  return map[s] || 'badge-gray'
}

async function deleteRoom(room) {
  if (!await showConfirm('Delete room ' + room.room_no + '?')) return
  try {
    await api.deleteRoom(room.id)
    rooms.value = await api.getRooms()
  } catch (err) {
    showFailToast(err.message)
  }
}

async function doAdd() {
  if (!form.value.room_no.trim()) { showToast('请输入房号'); return }
  try {
    const r = await api.addRoom(form.value)
    showAdd.value = false
    form.value = { room_no: '', floor: 1, room_type: '标准大床房', description: '', price: 0 }
    rooms.value = await api.getRooms()
  } catch (err) {
    showFailToast(err.message)
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

onMounted(async () => {
  rooms.value = await api.getRooms()
  if (route.query.status) {
    activeTab.value = route.query.status
  }
})
</script>

<style scoped>
.btn-del-icon { border: none; background: none; cursor: pointer; font-size: 12px; width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: var(--gray-500); }
.btn-del-icon:hover { background: #fce8e6; color: var(--danger); }
.room-info { display: flex; align-items: center; gap: 8px; }
.room-no { font-size: 18px; font-weight: 700; }
.room-detail { font-size: 12px; color: var(--gray-500); }
.guest-name { font-size: 14px; font-weight: 500; }
.room-price { font-size: 15px; font-weight: 600; color: var(--danger, #e74c3c); }
.room-desc { font-size: 12px; color: var(--danger); background: #fce8e6; padding: 6px 10px; border-radius: 6px; margin-top: 8px; }
</style>

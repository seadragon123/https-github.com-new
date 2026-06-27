<template>
  <div class="page">
    <header class="page-header">
      <div class="flex-between">
        <h1>👤 客人管理</h1>
        <button class="btn btn-sm btn-primary" @click="showAdd = true">+ 新增</button>
      </div>
      <div class="mt-4" style="display:flex;gap:8px">
        <input v-model="search" class="form-input" placeholder="搜索姓名/电话..." @input="debounceSearch" />
      </div>
    </header>
    <div class="page-body">
      <div v-for="g in guests" :key="g.id" class="card" @click="openDetail(g)">
        <div class="card-body">
          <div class="flex-between">
            <div class="flex-center">
              <span class="guest-name">{{ g.name }}</span>
              <span v-if="g.vip_level >= 2" class="badge badge-red">VIP</span>
              <span v-if="g.vip_level === 1" class="badge badge-orange">常客</span>
            </div>
            <button class="btn-icon" @click.stop="openEdit(g)">✏️</button>
          </div>
          <div class="flex-between mt-4 text-sm">
            <span class="text-muted">{{ g.phone || '无电话' }}</span>
            <span class="text-muted">{{ g.id_card ? g.id_card.slice(0,4)+'****'+g.id_card.slice(-4) : '' }}</span>
          </div>
          <div class="flex-between mt-4 text-sm text-muted">
            <span>入住 {{ g.booking_count || 0 }} 次</span>
            <span>消费 ¥{{ g.total_spent || 0 }}</span>
          </div>
        </div>
      </div>
      <van-empty v-if="guests.length === 0" description="暂无客人" />
    </div>

    <!-- 新增弹窗 -->
    <div v-if="showAdd" class="modal-overlay" @click.self="showAdd = false">
      <div class="modal-content">
        <div class="modal-title">👤 新增客人</div>
        <div class="form-group"><label>姓名 *</label><input v-model="addForm.name" class="form-input" /></div>
        <div class="form-group"><label>电话</label><input v-model="addForm.phone" class="form-input" /></div>
        <div class="form-group"><label>身份证</label><input v-model="addForm.id_card" class="form-input" /></div>
        <div class="form-group"><label>等级</label>
          <select v-model.number="addForm.vip_level" class="form-input form-select">
            <option :value="0">普通</option><option :value="1">常客</option><option :value="2">VIP</option>
          </select>
        </div>
        <div class="form-group"><label>备注</label><input v-model="addForm.notes" class="form-input" /></div>
        <div class="flex-between mt-8 gap-4">
          <button class="btn btn-outline btn-block" @click="showAdd = false">取消</button>
          <button class="btn btn-primary btn-block" @click="doAdd">保存</button>
        </div>
      </div>
    </div>

    <!-- 编辑弹窗 -->
    <div v-if="editTarget" class="modal-overlay" @click.self="editTarget = null">
      <div class="modal-content">
        <div class="modal-title">✏️ 编辑 {{ editTarget.name }}</div>
        <div class="form-group"><label>姓名</label><input v-model="editForm.name" class="form-input" /></div>
        <div class="form-group"><label>电话</label><input v-model="editForm.phone" class="form-input" /></div>
        <div class="form-group"><label>身份证</label><input v-model="editForm.id_card" class="form-input" /></div>
        <div class="form-group"><label>等级</label>
          <select v-model.number="editForm.vip_level" class="form-input form-select">
            <option :value="0">普通</option><option :value="1">常客</option><option :value="2">VIP</option>
          </select>
        </div>
        <div class="form-group"><label>备注</label><input v-model="editForm.notes" class="form-input" /></div>
        <div class="flex-between mt-8 gap-4">
          <button class="btn btn-outline btn-block" @click="editTarget = null">取消</button>
          <button class="btn btn-primary btn-block" @click="doEdit">💾 保存</button>
        </div>
      </div>
    </div>

    <!-- 详情弹窗 -->
    <div v-if="detailTarget" class="modal-overlay" @click.self="detailTarget = null">
      <div class="modal-content" style="max-height:85vh">
        <div class="modal-title">📋 {{ detailTarget.name }} 的入住记录</div>
        <div v-if="detailBookings.length === 0" class="text-sm text-muted" style="padding:12px 0">暂无入住记录</div>
        <div v-for="b in detailBookings" :key="b.id" style="padding:8px 0;border-bottom:1px solid var(--gray-100);font-size:13px">
          <div class="flex-between">
            <span><strong>{{ b.room_no }}</strong> {{ b.room_type }}</span>
            <span class="badge" :class="b.status==='已完成'?'badge-gray':b.status==='已入住'?'badge-green':'badge-blue'">{{ b.status }}</span>
          </div>
          <div class="text-muted mt-4">{{ b.check_in }} → {{ b.check_out }}  ¥{{ b.amount }}</div>
        </div>
        <button class="btn btn-outline btn-block mt-8" @click="detailTarget = null">关闭</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '../api/index.js'
import { showToast, showFailToast, showConfirmDialog } from 'vant'

const guests = ref([])
const search = ref('')
const showAdd = ref(false)
const addForm = ref({ name: '', phone: '', id_card: '', vip_level: 0, notes: '' })
const editTarget = ref(null)
const editForm = ref({})
const detailTarget = ref(null)
const detailBookings = ref([])
let searchTimer = null


// 确认弹窗
async function showConfirm(msg) {
  try {
    await showConfirmDialog({ message: msg })
    return true
  } catch {
    return false
  }
}

function debounceSearch() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(loadGuests, 300)
}

async function loadGuests() {
  guests.value = await api.getGuests(search.value || undefined)
}

async function openDetail(g) {
  detailTarget.value = g
  const r = await api.getGuest(g.id)
  detailBookings.value = r.bookings
}

function openEdit(g) {
  editTarget.value = g
  editForm.value = { name: g.name, phone: g.phone, id_card: g.id_card, vip_level: g.vip_level, notes: g.notes }
}

async function doAdd() {
  if (!addForm.value.name.trim()) { showToast('姓名不能为空'); return }
  await api.addGuest(addForm.value)
  showAdd.value = false
  addForm.value = { name: '', phone: '', id_card: '', vip_level: 0, notes: '' }
  loadGuests()
}

async function doEdit() {
  await api.updateGuest(editTarget.value.id, editForm.value)
  editTarget.value = null
  loadGuests()
}

onMounted(loadGuests)
</script>

<style scoped>
.guest-name { font-size: 15px; font-weight: 600; }
.btn-icon { border: none; background: none; cursor: pointer; font-size: 14px; padding: 4px 6px; border-radius: 4px; }
.btn-icon:hover { background: var(--gray-100); }
</style>

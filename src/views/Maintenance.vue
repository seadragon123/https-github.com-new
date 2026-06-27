<template>
  <div class="page">
    <header class="page-header">
      <div class="flex-between">
        <h1>🔧 维修报修</h1>
        <button class="btn btn-sm btn-primary" @click="showAdd = true">+ 报修</button>
      </div>
    </header>
    <div class="page-body">
      <div class="card"><div class="card-body">
        <div class="tabs">
          <div class="tab" :class="{active:activeTab===''}" @click="activeTab=''">全部</div>
          <div class="tab" :class="{active:activeTab==='待维修'}" @click="activeTab='待维修'">待维修</div>
          <div class="tab" :class="{active:activeTab==='维修中'}" @click="activeTab='维修中'">维修中</div>
          <div class="tab" :class="{active:activeTab==='已完成'}" @click="activeTab='已完成'">已完成</div>
        </div>
      </div></div>

      <div v-for="m in filtered" :key="m.id" class="card">
        <div class="card-body">
          <div class="flex-between">
            <div class="flex-center">
              <span class="room-label">{{ m.room_no }}</span>
              <span class="text-sm text-muted">{{ m.floor }}F</span>
            </div>
            <div class="flex-center">
              <span class="badge" :class="m.status==='已完成'?'badge-gray':m.status==='维修中'?'badge-orange':'badge-red'">{{ m.status }}</span>
              <button class="btn-icon" @click="openEdit(m)">✏️</button>
            </div>
          </div>
          <div class="desc-box mt-4">{{ m.description }}</div>
          <div class="flex-between mt-4 text-sm text-muted">
            <span>报修: {{ m.reported_at?.slice(0,16) }}</span>
            <span v-if="m.resolved_at">完成: {{ m.resolved_at?.slice(0,16) }}</span>
          </div>
          <div class="flex-between mt-8" v-if="m.status !== '已完成'">
            <button class="btn btn-sm btn-success" @click="markDone(m)">✓ 标记完成</button>
            <button class="btn btn-sm btn-outline" @click="deleteItem(m)">删除</button>
          </div>
        </div>
      </div>
      <van-empty v-if="filtered.length===0" description="暂无维修记录" />
    </div>

    <!-- 报修弹窗 -->
    <div v-if="showAdd" class="modal-overlay" @click.self="showAdd = false">
      <div class="modal-content">
        <div class="modal-title">🔧 报修登记</div>
        <div class="form-group">
          <label>房间</label>
          <select v-model="addForm.room_id" class="form-input form-select">
            <option value="">-- 选择房间 --</option>
            <option v-for="r in rooms" :key="r.id" :value="r.id">{{ r.room_no }} ({{ r.floor }}F) - {{ r.status }}</option>
          </select>
        </div>
        <div class="form-group">
          <label>故障描述</label>
          <textarea v-model="addForm.description" class="form-input" rows="3" placeholder="请描述故障情况"></textarea>
        </div>
        <div class="flex-between mt-8 gap-4">
          <button class="btn btn-outline btn-block" @click="showAdd = false">取消</button>
          <button class="btn btn-primary btn-block" @click="doAdd">提交报修</button>
        </div>
      </div>
    </div>

    <!-- 编辑弹窗 -->
    <div v-if="editTarget" class="modal-overlay" @click.self="editTarget = null">
      <div class="modal-content">
        <div class="modal-title">✏️ 编辑维修 #{{ editTarget.room_no }}</div>
        <div class="form-group">
          <label>故障描述</label>
          <textarea v-model="editForm.description" class="form-input" rows="3"></textarea>
        </div>
        <div class="form-group">
          <label>状态</label>
          <select v-model="editForm.status" class="form-input form-select">
            <option>待维修</option><option>维修中</option><option>已完成</option>
          </select>
        </div>
        <div class="flex-between mt-8 gap-4">
          <button class="btn btn-outline btn-block" @click="editTarget = null">取消</button>
          <button class="btn btn-primary btn-block" @click="doEdit">💾 保存</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import api from '../api/index.js'
import { showToast, showFailToast, showConfirmDialog } from 'vant'

const items = ref([])
const rooms = ref([])
const activeTab = ref('')
const showAdd = ref(false)
const addForm = ref({ room_id: '', description: '' })
const editTarget = ref(null)
const editForm = ref({})

const filtered = computed(() => {
  if (!activeTab.value) return items.value
  return items.value.filter(m => m.status === activeTab.value)
})

const openEdit = (m) => {
  editTarget.value = m
  editForm.value = { description: m.description, status: m.status }
}

const markDone = async (m) => {
  await api.updateMaintenance(m.id, { status: '已完成' })
  loadAll()
}

const deleteItem = async (m) => {
  if (!await showConfirm('确定删除？')) return
  await api.deleteMaintenance(m.id)
  loadAll()
}

const doAdd = async () => {
  if (!addForm.value.room_id || !addForm.value.description.trim()) { showToast('请填写完整信息'); return }
  await api.addMaintenance(addForm.value)
  showAdd.value = false
  addForm.value = { room_id: '', description: '' }
  loadAll()
}

const doEdit = async () => {
  await api.updateMaintenance(editTarget.value.id, editForm.value)
  editTarget.value = null
  loadAll()
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

const loadAll = async () => {
  items.value = await api.getMaintenance()
  rooms.value = await api.getRooms()
}

onMounted(loadAll)
</script>

<style scoped>
.room-label { font-size: 16px; font-weight: 600; }
.desc-box { font-size: 13px; background: var(--gray-50); padding: 8px 10px; border-radius: 6px; }
.btn-icon { border: none; background: none; cursor: pointer; font-size: 14px; padding: 4px 6px; border-radius: 4px; }
.btn-icon:hover { background: var(--gray-100); }
textarea.form-input { resize: vertical; min-height: 60px; }
</style>

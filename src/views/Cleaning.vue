<template>
  <div class="page">
    <header class="page-header">
      <div class="flex-between">
        <h1>🧹 清洁管理</h1>
        <button class="btn btn-sm btn-primary" @click="showAdd = true">+ 清洁任务</button>
      </div>
    </header>
    <div class="page-body">
      <div class="card"><div class="card-body">
        <div class="tabs">
          <div class="tab" :class="{active:activeTab===''}" @click="activeTab=''">全部</div>
          <div class="tab" :class="{active:activeTab==='待清洁'}" @click="activeTab='待清洁'">待清洁</div>
          <div class="tab" :class="{active:activeTab==='清洁中'}" @click="activeTab='清洁中'">清洁中</div>
          <div class="tab" :class="{active:activeTab==='已完成'}" @click="activeTab='已完成'">已完成</div>
        </div>
      </div></div>

      <div v-for="c in filtered" :key="c.id" class="card">
        <div class="card-body">
          <div class="flex-between">
            <div class="flex-center">
              <span class="room-label">{{ c.room_no }}</span>
              <span class="text-sm text-muted">{{ c.floor }}F · {{ c.room_type }}</span>
            </div>
            <div class="flex-center">
              <span class="badge" :class="c.status==='已完成'?'badge-gray':c.status==='清洁中'?'badge-orange':'badge-blue'">{{ c.status }}</span>
              <button class="btn-icon" @click="openEdit(c)">✏️</button>
            </div>
          </div>
          <div class="flex-between mt-4 text-sm">
            <span>清洁人员: <strong>{{ c.assigned_to || '未指派' }}</strong></span>
            <span class="text-muted">{{ c.scheduled_at ? c.scheduled_at.slice(0,16) : '' }}</span>
          </div>
          <div class="flex-between mt-8" v-if="c.status !== '已完成'">
            <button class="btn btn-sm btn-success" @click="markDone(c)">✓ 标记完成</button>
            <div class="flex-center gap-4">
              <button class="btn btn-sm btn-outline" @click="assignPerson(c)">👤 指派</button>
              <button class="btn btn-sm btn-outline" @click="deleteItem(c)">删除</button>
            </div>
          </div>
        </div>
      </div>
      <van-empty v-if="filtered.length===0" description="暂无清洁任务" />
    </div>

    <!-- 新增清洁任务弹窗 -->
    <div v-if="showAdd" class="modal-overlay" @click.self="showAdd = false">
      <div class="modal-content">
        <div class="modal-title">🧹 新建清洁任务</div>
        <div class="form-group">
          <label>房间</label>
          <select v-model="addForm.room_id" class="form-input form-select">
            <option value="">-- 选择房间 --</option>
            <option v-for="r in cleanRooms" :key="r.id" :value="r.id">{{ r.room_no }} ({{ r.floor }}F) - {{ r.status }}</option>
          </select>
        </div>
        <div class="form-group">
          <label>指派给</label>
          <input v-model="addForm.assigned_to" class="form-input" placeholder="保洁人员姓名" />
        </div>
        <div class="form-group">
          <label>安排时间</label>
          <input v-model="addForm.scheduled_at" type="datetime-local" class="form-input" />
        </div>
        <div class="flex-between mt-8 gap-4">
          <button class="btn btn-outline btn-block" @click="showAdd = false">取消</button>
          <button class="btn btn-primary btn-block" @click="doAdd">创建任务</button>
        </div>
      </div>
    </div>

    <!-- 编辑弹窗 -->
    <div v-if="editTarget" class="modal-overlay" @click.self="editTarget = null">
      <div class="modal-content">
        <div class="modal-title">✏️ 编辑清洁 #{{ editTarget.room_no }}</div>
        <div class="form-group">
          <label>清洁人员</label>
          <input v-model="editForm.assigned_to" class="form-input" />
        </div>
        <div class="form-group">
          <label>状态</label>
          <select v-model="editForm.status" class="form-input form-select">
            <option>待清洁</option><option>清洁中</option><option>已完成</option>
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
const allRooms = ref([])
const activeTab = ref('')
const showAdd = ref(false)
const addForm = ref({ room_id: '', assigned_to: '', scheduled_at: '' })
const editTarget = ref(null)
const editForm = ref({})

// 可选清洁的房间（退房后变成清洁中的房间）
const cleanRooms = computed(() => allRooms.value.filter(r => r.status === '清洁中' || r.status === '空房'))

const filtered = computed(() => {
  if (!activeTab.value) return items.value
  return items.value.filter(c => c.status === activeTab.value)
})

const openEdit = (c) => {
  editTarget.value = c
  editForm.value = { assigned_to: c.assigned_to, status: c.status }
}

const assignPerson = async (c) => {
  const name = prompt('指派给谁？', c.assigned_to || '')
  if (name === null) return
  try {
    await api.updateCleaning(c.id, { assigned_to: name })
    loadAll()
  } catch (e) {
    showFailToast(e.message)
  }
}

const markDone = async (c) => {
  try {
    await api.updateCleaning(c.id, { status: '已完成' })
    loadAll()
  } catch (e) {
    showFailToast(e.message)
  }
}

const deleteItem = async (c) => {
  if (!await showConfirm('确定删除？')) return
  try {
    await api.deleteCleaning(c.id)
    loadAll()
  } catch (e) {
    showFailToast(e.message)
  }
}

const doAdd = async () => {
  if (!addForm.value.room_id) { showToast('请选择房间'); return }
  try {
    await api.addCleaning(addForm.value)
    showAdd.value = false
    addForm.value = { room_id: '', assigned_to: '', scheduled_at: '' }
    loadAll()
  } catch (e) {
    showFailToast(e.message)
  }
}

const doEdit = async () => {
  try {
    await api.updateCleaning(editTarget.value.id, editForm.value)
    editTarget.value = null
    loadAll()
  } catch (e) {
    showFailToast(e.message)
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

const loadAll = async () => {
  items.value = await api.getCleaning()
  allRooms.value = await api.getRooms()
}

onMounted(loadAll)
</script>

<style scoped>
.room-label { font-size: 16px; font-weight: 600; }
.btn-icon { border: none; background: none; cursor: pointer; font-size: 14px; padding: 4px 6px; border-radius: 4px; }
.btn-icon:hover { background: var(--gray-100); }
</style>

<template>
  <div class="page">
    <header class="page-header">
      <div class="flex-between">
        <h1>📋 交班报表</h1>
        <button class="btn btn-primary btn-sm" @click="showNewShift = true">➕ 创建交班</button>
      </div>
    </header>

    <div class="page-body">
      <!-- 今日快照预览 -->
      <div class="card" v-if="snapshot">
        <div class="card-header">📊 今日经营快照</div>
        <div class="card-body">
          <div class="snapshot-grid">
            <div class="snap-item">
              <div class="snap-value">{{ snapshot.roomStats['已入住'] || 0 }}/{{ snapshot.totalRooms }}</div>
              <div class="snap-label">入住/总房</div>
            </div>
            <div class="snap-item">
              <div class="snap-value">{{ snapshot.todayCheckins }}</div>
              <div class="snap-label">今日入住</div>
            </div>
            <div class="snap-item">
              <div class="snap-value">{{ snapshot.todayCheckouts }}</div>
              <div class="snap-label">今日退房</div>
            </div>
            <div class="snap-item">
              <div class="snap-value text-success">¥{{ snapshot.revenue.room + snapshot.revenue.catering + snapshot.revenue.incense }}</div>
              <div class="snap-label">今日营收</div>
            </div>
          </div>
          <div class="snap-detail">
            <div class="snap-row">
              <span>🏨 客房收入</span><span>¥{{ snapshot.revenue.room }}</span>
            </div>
            <div class="snap-row">
              <span>🍜 餐饮收入</span><span>¥{{ snapshot.revenue.catering }}</span>
            </div>
            <div class="snap-row">
              <span>🪷 请香收入</span><span>¥{{ snapshot.revenue.incense }}</span>
            </div>
            <div class="snap-row">
              <span>💸 今日支出</span><span class="text-danger">-¥{{ snapshot.revenue.totalExpense }}</span>
            </div>
            <div class="snap-row">
              <span>💰 今日押金</span><span>¥{{ snapshot.depositTotal }}</span>
            </div>
            <div class="snap-row total">
              <span>待办事项</span><span>{{ snapshot.pendingTodos }} 项</span>
            </div>
            <div class="snap-row">
              <span>🍜 餐饮订单</span><span>{{ snapshot.cateringOrders }} 单（{{ snapshot.pendingCatering }} 未结）</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 历史交班记录 -->
      <div class="card">
        <div class="card-header">
          <span>📜 交班记录</span>
          <button class="btn btn-sm btn-outline" @click="loadReports">🔄 刷新</button>
        </div>
        <div class="card-body">
          <div v-for="r in reports" :key="r.id" class="report-row">
            <div class="report-info" @click="toggleDetail(r.id)">
              <div class="report-main">
                <span class="badge" :class="r.shift_type==='早班'?'badge-blue':'badge-orange'">{{ r.shift_type }}</span>
                <span class="text-sm">{{ r.report_date }}</span>
                <span class="text-sm text-muted">{{ r.reporter }}→{{ r.receiver }}</span>
              </div>
            </div>
            <div v-if="expandedReport === r.id" class="report-detail">
              <div class="snap-row" v-for="(v,k) in r.snappy_data?.revenue" :key="k">
                <span>{{ k }}</span><span>¥{{ v }}</span>
              </div>
              <div class="report-notes">{{ r.notes }}</div>
              <button class="btn btn-sm btn-danger" @click="deleteReport(r)">删除</button>
            </div>
          </div>
          <van-empty v-if="reports.length === 0" description="暂无交班记录" />
        </div>
      </div>
    </div>

    <!-- 创建交班弹窗 -->
    <div v-if="showNewShift" class="modal-overlay" @click.self="showNewShift = false">
      <div class="modal-content">
        <div class="modal-title">➕ 创建交班报表</div>
        <div class="form-group">
          <label>班次</label>
          <select v-model="shiftForm.shift_type" class="form-input form-select">
            <option value="早班">早班 (08:00~16:00)</option>
            <option value="中班">中班 (16:00~00:00)</option>
            <option value="晚班">晚班 (00:00~08:00)</option>
            <option value="全天">全天</option>
          </select>
        </div>
        <div class="form-group">
          <label>交班人</label>
          <input v-model="shiftForm.reporter" class="form-input" placeholder="当前班次负责人" />
        </div>
        <div class="form-group">
          <label>接班人</label>
          <input v-model="shiftForm.receiver" class="form-input" placeholder="下个班次负责人" />
        </div>
        <div class="form-group">
          <label>交接备注</label>
          <textarea v-model="shiftForm.notes" class="form-input" rows="3" placeholder="待办事项、注意事项等"></textarea>
        </div>
        <div class="flex-between gap-4">
          <button class="btn btn-outline btn-block" @click="showNewShift = false">取消</button>
          <button class="btn btn-primary btn-block" @click="submitShift">确认交班</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '../api/index.js'
import { showToast, showFailToast, showConfirmDialog } from 'vant'

const snapshot = ref(null)
const reports = ref([])
const showNewShift = ref(false)
const expandedReport = ref(null)
const shiftForm = ref({ shift_type: '早班', reporter: '', receiver: '', notes: '' })

async function loadData() {
  try {
    const [s, r] = await Promise.all([
      api.previewShiftSnapshot(),
      api.getShiftReports()
    ])
    snapshot.value = s
    reports.value = r.map(rep => ({
      ...rep,
      snappy_data: typeof rep.snappy_data === 'string' ? JSON.parse(rep.snappy_data) : rep.snappy_data
    }))
  } catch (e) { showFailToast(e.message) }
}

async function loadReports() {
  try {
    const r = await api.getShiftReports()
    reports.value = r.map(rep => ({
      ...rep,
      snappy_data: typeof rep.snappy_data === 'string' ? JSON.parse(rep.snappy_data) : rep.snappy_data
    }))
  } catch (e) { showFailToast(e.message) }
}

function toggleDetail(id) {
  expandedReport.value = expandedReport.value === id ? null : id
}

async function submitShift() {
  if (!shiftForm.value.reporter || !shiftForm.value.receiver) {
    showToast('请填写交班人和接班人')
    return
  }
  try {
    await api.createShiftReport(shiftForm.value)
    showNewShift.value = false
    shiftForm.value = { shift_type: '早班', reporter: '', receiver: '', notes: '' }
    showToast('交班报表已创建')
    loadData()
  } catch (e) { showFailToast(e.message) }
}

async function deleteReport(r) {
  if (!await showConfirmDialog({ message: `确认删除该交班记录？` }).catch(() => false)) return
  try {
    await api.deleteShiftReport(r.id)
    showToast('已删除')
    loadReports()
  } catch (e) { showFailToast(e.message) }
}

onMounted(loadData)
</script>

<style scoped>
.snapshot-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 12px; }
.snap-item { text-align: center; padding: 10px 4px; background: var(--gray-50); border-radius: var(--radius-sm); }
.snap-value { font-size: 20px; font-weight: 700; color: var(--gray-900); }
.snap-label { font-size: 11px; color: var(--gray-500); margin-top: 2px; }

.snap-detail { border-top: 1px solid var(--gray-100); padding-top: 8px; }
.snap-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; }
.snap-row.total { border-top: 1px dashed var(--gray-200); padding-top: 8px; margin-top: 4px; font-weight: 600; }

.report-row { padding: 10px 0; border-bottom: 1px solid var(--gray-100); }
.report-info { cursor: pointer; }
.report-main { display: flex; align-items: center; gap: 8px; }
.report-detail { padding: 8px 12px; background: var(--gray-50); border-radius: var(--radius-sm); margin-top: 6px; }
.report-notes { font-size: 13px; color: var(--gray-700); padding: 8px 0; border-top: 1px dashed var(--gray-200); margin-top: 6px; }

.text-success { color: var(--success); }
.text-danger { color: var(--danger); }
</style>

<template>
  <div class="page">
    <header class="page-header">
      <div class="flex-between">
        <h1>💸 支出管理</h1>
        <button class="btn btn-primary btn-sm" @click="showAddForm = true;expenseForm={}">➕ 新增支出</button>
      </div>
    </header>

    <div class="page-body">
      <!-- 本月支出分布 -->
      <div class="card">
        <div class="card-header">📊 {{ distribution.label }} 支出分布</div>
        <div class="card-body">
          <template v-for="(total, cat) in distribution.categories" :key="cat">
            <div v-if="total > 0" class="dist-row">
              <div class="dist-header">
                <span class="dist-icon">{{ catIcon(cat) }}</span>
                <span class="dist-label">{{ cat }}</span>
                <span class="dist-amount">¥{{ Number(total).toFixed(2) }}</span>
              </div>
              <div class="dist-bar-row">
                <div class="dist-bar-wrap">
                  <div class="dist-bar" :class="'bar-' + barColor(cat)"
                       :style="{ width: pct(total) + '%' }"></div>
                </div>
                <span class="dist-pct">{{ pct(total) }}%</span>
              </div>
            </div>
          </template>
          <div class="dist-total" v-if="distribution.total > 0">
            <span>合计 {{ itemCount }} 项</span>
            <span class="dist-total-amount">¥{{ distribution.total.toFixed(2) }}</span>
          </div>
          <van-empty v-if="distribution.total === 0" description="暂无支出" />
        </div>
      </div>

      <!-- 本日支出 -->
      <div class="card">
        <div class="card-header filterable">
          <span>📋 支出记录</span>
          <div class="filter-bar">
            <input v-model="expDateStart" type="date" class="filter-date-input" @change="onDateRangeChange" />
            <span class="filter-sep">至</span>
            <input v-model="expDateEnd" type="date" class="filter-date-input" @change="onDateRangeChange" />
            <button class="btn btn-sm btn-outline" style="flex-shrink:0" @click="loadExpenses">🔄 刷新</button>
          </div>
        </div>
        <div class="card-body">
          <div v-for="exp in expenses" :key="exp.id" class="expense-row">
            <div class="expense-info">
              <div class="expense-cat">
                <span class="badge badge-orange">{{ exp.category }}</span>
                <span class="text-sm text-muted">{{ exp.created_at?.slice(11, 16) }}</span>
              </div>
              <div class="expense-note">{{ exp.note }}</div>
              <div class="expense-meta">
                <span v-if="exp.expense_date" class="text-xs text-muted">📅 {{ exp.expense_date }}</span>
                <span v-if="exp.reimbursement_person" class="text-xs text-muted">👤 {{ exp.reimbursement_person }}</span>
              </div>
            </div>
            <div class="expense-amount">
              <div class="text-lg font-bold">¥{{ exp.amount }}</div>
              <div class="expense-actions">
                <button v-if="exp.receipt_image" class="btn btn-sm btn-outline" @click="viewImage(exp)">📎</button>
                <button class="btn btn-sm btn-outline" @click="editExpense(exp)">✎</button>
                <button class="btn btn-sm btn-danger" @click="deleteExpense(exp)">✕</button>
              </div>
            </div>
          </div>
          <van-empty v-if="expenses.length === 0" description="今日暂无支出" />
        </div>
      </div>
    </div>

    <!-- 新增/编辑支出弹窗 -->
    <div v-if="showAddForm" class="modal-overlay" @click.self="showAddForm = false">
      <div class="modal-content">
        <div class="modal-title">{{ expenseForm.id ? '编辑支出' : '新增支出' }}</div>
        <div class="form-group">
          <label>支出类别</label>
          <select v-model="expenseForm.category" class="form-input form-select">
            <option v-for="c in categories" :key="c" :value="c">{{ c }}</option>
          </select>
        </div>
        <div class="form-group">
          <label>金额 (¥)</label>
          <input v-model="expenseForm.amount" type="number" class="form-input" placeholder="0" />
        </div>
        <div class="flex-between gap-4">
          <div class="form-group" style="flex:1">
            <label>支出日期</label>
            <input v-model="expenseForm.expense_date" type="date" class="form-input" />
          </div>
          <div class="form-group" style="flex:1">
            <label>报销人</label>
            <input v-model="expenseForm.reimbursement_person" class="form-input" placeholder="选填" />
          </div>
        </div>
        <div class="form-group">
          <label>备注</label>
          <input v-model="expenseForm.note" class="form-input" placeholder="选填" />
        </div>
        <div class="form-group">
          <label>单据凭证</label>
          <div class="upload-area" @click="triggerUpload">
            <span v-if="!previewUrl">📷 点击拍照/选择图片</span>
            <img v-else :src="previewUrl" class="upload-preview" @click.stop />
          </div>
          <input ref="fileInput" type="file" accept="image/*" capture="environment" style="display:none" @change="onFileChange" />
          <div v-if="previewUrl" class="upload-actions">
            <button class="btn btn-sm btn-outline" @click="previewUrl = ''; expenseForm.receipt_image = ''; fileToUpload = null">删除图片</button>
          </div>
        </div>
        <div class="flex-between gap-4">
          <button class="btn btn-outline btn-block" @click="showAddForm = false">取消</button>
          <button class="btn btn-primary btn-block" @click="saveExpense">{{ expenseForm.id ? '保存' : '确认添加' }}</button>
        </div>
      </div>
    </div>

    <!-- 图片预览弹窗 -->
    <div v-if="showImageViewer" class="modal-overlay" @click.self="showImageViewer = false">
      <div class="image-viewer-content" @click.self="showImageViewer = false">
        <img :src="viewImageUrl" class="viewer-image" />
        <button class="btn btn-outline btn-block mt-8" @click="showImageViewer = false">关闭</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import api, { getMediaUrl } from '../api/index.js'
import { showToast, showFailToast, showConfirmDialog } from 'vant'

const categories = ['日常耗材', '餐饮成本', '维修杂费', '营销费用', '水电费用', '其他支出']
const expenses = ref([])
const expDateStart = ref(new Date().toISOString().slice(0, 10))
const expDateEnd = ref(new Date().toISOString().slice(0, 10))
const distribution = ref({ categories: {}, total: 0, label: '' })
const showAddForm = ref(false)
const showImageViewer = ref(false)
const viewImageUrl = ref('')
const expenseForm = ref({ category: '日常耗材', amount: 0, note: '', expense_date: new Date().toISOString().slice(0, 10), reimbursement_person: '', receipt_image: '' })
const previewUrl = ref('')
const fileInput = ref(null)
const fileToUpload = ref(null)

const itemCount = computed(() =>
  Object.values(distribution.value.categories).filter(v => v > 0).length
)

function pct(total) {
  return distribution.value.total > 0 ? Number((total / distribution.value.total * 100).toFixed(1)) : 0
}

function catIcon(cat) {
  const m = { '日常耗材':'🧹','餐饮成本':'🍳','维修杂费':'🔧','营销费用':'📢','水电费用':'⚡','其他支出':'📦' }
  return m[cat] || '📌'
}

function barColor(cat) {
  const m = { '日常耗材':'orange','餐饮成本':'green','维修杂费':'blue','营销费用':'purple','水电费用':'cyan','其他支出':'gray' }
  return m[cat] || 'orange'
}

function triggerUpload() {
  fileInput.value?.click()
}

function onFileChange(e) {
  const file = e.target.files?.[0]
  if (!file) return
  fileToUpload.value = file
  const reader = new FileReader()
  reader.onload = (ev) => { previewUrl.value = ev.target.result }
  reader.readAsDataURL(file)
}

async function loadExpenses() {
  try {
    const today = new Date().toISOString().slice(0, 10)
    const month = today.slice(0, 7)
    const daily = await api.getExpenses(today, month, expDateStart.value, expDateEnd.value)
    expenses.value = daily.items || []

    // 从日期范围查询结果中提取分类汇总
    const cats = {}
    let total = 0
    for (const [cat, data] of Object.entries(daily.categories || {})) {
      cats[cat] = data.total || 0
      total += data.total || 0
    }
    const s = expDateStart.value, e = expDateEnd.value
    distribution.value = { categories: cats, total, label: s === e ? s : `${s} ~ ${e}` }
  } catch (e) { showFailToast(e.message) }
}

function onDateRangeChange() {
  loadExpenses()
}

async function saveExpense() {
  if (!expenseForm.value.amount || expenseForm.value.amount <= 0) { showToast('请输入有效金额'); return }
  try {
    const formData = new FormData()
    formData.append('report_date', expenseForm.value.expense_date || new Date().toISOString().slice(0, 10))
    formData.append('category', expenseForm.value.category)
    formData.append('amount', expenseForm.value.amount)
    formData.append('note', expenseForm.value.note || '')
    formData.append('expense_date', expenseForm.value.expense_date || new Date().toISOString().slice(0, 10))
    formData.append('reimbursement_person', expenseForm.value.reimbursement_person || '')

    if (expenseForm.value.id) {
      // Update
      if (fileToUpload.value) formData.append('receipt_image', fileToUpload.value)
      // else: keep existing image (don't append receipt_image at all)
      await api.updateExpense(expenseForm.value.id, formData)
    } else {
      if (fileToUpload.value) formData.append('receipt_image', fileToUpload.value)
      await api.addExpense(formData)
    }

    const wasEdit = !!expenseForm.value.id
    showAddForm.value = false
    expenseForm.value = { category: '日常耗材', amount: 0, note: '', expense_date: new Date().toISOString().slice(0, 10), reimbursement_person: '', receipt_image: '' }
    previewUrl.value = ''
    fileToUpload.value = null
    showToast(wasEdit ? '已更新' : '添加成功')
    loadExpenses()
  } catch (e) { showFailToast(e.message) }
}

function editExpense(exp) {
  expenseForm.value = { ...exp }
  if (exp.receipt_image) {
    previewUrl.value = getMediaUrl(exp.receipt_image)
  } else {
    previewUrl.value = ''
  }
  fileToUpload.value = null
  showAddForm.value = true
}

async function deleteExpense(exp) {
  if (!await showConfirmDialog({ message: `确认删除此笔支出？` }).catch(() => false)) return
  try {
    await api.deleteExpense(exp.id)
    showToast('已删除')
    loadExpenses()
  } catch (e) { showFailToast(e.message) }
}

function viewImage(exp) {
  if (exp.receipt_image) {
    viewImageUrl.value = getMediaUrl(exp.receipt_image)
    showImageViewer.value = true
  }
}

onMounted(loadExpenses)
</script>

<style scoped>
.dist-row { margin-bottom: 16px; }
.dist-header { display: flex; align-items: center; gap: 6px; margin-bottom: 6px; }
.dist-icon { font-size: 15px; flex-shrink: 0; }
.dist-label { font-size: 13px; color: var(--gray-700); font-weight: 500; }
.dist-amount { margin-left: auto; font-size: 15px; font-weight: 700; color: var(--gray-900); }
.dist-bar-row { display: flex; align-items: center; gap: 8px; }
.dist-bar-wrap { flex: 1; height: 14px; background: var(--gray-100); border-radius: 7px; overflow: hidden; }
.dist-bar { height: 100%; border-radius: 7px; transition: width .5s cubic-bezier(.4,0,.2,1); }
/* bar colors */
.bar-orange { background: linear-gradient(90deg, #F0A050, #E08830); }
.bar-green  { background: linear-gradient(90deg, #5CB870, #3D9B55); }
.bar-blue   { background: linear-gradient(90deg, #6090C8, #4578B0); }
.bar-purple { background: linear-gradient(90deg, #9880C8, #7D60B0); }
.bar-cyan   { background: linear-gradient(90deg, #50B8C0, #38A0A8); }
.bar-gray   { background: linear-gradient(90deg, #A0A0A0, #888); }
.dist-pct { font-size: 12px; font-weight: 600; color: var(--gray-500); min-width: 40px; text-align: right; flex-shrink: 0; }
.dist-total { display: flex; justify-content: space-between; padding-top: 10px; border-top: 1px solid var(--gray-200); margin-top: 6px; font-size: 13px; color: var(--gray-700); }
.dist-total-amount { font-size: 16px; font-weight: 700; color: var(--gray-900); }

.expense-row { display: flex; align-items: center; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid var(--gray-100); }
.expense-info { flex: 1; }
.expense-cat { display: flex; align-items: center; gap: 6px; margin-bottom: 2px; }
.expense-note { font-size: 13px; color: var(--gray-500); margin-top: 2px; }
.expense-meta { display: flex; gap: 12px; margin-top: 2px; }
.expense-meta .text-xs { font-size: 11px; }
.expense-amount { text-align: right; }
.expense-actions { display: flex; gap: 4px; margin-top: 4px; }

.upload-area { border: 2px dashed var(--gray-300); border-radius: var(--radius-sm); padding: 24px; text-align: center; cursor: pointer; color: var(--gray-500); font-size: 14px; transition: all .15s; }
.upload-area:active { border-color: var(--primary); background: var(--primary-light); }
.upload-preview { max-width: 100%; max-height: 120px; border-radius: 8px; object-fit: contain; }
.upload-actions { margin-top: 4px; display: flex; gap: 4px; }

.image-viewer-content { width: 90%; max-width: 500px; }
.viewer-image { width: 100%; border-radius: var(--radius); }

.text-lg { font-size: 16px; }
.font-bold { font-weight: 700; }

/* 支出行移动端优化 */
@media (max-width: 360px) {
  .expense-row { flex-wrap: wrap; }
  .expense-amount { width: 100%; display: flex; justify-content: space-between; align-items: center; margin-top: 4px; }
}
</style>

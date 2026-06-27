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
        <div class="card-header">📊 {{ currentMonth }} 支出分布</div>
        <div class="card-body">
          <div v-for="(total, cat) in monthlyData.categories" :key="cat" class="dist-row" v-if="total > 0">
            <span class="dist-label">{{ cat }}</span>
            <div class="dist-bar-wrap">
              <div class="dist-bar" :style="'width:' + (monthlyData.total > 0 ? (total / monthlyData.total * 100) : 0) + '%'"></div>
            </div>
            <span class="dist-count">¥{{ total }}</span>
          </div>
          <div class="dist-total">
            <span>本月合计</span>
            <span class="text-lg font-bold">¥{{ monthlyData.total }}</span>
          </div>
          <van-empty v-if="monthlyData.total === 0" description="本月暂无支出" />
        </div>
      </div>

      <!-- 本日支出 -->
      <div class="card">
        <div class="card-header">
          <span>📋 本日支出</span>
          <button class="btn btn-sm btn-outline" @click="loadExpenses">🔄 刷新</button>
        </div>
        <div class="card-body">
          <div v-for="exp in expenses" :key="exp.id" class="expense-row">
            <div class="expense-info">
              <div class="expense-cat">
                <span class="badge badge-orange">{{ exp.category }}</span>
                <span class="text-sm text-muted">{{ exp.created_at?.slice(11, 16) }}</span>
              </div>
              <div class="expense-note">{{ exp.note }}</div>
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
import { ref, reactive, computed, onMounted } from 'vue'
import api, { getMediaUrl } from '../api/index.js'
import { showToast, showFailToast, showConfirmDialog } from 'vant'

const categories = ['日常耗材', '餐饮成本', '维修杂费', '营销费用', '水电费用', '其他支出']
const expenses = ref([])
const monthlyData = reactive({ categories: {}, total: 0 })
const showAddForm = ref(false)
const showImageViewer = ref(false)
const viewImageUrl = ref('')
const expenseForm = ref({ category: '日常耗材', amount: 0, note: '', receipt_image: '' })
const previewUrl = ref('')
const fileInput = ref(null)
const fileToUpload = ref(null)

const currentMonth = computed(() => {
  const d = new Date()
  return `${d.getFullYear()}年${d.getMonth() + 1}月`
})

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
    const [daily, summary] = await Promise.all([
      api.getExpenses(today, month),
      api.getExpenseSummary(month)
    ])
    expenses.value = daily.items || []
    monthlyData.categories = summary.categories || {}
    monthlyData.total = summary.total || 0
  } catch (e) { showFailToast(e.message) }
}

async function saveExpense() {
  if (!expenseForm.value.amount || expenseForm.value.amount <= 0) { showToast('请输入有效金额'); return }
  try {
    const formData = new FormData()
    formData.append('report_date', new Date().toISOString().slice(0, 10))
    formData.append('category', expenseForm.value.category)
    formData.append('amount', expenseForm.value.amount)
    formData.append('note', expenseForm.value.note || '')

    if (expenseForm.value.id) {
      // Update
      if (fileToUpload.value) formData.append('receipt_image', fileToUpload.value)
      // else: keep existing image (don't append receipt_image at all)
      await api.updateExpense(expenseForm.value.id, formData)
    } else {
      if (fileToUpload.value) formData.append('receipt_image', fileToUpload.value)
      await api.addExpense(formData)
    }

    showAddForm.value = false
    expenseForm.value = { category: '日常耗材', amount: 0, note: '', receipt_image: '' }
    previewUrl.value = ''
    fileToUpload.value = null
    showToast(expenseForm.value.id ? '已更新' : '添加成功')
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
.dist-row { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.dist-label { font-size: 13px; color: var(--gray-700); min-width: 60px; }
.dist-bar-wrap { flex: 1; height: 8px; background: var(--gray-100); border-radius: 4px; overflow: hidden; }
.dist-bar { height: 100%; background: var(--primary); border-radius: 4px; transition: width .3s; }
.dist-count { font-size: 13px; font-weight: 600; min-width: 60px; text-align: right; }
.dist-total { display: flex; justify-content: space-between; padding-top: 8px; border-top: 1px solid var(--gray-200); margin-top: 4px; font-size: 14px; }

.expense-row { display: flex; align-items: center; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid var(--gray-100); }
.expense-info { flex: 1; }
.expense-cat { display: flex; align-items: center; gap: 6px; margin-bottom: 2px; }
.expense-note { font-size: 13px; color: var(--gray-500); margin-top: 2px; }
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
</style>

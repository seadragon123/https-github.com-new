<template>
  <div class="page">
    <header class="page-header">
      <div class="flex-between">
        <h1>💰 营业日报</h1>
        <div class="flex-center">
          <button class="btn btn-sm btn-outline" @click="printReport">🖨️ 打印</button>
          <button class="btn btn-sm btn-outline" @click="exportCSV">📥 CSV</button>
        </div>
      </div>
    </header>

    <div class="page-body">
      <!-- 日期 & 报告人 -->
      <div class="card">
        <div class="card-body">
          <div class="flex-between">
            <div class="form-group" style="flex:1;margin-bottom:0">
              <label>日期</label>
              <input v-model="reportDate" type="date" class="form-input" @change="loadAll" />
            </div>
            <div class="form-group" style="flex:1;margin-left:12px;margin-bottom:0">
              <label>报告人</label>
              <input v-model="reporter" class="form-input" placeholder="签字" />
            </div>
          </div>
        </div>
      </div>

      <!-- ===== 客房收入明细 ===== -->
      <div class="card">
        <div class="card-header">
          <span>🏨 客房收入</span>
          <div style="display:flex;gap:6px">
            <button class="btn btn-sm btn-success" @click="autoGenerate">🤖 刷新</button>
          </div>
        </div>
        <div class="card-body" style="padding:0;overflow-x:auto">
          <table class="data-table">
            <thead>
              <tr>
                <th style="width:36px">#</th>
                <th style="width:54px">房号</th>
                <th>渠道</th>
                <th>客户姓名</th>
                <th style="width:70px">金额</th>
                <th>支付方式</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(r, i) in roomItems" :key="r._key">
                <td class="tc">{{ i + 1 }}</td>
                <td>{{ r.room_no }}</td>
                <td>{{ r.channel_type || '—' }}</td>
                <td>{{ parseGuestName(r.channel_source) }}</td>
                <td class="text-right">¥{{ r.amount }}</td>
                <td>{{ r.payment_method || '—' }}</td>
              </tr>
              <van-empty v-if="roomItems.length === 0" description="暂无记录" />
            </tbody>
          </table>
        </div>
        <div class="card-footer flex-between">
          <span class="text-sm">客房收入合计</span>
          <span class="stat-num">¥{{ roomTotal }}</span>
        </div>
      </div>

      <!-- ===== 请香收入明细 ===== -->
      <div class="card">
        <div class="card-header">
          <span>🪷 请香收入</span>
          <div style="display:flex;gap:6px">
            <button class="btn btn-sm btn-success" @click="autoIncense">🤖 刷新</button>
          </div>
        </div>
        <div class="card-body" style="padding:0;overflow-x:auto">
          <table class="data-table">
            <thead>
              <tr>
                <th style="width:36px">#</th>
                <th>商品名称</th>
                <th style="width:50px">单价</th>
                <th style="width:40px">数量</th>
                <th style="width:70px">金额</th>
                <th style="width:70px">返佣金额</th>
                <th>支付方式</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(r, i) in incenseItems" :key="r._key">
                <td class="tc">{{ i + 1 }}</td>
                <td>{{ r.product_name || '—' }}</td>
                <td class="text-right">¥{{ unitPrice(r) }}</td>
                <td class="tc">{{ r.quantity || 1 }}</td>
                <td class="text-right">¥{{ r.net_amount || r.amount }}</td>
                <td class="text-right" :class="(r.commission_amount||0)>0?'text-warning':''">{{ (r.commission_amount||0)>0 ? '¥'+r.commission_amount : '—' }}</td>
                <td>{{ r.payment_method || '—' }}</td>
              </tr>
              <van-empty v-if="incenseItems.length === 0" description="暂无记录" />
            </tbody>
          </table>
        </div>
        <div class="card-footer flex-between">
          <span class="text-sm">请香收入合计</span>
          <span class="stat-num">¥{{ incenseTotal }}</span>
        </div>
      </div>

      <!-- ===== 餐饮收入明细 ===== -->
      <div class="card">
        <div class="card-header">
          <span>🍜 餐饮收入</span>
          <div style="display:flex;gap:6px">
            <button class="btn btn-sm btn-success" @click="loadCatering">🤖 刷新</button>
          </div>
        </div>
        <div class="card-body" style="padding:0;overflow-x:auto">
          <table class="data-table">
            <thead>
              <tr>
                <th style="width:36px">#</th>
                <th>客人姓名</th>
                <th>类型</th>
                <th>菜品名称</th>
                <th style="width:70px">金额</th>
                <th>支付方式</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(r, i) in cateringItems" :key="r._key">
                <td class="tc">{{ i + 1 }}</td>
                <td>{{ r.guest_name }}</td>
                <td><span class="badge" :class="r.order_type==='外卖'?'badge-orange':'badge-blue'">{{ r.order_type }}</span></td>
                <td>{{ formatDishNames(r.items) }}</td>
                <td class="text-right">¥{{ r.total }}</td>
                <td>{{ r.payment_method || '—' }}</td>
              </tr>
              <van-empty v-if="cateringItems.length === 0" description="暂无记录" />
            </tbody>
          </table>
        </div>
        <div class="card-footer flex-between">
          <span class="text-sm">餐饮收入合计</span>
          <span class="stat-num">¥{{ cateringTotal }}</span>
        </div>
      </div>

      <!-- ===== 支出明细 ===== -->
      <div class="card">
        <div class="card-header">
          <span>💸 支出明细</span>
          <div style="display:flex;gap:6px">
            <button class="btn btn-sm btn-success" @click="autoExpenses">🤖 刷新</button>
          </div>
        </div>
        <div class="card-body" style="padding:0;overflow-x:auto">
          <table class="data-table">
            <thead>
              <tr>
                <th style="width:36px">#</th>
                <th>支出类别</th>
                <th style="width:70px">金额</th>
                <th>备注</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(e, i) in allExpenses" :key="e._key">
                <td class="tc">{{ i + 1 }}</td>
                <td><span class="badge badge-orange">{{ e.category }}</span></td>
                <td class="text-right">¥{{ e.amount }}</td>
                <td class="text-muted text-sm">{{ e.note || '—' }}</td>
              </tr>
              <van-empty v-if="allExpenses.length === 0" description="暂无记录" />
            </tbody>
          </table>
        </div>
        <div class="card-footer flex-between">
          <span class="text-sm">当日总支出</span>
          <span class="stat-num text-danger">¥{{ expenseTotal }}</span>
        </div>
      </div>

      <!-- ===== 经营结果汇总 ===== -->
      <div class="card">
        <div class="card-header">📈 经营结果汇总</div>
        <div class="card-body" style="padding:0;overflow-x:auto">
          <table class="data-table summary-table">
            <thead>
              <tr>
                <th style="width:100px">项目</th>
                <th style="width:90px">金额(元)</th>
                <th>计算公式</th>
              </tr>
            </thead>
            <tbody>
              <tr class="summary-row">
                <td>当日客房收入</td>
                <td class="stat-num">¥{{ summary.daily.roomRevenue }}</td>
                <td class="text-sm text-muted">= 已完成退房订单</td>
              </tr>
              <tr class="summary-row">
                <td>当日餐饮收入</td>
                <td class="stat-num">¥{{ summary.daily.cateringRevenue }}</td>
                <td class="text-sm text-muted">= 已结账餐饮订单</td>
              </tr>
              <tr class="summary-row">
                <td>当日请香收入</td>
                <td class="stat-num">¥{{ summary.daily.incenseRevenue }}</td>
                <td class="text-sm text-muted">= 请香销售（扣除返佣）</td>
              </tr>
              <tr class="summary-row total-row">
                <td><strong>当日总收入</strong></td>
                <td><strong>¥{{ summary.daily.totalRevenue }}</strong></td>
                <td class="text-sm text-muted">= 客房 + 餐饮 + 请香</td>
              </tr>
              <tr class="summary-row">
                <td>当日总支出</td>
                <td class="stat-num text-danger">¥{{ summary.daily.totalExpense }}</td>
                <td class="text-sm text-muted">= 支出小计</td>
              </tr>
              <tr class="summary-row net-row">
                <td><strong>当日净现金流</strong></td>
                <td><strong :class="netClass">¥{{ summary.daily.netCashflow }}</strong></td>
                <td class="text-sm text-muted">= 总收入 - 总支出</td>
              </tr>
              <tr><td colspan="3" class="sep-line"></td></tr>
              <tr class="summary-row">
                <td>本月累计收入</td>
                <td class="stat-num">¥{{ summary.monthly.totalRevenue }}</td>
                <td></td>
              </tr>
              <tr class="summary-row">
                <td>本月累计支出</td>
                <td class="stat-num text-danger">¥{{ summary.monthly.totalExpense }}</td>
                <td></td>
              </tr>
              <tr class="summary-row net-row">
                <td><strong>本月累计结余</strong></td>
                <td><strong :class="monthNetClass">¥{{ summary.monthly.netBalance }}</strong></td>
                <td class="text-sm text-muted">= 累计收入 - 累计支出</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="card-footer flex-between">
          <span class="text-sm">报告人: {{ reporter || '未填写' }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import api from '../api/index.js'
import { showToast, showFailToast, showConfirmDialog } from 'vant'

const reportDate = ref(new Date().toISOString().slice(0, 10))
const reporter = ref('')
const roomItems = ref([])
const incenseItems = ref([])
const allExpenses = ref([])
const cateringItems = ref([])
const expensesData = ref({ categories: {}, dailyTotal: 0, monthlyByCategory: {}, monthlyTotal: 0 })
const summary = ref({ daily: { roomRevenue: 0, cateringRevenue: 0, incenseRevenue: 0, totalRevenue: 0, totalExpense: 0, netCashflow: 0 }, monthly: { totalRevenue: 0, totalExpense: 0, netBalance: 0 } })

const expenseCategories = ['日常耗材', '维修杂费', '营销费用', '水电费用', '其他支出']

let keyCounter = 0

// 确认弹窗
async function showConfirm(msg) {
  try {
    await showConfirmDialog({ message: msg })
    return true
  } catch {
    return false
  }
}

function genKey() { return ++keyCounter }

function parseGuestName(src) {
  if (!src) return '—'
  return src.replace(/\(.*\)$/, '')
}

function formatDishNames(items) {
  if (!items) return '—'
  const parsed = typeof items === 'string' ? JSON.parse(items) : items
  if (!Array.isArray(parsed) || parsed.length === 0) return '—'
  return parsed.map(i => `${i.name}×${i.qty}`).join('、')
}

function unitPrice(r) {
  const qty = r.quantity || 1
  const total = r.amount || 0
  return qty > 0 ? (total / qty).toFixed(0) : '0'
}

async function loadCatering() {
  try {
    const data = await api.getCateringOrders(reportDate.value, '已结账')
    cateringItems.value = (data.orders || []).map(o => ({
      ...o,
      items: typeof o.items === 'string' ? JSON.parse(o.items) : (o.items || []),
      _key: genKey()
    }))
  } catch (e) { /* ignore */ }
}

const roomTotal = computed(() => roomItems.value.reduce((s, r) => s + (r.amount || 0), 0))
const incenseTotal = computed(() => incenseItems.value.reduce((s, r) => s + (r.net_amount || r.amount || 0), 0))
const cateringTotal = computed(() => cateringItems.value.reduce((s, r) => s + (r.total || 0), 0))
const expenseTotal = computed(() => allExpenses.value.reduce((s, e) => s + (e.amount || 0), 0))
const monthlyExpenseByCat = computed(() => expensesData.value.monthlyByCategory || {})

const netClass = computed(() => summary.value.daily.netCashflow >= 0 ? 'text-success' : 'text-danger')
const monthNetClass = computed(() => summary.value.monthly.netBalance >= 0 ? 'text-success' : 'text-danger')

function addRoomRow() {
  roomItems.value.push({ _key: genKey(), time: '', room_no: '', price: 0, channel_type: '', channel_source: '', amount: 0, payment_method: '' })
}

async function autoGenerate() {
  if (!await showConfirm('确定从今日订单自动生成客房收入吗？\n\n将会清空现有明细，从退房+入住订单生成收入记录。')) return
  try {
    const r = await api.autoGenerateRevenue(reportDate.value)
    showToast('✅ ' + r.message + '\n共' + r.items.length + '条，合计¥' + r.total)
    loadAll()
  } catch (err) {
    showToast('❌ ' + err.message)
  }
}

async function autoIncense() {
  if (!await showConfirm('从请香销售记录自动生成请香收入？')) return
  try {
    await api.autoGenerateIncense(reportDate.value)
    showToast('✅ 请香收入已从销售记录生成')
    loadAll()
  } catch (err) {
    showToast('❌ ' + err.message)
  }
}

async function autoExpenses() {
  try {
    const r = await api.autoGenerateExpenses(reportDate.value)
    // 从 expenses 表重新加载到视图
    const items = r.items || []
    allExpenses.value = items.map(e => ({ ...e, _key: genKey() }))
    updateExpenses()
    showToast(`✅ 已加载 ${items.length} 笔支出`)
  } catch (err) {
    showToast('❌ ' + err.message)
  }
}

function deleteRoomRow(i) {
  const item = roomItems.value[i]
  if (item.id) api.deleteRevenueDetail(item.id)
  roomItems.value.splice(i, 1)
  updateRoomTotal()
}

function updateRoomTotal() {
  summary.value.daily.roomRevenue = roomTotal.value
  summary.value.daily.totalRevenue = roomTotal.value + incenseTotal.value
  summary.value.daily.netCashflow = summary.value.daily.totalRevenue - summary.value.daily.totalExpense
}

function addIncenseRow() {
  incenseItems.value.push({ _key: genKey(), time: '', amount: 0, has_commission: false, commission_rate: 0, commission_amount: 0, net_amount: 0, payment_method: '' })
}

function deleteIncenseRow(i) {
  const item = incenseItems.value[i]
  if (item.id) api.deleteIncenseRevenue(item.id)
  incenseItems.value.splice(i, 1)
  updateIncenseTotal()
}

function recalcIncense(i) {
  const r = incenseItems.value[i]
  if (r.has_commission && r.commission_rate > 0) {
    r.commission_amount = Math.round((r.amount || 0) * r.commission_rate / 100 * 100) / 100
  }
  if (r.has_commission) {
    r.net_amount = Math.round(((r.amount || 0) - r.commission_amount) * 100) / 100
  } else {
    r.commission_amount = 0
    r.net_amount = r.amount || 0
  }
  updateIncenseTotal()
}

function updateIncenseTotal() {
  summary.value.daily.incenseRevenue = incenseTotal.value
  summary.value.daily.totalRevenue = roomTotal.value + incenseTotal.value
  summary.value.daily.netCashflow = summary.value.daily.totalRevenue - summary.value.daily.totalExpense
}

function addExpenseRow() {
  allExpenses.value.push({ _key: genKey(), category: '日常耗材', amount: 0, note: '' })
}

function deleteExpenseRow(id, i) {
  if (id) api.deleteExpense(id)
  allExpenses.value.splice(i, 1)
  updateExpenses()
}

function updateExpenses() {
  const total = allExpenses.value.reduce((s, e) => s + (e.amount || 0), 0)
  summary.value.daily.totalExpense = total
  summary.value.daily.netCashflow = summary.value.daily.totalRevenue - total
}

async function loadAll() {
  const date = reportDate.value
  const month = date.slice(0, 7)
  try {
    // 自动从各业务模块拉取当天数据
    const [roomRes, expRes, sum] = await Promise.all([
      api.autoGenerateRevenue(date).catch(() => ({ items: [], total: 0 })),
      api.autoGenerateExpenses(date).catch(() => ({ items: [], total: 0 })),
      api.getRevenueSummary(date, month)
    ])
    // 加载客房收入
    roomItems.value = (roomRes.items || []).map(r => ({ ...r, _key: genKey() }))
    // 加载请香收入（从 incense_sales 取，含商品名称和数量）
    const incData = await api.getIncenseSales(date)
    incenseItems.value = (incData.items || []).map(r => ({ ...r, _key: genKey() }))
    // 加载支出
    allExpenses.value = (expRes.items || []).map(e => ({ ...e, _key: genKey() }))
    expensesData.value = expRes
    summary.value = sum
    // 加载餐饮收入
    loadCatering()
  } catch (e) {
    showFailToast(e.message)
  }
}

async function saveAll() {
  const date = reportDate.value
  try {
    // Only save rows that have data
    await api.clearRevenueDetails(date)
    await api.clearIncenseRevenue(date)
    await api.clearExpenses(date)

    for (const r of roomItems.value) {
      await api.addRevenueDetail({ report_date: date, time: r.time, room_no: r.room_no, price: r.price, channel_type: r.channel_type, channel_source: r.channel_source, amount: r.amount, payment_method: r.payment_method })
    }
    for (const r of incenseItems.value) {
      await api.addIncenseRevenue({ report_date: date, time: r.time, amount: r.amount, has_commission: r.has_commission, commission_rate: r.commission_rate, commission_amount: r.commission_amount, net_amount: r.net_amount, payment_method: r.payment_method })
    }
    for (const e of allExpenses.value) {
      if (e.amount > 0 || e.note) {
        await api.addExpense({ report_date: date, category: e.category, amount: e.amount, note: e.note })
      }
    }

    showToast('日报保存成功')
    loadAll()
  } catch (err) {
    showFailToast('' + err.message)
  }
}

// 打印报表
function printReport() {
  const title = `营业日报 - ${reportDate.value}`
  let html = `<html><head><meta charset="utf-8"><title>${title}</title>
    <style>
      body { font-family: SimSun, serif; padding: 20px; font-size: 14px; }
      h1 { text-align: center; font-size: 18px; }
      .meta { text-align: center; color: #666; margin-bottom: 16px; font-size: 13px; }
      h3 { margin: 16px 0 8px; font-size: 15px; }
      table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
      th, td { border: 1px solid #333; padding: 6px 8px; text-align: left; font-size: 12px; }
      th { background: #f0f0f0; }
      .total { text-align: right; font-weight: bold; margin: 8px 0; }
      .net { font-size: 16px; text-align: center; margin: 12px 0; padding: 8px; border: 1px solid #333; }
      .report-footer { text-align: right; margin-top: 20px; font-size: 13px; }
      @media print { body { -webkit-print-color-adjust: exact; } }
    </style></head><body>
    <h1>🏨 酒店管家 - 营业日报</h1>
    <div class="meta">日期: ${reportDate.value} | 报告人: ${reporter.value || '未填写'}</div>`
  
  // 客房收入
  if (roomItems.value.length > 0) {
    html += `<h3>一、客房收入</h3><table><tr><th>房号</th><th>渠道</th><th>客户姓名</th><th>金额</th><th>支付方式</th></tr>`
    for (const r of roomItems.value) {
      html += `<tr><td>${r.room_no}</td><td>${r.channel_type || '—'}</td><td>${parseGuestName(r.channel_source)}</td><td>¥${r.amount}</td><td>${r.payment_method || '—'}</td></tr>`
    }
    html += `</table><div class="total">客房收入合计: ¥${roomTotal.value}</div>`
  }
  // 餐饮收入
  if (cateringItems.value.length > 0) {
    html += `<h3>二、餐饮收入</h3><table><tr><th>客人姓名</th><th>类型</th><th>菜品名称</th><th>金额</th><th>支付方式</th></tr>`
    for (const r of cateringItems.value) {
      html += `<tr><td>${r.guest_name}</td><td>${r.order_type}</td><td>${formatDishNames(r.items)}</td><td>¥${r.total}</td><td>${r.payment_method || '—'}</td></tr>`
    }
    html += `</table><div class="total">餐饮收入合计: ¥${cateringTotal.value}</div>`
  }
  // 请香收入
  if (incenseItems.value.length > 0) {
    html += `<h3>三、请香收入</h3><table><tr><th>商品名称</th><th>单价</th><th>数量</th><th>金额</th><th>返佣金额</th><th>支付方式</th></tr>`
    for (const r of incenseItems.value) {
      html += `<tr><td>${r.product_name || '—'}</td><td>¥${unitPrice(r)}</td><td>${r.quantity || 1}</td><td>¥${r.net_amount || r.amount}</td><td>${(r.commission_amount||0) > 0 ? '¥'+r.commission_amount : '—'}</td><td>${r.payment_method || '—'}</td></tr>`
    }
    html += `</table><div class="total">请香收入合计: ¥${incenseTotal.value}</div>`
  }
  // 支出明细
  if (allExpenses.value.length > 0) {
    html += `<h3>四、支出明细</h3><table><tr><th>类别</th><th>金额</th><th>备注</th></tr>`
    for (const e of allExpenses.value) {
      if (e.amount > 0) html += `<tr><td>${e.category}</td><td>¥${e.amount}</td><td>${e.note || '—'}</td></tr>`
    }
    html += `</table><div class="total">支出合计: ¥${expenseTotal.value}</div>`
  }
  const secNo = [roomItems, cateringItems, incenseItems, allExpenses].filter(a => a.value.length > 0).length
  html += `<h3>${['五',''][0]}经营结果汇总</h3>
  <table>
    <tr><th>项目</th><th>金额(元)</th></tr>
    <tr><td>当日总收入</td><td>¥${summary.value.daily.totalRevenue}</td></tr>
    <tr><td>当日总支出</td><td>¥${summary.value.daily.totalExpense}</td></tr>
    <tr><td><strong>当日净现金流</strong></td><td><strong>¥${summary.value.daily.netCashflow}</strong></td></tr>
    <tr><td>本月累计收入</td><td>¥${summary.value.monthly.totalRevenue}</td></tr>
    <tr><td>本月累计支出</td><td>¥${summary.value.monthly.totalExpense}</td></tr>
    <tr><td><strong>本月累计结余</strong></td><td><strong>¥${summary.value.monthly.netBalance}</strong></td></tr>
  </table>
  <div class="report-footer">报告人: ${reporter.value || '___________'}  |  ${reportDate.value}</div>
  </body></html>`

  const w = window.open('', '_blank')
  w.document.write(html)
  w.document.close()
  setTimeout(() => w.print(), 500)
}

// CSV 导出
function exportCSV() {
  const BOM = '\uFEFF'
  const date = reportDate.value
  let csv = BOM + `营业日报,${date}\n\n`
  
  if (roomItems.value.length > 0) {
    csv += `客房收入\n房号,渠道,客户姓名,金额,支付方式\n`
    for (const r of roomItems.value) {
      csv += `${r.room_no},${r.channel_type || '—'},${parseGuestName(r.channel_source)},${r.amount},${r.payment_method || '—'}\n`
    }
    csv += `,客房收入合计,,¥${roomTotal.value}\n\n`
  }
  if (cateringItems.value.length > 0) {
    csv += `餐饮收入\n客人姓名,类型,菜品名称,金额,支付方式\n`
    for (const r of cateringItems.value) {
      csv += `${r.guest_name},${r.order_type},"${formatDishNames(r.items)}",${r.total},${r.payment_method || '—'}\n`
    }
    csv += `,餐饮收入合计,,¥${cateringTotal.value}\n\n`
  }
  if (incenseItems.value.length > 0) {
    csv += `请香收入\n商品名称,单价,数量,金额,返佣金额,支付方式\n`
    for (const r of incenseItems.value) {
      csv += `${r.product_name || '—'},${unitPrice(r)},${r.quantity || 1},${r.net_amount || r.amount},${(r.commission_amount||0)>0 ? r.commission_amount : '—'},${r.payment_method || '—'}\n`
    }
    csv += `,请香收入合计,,,,¥${incenseTotal.value}\n\n`
  }
  if (allExpenses.value.length > 0) {
    csv += `支出\n类别,金额,备注\n`
    for (const e of allExpenses.value) {
      if (e.amount > 0) csv += `${e.category},${e.amount},"${e.note || ''}"\n`
    }
    csv += `,支出合计,¥${expenseTotal.value}\n\n`
  }
  csv += `经营汇总\n项目,金额\n`
  csv += `当日总收入,¥${summary.value.daily.totalRevenue}\n`
  csv += `当日总支出,¥${summary.value.daily.totalExpense}\n`
  csv += `当日净现金流,¥${summary.value.daily.netCashflow}\n`
  csv += `本月累计收入,¥${summary.value.monthly.totalRevenue}\n`
  csv += `本月累计支出,¥${summary.value.monthly.totalExpense}\n`
  csv += `本月累计结余,¥${summary.value.monthly.netBalance}\n`
  csv += `报告人,${reporter.value || ''}\n`

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = `营业日报_${date}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

onMounted(loadAll)
</script>

<style scoped>
/* ===== 请香卡片样式 ===== */
.incense-card {
  background: var(--gray-50);
  border-radius: var(--radius-sm);
  padding: 12px;
  margin-bottom: 10px;
}
.incense-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}
.incense-num {
  font-weight: 600;
  font-size: 14px;
  color: var(--gray-700);
}
.incense-body { display: flex; flex-direction: column; gap: 8px; }
.incense-row { display: flex; gap: 10px; }
.incense-field { display: flex; flex-direction: column; gap: 3px; }
.incense-field label { font-size: 11px; color: var(--gray-500); font-weight: 500; }
.incense-total {
  text-align: right;
  padding-top: 10px;
  border-top: 1px solid var(--gray-200);
  font-size: 14px;
  color: var(--gray-700);
}

/* 返佣切换开关 */
.commission-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}
.toggle-label { font-size: 12px; color: var(--gray-700); }
.toggle-input { display: none; }
.toggle-slider {
  width: 36px; height: 20px;
  background: var(--gray-300);
  border-radius: 10px;
  position: relative;
  transition: background .2s;
}
.toggle-slider::after {
  content: '';
  width: 16px; height: 16px;
  background: #fff;
  border-radius: 50%;
  position: absolute;
  top: 2px; left: 2px;
  transition: transform .2s;
  box-shadow: 0 1px 3px rgba(0,0,0,.2);
}
.toggle-input:checked + .toggle-slider { background: var(--success); }
.toggle-input:checked + .toggle-slider::after { transform: translateX(16px); }

/* ===== 支出卡片样式 ===== */
.expense-card {
  background: var(--gray-50);
  border-radius: var(--radius-sm);
  padding: 12px;
  margin-bottom: 10px;
}
.expense-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}
.category-select {
  font-size: 14px;
  font-weight: 600;
  border: none;
  background: transparent;
  padding: 4px 8px;
  border-radius: 4px;
  cursor: pointer;
  outline: none;
}
.category-select:focus { background: #fff; box-shadow: 0 0 0 2px var(--primary-light); }
.expense-body { display: flex; flex-direction: column; gap: 4px; }
.expense-row { display: flex; gap: 10px; }
.expense-field { display: flex; flex-direction: column; gap: 3px; }
.expense-field label { font-size: 11px; color: var(--gray-500); font-weight: 500; }
.expense-total {
  text-align: right;
  padding-top: 10px;
  border-top: 1px solid var(--gray-200);
  font-size: 14px;
  color: var(--gray-700);
}

/* ===== 通用字段样式 ===== */
.field-input {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid var(--gray-200);
  border-radius: 6px;
  font-size: 14px;
  outline: none;
  background: #fff;
  transition: border-color .15s;
}
.field-input:focus { border-color: var(--primary); box-shadow: 0 0 0 2px var(--primary-light); }
.field-amount { font-weight: 600; text-align: right; }
.net-display, .monthly-display {
  padding: 8px 10px;
  font-size: 14px;
  font-weight: 600;
  color: var(--gray-900);
  background: #fff;
  border: 1px solid var(--gray-200);
  border-radius: 6px;
  min-height: 37px;
}

/* ===== 表格 ===== */
.data-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.data-table th { background: var(--gray-50); padding: 8px 4px; font-weight: 600; font-size: 12px; color: var(--gray-700); text-align: left; border-bottom: 1px solid var(--gray-200); white-space: nowrap; }
.data-table td { padding: 4px; border-bottom: 1px solid var(--gray-100); vertical-align: middle; }
.tc { text-align: center !important; }
.cell-input { width: 100%; border: none; background: transparent; padding: 6px 4px; font-size: 13px; outline: none; border-radius: 4px; }
.cell-input:focus { background: #fff; box-shadow: 0 0 0 2px var(--primary-light); }
.cell-select { cursor: pointer; appearance: auto; }
input[type="number"].cell-input { text-align: right; }
.btn-del { border: none; background: none; color: var(--gray-500); cursor: pointer; font-size: 14px; padding: 4px 6px; border-radius: 4px; }
.btn-del:hover { color: var(--danger); background: #fce8e6; }
.card-footer { padding: 10px 16px; border-top: 1px solid var(--gray-100); }
.stat-num { font-weight: 600; font-size: 14px; }
.text-success { color: var(--success); }
.text-danger { color: var(--danger); }
.summary-table td { padding: 10px 8px; }
.sep-line { padding: 0 !important; height: 1px; background: var(--gray-200); }
</style>

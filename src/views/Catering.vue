<template>
  <div class="page">
    <header class="page-header">
      <div class="flex-between">
        <h1>🍜 餐厅管理</h1>
        <button class="btn btn-primary btn-sm" @click="showNewOrder = true">➕ 快速点单</button>
      </div>
    </header>

    <div class="page-body">
      <!-- 今日营业概况 -->
      <div class="card">
        <div class="card-header">📊 今日营业</div>
        <div class="card-body">
          <div class="stats-grid">
            <div class="stat-item">
              <div class="stat-value">{{ summary.dineIn }}</div>
              <div class="stat-label">堂食</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">{{ summary.takeout }}</div>
              <div class="stat-label">外卖</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">{{ summary.linked }}</div>
              <div class="stat-label">挂账</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">{{ summary.totalOrders }}</div>
              <div class="stat-label">总单数</div>
            </div>
            <div class="stat-item" style="grid-column:span 2">
              <div class="stat-value" style="color:var(--success)">¥{{ summary.totalRevenue }}</div>
              <div class="stat-label">今日营收</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 菜品管理 -->
      <div class="card">
        <div class="card-header">
          <span class="flex-center gap-2">
            <span>🍽️</span>
            <span class="tab" :class="{active: cateringTab === 'menu'}" @click="cateringTab='menu'">菜品管理</span>
            <span class="tab" :class="{active: cateringTab === 'ranking'}" @click="cateringTab='ranking';loadRanking()">📊 销量排行</span>
          </span>
          <button v-if="cateringTab === 'menu'" class="btn btn-sm btn-outline" @click="showMenuForm = true;menuForm={}">+ 新增</button>
        </div>
        <div class="card-body" v-if="cateringTab === 'menu'">
          <div class="tabs mb-8">
            <div class="tab" :class="{active: menuCat === '全部'}" @click="menuCat='全部'">全部</div>
            <div v-for="c in menuCategories" :key="c" class="tab" :class="{active: menuCat === c}" @click="menuCat=c">{{ c }}</div>
          </div>
          <div class="menu-grid">
            <div v-for="item in filteredMenus" :key="item.id" class="menu-item" :class="{off: !item.is_available}">
              <div class="menu-info" @click="editMenu(item)">
                <div class="menu-name">{{ item.name }}</div>
                <div class="menu-meta">
                  <span class="badge badge-gray">{{ item.category }}</span>
                  <span class="menu-price">¥{{ item.price }}</span>
                </div>
              </div>
              <div class="menu-actions">
                <span v-if="!item.is_available" class="badge badge-red">下架</span>
                <button class="btn btn-sm btn-danger" @click="deleteMenuItem(item)">✕</button>
              </div>
            </div>
          </div>
          <van-empty v-if="cateringTab === 'menu' && filteredMenus.length === 0" description="暂无菜品" />
        </div>
        <!-- 菜品销量排行 -->
        <div class="card-body" v-if="cateringTab === 'ranking'">
          <div class="tabs mb-8">
            <div class="tab" :class="{active: rankingPeriod === 'all'}" @click="rankingPeriod='all';loadRanking()">全部</div>
            <div class="tab" :class="{active: rankingPeriod === 'month'}" @click="rankingPeriod='month';loadRanking()">本月</div>
            <div class="tab" :class="{active: rankingPeriod === 'week'}" @click="rankingPeriod='week';loadRanking()">本周</div>
          </div>
          <div v-for="(item, i) in ranking" :key="item.menu_id" class="ranking-row">
            <div class="ranking-rank" :class="'rank-' + (i + 1)">{{ i + 1 }}</div>
            <div class="ranking-info">
              <span class="ranking-name">{{ item.name }}</span>
              <span class="text-sm text-muted">{{ item.category }} · ¥{{ item.price }}</span>
            </div>
            <div class="ranking-stats">
              <div class="stat-qty">{{ item.total_qty }}份</div>
              <div class="stat-revenue">¥{{ item.total_revenue }}</div>
            </div>
          </div>
          <van-empty v-if="ranking.length === 0" description="暂无销量数据" />
        </div>
      </div>

      <!-- 未结账订单 -->
      <div class="card">
        <div class="card-header filterable">
          <span>📋 未结账订单</span>
          <div class="filter-bar">
            <input v-model="orderDateStart" type="date" class="filter-date-input" @change="loadOrders" />
            <span class="filter-sep">至</span>
            <input v-model="orderDateEnd" type="date" class="filter-date-input" @change="loadOrders" />
            <button class="btn btn-sm btn-outline" style="flex-shrink:0" @click="loadOrders">🔄 刷新</button>
          </div>
        </div>
        <div class="card-body">
          <div v-for="order in pendingOrders" :key="order.id" class="order-card">
            <div class="order-header" @click="toggleOrderDetail(order.id)">
              <div class="flex-between">
                <div>
                  <span class="order-no">{{ order.order_no }}</span>
                  <span class="badge" :class="order.order_type==='外卖'?'badge-orange':'badge-blue'">{{ order.order_type }}</span>
                </div>
                <span class="order-total">¥{{ order.total }}</span>
              </div>
              <div class="order-meta">
                <span>{{ order.guest_name }} {{ order.guest_phone }}</span>
                <span v-if="order.booking_id" class="badge badge-green">挂房账</span>
              </div>
            </div>
            <div v-if="expandedOrder === order.id" class="order-items">
              <div v-for="item in order.items" :key="item.id" class="item-row">
                <span>{{ item.name }} × {{ item.qty }}</span>
                <span>¥{{ item.price * item.qty }}</span>
              </div>
              <div class="order-actions">
                <button class="btn btn-sm btn-outline" @click="openEditOrder(order)">修改</button>
                <button class="btn btn-sm btn-success" @click="payOrder(order)">💰 结账</button>
                <button class="btn btn-sm btn-danger" @click="cancelOrder(order)">取消</button>
              </div>
            </div>
          </div>
          <van-empty v-if="pendingOrders.length === 0" description="暂无未结账订单" />
        </div>
      </div>

      <!-- 已结账订单 -->
      <div class="card">
        <div class="card-header filterable">
          <span>✅ 已结账订单</span>
          <div class="filter-bar">
            <input v-model="paidDateStart" type="date" class="filter-date-input" @change="loadPaidOrders" />
            <span class="filter-sep">至</span>
            <input v-model="paidDateEnd" type="date" class="filter-date-input" @change="loadPaidOrders" />
            <button class="btn btn-sm btn-outline" style="flex-shrink:0" @click="loadPaidOrders">🔄 刷新</button>
          </div>
        </div>
        <div class="card-body" style="padding:0;overflow-x:auto">
          <div class="filter-summary" style="padding:8px 16px 0">共 {{ paidOrders.length }} 单 · ¥{{ paidOrders.reduce((s,o) => s + (o.total||0), 0).toFixed(2) }}</div>
          <!-- 移动端：卡片布局 -->
          <div class="paid-cards">
            <div v-for="o in paidOrders" :key="o.id" class="order-card" @click="toggleOrderDetail(o.id)">
              <div class="order-header">
                <div class="flex-between">
                  <div>
                    <span class="order-no">{{ o.order_no }}</span>
                    <span class="badge" :class="o.order_type==='外卖'?'badge-orange':'badge-blue'">{{ o.order_type }}</span>
                  </div>
                  <span class="order-total">¥{{ o.total }}</span>
                </div>
                <div class="order-meta">
                  <span>{{ o.guest_name }}</span>
                  <span class="text-sm text-muted">{{ o.payment_method || '—' }}</span>
                  <span class="text-xs text-muted">{{ o.paid_at?.slice(5,16) || '—' }}</span>
                </div>
              </div>
              <div v-if="expandedOrder === o.id" class="order-items">
                <div v-for="item in o.items" :key="item.id" class="item-row">
                  <span>{{ item.name }} × {{ item.qty }}</span>
                  <span>¥{{ item.price * item.qty }}</span>
                </div>
              </div>
            </div>
          </div>
          <!-- 桌面端：表格 -->
          <table class="data-table desktop-only" v-if="paidOrders.length > 0">
            <thead>
              <tr>
                <th>订单号</th>
                <th>客人</th>
                <th>类型</th>
                <th>菜品</th>
                <th style="width:70px">金额</th>
                <th>支付方式</th>
                <th>时间</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="o in paidOrders" :key="o.id" class="clickable-row" @click="toggleOrderDetail(o.id)">
                <td class="text-sm">{{ o.order_no }}</td>
                <td>{{ o.guest_name }}</td>
                <td><span class="badge" :class="o.order_type==='外卖'?'badge-orange':'badge-blue'">{{ o.order_type }}</span></td>
                <td class="text-sm">{{ o.items?.map(i=>i.name+'×'+i.qty).join('、') || '—' }}</td>
                <td class="text-right">¥{{ o.total }}</td>
                <td>{{ o.payment_method || '—' }}</td>
                <td class="text-sm text-muted">{{ o.paid_at?.slice(0,16) || '—' }}</td>
              </tr>
            </tbody>
          </table>
          <van-empty v-if="paidOrders.length === 0" description="暂无已结账订单" />
        </div>
      </div>
    </div>

    <!-- 新增/编辑菜品弹窗 -->
    <div v-if="showMenuForm" class="modal-overlay" @click.self="showMenuForm = false">
      <div class="modal-content">
        <div class="modal-title">{{ menuForm.id ? '编辑菜品' : '新增菜品' }}</div>
        <div class="form-group">
          <label>菜品名称</label>
          <input v-model="menuForm.name" class="form-input" placeholder="请输入" />
        </div>
        <div class="form-group">
          <label>分类</label>
          <select v-model="menuForm.category" class="form-input form-select">
            <option v-for="c in menuCategories" :key="c" :value="c">{{ c }}</option>
          </select>
        </div>
        <div class="form-group">
          <label>价格 (¥)</label>
          <input v-model="menuForm.price" type="number" class="form-input" placeholder="0" />
        </div>
        <div class="flex-between gap-4">
          <button class="btn btn-outline btn-block" @click="showMenuForm = false">取消</button>
          <button class="btn btn-primary btn-block" @click="saveMenu">保存</button>
        </div>
      </div>
    </div>

    <!-- 快速点单弹窗 -->
    <div v-if="showNewOrder" class="modal-overlay" @click.self="showNewOrder = false">
      <div class="modal-content">
        <div class="modal-title">➕ 快速点单</div>
        <div class="form-group">
          <label>客人姓名</label>
          <input v-model="orderForm.guest_name" class="form-input" placeholder="必填" />
        </div>
        <div class="form-group">
          <label>联系电话</label>
          <input v-model="orderForm.guest_phone" class="form-input" placeholder="选填" />
        </div>
        <div class="form-group">
          <label>类型</label>
          <select v-model="orderForm.order_type" class="form-input form-select">
            <option value="堂食">堂食</option>
            <option value="外卖">外卖</option>
          </select>
        </div>
        <div class="form-group">
          <label>选择菜品</label>
          <div class="menu-select-grid">
            <div v-for="item in availableMenus" :key="item.id" class="menu-select-item"
                 :class="{selected: orderItems.some(i => i.id === item.id)}"
                 @click="toggleOrderItem(item)">
              <span class="ms-name">{{ item.name }}</span>
              <span class="ms-price">¥{{ item.price }}</span>
              <span v-if="orderItems.find(i => i.id === item.id)?.qty" class="ms-qty">
                ×{{ orderItems.find(i => i.id === item.id)?.qty }}
              </span>
            </div>
          </div>
        </div>
        <div v-if="orderItems.length > 0" class="form-group">
          <label>数量调整</label>
          <div v-for="item in orderItems" :key="item.id" class="qty-row">
            <span>{{ item.name }}</span>
            <div class="qty-control">
              <button class="qty-btn" @click="changeQty(item, -1)">−</button>
              <span class="qty-num">{{ item.qty }}</span>
              <button class="qty-btn" @click="changeQty(item, 1)">+</button>
            </div>
          </div>
          <div class="order-total-row">合计: <strong>¥{{ orderTotal }}</strong></div>
        </div>
        <div class="flex-between gap-4">
          <button class="btn btn-outline btn-block" @click="showNewOrder = false">取消</button>
          <button class="btn btn-primary btn-block" @click="submitOrder">提交点单</button>
        </div>
      </div>
    </div>

    <!-- 挂房账弹窗 -->
    <div v-if="showPayDialog" class="modal-overlay" @click.self="showPayDialog = false">
      <div class="modal-content">
        <div class="modal-title">💰 结账 (¥{{ payingOrder?.total }})</div>
        <div class="form-group">
          <label>支付方式</label>
          <select v-model="payForm.method" class="form-input form-select">
            <option value="现金">现金</option>
            <option value="微信">微信</option>
            <option value="支付宝">支付宝</option>
            <option value="挂房账">挂房账</option>
          </select>
        </div>
        <div v-if="payForm.method === '挂房账'" class="form-group">
          <label>关联入住订单</label>
          <select v-model="payForm.booking_id" class="form-input form-select">
            <option value="">-- 请选择 --</option>
            <option v-for="b in activeBookings" :key="b.id" :value="b.id">
              {{ b.room_no }} - {{ b.guest_name }}
            </option>
          </select>
        </div>
        <div class="flex-between gap-4">
          <button class="btn btn-outline btn-block" @click="showPayDialog = false">取消</button>
          <button class="btn btn-success btn-block" @click="doPay">确认结账</button>
        </div>
      </div>
    </div>

    <!-- 修改订单弹窗 -->
    <div v-if="showEditOrder" class="modal-overlay" @click.self="showEditOrder = false">
      <div class="modal-content">
        <div class="modal-title">✎ 修改订单</div>
        <div class="form-group">
          <label>调整菜品数量</label>
          <div v-for="item in editOrderItems" :key="item.id" class="qty-row">
            <span>{{ item.name }} (¥{{ item.price }})</span>
            <div class="qty-control">
              <button class="qty-btn" @click="editItemQty(item, -1)">−</button>
              <span class="qty-num">{{ item.qty }}</span>
              <button class="qty-btn" @click="editItemQty(item, 1)">+</button>
            </div>
            <span class="text-muted text-sm">¥{{ item.price * item.qty }}</span>
          </div>
          <div class="order-total-row">合计: ¥{{ editOrderTotal }}</div>
        </div>
        <div class="flex-between gap-4">
          <button class="btn btn-outline btn-block" @click="showEditOrder = false">取消</button>
          <button class="btn btn-primary btn-block" @click="saveEditOrder">保存修改</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import api from '../api/index.js'
import { showToast, showFailToast, showConfirmDialog } from 'vant'

const menus = ref([])
const orders = ref([])
const menuCat = ref('全部')
const showMenuForm = ref(false)
const showNewOrder = ref(false)
const showPayDialog = ref(false)
const showEditOrder = ref(false)
const expandedOrder = ref(null)
const menuForm = ref({})
const menuCategories = ['热菜', '凉菜', '主食', '酒水', '汤品']
const orderForm = ref({ guest_name: '', guest_phone: '', order_type: '堂食' })
const orderItems = ref([])
const payingOrder = ref(null)
const payForm = ref({ method: '现金', booking_id: '' })
const activeBookings = ref([])
const editingOrder = ref(null)
const editOrderItems = ref([])

const summaryData = ref({ totalOrders: 0, totalRevenue: 0, dineIn: 0, takeout: 0, linked: 0 })
const cateringTab = ref('menu')
const ranking = ref([])
const rankingPeriod = ref('all')
const orderDateStart = ref(new Date().toISOString().slice(0, 10))
const orderDateEnd = ref(new Date().toISOString().slice(0, 10))
const paidDateStart = ref(new Date().toISOString().slice(0, 10))
const paidDateEnd = ref(new Date().toISOString().slice(0, 10))
const paidOrders = ref([])

async function loadRanking() {
  try {
    const r = await api.getDishRanking(rankingPeriod.value)
    ranking.value = r.items || []
  } catch (e) { showFailToast(e.message) }
}

const availableMenus = computed(() => menus.value.filter(m => m.is_available))
const filteredMenus = computed(() => menuCat.value === '全部' ? menus.value : menus.value.filter(m => m.category === menuCat.value))
const summary = computed(() => summaryData.value)
const pendingOrders = computed(() => orders.value.filter(o => o.status === '就餐中'))
const orderTotal = computed(() => orderItems.value.reduce((s, i) => s + i.price * i.qty, 0))
const editOrderTotal = computed(() => editOrderItems.value.reduce((s, i) => s + i.price * i.qty, 0))

function toggleOrderDetail(id) {
  expandedOrder.value = expandedOrder.value === id ? null : id
}

function toggleOrderItem(item) {
  const existing = orderItems.value.find(i => i.id === item.id)
  if (existing) {
    existing.qty++
  } else {
    orderItems.value.push({ id: item.id, name: item.name, price: item.price, qty: 1 })
  }
}

function changeQty(item, delta) {
  item.qty += delta
  if (item.qty <= 0) {
    orderItems.value = orderItems.value.filter(i => i.id !== item.id)
  }
}

function editItemQty(item, delta) {
  item.qty += delta
  if (item.qty <= 0) {
    editOrderItems.value = editOrderItems.value.filter(i => i.id !== item.id)
  }
}

async function loadData() {
  try {
    const [m, o, b] = await Promise.all([
      api.getMenus(),
      api.getCateringOrders(null, null, orderDateStart.value, orderDateEnd.value),
      api.getBookings('已入住')
    ])
    menus.value = m
    orders.value = (o.orders || []).map(ord => ({
      ...ord,
      items: typeof ord.items === 'string' ? JSON.parse(ord.items) : (ord.items || [])
    }))
    summaryData.value = o.summary || { totalOrders: 0, totalRevenue: 0, dineIn: 0, takeout: 0, linked: 0 }
    activeBookings.value = b
    loadPaidOrders()
  } catch (e) {
    showFailToast(e.message)
  }
}

async function loadOrders() {
  try {
    const o = await api.getCateringOrders(null, null, orderDateStart.value, orderDateEnd.value)
    orders.value = (o.orders || []).map(ord => ({
      ...ord,
      items: typeof ord.items === 'string' ? JSON.parse(ord.items) : (ord.items || [])
    }))
    summaryData.value = o.summary || { totalOrders: 0, totalRevenue: 0, dineIn: 0, takeout: 0, linked: 0 }
    loadPaidOrders()
  } catch (e) {
    showFailToast(e.message)
  }
}

async function loadPaidOrders() {
  try {
    const o = await api.getCateringOrders(null, '已结账', paidDateStart.value, paidDateEnd.value)
    paidOrders.value = (o.orders || []).map(ord => ({
      ...ord,
      items: typeof ord.items === 'string' ? JSON.parse(ord.items) : (ord.items || [])
    }))
  } catch (e) { /* ignore */ }
}

async function saveMenu() {
  try {
    if (menuForm.value.id) {
      await api.updateMenu(menuForm.value.id, menuForm.value)
    } else {
      await api.addMenu(menuForm.value)
    }
    showMenuForm.value = false
    showToast('保存成功')
    const m = await api.getMenus()
    menus.value = m
  } catch (e) { showFailToast(e.message) }
}

function editMenu(item) {
  menuForm.value = { ...item }
  showMenuForm.value = true
}

async function deleteMenuItem(item) {
  if (!await showConfirmDialog({ message: `确认删除「${item.name}」？` }).catch(() => false)) return
  try {
    await api.deleteMenu(item.id)
    showToast('已删除')
    const m = await api.getMenus()
    menus.value = m
  } catch (e) { showFailToast(e.message) }
}

async function submitOrder() {
  if (!orderForm.value.guest_name || orderItems.value.length === 0) {
    showToast('请填写客人姓名并选择菜品')
    return
  }
  try {
    await api.createCateringOrder({ ...orderForm.value, items: orderItems.value })
    showNewOrder.value = false
    orderItems.value = []
    orderForm.value = { guest_name: '', guest_phone: '', order_type: '堂食' }
    showToast('点单成功！')
    loadOrders()
  } catch (e) { showFailToast(e.message) }
}

function payOrder(order) {
  payingOrder.value = order
  payForm.value = { method: '现金', booking_id: '' }
  showPayDialog.value = true
}

async function doPay() {
  if (payForm.value.method === '挂房账' && !payForm.value.booking_id) {
    showToast('请选择关联的入住订单')
    return
  }
  try {
    await api.payCateringOrder(payingOrder.value.id, { payment_method: payForm.value.method, booking_id: payForm.value.booking_id || null })
    showPayDialog.value = false
    showToast('结账成功！')
    loadOrders()
  } catch (e) { showFailToast(e.message) }
}

async function cancelOrder(order) {
  if (!await showConfirmDialog({ message: `确认取消订单 ${order.order_no}？` }).catch(() => false)) return
  try {
    await api.cancelCateringOrder(order.id)
    showToast('已取消')
    loadOrders()
  } catch (e) { showFailToast(e.message) }
}

function openEditOrder(order) {
  editingOrder.value = order
  editOrderItems.value = JSON.parse(JSON.stringify(order.items))
  showEditOrder.value = true
}

async function saveEditOrder() {
  try {
    await api.updateCateringOrder(editingOrder.value.id, { items: editOrderItems.value })
    showEditOrder.value = false
    showToast('修改成功')
    loadOrders()
  } catch (e) { showFailToast(e.message) }
}

onMounted(loadData)
</script>

<style scoped>
.stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.stat-item { text-align: center; padding: 10px 4px; background: var(--gray-50); border-radius: var(--radius-sm); }
.stat-value { font-size: 22px; font-weight: 700; color: var(--gray-900); }
.stat-label { font-size: 11px; color: var(--gray-500); margin-top: 2px; }

.menu-grid { display: flex; flex-direction: column; gap: 6px; }
.menu-item { display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; background: var(--gray-50); border-radius: var(--radius-sm); }
.menu-item.off { opacity: .5; }
.menu-info { flex: 1; cursor: pointer; }
.menu-name { font-size: 14px; font-weight: 500; }
.menu-meta { display: flex; align-items: center; gap: 8px; margin-top: 2px; }
.menu-price { font-size: 14px; font-weight: 600; color: var(--danger); }
.menu-actions { display: flex; align-items: center; gap: 6px; }

.order-card { margin-bottom: 8px; border: 1px solid var(--gray-200); border-radius: var(--radius-sm); overflow: hidden; }
.order-header { padding: 10px 12px; cursor: pointer; background: var(--gray-50); }
.order-header:active { background: var(--gray-100); }
.order-no { font-size: 12px; font-weight: 600; color: var(--gray-700); margin-right: 6px; }
.order-total { font-size: 16px; font-weight: 700; color: var(--danger); }
.order-meta { display: flex; align-items: center; gap: 8px; margin-top: 4px; font-size: 12px; color: var(--gray-500); }
.order-items { padding: 8px 12px; border-top: 1px solid var(--gray-200); }
.item-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 13px; }
.order-actions { display: flex; gap: 6px; margin-top: 8px; justify-content: flex-end; }
.order-total-row { text-align: right; font-size: 15px; margin-top: 8px; padding-top: 8px; border-top: 1px dashed var(--gray-200); }

.menu-select-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; max-height: 240px; overflow-y: auto; }
.menu-select-item { padding: 8px; text-align: center; border: 1.5px solid var(--gray-200); border-radius: var(--radius-sm); cursor: pointer; transition: all .15s; }
.menu-select-item.selected { border-color: var(--primary); background: var(--primary-light); }
.menu-select-item:active { transform: scale(.95); }
.ms-name { display: block; font-size: 12px; font-weight: 500; }
.ms-price { display: block; font-size: 12px; color: var(--danger); margin-top: 2px; }
.ms-qty { display: block; font-size: 16px; font-weight: 700; color: var(--primary); margin-top: 2px; }

.qty-row { display: flex; align-items: center; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid var(--gray-100); font-size: 13px; }
.qty-control { display: flex; align-items: center; gap: 8px; }
.qty-btn { width: 28px; height: 28px; border-radius: 50%; border: 1.5px solid var(--gray-300); background: #fff; cursor: pointer; font-size: 16px; display: flex; align-items: center; justify-content: center; }
.qty-btn:active { background: var(--gray-100); }
.qty-num { font-size: 15px; font-weight: 600; min-width: 20px; text-align: center; }
.gap-2 { gap: 4px; }

.ranking-row { display: flex; align-items: center; gap: 10px; padding: 10px 0; border-bottom: 1px solid var(--gray-100); }
.ranking-rank { width: 26px; height: 26px; display: flex; align-items: center; justify-content: center; border-radius: 50%; font-size: 12px; font-weight: 700; background: var(--gray-100); color: var(--gray-700); }
.ranking-rank.rank-1 { background: #FFD700; color: #8B6A00; }
.ranking-rank.rank-2 { background: #E8E8E8; color: #666; }
.ranking-rank.rank-3 { background: #FFDAB9; color: #8B4513; }
.ranking-info { flex: 1; display: flex; flex-direction: column; }
.ranking-name { font-size: 14px; font-weight: 500; }
.ranking-stats { text-align: right; }
.stat-qty { font-size: 16px; font-weight: 700; color: var(--primary); }
.stat-revenue { font-size: 12px; color: var(--gray-500); }

.data-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.data-table th { background: var(--gray-50); padding: 8px 4px; font-weight: 600; font-size: 12px; color: var(--gray-700); text-align: left; border-bottom: 1px solid var(--gray-200); white-space: nowrap; }
.data-table td { padding: 6px 4px; border-bottom: 1px solid var(--gray-100); vertical-align: middle; }
.clickable-row { cursor: pointer; transition: background .1s; }
.clickable-row:hover { background: var(--primary-light); }
.clickable-row:active { background: var(--gray-200); }

/* 移动端卡片 / 桌面端表格切换 */
.paid-cards { display: block; }
.desktop-only { display: none; }
@media (min-width: 768px) {
  .paid-cards { display: none; }
  .desktop-only { display: table; }
}
</style>

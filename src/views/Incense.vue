<template>
  <div class="page">
    <header class="page-header">
      <div class="flex-between">
        <h1>🪷 请香管理</h1>
        <button class="btn btn-primary btn-sm" @click="showNewSale = true">➕ 新增销售</button>
      </div>
    </header>

    <div class="page-body">
      <!-- 今日收入 -->
      <div class="card">
        <div class="card-header">📊 今日销售</div>
        <div class="card-body">
          <div class="flex-between">
            <div>
              <div class="stat-value" style="color:var(--success)">¥{{ todayRevenue }}</div>
              <div class="stat-label">今日收入</div>
            </div>
            <div>
              <div class="stat-value" style="color:var(--warning)">¥{{ todayCommission }}</div>
              <div class="stat-label">返佣合计</div>
            </div>
            <div>
              <div class="stat-value">{{ todayCount }}</div>
              <div class="stat-label">销售笔数</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 商品管理 -->
      <div class="card">
        <div class="card-header">
          <span>🏪 商品管理</span>
          <button class="btn btn-sm btn-outline" @click="showProductForm = true;productForm={}">+ 新增商品</button>
        </div>
        <div class="card-body">
          <div v-for="p in products" :key="p.id" class="product-row">
            <div class="product-info" @click="editProduct(p)">
              <span class="product-name">{{ p.name }}</span>
              <span class="text-sm text-muted">¥{{ p.price }} / {{ p.unit }}</span>
              <span class="badge" :class="p.stock <= 5 ? 'badge-red' : 'badge-gray'">库存: {{ p.stock }}{{ p.unit }}</span>
            </div>
            <div class="product-actions">
              <button class="btn btn-sm btn-outline" @click="editProduct(p)">✎</button>
              <button class="btn btn-sm btn-danger" @click="deleteProduct(p)">✕</button>
            </div>
          </div>
          <van-empty v-if="products.length === 0" description="暂无商品" />
        </div>
      </div>

      <!-- 今日销售记录 -->
      <div class="card">
        <div class="card-header">
          <span>📋 今日销售</span>
          <button class="btn btn-sm btn-outline" @click="loadSales">🔄 刷新</button>
        </div>
        <div class="card-body">
          <div v-for="s in sales" :key="s.id" class="sale-row">
            <div class="sale-info">
              <div class="sale-main">
                <span class="sale-product">{{ s.product_name }} × {{ s.quantity }}</span>
                <span v-if="s.has_commission" class="badge badge-orange">返佣{{ s.commission_rate }}%</span>
              </div>
              <div class="sale-meta">
                <span>{{ s.guest_name || '散客' }}</span>
                <span>· {{ s.payment_method }}</span>
                <span v-if="s.booking_id" class="badge badge-blue">挂房账</span>
              </div>
            </div>
            <div class="sale-amount">
              <div class="sale-total">¥{{ s.net_amount || s.amount }}</div>
              <button class="btn btn-sm btn-danger" @click="deleteSale(s)">✕</button>
            </div>
          </div>
          <van-empty v-if="sales.length === 0" description="暂无销售记录" />
        </div>
      </div>
    </div>

    <!-- 新增/编辑商品弹窗 -->
    <div v-if="showProductForm" class="modal-overlay" @click.self="showProductForm = false">
      <div class="modal-content">
        <div class="modal-title">{{ productForm.id ? '编辑商品' : '新增商品' }}</div>
        <div class="form-group">
          <label>商品名称</label>
          <input v-model="productForm.name" class="form-input" placeholder="请输入" />
        </div>
        <div class="form-group">
          <label>售价 (¥)</label>
          <input v-model="productForm.price" type="number" class="form-input" placeholder="0" />
        </div>
        <div class="form-group">
          <label>库存数量</label>
          <input v-model="productForm.stock" type="number" class="form-input" placeholder="0" />
        </div>
        <div class="form-group">
          <label>单位</label>
          <select v-model="productForm.unit" class="form-input form-select">
            <option value="份">份</option>
            <option value="套">套</option>
            <option value="个">个</option>
          </select>
        </div>
        <div class="flex-between gap-4">
          <button class="btn btn-outline btn-block" @click="showProductForm = false">取消</button>
          <button class="btn btn-primary btn-block" @click="saveProduct">保存</button>
        </div>
      </div>
    </div>

    <!-- 新增销售弹窗 -->
    <div v-if="showNewSale" class="modal-overlay" @click.self="showNewSale = false">
      <div class="modal-content">
        <div class="modal-title">➕ 新增销售</div>
        <div class="form-group">
          <label>选择商品</label>
          <select v-model="saleForm.product_id" class="form-input form-select" @change="onProductChange">
            <option value="">-- 请选择 --</option>
            <option v-for="p in availableProducts" :key="p.id" :value="p.id">
              {{ p.name }} (¥{{ p.price }} / {{ p.unit }}) 库存: {{ p.stock }}
            </option>
          </select>
        </div>
        <div class="form-group">
          <label>数量</label>
          <input v-model="saleForm.quantity" type="number" class="form-input" min="1" />
        </div>
        <div class="form-group">
          <label>金额</label>
          <input v-model="saleForm.amount" type="number" class="form-input" readonly />
        </div>
        <div class="form-group">
          <label>是否返佣</label>
          <select v-model="saleForm.has_commission" class="form-input form-select" @change="calcCommission">
            <option :value="0">不返佣</option>
            <option :value="1">返佣</option>
          </select>
        </div>
        <div v-if="saleForm.has_commission" class="form-group">
          <label>返佣比例 (%)</label>
          <select v-model="saleForm.commission_rate" class="form-input form-select" @change="calcCommission">
            <option value="5">5%</option>
            <option value="10">10%</option>
            <option value="15">15%</option>
            <option value="20">20%</option>
            <option value="30">30%</option>
            <option value="50">50%</option>
          </select>
        </div>
        <div class="form-group">
          <label>支付方式</label>
          <select v-model="saleForm.payment_method" class="form-input form-select">
            <option value="现金">现金</option>
            <option value="微信">微信</option>
            <option value="支付宝">支付宝</option>
            <option value="挂房账">挂房账</option>
          </select>
        </div>
        <div v-if="saleForm.payment_method === '挂房账'" class="form-group">
          <label>关联入住订单</label>
          <select v-model="saleForm.booking_id" class="form-input form-select">
            <option value="">-- 请选择 --</option>
            <option v-for="b in activeBookings" :key="b.id" :value="b.id">
              {{ b.room_no }} - {{ b.guest_name }}
            </option>
          </select>
        </div>
        <div class="form-group">
          <label>客人姓名</label>
          <input v-model="saleForm.guest_name" class="form-input" placeholder="选填" />
        </div>
        <div class="bill-row">
          <span>销售金额:</span><span>¥{{ saleForm.amount }}</span>
        </div>
        <div v-if="saleForm.has_commission" class="bill-row" style="color:var(--warning)">
          <span>返佣:</span><span>-¥{{ saleForm.commission_amount }}</span>
        </div>
        <div class="bill-row total">
          <span>实收:</span><span>¥{{ saleForm.net_amount }}</span>
        </div>
        <div class="flex-between gap-4 mt-8">
          <button class="btn btn-outline btn-block" @click="showNewSale = false">取消</button>
          <button class="btn btn-primary btn-block" @click="submitSale">确认登记</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import api from '../api/index.js'
import { showToast, showFailToast, showConfirmDialog } from 'vant'

const products = ref([])
const sales = ref([])
const activeBookings = ref([])
const showProductForm = ref(false)
const showNewSale = ref(false)
const productForm = ref({})
const saleForm = ref({ product_id: '', quantity: 1, amount: 0, has_commission: 0, commission_rate: 5, commission_amount: 0, net_amount: 0, payment_method: '现金', booking_id: '', guest_name: '' })

const todayRevenue = computed(() => sales.value.reduce((s, r) => s + (r.net_amount || r.amount || 0), 0))
const todayCommission = computed(() => sales.value.reduce((s, r) => s + (r.commission_amount || 0), 0))
const todayCount = computed(() => sales.value.length)
const availableProducts = computed(() => products.value.filter(p => p.is_available && p.stock > 0))

async function loadData() {
  try {
    const [p, s, b] = await Promise.all([
      api.getIncenseProducts(),
      api.getIncenseSales(),
      api.getBookings('已入住')
    ])
    products.value = p
    sales.value = s.items || []
    activeBookings.value = b
  } catch (e) { showFailToast(e.message) }
}

async function loadSales() {
  try {
    const s = await api.getIncenseSales()
    sales.value = s.items || []
  } catch (e) { showFailToast(e.message) }
}

async function saveProduct() {
  if (!productForm.value.name || !productForm.value.price) { showToast('请填写完整'); return }
  try {
    if (productForm.value.id) {
      await api.updateIncenseProduct(productForm.value.id, productForm.value)
    } else {
      await api.addIncenseProduct(productForm.value)
    }
    showProductForm.value = false
    showToast('保存成功')
    products.value = await api.getIncenseProducts()
  } catch (e) { showFailToast(e.message) }
}

function editProduct(p) {
  productForm.value = { ...p }
  showProductForm.value = true
}

async function deleteProduct(p) {
  if (!await showConfirmDialog({ message: `确认删除「${p.name}」？` }).catch(() => false)) return
  try {
    await api.deleteIncenseProduct(p.id)
    showToast('已删除')
    products.value = await api.getIncenseProducts()
  } catch (e) { showFailToast(e.message) }
}

function onProductChange() {
  const p = products.value.find(x => x.id === Number(saleForm.value.product_id))
  if (p) {
    saleForm.value.quantity = 1
    saleForm.value.amount = p.price
    calcCommission()
  }
}

function calcCommission() {
  const qty = parseInt(saleForm.value.quantity) || 1
  const unitPrice = saleForm.value.product_id ? (products.value.find(x => x.id === Number(saleForm.value.product_id))?.price || 0) : 0
  saleForm.value.amount = unitPrice * qty
  if (saleForm.value.has_commission) {
    const rate = Number(saleForm.value.commission_rate) || 0
    saleForm.value.commission_amount = Math.round(saleForm.value.amount * rate / 100 * 100) / 100
    saleForm.value.net_amount = saleForm.value.amount - saleForm.value.commission_amount
  } else {
    saleForm.value.commission_amount = 0
    saleForm.value.net_amount = saleForm.value.amount
  }
}

async function submitSale() {
  if (!saleForm.value.product_id) { showToast('请选择商品'); return }
  if (saleForm.value.payment_method === '挂房账' && !saleForm.value.booking_id) { showToast('挂房账请选择订单'); return }
  try {
    await api.addIncenseSale(saleForm.value)
    showNewSale.value = false
    saleForm.value = { product_id: '', quantity: 1, amount: 0, has_commission: 0, commission_rate: 5, commission_amount: 0, net_amount: 0, payment_method: '现金', booking_id: '', guest_name: '' }
    showToast('登记成功！')
    const [p, s] = await Promise.all([api.getIncenseProducts(), api.getIncenseSales()])
    products.value = p
    sales.value = s.items || []
  } catch (e) { showFailToast(e.message) }
}

async function deleteSale(s) {
  if (!await showConfirmDialog({ message: `确认删除该笔销售？` }).catch(() => false)) return
  try {
    await api.deleteIncenseSale(s.id)
    showToast('已删除')
    loadSales()
    products.value = await api.getIncenseProducts()
  } catch (e) { showFailToast(e.message) }
}

onMounted(loadData)
</script>

<style scoped>
.bill-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; }
.bill-row.total { font-weight: 700; font-size: 16px; border-top: 1px dashed var(--gray-300); padding-top: 8px; margin-top: 4px; }

.product-row { display: flex; align-items: center; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid var(--gray-100); }
.product-info { flex: 1; cursor: pointer; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.product-name { font-size: 14px; font-weight: 500; }
.product-actions { display: flex; gap: 4px; }

.sale-row { display: flex; align-items: center; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid var(--gray-100); }
.sale-info { flex: 1; }
.sale-main { display: flex; align-items: center; gap: 6px; }
.sale-product { font-size: 14px; font-weight: 500; }
.sale-meta { font-size: 12px; color: var(--gray-500); margin-top: 2px; display: flex; align-items: center; gap: 6px; }
.sale-amount { text-align: right; }
.sale-total { font-size: 15px; font-weight: 700; color: var(--danger); }
</style>

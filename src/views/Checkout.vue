<template>
  <div class="page">
    <header class="page-header">
      <button class="btn-back" @click="$router.back()">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>
      <h1>💰 退房结账</h1>
    </header>

    <div class="page-body">
      <!-- 订单信息 -->
      <div class="card" v-if="booking">
        <div class="card-header">订单信息</div>
        <div class="card-body">
          <div class="info-grid">
            <div>
              <div class="info-label">房间</div>
              <div class="info-value">{{ booking.room_no }} · {{ booking.room_type }}</div>
            </div>
            <div>
              <div class="info-label">客人</div>
              <div class="info-value">{{ booking.guest_name }}</div>
            </div>
            <div>
              <div class="info-label">入住</div>
              <div class="info-value">{{ booking.check_in }}</div>
            </div>
            <div>
              <div class="info-label">退房</div>
              <div class="info-value">{{ booking.check_out }}</div>
            </div>
            <div v-if="booking.channel">
              <div class="info-label">渠道</div>
              <div class="info-value"><span class="badge badge-blue">{{ booking.channel }}</span></div>
            </div>
          </div>
        </div>
      </div>

      <!-- 费用汇总 -->
      <div class="card" v-if="booking">
        <div class="card-header">💵 费用结算</div>
        <div class="card-body">
          <div class="bill-row">
            <span>🏨 房费（{{ nights }}晚）</span>
            <span>¥{{ roomTotal }}</span>
          </div>
          <div class="bill-row" v-if="cateringOrders.length > 0">
            <span>🍜 餐饮挂账</span>
            <span>¥{{ cateringTotal }}</span>
          </div>
          <div class="bill-row" v-if="incenseSales.length > 0">
            <span>🪷 请香挂账</span>
            <span>¥{{ incenseTotal }}</span>
          </div>
          <div class="bill-divider"></div>
          <div class="bill-row total">
            <span>应付合计</span>
            <span>¥{{ grandTotal }}</span>
          </div>

          <!-- 押金信息 -->
          <div v-if="depositInfo.balance > 0" class="deposit-section">
            <div class="bill-divider"></div>
            <div class="bill-row">
              <span>💰 押金</span>
              <span>¥{{ depositInfo.balance }}</span>
            </div>
            <div class="form-group mt-8">
              <label>押金处理方式</label>
              <div class="radio-group">
                <label class="radio-item">
                  <input type="radio" v-model="depositHandling" value="deduct" />
                  <span>从押金抵扣消费 ¥{{ Math.min(grandTotal, depositInfo.balance) }}</span>
                </label>
                <label class="radio-item">
                  <input type="radio" v-model="depositHandling" value="full_refund" />
                  <span>全额退还押金 ¥{{ depositInfo.balance }}</span>
                </label>
                <label class="radio-item">
                  <input type="radio" v-model="depositHandling" value="partial" />
                  <span>部分扣款</span>
                </label>
              </div>
            </div>
            <div v-if="depositHandling === 'partial'" class="form-group">
              <label>扣款金额 (¥)</label>
              <input v-model="deductAmount" type="number" class="form-input" :max="depositInfo.balance" />
              <div class="text-sm text-muted mt-4">
                退还押金: ¥{{ Math.max(0, depositInfo.balance - (Number(deductAmount) || 0)) }}
              </div>
            </div>
          </div>

          <!-- 挂账明细 -->
          <div v-if="cateringOrders.length > 0" class="mt-8">
            <div class="bill-divider"></div>
            <div class="section-title">🍜 餐饮挂账明细</div>
            <div v-for="o in cateringOrders" :key="o.id" class="sub-row">
              <span>{{ o.order_no }} · {{ o.guest_name }}</span>
              <span>¥{{ o.total }}</span>
            </div>
          </div>
          <div v-if="incenseSales.length > 0" class="mt-8">
            <div class="bill-divider"></div>
            <div class="section-title">🪷 请香挂账明细</div>
            <div v-for="s in incenseSales" :key="s.id" class="sub-row">
              <span>{{ s.product_name }} × {{ s.quantity }} · {{ s.guest_name }}</span>
              <span>¥{{ s.net_amount || s.amount }}</span>
            </div>
          </div>

          <div class="form-group mt-8">
            <label>支付方式</label>
            <div class="radio-group" style="flex-direction:row">
              <label class="radio-item"><input type="radio" v-model="paymentMethod" value="现金" /><span>现金</span></label>
              <label class="radio-item"><input type="radio" v-model="paymentMethod" value="微信" /><span>微信</span></label>
              <label class="radio-item"><input type="radio" v-model="paymentMethod" value="支付宝" /><span>支付宝</span></label>
            </div>
          </div>

          <div class="form-group mt-8">
            <label>备注</label>
            <input v-model="notes" class="form-input" placeholder="选填" />
          </div>

          <button class="btn btn-success btn-block mt-8" @click="doCheckout" :disabled="loading">
            {{ loading ? '处理中...' : `✅ 确认退房结账` }}
          </button>
        </div>
      </div>

      <!-- 加载中 -->
      <van-loading v-if="!booking" class="loading-center" />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '../api/index.js'
import { showToast, showFailToast, showConfirmDialog } from 'vant'

const route = useRoute()
const router = useRouter()
const booking = ref(null)
const notes = ref('')
const loading = ref(false)
const depositHandling = ref('full_refund')
const deductAmount = ref(0)
const paymentMethod = ref('现金')

// 挂账数据
const cateringOrders = ref([])
const incenseSales = ref([])
const depositInfo = ref({ balance: 0, totalDeposit: 0, totalRefund: 0, totalDeduct: 0 })

const nights = computed(() => {
  if (!booking.value) return 1
  const start = new Date(booking.value.check_in)
  const end = new Date(booking.value.check_out)
  return Math.max(1, Math.ceil((end - start) / 86400000))
})

const roomTotal = computed(() => {
  if (!booking.value) return 0
  const base = (booking.value.room_price || booking.value.amount || 0)
  return nights.value > 1 ? base : Math.max(base, booking.value.amount || 0)
})

const cateringTotal = computed(() => cateringOrders.value.reduce((s, o) => s + (o.total || 0), 0))
const incenseTotal = computed(() => incenseSales.value.reduce((s, i) => s + (i.net_amount || i.amount || 0), 0))
const grandTotal = computed(() => roomTotal.value + cateringTotal.value + incenseTotal.value)

onMounted(async () => {
  try {
    const b = await api.getBooking(route.params.id)
    booking.value = b

    // 获取该订单相关的挂账消费
    const catOrders = (await api.getCateringOrders()).orders || []
    cateringOrders.value = catOrders.filter(o => o.booking_id === Number(route.params.id) && o.status === '就餐中')

    const incSales = (await api.getIncenseSales()).items || []
    incenseSales.value = incSales.filter(s => s.booking_id === Number(route.params.id))

    // 押金信息
    const dep = await api.getDeposits(route.params.id)
    depositInfo.value = dep.summary || { balance: 0 }

    // 默认：有房账消费时押金抵扣
    if (cateringOrders.value.length > 0 || incenseSales.value.length > 0) {
      depositHandling.value = 'deduct'
    }
  } catch (e) {
    showFailToast(e.message)
  }
})

const doCheckout = async () => {
  if (!await showConfirmDialog({ message: `确认退房结账？\n应付: ¥${grandTotal.value}\n押金: ¥${depositInfo.value.balance}\n实付: ¥${finalAmount.value}` }).catch(() => false)) return

  loading.value = true
  try {
    const payload = {
      final_amount: grandTotal.value,
      payment_method: paymentMethod.value,
      notes: notes.value,
      deposit_handling: depositHandling.value
    }

    if (depositHandling.value === 'deduct') {
      payload.deposit_deduct_amount = Math.min(grandTotal.value, depositInfo.value.balance)
    } else if (depositHandling.value === 'partial') {
      payload.deposit_deduct_amount = Number(deductAmount.value) || 0
    }

    await api.checkoutBooking(booking.value.id, payload)
    showToast('退房结账成功！')
    router.push('/')
  } catch (e) {
    showFailToast(e.message)
  } finally {
    loading.value = false
  }
}

const finalAmount = computed(() => {
  let pay = grandTotal.value
  if (depositHandling.value === 'deduct') {
    pay = Math.max(0, grandTotal.value - Math.min(grandTotal.value, depositInfo.value.balance))
  } else if (depositHandling.value === 'partial') {
    pay = Math.max(0, grandTotal.value - (Number(deductAmount.value) || 0))
  }
  return pay
})
</script>

<style scoped>
.info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.info-label { font-size: 12px; color: var(--gray-500); }
.info-value { font-size: 15px; font-weight: 500; }
.bill-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px; }
.bill-row.total { font-weight: 700; font-size: 18px; color: var(--danger); border-top: 2px solid var(--gray-200); padding-top: 12px; }
.bill-divider { border-top: 1px dashed var(--gray-300); margin: 4px 0; }
.section-title { font-size: 13px; font-weight: 600; color: var(--gray-700); margin-bottom: 6px; }
.sub-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 13px; color: var(--gray-500); }

.deposit-section { margin-top: 8px; }
.radio-group { display: flex; flex-direction: column; gap: 8px; }
.radio-item { display: flex; align-items: center; gap: 8px; font-size: 14px; cursor: pointer; padding: 6px 8px; border-radius: 8px; transition: background .15s; }
.radio-item:active { background: var(--gray-50); }
.radio-item input[type="radio"] { accent-color: var(--primary); }

.loading-center { display: flex; justify-content: center; padding: 80px 0; }
</style>

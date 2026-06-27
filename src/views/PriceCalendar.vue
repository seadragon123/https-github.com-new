<template>
  <div class="page">
    <header class="page-header">
      <div class="flex-between">
        <h1>🗓️ 房价日历</h1>
        <div class="flex-center">
          <button class="btn btn-sm btn-outline" @click="showBatch = true">⚡ 批量调价</button>
        </div>
      </div>
    </header>

    <div class="page-body">
      <!-- 月份切换 + 房型选择 -->
      <div class="card">
        <div class="card-body">
          <div class="flex-between mb-8">
            <button class="btn btn-sm btn-outline" @click="changeMonth(-1)">◀ 上月</button>
            <div class="text-lg font-bold">{{ year }}年{{ month }}月</div>
            <button class="btn btn-sm btn-outline" @click="changeMonth(1)">下月 ▶</button>
          </div>
          <div class="form-group" style="margin-bottom:0">
            <select v-model="selectedType" class="form-input form-select" @change="loadData">
              <option v-for="t in roomTypes" :key="t" :value="t">{{ t }}</option>
            </select>
          </div>
        </div>
      </div>

      <!-- 日历网格 -->
      <div class="card">
        <div class="card-body" style="padding:8px 12px">
          <!-- 全部房型时显示价格说明 -->
          <div v-if="selectedType === '全部'" class="text-sm text-muted mb-8" style="padding:4px 0">
            💡 各房型平日价格：¥268(标准大床) · ¥298(标准双床) · ¥368(豪华大床) · ¥398(豪华双床) · ¥588(豪华套房)
            <br>周末自动加价 ¥100。请选择上方具体房型查看价格。
          </div>
          <div class="calendar-weekdays">
            <div v-for="w in weekDays" :key="w" class="cw-day">{{ w }}</div>
          </div>
          <div class="calendar-grid">
            <div v-for="(day, i) in calendarDays" :key="i"
                 class="cal-cell"
                 :class="{
                   weekend: day.isWeekend,
                   holiday: day.is_holiday,
                   today: day.date === todayStr,
                   hasPrice: day.price > 0
                 }"
                 @click="editDay(day)">
              <div class="cal-day">{{ day.day }}</div>
              <div class="cal-price" v-if="day.day && day._showPrice !== false">¥{{ day.price }}</div>
              <div class="cal-price" v-else-if="day.day && day._showPrice === false" style="color:var(--gray-300);font-size:10px">—</div>
              <div class="cal-label" v-if="day.label">{{ day.label }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 图例 -->
      <div class="card">
        <div class="card-body">
          <div class="legend-row">
            <span class="legend-item"><span class="legend-dot dot-weekend"></span> 周末加价</span>
            <span class="legend-item"><span class="legend-dot dot-holiday"></span> 节假日</span>
            <span class="legend-item"><span class="legend-dot dot-today"></span> 今天</span>
          </div>
          <div class="text-sm text-muted mt-8">点击日期可单独修改该日价格</div>
        </div>
      </div>
    </div>

    <!-- 编辑单日价格弹窗 -->
    <div v-if="showEditDay" class="modal-overlay" @click.self="showEditDay = false">
      <div class="modal-content">
        <div class="modal-title">✎ 编辑价格 - {{ editDayData.date }}</div>
        <div class="form-group">
          <label>房价 (¥/晚)</label>
          <input v-model="editDayData.price" type="number" class="form-input" />
        </div>
        <div class="form-group">
          <label>标记</label>
          <div class="radio-group" style="flex-direction:row">
            <label class="radio-item">
              <input type="radio" v-model="editDayData.is_holiday" :value="0" />
              <span>普通</span>
            </label>
            <label class="radio-item">
              <input type="radio" v-model="editDayData.is_holiday" :value="1" />
              <span>节假日</span>
            </label>
          </div>
        </div>
        <div class="form-group">
          <label>标签（选填）</label>
          <input v-model="editDayData.label" class="form-input" placeholder="如：春节、国庆" />
        </div>
        <div class="flex-between gap-4">
          <button class="btn btn-outline btn-block" @click="showEditDay = false">取消</button>
          <button class="btn btn-primary btn-block" @click="saveDayPrice">保存</button>
        </div>
      </div>
    </div>

    <!-- 批量调价弹窗 -->
    <div v-if="showBatch" class="modal-overlay" @click.self="showBatch = false">
      <div class="modal-content">
        <div class="modal-title">⚡ 批量调价</div>
        <div class="form-group">
          <label>适用月份</label>
          <div class="text-lg font-bold">{{ year }}年{{ month }}月</div>
        </div>
        <div class="form-group">
          <label>适用房型</label>
          <select v-model="batchForm.room_type" class="form-input form-select">
            <option v-for="t in roomTypes" :key="t" :value="t">{{ t }}</option>
          </select>
        </div>
        <div class="form-group">
          <label>周末加价 (¥/晚)</label>
          <input v-model="batchForm.weekend_increment" type="number" class="form-input" placeholder="0 不加价" />
          <div class="text-sm text-muted mt-4">周六、日自动上浮此金额</div>
        </div>
        <div class="form-group">
          <label>节假日加价 (¥/晚)</label>
          <input v-model="batchForm.holiday_increment" type="number" class="form-input" placeholder="0 不加价" />
        </div>
        <div class="form-group">
          <label>选择节假日日期</label>
          <div class="holiday-picker">
            <template v-for="d in calendarDays" :key="d.date">
              <div v-if="d.day"
                   class="holiday-chip"
                   :class="{selected: batchForm.holiday_dates.includes(d.day)}"
                   @click="toggleHoliday(d.day)">
                {{ d.day }}
              </div>
            </template>
          </div>
        </div>
        <div class="flex-between gap-4">
          <button class="btn btn-outline btn-block" @click="showBatch = false">取消</button>
          <button class="btn btn-primary btn-block" @click="doBatchUpdate">确认调价</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import api from '../api/index.js'
import { showToast, showFailToast } from 'vant'

const roomTypes = ['全部', '标准大床房', '标准双床房', '豪华大床房', '豪华双床房', '豪华套房']
const weekDays = ['日', '一', '二', '三', '四', '五', '六']
const now = new Date()
const year = ref(now.getFullYear())
const month = ref(now.getMonth() + 1)
const selectedType = ref('全部')
const calendarDays = ref([])
const todayStr = now.toISOString().slice(0, 10)

const showEditDay = ref(false)
const editDayData = ref({ date: '', price: 0, is_holiday: 0, label: '' })
const showBatch = ref(false)
const batchForm = ref({ room_type: '全部', weekend_increment: 100, holiday_increment: 200, holiday_dates: [] })

function changeMonth(delta) {
  month.value += delta
  if (month.value > 12) { month.value = 1; year.value++ }
  if (month.value < 1) { month.value = 12; year.value-- }
  loadData()
}

async function loadData() {
  try {
    const data = await api.getPriceCalendar(year.value, month.value, selectedType.value)
    calendarDays.value = data.days || []
  } catch (e) { showFailToast(e.message) }
}

function editDay(day) {
  if (!day.day) return
  editDayData.value = { ...day }
  showEditDay.value = true
}

async function saveDayPrice() {
  try {
    await api.updatePriceDate(editDayData.value.date, {
      room_type: selectedType.value,
      price: Number(editDayData.value.price),
      is_holiday: editDayData.value.is_holiday,
      label: editDayData.value.label
    })
    showEditDay.value = false
    showToast('保存成功')
    loadData()
  } catch (e) { showFailToast(e.message) }
}

function toggleHoliday(day) {
  const idx = batchForm.value.holiday_dates.indexOf(day)
  if (idx >= 0) batchForm.value.holiday_dates.splice(idx, 1)
  else batchForm.value.holiday_dates.push(day)
}

async function doBatchUpdate() {
  try {
    const r = await api.batchUpdatePrices({
      year: year.value, month: month.value,
      room_type: batchForm.value.room_type,
      weekend_increment: batchForm.value.weekend_increment,
      holiday_increment: batchForm.value.holiday_increment,
      holiday_dates: batchForm.value.holiday_dates
    })
    showBatch.value = false
    showToast(r.message)
    loadData()
  } catch (e) { showFailToast(e.message) }
}

onMounted(loadData)
</script>

<style scoped>
.calendar-weekdays { display: grid; grid-template-columns: repeat(7, 1fr); text-align: center; margin-bottom: 4px; }
.cw-day { font-size: 12px; color: var(--gray-500); padding: 4px 0; }
.calendar-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; }
.cal-cell { min-height: 56px; padding: 4px; border-radius: 8px; cursor: pointer; text-align: center; transition: all .15s; position: relative; }
.cal-cell:active { transform: scale(.95); }
.cal-cell.weekend { background: #FFF8F0; }
.cal-cell.holiday { background: #FEF0F0; }
.cal-cell.today { box-shadow: 0 0 0 2px var(--primary); }
.cal-cell.hasPrice { }
.cal-day { font-size: 13px; font-weight: 600; }
.cal-price { font-size: 11px; color: var(--danger); font-weight: 600; margin-top: 2px; }
.cal-label { font-size: 9px; color: var(--warning); position: absolute; top: 2px; right: 4px; }
.legend-row { display: flex; gap: 16px; font-size: 13px; color: var(--gray-700); }
.legend-dot { display: inline-block; width: 10px; height: 10px; border-radius: 50%; vertical-align: middle; margin-right: 4px; }
.dot-weekend { background: #FFF8F0; border: 1px solid var(--gray-300); }
.dot-holiday { background: #FEF0F0; border: 1px solid var(--gray-300); }
.dot-today { background: var(--primary-light); border: 2px solid var(--primary); }

.holiday-picker { display: flex; flex-wrap: wrap; gap: 6px; }
.holiday-chip { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 50%; font-size: 13px; cursor: pointer; border: 1px solid var(--gray-200); transition: all .15s; }
.holiday-chip.selected { background: var(--danger); color: #fff; border-color: var(--danger); }

.radio-group { display: flex; gap: 16px; }
.radio-item { display: flex; align-items: center; gap: 6px; font-size: 14px; cursor: pointer; }
.radio-item input[type="radio"] { accent-color: var(--primary); }
.text-lg { font-size: 16px; }
.font-bold { font-weight: 700; }
</style>

const BASE = import.meta.env.VITE_API_BASE || '/api'

// 后端图片/媒体文件的 base URL（从 API_BASE 推导或独立环境变量）
const MEDIA_BASE = import.meta.env.VITE_MEDIA_BASE || BASE.replace(/\/api$/, '') || ''

export function getMediaUrl(path) {
  if (!path) return ''
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  return `${MEDIA_BASE}${path}`
}

async function request(url, options = {}) {
  const headers = { ...options.headers }
  // Don't set Content-Type for FormData (browser sets it with boundary)
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
  }
  // 自动带上登录 token
  const token = localStorage.getItem('token')
  if (token) {
    headers['Authorization'] = 'Bearer ' + token
  }
  const res = await fetch(`${BASE}${url}`, { headers, ...options })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: '请求失败' }))
    throw new Error(err.error || `HTTP ${res.status}`)
  }
  return res.json()
}

export default {
  // Dashboard
  getOverview() { return request('/dashboard/overview') },
  getTodos(completed = 0) { return request(`/dashboard/todos?completed=${completed}`) },
  toggleTodo(id) { return request(`/dashboard/todos/${id}/toggle`, { method: 'PATCH' }) },
  addTodo(data) { return request('/dashboard/todos', { method: 'POST', body: JSON.stringify(data) }) },
  deleteTodo(id) { return request(`/dashboard/todos/${id}`, { method: 'DELETE' }) },

  // Rooms
  getRooms(status) { return request(`/rooms${status ? '?status=' + encodeURIComponent(status) : ''}`) },
  getRoom(id) { return request(`/rooms/${id}`) },
  updateRoomStatus(id, status) { return request(`/rooms/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }) },
  updateRoom(id, data) { return request(`/rooms/${id}`, { method: 'PUT', body: JSON.stringify(data) }) },
  getAvailableRooms(checkIn, checkOut) { return request(`/rooms/available/list${checkIn ? `?checkIn=${checkIn}&checkOut=${checkOut}` : ''}`) },
  addRoom(data) { return request('/rooms', { method: 'POST', body: JSON.stringify(data) }) },
  deleteRoom(id) { return request(`/rooms/${id}`, { method: 'DELETE' }) },

  // Bookings
  getBookings(status) { return request(`/bookings${status ? '?status=' + encodeURIComponent(status) : ''}`) },
  getBooking(id) { return request(`/bookings/${id}`) },
  createBooking(data) { return request('/bookings', { method: 'POST', body: JSON.stringify(data) }) },
  updateBooking(id, data) { return request(`/bookings/${id}`, { method: 'PUT', body: JSON.stringify(data) }) },
  checkoutBooking(id, data) { return request(`/bookings/${id}/checkout`, { method: 'POST', body: JSON.stringify(data) }) },
  cancelBooking(id) { return request(`/bookings/${id}/cancel`, { method: 'PATCH' }) },
  directCheckin(id, data) { return request(`/bookings/${id}/direct-checkin`, { method: 'POST', body: JSON.stringify(data) }) },
  updateBookingStatus(id, status) { return request(`/bookings/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }) },
  getBookingGuests() { return request('/bookings/guests/list') },

  // Revenue / Reports
  getRevenueSummary(date, month) { return request(`/revenue/summary?date=${date || ''}&month=${month || ''}`) },
  getDailyReport(date) { return request(`/revenue/daily?date=${date || ''}`) },
  autoGenerateRevenue(date) { return request('/revenue/auto-generate', { method: 'POST', body: JSON.stringify({ date }) }) },
  autoGenerateIncense(date) { return request('/revenue/auto-incense', { method: 'POST', body: JSON.stringify({ date }) }) },
  autoGenerateExpenses(date) { return request('/revenue/auto-expenses', { method: 'POST', body: JSON.stringify({ date }) }) },
  getRevenueDetails(date) { return request(`/revenue/details?date=${date || ''}`) },
  addRevenueDetail(data) { return request('/revenue/details', { method: 'POST', body: JSON.stringify(data) }) },
  updateRevenueDetail(id, data) { return request(`/revenue/details/${id}`, { method: 'PUT', body: JSON.stringify(data) }) },
  deleteRevenueDetail(id) { return request(`/revenue/details/${id}`, { method: 'DELETE' }) },
  clearRevenueDetails(date) { return request(`/revenue/details?date=${date}`, { method: 'DELETE' }) },
  getIncenseRevenue(date) { return request(`/revenue/incense?date=${date || ''}`) },
  addIncenseRevenue(data) { return request('/revenue/incense', { method: 'POST', body: JSON.stringify(data) }) },
  updateIncenseRevenue(id, data) { return request(`/revenue/incense/${id}`, { method: 'PUT', body: JSON.stringify(data) }) },
  deleteIncenseRevenue(id) { return request(`/revenue/incense/${id}`, { method: 'DELETE' }) },
  clearIncenseRevenue(date) { return request(`/revenue/incense?date=${date}`, { method: 'DELETE' }) },
  getExpensesOld(date, month) { return request(`/revenue/expenses?date=${date || ''}&month=${month || ''}`) },
  addExpenseOld(data) { return request('/revenue/expenses', { method: 'POST', body: JSON.stringify(data) }) },
  updateExpenseOld(id, data) { return request(`/revenue/expenses/${id}`, { method: 'PUT', body: JSON.stringify(data) }) },
  deleteExpenseOld(id) { return request(`/revenue/expenses/${id}`, { method: 'DELETE' }) },
  clearExpensesOld(date) { return request(`/revenue/expenses?date=${date}`, { method: 'DELETE' }) },

  // Catering
  getMenus() { return request('/catering/menus') },
  addMenu(data) { return request('/catering/menus', { method: 'POST', body: JSON.stringify(data) }) },
  updateMenu(id, data) { return request(`/catering/menus/${id}`, { method: 'PUT', body: JSON.stringify(data) }) },
  deleteMenu(id) { return request(`/catering/menus/${id}`, { method: 'DELETE' }) },
  getCateringOrders(date, status) { return request(`/catering/orders?date=${date || ''}&status=${status || ''}`) },
  createCateringOrder(data) { return request('/catering/orders', { method: 'POST', body: JSON.stringify(data) }) },
  updateCateringOrder(id, data) { return request(`/catering/orders/${id}`, { method: 'PUT', body: JSON.stringify(data) }) },
  payCateringOrder(id, data) { return request(`/catering/orders/${id}/pay`, { method: 'POST', body: JSON.stringify(data) }) },
  cancelCateringOrder(id) { return request(`/catering/orders/${id}`, { method: 'DELETE' }) },

  // Incense

  getIncenseSales(date, start_date, end_date) {
    const params = new URLSearchParams()
    if (start_date && end_date) {
      params.set('start_date', start_date)
      params.set('end_date', end_date)
    } else if (date) {
      params.set('date', date)
    }
    return request(`/incense/sales?${params.toString()}`)
  },
  addIncenseSale(data) { return request('/incense/sales', { method: 'POST', body: JSON.stringify(data) }) },
  deleteIncenseSale(id) { return request(`/incense/sales/${id}`, { method: 'DELETE' }) },

  // Expenses (独立路由，含图片上传)
  getExpenses(date, month, start_date, end_date) {
    const params = new URLSearchParams()
    if (start_date && end_date) {
      params.set('start_date', start_date)
      params.set('end_date', end_date)
    } else if (date) {
      params.set('date', date)
    }
    if (month) params.set('month', month)
    return request(`/expenses?${params.toString()}`)
  },
  addExpense(data) {
    if (data instanceof FormData) {
      return request('/expenses', { method: 'POST', body: data })
    }
    return request('/expenses', { method: 'POST', body: JSON.stringify(data) })
  },
  updateExpense(id, data) {
    if (data instanceof FormData) {
      return request(`/expenses/${id}`, { method: 'PUT', body: data })
    }
    return request(`/expenses/${id}`, { method: 'PUT', body: JSON.stringify(data) })
  },
  deleteExpense(id) { return request(`/expenses/${id}`, { method: 'DELETE' }) },
  getExpenseSummary(month) { return request(`/expenses/summary?month=${month || ''}`) },

  // Deposits
  getDeposits(booking_id) { return request(`/deposits${booking_id ? '?booking_id=' + booking_id : ''}`) },
  addDeposit(data) { return request('/deposits', { method: 'POST', body: JSON.stringify(data) }) },
  refundDeposit(id, data) { return request(`/deposits/${id}/refund`, { method: 'POST', body: JSON.stringify(data) }) },
  deductDeposit(id, data) { return request(`/deposits/${id}/deduct`, { method: 'POST', body: JSON.stringify(data) }) },

  // Maintenance
  getMaintenance(status) { return request(`/maintenance${status ? '?status=' + encodeURIComponent(status) : ''}`) },
  addMaintenance(data) { return request('/maintenance', { method: 'POST', body: JSON.stringify(data) }) },
  updateMaintenance(id, data) { return request(`/maintenance/${id}`, { method: 'PUT', body: JSON.stringify(data) }) },
  deleteMaintenance(id) { return request(`/maintenance/${id}`, { method: 'DELETE' }) },

  // Cleaning
  getCleaning(status) { return request(`/cleaning${status ? '?status=' + encodeURIComponent(status) : ''}`) },
  addCleaning(data) { return request('/cleaning', { method: 'POST', body: JSON.stringify(data) }) },
  updateCleaning(id, data) { return request(`/cleaning/${id}`, { method: 'PUT', body: JSON.stringify(data) }) },
  deleteCleaning(id) { return request(`/cleaning/${id}`, { method: 'DELETE' }) },

  // Guests
  getGuests(search) { return request(`/guests${search ? '?search=' + encodeURIComponent(search) : ''}`) },
  getGuest(id) { return request(`/guests/${id}`) },
  addGuest(data) { return request('/guests', { method: 'POST', body: JSON.stringify(data) }) },
  updateGuest(id, data) { return request(`/guests/${id}`, { method: 'PUT', body: JSON.stringify(data) }) },
  deleteGuest(id) { return request(`/guests/${id}`, { method: 'DELETE' }) },

  // Price Calendar
  getPriceCalendar(year, month, room_type) {
    const params = new URLSearchParams()
    if (year) params.set('year', year)
    if (month) params.set('month', month)
    if (room_type) params.set('room_type', room_type)
    return request(`/price-calendar?${params.toString()}`)
  },
  updatePriceDate(date, data) { return request(`/price-calendar/${date}`, { method: 'PUT', body: JSON.stringify(data) }) },
  batchUpdatePrices(data) { return request('/price-calendar/batch', { method: 'POST', body: JSON.stringify(data) }) },
  getPriceRates(date) { return request(`/price-calendar/rates?date=${date || ''}`) },

  // Shift Report
  getShiftReports(date, shift_type) {
    const params = new URLSearchParams()
    if (date) params.set('date', date)
    if (shift_type) params.set('shift_type', shift_type)
    return request(`/shift-report?${params.toString()}`)
  },
  getShiftReport(id) { return request(`/shift-report/${id}`) },
  createShiftReport(data) { return request('/shift-report', { method: 'POST', body: JSON.stringify(data) }) },
  deleteShiftReport(id) { return request(`/shift-report/${id}`, { method: 'DELETE' }) },
  previewShiftSnapshot() { return request('/shift-report/preview/today') },

  // Dish Ranking
  getDishRanking(period) { return request(`/catering/ranking?period=${period || 'all'}`) },

  // User Management
  getAllUsers() { return request('/auth') },
  createUser(data) { return request('/auth', { method: 'POST', body: JSON.stringify(data) }) },
  updateUser(id, data) { return request(`/auth/${id}`, { method: 'PUT', body: JSON.stringify(data) }) },
  deleteUser(id) { return request(`/auth/${id}`, { method: 'DELETE' }) },
}

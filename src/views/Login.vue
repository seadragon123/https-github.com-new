<template>
  <div class="login-page">
    <div class="login-card">
      <div class="login-logo">🏨</div>
      <h1 class="login-title">酒店管家</h1>
      <p class="login-subtitle">福源登山酒店管理系统</p>

      <div class="form-group">
        <label>用户名</label>
        <input v-model="username" class="form-input" placeholder="请输入用户名" @keyup.enter="login" />
      </div>
      <div class="form-group">
        <label>密码</label>
        <input v-model="password" type="password" class="form-input" placeholder="请输入密码" @keyup.enter="login" />
      </div>

      <div v-if="error" class="error-msg">{{ error }}</div>

      <button class="btn btn-primary btn-block" @click="login" :disabled="loading">
        {{ loading ? '登录中...' : '登 录' }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const username = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

// 如果已登录则直接跳首页
onMounted(() => {
  const token = localStorage.getItem('token')
  if (token) {
    fetch('/api/auth/me', { headers: { Authorization: 'Bearer ' + token } })
      .then(r => r.json())
      .then(user => {
        if (user.id) router.push('/')
      })
      .catch(() => localStorage.removeItem('token'))
  }
})

async function login() {
  if (!username.value || !password.value) {
    error.value = '请输入用户名和密码'
    return
  }
  loading.value = true
  error.value = ''
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: username.value, password: password.value })
    })
    const data = await res.json()
    if (!res.ok) {
      error.value = data.error || '登录失败'
      return
    }
    localStorage.setItem('token', data.token)
    localStorage.setItem('user', JSON.stringify(data.user))
    router.push('/')
  } catch (e) {
    error.value = '网络错误'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #F5EDE6 0%, #E8DCD4 100%);
  padding: 24px;
}
.login-card {
  width: 100%;
  max-width: 360px;
  background: #fff;
  border-radius: 20px;
  padding: 40px 28px;
  box-shadow: 0 8px 32px rgba(0,0,0,.08);
}
.login-logo { text-align: center; font-size: 48px; margin-bottom: 8px; }
.login-title { text-align: center; font-size: 22px; font-weight: 700; color: var(--gray-900); }
.login-subtitle { text-align: center; font-size: 13px; color: var(--gray-500); margin-bottom: 28px; }
.error-msg { color: var(--danger); font-size: 13px; text-align: center; margin-bottom: 8px; }
</style>

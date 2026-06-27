<template>
  <div class="page">
    <header class="page-header">
      <h1>👤 用户管理</h1>
    </header>

    <div class="page-body">
      <!-- 当前用户 -->
      <div class="card">
        <div class="card-body" style="text-align:center;padding:20px;">
          <div style="font-size:48px;margin-bottom:8px;">👤</div>
          <div style="font-size:18px;font-weight:700;">{{ currentUser.display_name }}</div>
          <div class="badge" :class="roleBadge(currentUser.role)" style="margin-top:6px;">{{ currentUser.role }}</div>
          <div class="text-sm text-muted mt-4">{{ currentUser.username }}</div>
        </div>
      </div>

      <!-- 修改密码 -->
      <div class="card">
        <div class="card-header">🔑 修改密码</div>
        <div class="card-body">
          <div class="form-group">
            <label>原密码</label>
            <input v-model="pwdForm.old_password" type="password" class="form-input" placeholder="输入原密码" />
          </div>
          <div class="form-group">
            <label>新密码</label>
            <input v-model="pwdForm.new_password" type="password" class="form-input" placeholder="至少6位" />
          </div>
          <button class="btn btn-primary btn-block" @click="changePassword">确认修改</button>
        </div>
      </div>

      <!-- 用户列表（管理员可见） -->
      <div class="card" v-if="currentUser.role === '管理员'">
        <div class="card-header">
          <span>👥 所有用户</span>
          <button class="btn btn-sm btn-primary" @click="openUserForm({})">+ 新增用户</button>
        </div>
        <div class="card-body" style="padding:0;overflow-x:auto">
          <table class="data-table desktop-table">
            <thead>
              <tr>
                <th>用户名</th>
                <th>姓名</th>
                <th>角色</th>
                <th>状态</th>
                <th style="width:80px">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="u in users" :key="u.id">
                <td>{{ u.username }}</td>
                <td>{{ u.display_name || '—' }}</td>
                <td><span class="badge" :class="roleBadge(u.role)">{{ u.role }}</span></td>
                <td><span class="badge" :class="u.is_active ? 'badge-green' : 'badge-gray'">{{ u.is_active ? '正常' : '禁用' }}</span></td>
                <td>
                  <button class="btn btn-sm btn-outline" @click="openUserForm(u)">✎</button>
                  <button v-if="u.role !== '管理员'" class="btn btn-sm btn-danger" @click="deleteUser(u)">✕</button>
                </td>
              </tr>
            </tbody>
          </table>
          <van-empty v-if="users.length === 0" description="暂无用户" style="padding:20px" />
        </div>
      </div>

      <!-- 退出登录 -->
      <div class="card">
        <div class="card-body">
          <button class="btn btn-danger btn-block" @click="logout">🚪 退出登录</button>
        </div>
      </div>
    </div>

    <!-- 新增/编辑用户弹窗 -->
    <div v-if="showUserForm" class="modal-overlay" @click.self="showUserForm = false">
      <div class="modal-content">
        <div class="modal-title">{{ userForm.id ? '编辑用户' : '新增用户' }}</div>
        <div class="form-group">
          <label>用户名</label>
          <input v-model="userForm.username" class="form-input" :disabled="!!userForm.id" placeholder="登录账号" />
        </div>
        <div class="form-group" v-if="!userForm.id">
          <label>密码</label>
          <input v-model="userForm.password" type="password" class="form-input" placeholder="至少6位" />
        </div>
        <div class="form-group">
          <label>姓名</label>
          <input v-model="userForm.display_name" class="form-input" placeholder="显示名称" />
        </div>
        <div class="form-group">
          <label>角色</label>
          <select v-model="userForm.role" class="form-input form-select">
            <option value="管理员">管理员</option>
            <option value="前台">前台</option>
            <option value="餐厅">餐厅</option>
            <option value="财务">财务</option>
          </select>
        </div>
        <div class="form-group" v-if="userForm.id">
          <label>状态</label>
          <div class="radio-group">
            <label class="radio-item"><input type="radio" v-model="userForm.is_active" :value="1" /> 正常</label>
            <label class="radio-item"><input type="radio" v-model="userForm.is_active" :value="0" /> 禁用</label>
          </div>
        </div>
        <div class="flex-between gap-4">
          <button class="btn btn-outline btn-block" @click="showUserForm = false">取消</button>
          <button class="btn btn-primary btn-block" @click="saveUser">{{ userForm.id ? '保存' : '创建' }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import api from '../api/index.js'
import { showToast, showFailToast, showConfirmDialog } from 'vant'

const router = useRouter()
const users = ref([])
const showUserForm = ref(false)
const userForm = ref({ username: '', password: '', display_name: '', role: '前台', is_active: 1 })
const pwdForm = ref({ old_password: '', new_password: '' })

const currentUser = reactive({ username: '', display_name: '', role: '' })

function roleBadge(role) {
  const map = { '管理员': 'badge-red', '前台': 'badge-blue', '餐厅': 'badge-orange', '财务': 'badge-green' }
  return map[role] || 'badge-gray'
}

async function loadUsers() {
  try { users.value = await api.getAllUsers() } catch {}
}

function loadCurrentUser() {
  try {
    const u = JSON.parse(localStorage.getItem('user') || '{}')
    currentUser.username = u.username || ''
    currentUser.display_name = u.display_name || ''
    currentUser.role = u.role || ''
  } catch {}
}

async function changePassword() {
  if (!pwdForm.value.old_password || !pwdForm.value.new_password) {
    showToast('请填写完整'); return
  }
  if (pwdForm.value.new_password.length < 6) {
    showToast('密码至少6位'); return
  }
  try {
    const token = localStorage.getItem('token')
    const res = await fetch('/api/auth/password', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: ('Bearer ' + token) },
      body: JSON.stringify(pwdForm.value)
    })
    const data = await res.json()
    if (!res.ok) { showFailToast(data.error); return }
    pwdForm.value = { old_password: '', new_password: '' }
    showToast('密码已修改')
  } catch (e) { showFailToast(e.message) }
}

function openUserForm(u) {
  if (u.id) {
    userForm.value = { id: u.id, username: u.username, display_name: u.display_name, role: u.role, is_active: u.is_active ?? 1 }
  } else {
    userForm.value = { username: '', password: '', display_name: '', role: '前台', is_active: 1 }
  }
  showUserForm.value = true
}

async function saveUser() {
  try {
    if (userForm.value.id) {
      await api.updateUser(userForm.value.id, userForm.value)
      showToast('已更新')
    } else {
      if (!userForm.value.username || !userForm.value.password) { showToast('请填写用户名和密码'); return }
      await api.createUser(userForm.value)
      showToast('用户已创建')
    }
    showUserForm.value = false
    loadUsers()
  } catch (e) { showFailToast(e.message) }
}

async function deleteUser(u) {
  if (!await showConfirmDialog({ message: `确认删除用户「${u.username}」？` }).catch(() => false)) return
  try {
    await api.deleteUser(u.id)
    showToast('已删除')
    loadUsers()
  } catch (e) { showFailToast(e.message) }
}

async function logout() {
  if (!await showConfirmDialog({ message: '确认退出登录？' }).catch(() => false)) return
  localStorage.removeItem('token')
  localStorage.removeItem('user')
  router.push('/login')
}

onMounted(() => {
  loadCurrentUser()
  if (currentUser.role === '管理员') loadUsers()
})
</script>

<style scoped>
.radio-group { display: flex; gap: 16px; }
.radio-item { display: flex; align-items: center; gap: 6px; font-size: 14px; cursor: pointer; }
.radio-item input[type="radio"] { accent-color: var(--primary); }
</style>

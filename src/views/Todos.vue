<template>
  <div class="page">
    <header class="page-header">
      <div class="flex-between">
        <h1>✅ 待办事项</h1>
        <button class="btn btn-sm btn-primary" @click="showAdd = true">+ 新增</button>
      </div>
    </header>

    <div class="page-body">
      <div class="card">
        <div class="card-body">
          <div class="tabs">
            <div class="tab" :class="{ active: activeTab === 'pending' }" @click="activeTab = 'pending'">待办</div>
            <div class="tab" :class="{ active: activeTab === 'done' }" @click="activeTab = 'done'">已完成</div>
            <div class="tab" :class="{ active: activeTab === 'all' }" @click="activeTab = 'all'">全部</div>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-body">
          <div v-for="todo in filteredTodos" :key="todo.id" class="todo-item">
            <div class="todo-check" :class="{ checked: todo.completed }"
                 @click="toggleTodo(todo.id)">
              {{ todo.completed ? '✓' : '' }}
            </div>
            <div class="todo-content">
              <span :class="{ 'todo-done': todo.completed }">{{ todo.title }}</span>
              <span v-if="todo.due_time" class="todo-time">{{ todo.due_time }}</span>
            </div>
            <div class="todo-actions">
              <span v-if="todo.priority >= 2" class="badge badge-red">VIP</span>
              <button class="btn btn-sm btn-outline" @click="deleteTodo(todo.id)">✕</button>
            </div>
          </div>
          <van-empty v-if="filteredTodos.length === 0" description="暂无待办" />
        </div>
      </div>
    </div>

    <!-- 新增待办 Modal -->
    <div v-if="showAdd" class="modal-overlay" @click.self="showAdd = false">
      <div class="modal-content">
        <div class="modal-title">➕ 新增待办</div>
        <div class="form-group">
          <label>待办内容</label>
          <input v-model="newTodo.title" class="form-input" placeholder="输入待办事项" />
        </div>
        <div class="form-group">
          <label>优先级</label>
          <select v-model="newTodo.priority" class="form-input form-select">
            <option value="0">普通</option>
            <option value="1">重要</option>
            <option value="2">紧急</option>
          </select>
        </div>
        <div class="form-group">
          <label>截止时间</label>
          <input v-model="newTodo.due_time" type="datetime-local" class="form-input" />
        </div>
        <div class="flex-between mt-8 gap-4">
          <button class="btn btn-outline btn-block" @click="showAdd = false">取消</button>
          <button class="btn btn-primary btn-block" @click="addTodo">确认添加</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import api from '../api/index.js'
import { showToast, showFailToast, showConfirmDialog } from 'vant'

const todos = ref([])
const activeTab = ref('pending')
const showAdd = ref(false)
const newTodo = ref({ title: '', priority: 0, due_time: '' })

const filteredTodos = computed(() => {
  if (activeTab.value === 'pending') return todos.value.filter(t => !t.completed)
  if (activeTab.value === 'done') return todos.value.filter(t => t.completed)
  return todos.value
})


// 确认弹窗
async function showConfirm(msg) {
  try {
    await showConfirmDialog({ message: msg })
    return true
  } catch {
    return false
  }
}

const loadTodos = async () => {
  todos.value = await api.getTodos('all')
}

const toggleTodo = async (id) => {
  try {
    await api.toggleTodo(id)
    loadTodos()
  } catch (e) { showFailToast(e.message) }
}

const deleteTodo = async (id) => {
  if (!await showConfirm('确定删除？')) return
  try {
    await api.deleteTodo(id)
    loadTodos()
  } catch (e) { showFailToast(e.message) }
}

const addTodo = async () => {
  if (!newTodo.value.title.trim()) { showToast('请输入内容'); return }
  try {
    await api.addTodo({
      title: newTodo.value.title,
      priority: parseInt(newTodo.value.priority),
      due_time: newTodo.value.due_time
    })
    showAdd.value = false
    newTodo.value = { title: '', priority: 0, due_time: '' }
    loadTodos()
  } catch (e) { showFailToast(e.message) }
}

onMounted(loadTodos)
</script>

<style scoped>
.todo-item { display: flex; align-items: flex-start; gap: 10px; padding: 10px 0; border-bottom: 1px solid var(--gray-100); }
.todo-item:last-child { border-bottom: none; }
.todo-check {
  width: 22px; height: 22px;
  border: 2px solid var(--gray-300);
  border-radius: 50%;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  color: transparent;
  margin-top: 2px;
}
.todo-check.checked { background: var(--success); border-color: var(--success); color: #fff; }
.todo-content { flex: 1; font-size: 14px; }
.todo-done { text-decoration: line-through; color: var(--gray-500); }
.todo-time { display: block; font-size: 12px; color: var(--gray-500); margin-top: 2px; }
.todo-actions { display: flex; align-items: center; gap: 6px; }
</style>

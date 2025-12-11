<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useTasksStore } from '@/stores/tasks'
import { format, isToday, isTomorrow, parseISO } from 'date-fns'
import Modal from '@/components/ui/Modal.vue'
import EmptyState from '@/components/ui/EmptyState.vue'

const route = useRoute()
const tasksStore = useTasksStore()

const showModal = ref(false)
const editingTask = ref(null)

const form = ref({
  title: '',
  description: '',
  priority: 'medium',
  dueDate: '',
  assignee: ''
})

onMounted(() => {
  if (route.query.action === 'add') {
    openAddModal()
  }
})

const openAddModal = () => {
  editingTask.value = null
  form.value = { title: '', description: '', priority: 'medium', dueDate: '', assignee: '' }
  showModal.value = true
}

const openEditModal = (task) => {
  editingTask.value = task
  form.value = {
    title: task.title,
    description: task.description || '',
    priority: task.priority,
    dueDate: task.dueDate?.split('T')[0] || '',
    assignee: task.assignee || ''
  }
  showModal.value = true
}

const handleSubmit = () => {
  if (editingTask.value) {
    tasksStore.updateTask(editingTask.value.id, {
      ...form.value,
      dueDate: form.value.dueDate ? new Date(form.value.dueDate).toISOString() : null
    })
  } else {
    tasksStore.addTask({
      ...form.value,
      dueDate: form.value.dueDate ? new Date(form.value.dueDate).toISOString() : null
    })
  }
  showModal.value = false
}

const handleDelete = (id) => {
  if (confirm('Are you sure you want to delete this task?')) {
    tasksStore.deleteTask(id)
  }
}

const toggleStatus = (task) => {
  const nextStatus = {
    'todo': 'in-progress',
    'in-progress': 'done',
    'done': 'todo'
  }
  tasksStore.updateTaskStatus(task.id, nextStatus[task.status])
}

const formatDueDate = (date) => {
  if (!date) return null
  const parsed = parseISO(date)
  if (isToday(parsed)) return 'Today'
  if (isTomorrow(parsed)) return 'Tomorrow'
  return format(parsed, 'MMM d')
}

const getPriorityClass = (priority) => {
  const classes = {
    'high': 'priority-high',
    'medium': 'priority-medium',
    'low': 'priority-low'
  }
  return classes[priority] || 'priority-medium'
}
</script>

<template>
  <div class="p-4 lg:p-8">
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Tasks</h1>
        <p class="text-gray-500">Manage your daily tasks</p>
      </div>
      <button @click="openAddModal" class="btn-primary flex items-center gap-2">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        Add Task
      </button>
    </div>

    <div v-if="tasksStore.tasks.length" class="grid lg:grid-cols-3 gap-6">
      <div v-for="status in tasksStore.statuses" :key="status" class="space-y-4">
        <div class="flex items-center gap-2 mb-4">
          <div :class="[
            'w-3 h-3 rounded-full',
            status === 'todo' ? 'bg-gray-400' : status === 'in-progress' ? 'bg-blue-500' : 'bg-green-500'
          ]"></div>
          <h2 class="font-semibold text-gray-900 capitalize">{{ status.replace('-', ' ') }}</h2>
          <span class="text-sm text-gray-500">({{ tasksStore.tasksByStatus[status]?.length || 0 }})</span>
        </div>

        <div
          v-for="task in tasksStore.tasksByStatus[status]"
          :key="task.id"
          :class="[
            'card cursor-pointer transition-all hover:shadow-md',
            task.status === 'done' ? 'opacity-60' : ''
          ]"
        >
          <div class="flex items-start gap-3">
            <button @click="toggleStatus(task)" :class="[
              'w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center mt-0.5',
              task.status === 'done'
                ? 'bg-green-500 border-green-500 text-white'
                : 'border-gray-300 hover:border-primary-500'
            ]">
              <svg v-if="task.status === 'done'" class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
              </svg>
            </button>
            <div class="flex-1 min-w-0">
              <h3 :class="['font-medium', task.status === 'done' ? 'line-through text-gray-500' : 'text-gray-900']">
                {{ task.title }}
              </h3>
              <p v-if="task.description" class="text-sm text-gray-500 mt-1 line-clamp-2">{{ task.description }}</p>
              <div class="flex flex-wrap items-center gap-2 mt-3">
                <span :class="['status-badge text-xs', getPriorityClass(task.priority)]">
                  {{ task.priority }}
                </span>
                <span v-if="formatDueDate(task.dueDate)" class="text-xs text-gray-500">
                  {{ formatDueDate(task.dueDate) }}
                </span>
              </div>
            </div>
          </div>
          <div class="flex gap-2 mt-4 pt-3 border-t border-gray-100">
            <button @click.stop="openEditModal(task)" class="btn-ghost text-xs py-1.5 flex-1">Edit</button>
            <button @click.stop="handleDelete(task.id)" class="btn-ghost text-xs py-1.5 text-red-600 hover:bg-red-50 flex-1">Delete</button>
          </div>
        </div>

        <div v-if="!tasksStore.tasksByStatus[status]?.length" class="text-center py-8 text-gray-400 text-sm">
          No {{ status.replace('-', ' ') }} tasks
        </div>
      </div>
    </div>

    <EmptyState
      v-else
      icon="tasks"
      title="No tasks yet"
      description="Create tasks to track your daily work and stay organized."
      action-label="Add Task"
      @action="openAddModal"
    />

    <Modal :show="showModal" :title="editingTask ? 'Edit Task' : 'Add Task'" @close="showModal = false">
      <form @submit.prevent="handleSubmit" class="space-y-4">
        <div>
          <label class="label">Title *</label>
          <input v-model="form.title" type="text" required class="input-field" placeholder="Task title" />
        </div>
        <div>
          <label class="label">Description</label>
          <textarea v-model="form.description" rows="3" class="input-field" placeholder="Task details..."></textarea>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="label">Priority</label>
            <select v-model="form.priority" class="input-field">
              <option v-for="p in tasksStore.priorities" :key="p" :value="p" class="capitalize">
                {{ p }}
              </option>
            </select>
          </div>
          <div>
            <label class="label">Due Date</label>
            <input v-model="form.dueDate" type="date" class="input-field" />
          </div>
        </div>
        <div>
          <label class="label">Assignee</label>
          <input v-model="form.assignee" type="text" class="input-field" placeholder="Who's responsible?" />
        </div>
        <div class="flex gap-3 pt-4">
          <button type="button" @click="showModal = false" class="btn-ghost flex-1">Cancel</button>
          <button type="submit" class="btn-primary flex-1">
            {{ editingTask ? 'Update' : 'Add' }} Task
          </button>
        </div>
      </form>
    </Modal>
  </div>
</template>

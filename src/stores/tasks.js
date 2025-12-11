import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useTasksStore = defineStore('tasks', () => {
  const tasks = ref(JSON.parse(localStorage.getItem('tasks')) || [])

  const priorities = ['high', 'medium', 'low']
  const statuses = ['todo', 'in-progress', 'done']

  const totalTasks = computed(() => tasks.value.length)

  const pendingTasks = computed(() => 
    tasks.value.filter(t => t.status !== 'done')
  )

  const todayTasks = computed(() => {
    const today = new Date().toISOString().split('T')[0]
    return tasks.value.filter(t => 
      t.dueDate?.startsWith(today) && t.status !== 'done'
    )
  })

  const tasksByStatus = computed(() => {
    return statuses.reduce((acc, status) => {
      acc[status] = tasks.value.filter(t => t.status === status)
      return acc
    }, {})
  })

  const highPriorityTasks = computed(() => 
    tasks.value.filter(t => t.priority === 'high' && t.status !== 'done')
  )

  function saveToStorage() {
    localStorage.setItem('tasks', JSON.stringify(tasks.value))
  }

  function addTask(task) {
    const newTask = {
      id: Date.now().toString(),
      status: 'todo',
      priority: 'medium',
      ...task,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    tasks.value.push(newTask)
    saveToStorage()
    return newTask
  }

  function updateTask(id, updates) {
    const index = tasks.value.findIndex(t => t.id === id)
    if (index !== -1) {
      tasks.value[index] = {
        ...tasks.value[index],
        ...updates,
        updatedAt: new Date().toISOString()
      }
      saveToStorage()
      return tasks.value[index]
    }
    return null
  }

  function updateTaskStatus(id, status) {
    return updateTask(id, { status })
  }

  function deleteTask(id) {
    const index = tasks.value.findIndex(t => t.id === id)
    if (index !== -1) {
      tasks.value.splice(index, 1)
      saveToStorage()
      return true
    }
    return false
  }

  function getTaskById(id) {
    return tasks.value.find(t => t.id === id)
  }

  return {
    tasks,
    priorities,
    statuses,
    totalTasks,
    pendingTasks,
    todayTasks,
    tasksByStatus,
    highPriorityTasks,
    addTask,
    updateTask,
    updateTaskStatus,
    deleteTask,
    getTaskById
  }
})

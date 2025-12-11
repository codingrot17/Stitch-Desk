<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useCustomersStore } from '@/stores/customers'
import { useOrdersStore } from '@/stores/orders'
import { useInventoryStore } from '@/stores/inventory'
import { useTasksStore } from '@/stores/tasks'
import { format, isToday, isTomorrow, parseISO } from 'date-fns'

const router = useRouter()
const authStore = useAuthStore()
const customersStore = useCustomersStore()
const ordersStore = useOrdersStore()
const inventoryStore = useInventoryStore()
const tasksStore = useTasksStore()

const stats = computed(() => [
  {
    label: 'Active Orders',
    value: ordersStore.activeOrders.length,
    icon: 'clipboard',
    color: 'primary',
    path: '/orders'
  },
  {
    label: 'Total Customers',
    value: customersStore.totalCustomers,
    icon: 'users',
    color: 'secondary',
    path: '/customers'
  },
  {
    label: 'Pending Tasks',
    value: tasksStore.pendingTasks.length,
    icon: 'check',
    color: 'accent',
    path: '/tasks'
  },
  {
    label: 'Low Stock Items',
    value: inventoryStore.lowStockCount,
    icon: 'alert',
    color: 'warning',
    path: '/inventory'
  }
])

const formatDate = (date) => {
  const parsed = parseISO(date)
  if (isToday(parsed)) return 'Today'
  if (isTomorrow(parsed)) return 'Tomorrow'
  return format(parsed, 'MMM d')
}

const getStatusClass = (status) => {
  const classes = {
    'pending': 'status-pending',
    'in-progress': 'status-in-progress',
    'completed': 'status-completed',
    'delivered': 'status-delivered'
  }
  return classes[status] || 'status-pending'
}

const quickActions = [
  { label: 'New Customer', icon: 'user-plus', path: '/customers', action: 'add' },
  { label: 'New Order', icon: 'plus', path: '/orders', action: 'add' },
  { label: 'Add Task', icon: 'check-plus', path: '/tasks', action: 'add' },
  { label: 'Add Inventory', icon: 'box-plus', path: '/inventory', action: 'add' }
]

const navigateWithAction = (path, action) => {
  router.push({ path, query: { action } })
}
</script>

<template>
  <div class="p-4 lg:p-8">
    <div class="mb-8">
      <h1 class="text-2xl lg:text-3xl font-bold text-gray-900">
        Good {{ new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening' }}, {{ authStore.user?.name?.split(' ')[0] || 'there' }}
      </h1>
      <p class="text-gray-500 mt-1">Here's what's happening with your shop today</p>
    </div>

    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <router-link
        v-for="stat in stats"
        :key="stat.label"
        :to="stat.path"
        class="card hover:shadow-md transition-shadow cursor-pointer"
      >
        <div class="flex items-start justify-between">
          <div>
            <p class="text-sm text-gray-500">{{ stat.label }}</p>
            <p class="text-2xl lg:text-3xl font-bold text-gray-900 mt-1">{{ stat.value }}</p>
          </div>
          <div :class="`w-10 h-10 rounded-lg flex items-center justify-center bg-${stat.color}-100`">
            <svg class="w-5 h-5" :class="`text-${stat.color}-600`" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <template v-if="stat.icon === 'clipboard'">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </template>
              <template v-else-if="stat.icon === 'users'">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </template>
              <template v-else-if="stat.icon === 'check'">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </template>
              <template v-else-if="stat.icon === 'alert'">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </template>
            </svg>
          </div>
        </div>
      </router-link>
    </div>

    <div class="mb-8">
      <h2 class="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <button
          v-for="action in quickActions"
          :key="action.label"
          @click="navigateWithAction(action.path, action.action)"
          class="flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors"
        >
          <div class="w-10 h-10 rounded-lg bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center">
            <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <span class="text-sm font-medium text-gray-700">{{ action.label }}</span>
        </button>
      </div>
    </div>

    <div class="grid lg:grid-cols-2 gap-6">
      <div class="card">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-semibold text-gray-900">Upcoming Deadlines</h2>
          <router-link to="/orders" class="text-sm text-primary-600 hover:text-primary-700 font-medium">
            View all
          </router-link>
        </div>
        <div v-if="ordersStore.upcomingDeadlines.length" class="space-y-3">
          <div
            v-for="order in ordersStore.upcomingDeadlines"
            :key="order.id"
            class="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
          >
            <div>
              <p class="font-medium text-gray-900">{{ order.orderNumber }}</p>
              <p class="text-sm text-gray-500">{{ order.description }}</p>
            </div>
            <div class="text-right">
              <span :class="['status-badge', getStatusClass(order.status)]">
                {{ order.status.replace('-', ' ') }}
              </span>
              <p class="text-sm text-gray-500 mt-1">{{ formatDate(order.dueDate) }}</p>
            </div>
          </div>
        </div>
        <div v-else class="text-center py-8 text-gray-500">
          No upcoming deadlines
        </div>
      </div>

      <div class="card">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-semibold text-gray-900">Recent Customers</h2>
          <router-link to="/customers" class="text-sm text-primary-600 hover:text-primary-700 font-medium">
            View all
          </router-link>
        </div>
        <div v-if="customersStore.recentCustomers.length" class="space-y-3">
          <router-link
            v-for="customer in customersStore.recentCustomers"
            :key="customer.id"
            :to="`/customers/${customer.id}`"
            class="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div class="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-secondary-400 flex items-center justify-center text-white font-medium">
              {{ customer.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() }}
            </div>
            <div class="flex-1 min-w-0">
              <p class="font-medium text-gray-900 truncate">{{ customer.name }}</p>
              <p class="text-sm text-gray-500 truncate">{{ customer.phone || customer.email }}</p>
            </div>
          </router-link>
        </div>
        <div v-else class="text-center py-8 text-gray-500">
          No customers yet
        </div>
      </div>

      <div class="card lg:col-span-2" v-if="inventoryStore.lowStockItems.length">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <span class="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></span>
            Low Stock Alert
          </h2>
          <router-link to="/inventory" class="text-sm text-primary-600 hover:text-primary-700 font-medium">
            View inventory
          </router-link>
        </div>
        <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div
            v-for="item in inventoryStore.lowStockItems.slice(0, 6)"
            :key="item.id"
            class="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-lg"
          >
            <div>
              <p class="font-medium text-gray-900">{{ item.name }}</p>
              <p class="text-sm text-gray-500 capitalize">{{ item.category }}</p>
            </div>
            <span class="text-lg font-bold text-amber-600">{{ item.quantity }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

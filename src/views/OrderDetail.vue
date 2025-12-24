<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useOrdersStore } from '@/stores/orders'
import { useCustomersStore } from '@/stores/customers'
import { format } from 'date-fns'

const route = useRoute()
const router = useRouter()
const ordersStore = useOrdersStore()
const customersStore = useCustomersStore()

const order = computed(() => ordersStore.getOrderById(route.params.id))
const customer = computed(() => order.value ? customersStore.getCustomerById(order.value.customerId) : null)

const formatDate = (date) => date ? format(new Date(date), 'MMMM d, yyyy') : '-'

const getStatusClass = (status) => {
  const classes = {
    'pending': 'status-pending',
    'in-progress': 'status-in-progress',
    'completed': 'status-completed',
    'delivered': 'status-delivered'
  }
  return classes[status] || 'status-pending'
}

const updateStatus = (status) => {
  ordersStore.updateOrderStatus(order.value.id, status)
}

if (!order.value) {
  router.push('/orders')
}
</script>

<template>
  <div v-if="order" class="p-4 lg:p-8">
    <button @click="router.push('/orders')" class="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6">
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
      </svg>
      Back to Orders
    </button>

    <div class="card mb-6">
      <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
        <div>
          <div class="flex items-center gap-3 mb-2">
            <h1 class="text-2xl font-bold text-gray-900">{{ order.orderNumber }}</h1>
            <span :class="['status-badge', getStatusClass(order.status)]">
              {{ order.status.replace('-', ' ') }}
            </span>
          </div>
          <p class="text-lg text-gray-600">{{ order.description }}</p>
        </div>
        <select :value="order.status" @change="updateStatus($event.target.value)" class="input-field w-auto">
          <option v-for="s in ordersStore.statusOptions" :key="s" :value="s">
            {{ s.replace('-', ' ') }}
          </option>
        </select>
      </div>

      <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div>
          <p class="text-sm text-gray-500 mb-1">Customer</p>
          <router-link v-if="customer" :to="`/customers/${customer.id}`" class="font-medium text-primary-600 hover:text-primary-700">
            {{ customer.name }}
          </router-link>
          <p v-else class="font-medium text-gray-900">Unknown</p>
        </div>
        <div>
          <p class="text-sm text-gray-500 mb-1">Price</p>
          <p class="font-medium text-gray-900">{{ order.price ? `₦${Number(order.price).toLocaleString()}` : '-' }}</p>
        </div>
        <div>
          <p class="text-sm text-gray-500 mb-1">Due Date</p>
          <p class="font-medium text-gray-900">{{ formatDate(order.dueDate) }}</p>
        </div>
        <div>
          <p class="text-sm text-gray-500 mb-1">Created</p>
          <p class="font-medium text-gray-900">{{ formatDate(order.$createdAt) }}</p>
        </div>
      </div>

      <div v-if="order.notes" class="mt-6 pt-6 border-t border-gray-100">
        <p class="text-sm text-gray-500 mb-2">Notes</p>
        <p class="text-gray-700">{{ order.notes }}</p>
      </div>
    </div>

    <div class="card">
      <h2 class="text-lg font-semibold text-gray-900 mb-4">Order Timeline</h2>
      <div class="space-y-4">
        <div v-for="(status, index) in ordersStore.statusOptions" :key="status" class="flex items-center gap-4">
          <div :class="[
            'w-8 h-8 rounded-full flex items-center justify-center',
            ordersStore.statusOptions.indexOf(order.status) >= index
              ? 'bg-primary-500 text-white'
              : 'bg-gray-200 text-gray-400'
          ]">
            <svg v-if="ordersStore.statusOptions.indexOf(order.status) > index" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            <span v-else class="text-xs font-medium">{{ index + 1 }}</span>
          </div>
          <span :class="[
            'font-medium capitalize',
            ordersStore.statusOptions.indexOf(order.status) >= index ? 'text-gray-900' : 'text-gray-400'
          ]">
            {{ status.replace('-', ' ') }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

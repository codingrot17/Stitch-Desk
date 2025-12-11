<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useOrdersStore } from '@/stores/orders'
import { useCustomersStore } from '@/stores/customers'
import { format } from 'date-fns'
import Modal from '@/components/ui/Modal.vue'
import EmptyState from '@/components/ui/EmptyState.vue'

const route = useRoute()
const ordersStore = useOrdersStore()
const customersStore = useCustomersStore()

const showModal = ref(false)
const editingOrder = ref(null)
const filterStatus = ref('all')

const form = ref({
  customerId: '',
  description: '',
  price: '',
  dueDate: '',
  notes: ''
})

const filteredOrders = computed(() => {
  if (filterStatus.value === 'all') return ordersStore.orders
  return ordersStore.orders.filter(o => o.status === filterStatus.value)
})

onMounted(() => {
  if (route.query.action === 'add') {
    openAddModal()
    if (route.query.customerId) {
      form.value.customerId = route.query.customerId
    }
  }
})

const openAddModal = () => {
  editingOrder.value = null
  form.value = { customerId: '', description: '', price: '', dueDate: '', notes: '' }
  showModal.value = true
}

const openEditModal = (order) => {
  editingOrder.value = order
  form.value = {
    customerId: order.customerId,
    description: order.description,
    price: order.price,
    dueDate: order.dueDate?.split('T')[0] || '',
    notes: order.notes
  }
  showModal.value = true
}

const handleSubmit = () => {
  if (editingOrder.value) {
    ordersStore.updateOrder(editingOrder.value.id, {
      ...form.value,
      dueDate: form.value.dueDate ? new Date(form.value.dueDate).toISOString() : null
    })
  } else {
    ordersStore.addOrder({
      ...form.value,
      dueDate: form.value.dueDate ? new Date(form.value.dueDate).toISOString() : null
    })
  }
  showModal.value = false
}

const updateStatus = (order, status) => {
  ordersStore.updateOrderStatus(order.id, status)
}

const handleDelete = (id) => {
  if (confirm('Are you sure you want to delete this order?')) {
    ordersStore.deleteOrder(id)
  }
}

const getCustomerName = (customerId) => {
  const customer = customersStore.getCustomerById(customerId)
  return customer?.name || 'Unknown Customer'
}

const formatDate = (date) => date ? format(new Date(date), 'MMM d, yyyy') : '-'

const getStatusClass = (status) => {
  const classes = {
    'pending': 'status-pending',
    'in-progress': 'status-in-progress',
    'completed': 'status-completed',
    'delivered': 'status-delivered'
  }
  return classes[status] || 'status-pending'
}
</script>

<template>
  <div class="p-4 lg:p-8">
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Orders</h1>
        <p class="text-gray-500">Track and manage customer orders</p>
      </div>
      <button @click="openAddModal" class="btn-primary flex items-center gap-2">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        New Order
      </button>
    </div>

    <div class="flex gap-2 mb-6 overflow-x-auto pb-2">
      <button
        v-for="status in ['all', ...ordersStore.statusOptions]"
        :key="status"
        @click="filterStatus = status"
        :class="[
          'px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
          filterStatus === status
            ? 'bg-primary-500 text-white'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        ]"
      >
        {{ status === 'all' ? 'All' : status.replace('-', ' ') }}
        <span v-if="status !== 'all'" class="ml-1 opacity-75">
          ({{ ordersStore.ordersByStatus[status]?.length || 0 }})
        </span>
      </button>
    </div>

    <div v-if="filteredOrders.length" class="space-y-4">
      <div
        v-for="order in filteredOrders"
        :key="order.id"
        class="card hover:shadow-md transition-shadow"
      >
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div class="flex-1">
            <div class="flex items-center gap-3 mb-2">
              <h3 class="font-semibold text-gray-900">{{ order.orderNumber }}</h3>
              <span :class="['status-badge', getStatusClass(order.status)]">
                {{ order.status.replace('-', ' ') }}
              </span>
            </div>
            <p class="text-gray-600">{{ order.description }}</p>
            <div class="flex flex-wrap gap-4 mt-2 text-sm text-gray-500">
              <span>{{ getCustomerName(order.customerId) }}</span>
              <span v-if="order.price">₦{{ Number(order.price).toLocaleString() }}</span>
              <span v-if="order.dueDate">Due: {{ formatDate(order.dueDate) }}</span>
            </div>
          </div>
          <div class="flex flex-wrap gap-2">
            <select
              :value="order.status"
              @change="updateStatus(order, $event.target.value)"
              class="input-field text-sm py-2 w-auto"
            >
              <option v-for="s in ordersStore.statusOptions" :key="s" :value="s">
                {{ s.replace('-', ' ') }}
              </option>
            </select>
            <button @click="openEditModal(order)" class="btn-ghost text-sm py-2">Edit</button>
            <button @click="handleDelete(order.id)" class="btn-ghost text-sm py-2 text-red-600 hover:bg-red-50">Delete</button>
          </div>
        </div>
      </div>
    </div>

    <EmptyState
      v-else
      icon="orders"
      title="No orders yet"
      description="Create your first order to start tracking your tailoring work."
      action-label="New Order"
      @action="openAddModal"
    />

    <Modal :show="showModal" :title="editingOrder ? 'Edit Order' : 'New Order'" @close="showModal = false">
      <form @submit.prevent="handleSubmit" class="space-y-4">
        <div>
          <label class="label">Customer *</label>
          <select v-model="form.customerId" required class="input-field">
            <option value="">Select customer</option>
            <option v-for="customer in customersStore.customers" :key="customer.id" :value="customer.id">
              {{ customer.name }}
            </option>
          </select>
        </div>
        <div>
          <label class="label">Description *</label>
          <input v-model="form.description" type="text" required class="input-field" placeholder="e.g., Custom suit, Wedding dress" />
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="label">Price</label>
            <input v-model="form.price" type="number" class="input-field" placeholder="0.00" />
          </div>
          <div>
            <label class="label">Due Date</label>
            <input v-model="form.dueDate" type="date" class="input-field" />
          </div>
        </div>
        <div>
          <label class="label">Notes</label>
          <textarea v-model="form.notes" rows="3" class="input-field" placeholder="Additional details..."></textarea>
        </div>
        <div class="flex gap-3 pt-4">
          <button type="button" @click="showModal = false" class="btn-ghost flex-1">Cancel</button>
          <button type="submit" class="btn-primary flex-1">
            {{ editingOrder ? 'Update' : 'Create' }} Order
          </button>
        </div>
      </form>
    </Modal>
  </div>
</template>

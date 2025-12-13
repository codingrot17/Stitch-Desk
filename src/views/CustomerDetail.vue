<script setup>
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCustomersStore } from '@/stores/customers'
import { useOrdersStore } from '@/stores/orders'
import { useMeasurementsStore } from '@/stores/measurements'
import { format, parseISO, isValid } from 'date-fns'
import Modal from '@/components/ui/Modal.vue'

const route = useRoute()
const router = useRouter()
const customersStore = useCustomersStore()
const ordersStore = useOrdersStore()
const measurementsStore = useMeasurementsStore()

const customer = computed(() => customersStore.getCustomerById(route.params.id))
const customerOrders = computed(() => ordersStore.getOrdersByCustomer(route.params.id))
const customerMeasurements = computed(() => measurementsStore.getMeasurementsByCustomer(route.params.id))

const showMeasurementModal = ref(false)
const measurementForm = ref({
  name: '',
  values: {}
})

measurementsStore.defaultFields.forEach(field => {
  measurementForm.value.values[field.key] = ''
})

const addMeasurement = () => {
  measurementsStore.addMeasurement({
    customerId: route.params.id,
    name: measurementForm.value.name || `Measurement ${customerMeasurements.value.length + 1}`,
    values: measurementForm.value.values
  })
  showMeasurementModal.value = false
  measurementForm.value = { name: '', values: {} }
  measurementsStore.defaultFields.forEach(field => {
    measurementForm.value.values[field.key] = ''
  })
}

// Fixed: Handle invalid dates safely
const formatDate = (date) => {
  if (!date) return 'N/A'
  
  try {
    // Try to parse the date
    const parsedDate = typeof date === 'string' ? parseISO(date) : new Date(date)
    
    // Check if date is valid
    if (!isValid(parsedDate)) {
      console.warn('Invalid date:', date)
      return 'Invalid date'
    }
    
    return format(parsedDate, 'MMM d, yyyy')
  } catch (error) {
    console.error('Date formatting error:', error, date)
    return 'Invalid date'
  }
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

if (!customer.value) {
  router.push('/customers')
}
</script>

<template>
  <div v-if="customer" class="p-4 lg:p-8">
    <button @click="router.push('/customers')" class="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6">
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
      </svg>
      Back to Customers
    </button>

    <div class="card mb-6">
      <div class="flex items-start gap-4">
        <div class="w-16 h-16 rounded-full bg-gradient-to-br from-primary-400 to-secondary-400 flex items-center justify-center text-white text-xl font-semibold">
          {{ customer.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() }}
        </div>
        <div class="flex-1">
          <h1 class="text-2xl font-bold text-gray-900">{{ customer.name }}</h1>
          <div class="flex flex-wrap gap-4 mt-2 text-sm text-gray-500">
            <span v-if="customer.phone" class="flex items-center gap-1">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              {{ customer.phone }}
            </span>
            <span v-if="customer.email" class="flex items-center gap-1">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              {{ customer.email }}
            </span>
          </div>
          <p v-if="customer.notes" class="text-gray-600 mt-3">{{ customer.notes }}</p>
        </div>
      </div>
    </div>

    <div class="grid lg:grid-cols-2 gap-6">
      <div class="card">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-semibold text-gray-900">Measurements</h2>
          <button @click="showMeasurementModal = true" class="btn-primary text-sm py-2">
            Add Measurement
          </button>
        </div>
        <div v-if="customerMeasurements.length" class="space-y-4">
          <div v-for="measurement in customerMeasurements" :key="measurement.id" class="p-4 bg-gray-50 rounded-lg">
            <div class="flex items-center justify-between mb-3">
              <h3 class="font-medium text-gray-900">{{ measurement.name }}</h3>
              <span class="text-xs text-gray-500">{{ formatDate(measurement.createdAt) }}</span>
            </div>
            <div class="grid grid-cols-3 gap-2 text-sm">
              <template v-for="(value, key) in measurement.values" :key="key">
                <div v-if="value" class="flex justify-between bg-white p-2 rounded">
                  <span class="text-gray-500 capitalize">{{ key.replace(/([A-Z])/g, ' $1') }}</span>
                  <span class="font-medium">{{ value }}"</span>
                </div>
              </template>
            </div>
          </div>
        </div>
        <p v-else class="text-gray-500 text-center py-8">No measurements recorded</p>
      </div>

      <div class="card">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-semibold text-gray-900">Orders</h2>
          <router-link :to="{ path: '/orders', query: { action: 'add', customerId: customer.id } }" class="btn-primary text-sm py-2">
            New Order
          </router-link>
        </div>
        <div v-if="customerOrders.length" class="space-y-3">
          <router-link
            v-for="order in customerOrders"
            :key="order.id"
            :to="`/orders/${order.id}`"
            class="block p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div class="flex items-center justify-between">
              <div>
                <p class="font-medium text-gray-900">{{ order.orderNumber }}</p>
                <p class="text-sm text-gray-500">{{ order.description }}</p>
              </div>
              <span :class="['status-badge', getStatusClass(order.status)]">
                {{ order.status.replace('-', ' ') }}
              </span>
            </div>
          </router-link>
        </div>
        <p v-else class="text-gray-500 text-center py-8">No orders yet</p>
      </div>
    </div>

    <Modal :show="showMeasurementModal" title="Add Measurement" size="lg" @close="showMeasurementModal = false">
      <form @submit.prevent="addMeasurement" class="space-y-4">
        <div>
          <label class="label">Profile Name</label>
          <input v-model="measurementForm.name" type="text" class="input-field" placeholder="e.g., Suit Measurements" />
        </div>
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div v-for="field in measurementsStore.defaultFields" :key="field.key">
            <label class="label text-xs">{{ field.label }} ({{ field.unit }})</label>
            <input
              v-model="measurementForm.values[field.key]"
              type="number"
              step="0.25"
              class="input-field text-sm"
              :placeholder="field.label"
            />
          </div>
        </div>
        <div class="flex gap-3 pt-4">
          <button type="button" @click="showMeasurementModal = false" class="btn-ghost flex-1">Cancel</button>
          <button type="submit" class="btn-primary flex-1">Save Measurement</button>
        </div>
      </form>
    </Modal>
  </div>
</template>
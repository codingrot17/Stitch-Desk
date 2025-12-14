<script setup>
import { ref, computed } from 'vue'
import { useMeasurementsStore } from '@/stores/measurements'
import { useCustomersStore } from '@/stores/customers'
import { format, parseISO, isValid } from 'date-fns'
import Modal from '@/components/ui/Modal.vue'
import EmptyState from '@/components/ui/EmptyState.vue'

const measurementsStore = useMeasurementsStore()
const customersStore = useCustomersStore()

const showModal = ref(false)
const selectedMeasurement = ref(null)

const form = ref({
  customerId: '',
  name: '',
  values: {}
})

measurementsStore.defaultFields.forEach(field => {
  form.value.values[field.key] = ''
})

const openAddModal = () => {
  selectedMeasurement.value = null
  form.value = { customerId: '', name: '', values: {} }
  measurementsStore.defaultFields.forEach(field => {
    form.value.values[field.key] = ''
  })
  showModal.value = true
}

const viewMeasurement = (measurement) => {
  selectedMeasurement.value = measurement
}

const handleSubmit = async () => {
  try {
    await measurementsStore.addMeasurement({
      customerId: form.value.customerId,
      name: form.value.name || 'Measurement Profile',
      values: form.value.values
    })
    showModal.value = false
  } catch (error) {
    console.error('Failed to add measurement:', error)
  }
}

const handleDelete = async (id) => {
  if (confirm('Are you sure you want to delete this measurement?')) {
    try {
      await measurementsStore.deleteMeasurement(id)
      selectedMeasurement.value = null
    } catch (error) {
      console.error('Failed to delete measurement:', error)
    }
  }
}

const getCustomerName = (customerId) => {
  const customer = customersStore.getCustomerById(customerId)
  return customer?.name || 'Unknown'
}

// Fixed: Safe date formatting
const formatDate = (date) => {
  if (!date) return 'N/A'
  
  try {
    const parsedDate = typeof date === 'string' ? parseISO(date) : new Date(date)
    
    if (!isValid(parsedDate)) {
      console.warn('Invalid date:', date)
      return 'N/A'
    }
    
    return format(parsedDate, 'MMM d, yyyy')
  } catch (error) {
    console.error('Date formatting error:', error, date)
    return 'N/A'
  }
}

// Fixed: Safe helper to get measurement values as object
const getMeasurementValues = (measurement) => {
  if (!measurement || !measurement.values) return {}
  
  // If values is already an object, return it
  if (typeof measurement.values === 'object' && !Array.isArray(measurement.values)) {
    return measurement.values
  }
  
  // If values is a string, try to parse it
  if (typeof measurement.values === 'string') {
    try {
      return JSON.parse(measurement.values)
    } catch (error) {
      console.error('Failed to parse measurement values:', error)
      return {}
    }
  }
  
  return {}
}

// Fixed: Safely get filled values for display
const filledValues = computed(() => {
  if (!selectedMeasurement.value) return []
  
  const values = getMeasurementValues(selectedMeasurement.value)
  
  return Object.entries(values)
    .filter(([, value]) => value)
    .map(([key, value]) => ({ key, value }))
})

// Fixed: Get field label with proper string handling
const getFieldLabel = (key) => {
  if (typeof key !== 'string') return String(key)
  return key.replace(/([A-Z])/g, ' $1').trim()
}
</script>

<template>
  <div class="p-4 lg:p-8">
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Measurements</h1>
        <p class="text-gray-500">Customer measurement profiles</p>
      </div>
      <button @click="openAddModal" class="btn-primary flex items-center gap-2">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        Add Measurement
      </button>
    </div>

    <div class="grid lg:grid-cols-3 gap-6">
      <div class="lg:col-span-2">
        <div v-if="measurementsStore.measurements.length" class="space-y-4">
          <div
            v-for="measurement in measurementsStore.measurements"
            :key="measurement.id"
            @click="viewMeasurement(measurement)"
            :class="[
              'card cursor-pointer transition-all',
              selectedMeasurement?.id === measurement.id
                ? 'ring-2 ring-primary-500 shadow-md'
                : 'hover:shadow-md'
            ]"
          >
            <div class="flex items-start justify-between">
              <div>
                <h3 class="font-semibold text-gray-900">{{ measurement.name }}</h3>
                <p class="text-sm text-gray-500">{{ getCustomerName(measurement.customerId) }}</p>
              </div>
              <span class="text-xs text-gray-400">{{ formatDate(measurement.createdAt) }}</span>
            </div>
            <div class="flex flex-wrap gap-2 mt-3">
              <template v-for="(value, key) in getMeasurementValues(measurement)" :key="key">
                <span v-if="value" class="px-2 py-1 bg-gray-100 rounded text-xs text-gray-600">
                  {{ getFieldLabel(key) }}: {{ value }}"
                </span>
              </template>
            </div>
          </div>
        </div>
        <EmptyState
          v-else
          icon="ruler"
          title="No measurements yet"
          description="Save customer measurements for quick reference and accurate tailoring."
          action-label="Add Measurement"
          @action="openAddModal"
        />
      </div>

      <div v-if="selectedMeasurement" class="card h-fit sticky top-4">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-semibold text-gray-900">{{ selectedMeasurement.name }}</h2>
          <button @click="selectedMeasurement = null" class="text-gray-400 hover:text-gray-600">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <p class="text-sm text-gray-500 mb-4">{{ getCustomerName(selectedMeasurement.customerId) }}</p>
        <div class="space-y-3">
          <div
            v-for="item in filledValues"
            :key="item.key"
            class="flex justify-between items-center py-2 border-b border-gray-100 last:border-0"
          >
            <span class="text-gray-600 capitalize">{{ getFieldLabel(item.key) }}</span>
            <span class="font-medium text-gray-900">{{ item.value }}"</span>
          </div>
        </div>
        <button @click="handleDelete(selectedMeasurement.id)" class="btn-ghost w-full mt-4 text-red-600 hover:bg-red-50">
          Delete Measurement
        </button>
      </div>
    </div>

    <Modal :show="showModal" title="Add Measurement" size="lg" @close="showModal = false">
      <form @submit.prevent="handleSubmit" class="space-y-4">
        <div class="grid grid-cols-2 gap-4">
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
            <label class="label">Profile Name</label>
            <input v-model="form.name" type="text" class="input-field" placeholder="e.g., Suit Measurements" />
          </div>
        </div>
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div v-for="field in measurementsStore.defaultFields" :key="field.key">
            <label class="label text-xs">{{ field.label }} ({{ field.unit }})</label>
            <input
              v-model="form.values[field.key]"
              type="number"
              step="0.25"
              class="input-field text-sm"
              :placeholder="field.label"
            />
          </div>
        </div>
        <div class="flex gap-3 pt-4">
          <button type="button" @click="showModal = false" class="btn-ghost flex-1">Cancel</button>
          <button type="submit" class="btn-primary flex-1">Save Measurement</button>
        </div>
      </form>
    </Modal>
  </div>
</template>
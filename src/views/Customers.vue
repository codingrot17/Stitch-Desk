<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCustomersStore } from '@/stores/customers'
import Modal from '@/components/ui/Modal.vue'
import EmptyState from '@/components/ui/EmptyState.vue'

const route = useRoute()
const router = useRouter()
const customersStore = useCustomersStore()

const showModal = ref(false)
const editingCustomer = ref(null)
const searchQuery = ref('')

const form = ref({
  name: '',
  email: '',
  phone: '',
  address: '',
  notes: ''
})

onMounted(() => {
  if (route.query.action === 'add') {
    openAddModal()
  }
})

const openAddModal = () => {
  editingCustomer.value = null
  form.value = { name: '', email: '', phone: '', address: '', notes: '' }
  showModal.value = true
}

const openEditModal = (customer) => {
  editingCustomer.value = customer
  form.value = { ...customer }
  showModal.value = true
}

const handleSubmit = () => {
  if (editingCustomer.value) {
    customersStore.updateCustomer(editingCustomer.value.id, form.value)
  } else {
    customersStore.addCustomer(form.value)
  }
  showModal.value = false
}

const handleDelete = (id) => {
  if (confirm('Are you sure you want to delete this customer?')) {
    customersStore.deleteCustomer(id)
  }
}

const handleSearch = (e) => {
  searchQuery.value = e.target.value
  customersStore.setSearchQuery(e.target.value)
}

const viewCustomer = (id) => {
  router.push(`/customers/${id}`)
}
</script>

<template>
  <div class="p-4 lg:p-8">
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Customers</h1>
        <p class="text-gray-500">Manage your customer profiles</p>
      </div>
      <button @click="openAddModal" class="btn-primary flex items-center gap-2">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        Add Customer
      </button>
    </div>

    <div class="mb-6">
      <div class="relative">
        <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="search"
          :value="searchQuery"
          @input="handleSearch"
          placeholder="Search customers..."
          class="input-field pl-10"
        />
      </div>
    </div>

    <div v-if="customersStore.filteredCustomers.length" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <div
        v-for="customer in customersStore.filteredCustomers"
        :key="customer.id"
        class="card hover:shadow-md transition-shadow cursor-pointer"
        @click="viewCustomer(customer.id)"
      >
        <div class="flex items-start gap-4">
          <div class="w-12 h-12 rounded-full bg-gradient-to-br from-primary-400 to-secondary-400 flex items-center justify-center text-white font-semibold flex-shrink-0">
            {{ customer.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() }}
          </div>
          <div class="flex-1 min-w-0">
            <h3 class="font-semibold text-gray-900 truncate">{{ customer.name }}</h3>
            <p v-if="customer.phone" class="text-sm text-gray-500">{{ customer.phone }}</p>
            <p v-if="customer.email" class="text-sm text-gray-500 truncate">{{ customer.email }}</p>
          </div>
        </div>
        <div class="flex gap-2 mt-4 pt-4 border-t border-gray-100" @click.stop>
          <button @click="openEditModal(customer)" class="btn-ghost text-sm flex-1">Edit</button>
          <button @click="handleDelete(customer.id)" class="btn-ghost text-sm text-red-600 hover:bg-red-50 flex-1">Delete</button>
        </div>
      </div>
    </div>

    <EmptyState
      v-else
      icon="users"
      title="No customers yet"
      description="Add your first customer to get started tracking measurements and orders."
      action-label="Add Customer"
      @action="openAddModal"
    />

    <Modal :show="showModal" :title="editingCustomer ? 'Edit Customer' : 'Add Customer'" @close="showModal = false">
      <form @submit.prevent="handleSubmit" class="space-y-4">
        <div>
          <label class="label">Name *</label>
          <input v-model="form.name" type="text" required class="input-field" placeholder="Customer name" />
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="label">Phone</label>
            <input v-model="form.phone" type="tel" class="input-field" placeholder="+1 234 567 890" />
          </div>
          <div>
            <label class="label">Email</label>
            <input v-model="form.email" type="email" class="input-field" placeholder="email@example.com" />
          </div>
        </div>
        <div>
          <label class="label">Address</label>
          <input v-model="form.address" type="text" class="input-field" placeholder="Street address" />
        </div>
        <div>
          <label class="label">Notes</label>
          <textarea v-model="form.notes" rows="3" class="input-field" placeholder="Any special notes..."></textarea>
        </div>
        <div class="flex gap-3 pt-4">
          <button type="button" @click="showModal = false" class="btn-ghost flex-1">Cancel</button>
          <button type="submit" class="btn-primary flex-1">
            {{ editingCustomer ? 'Update' : 'Add' }} Customer
          </button>
        </div>
      </form>
    </Modal>
  </div>
</template>

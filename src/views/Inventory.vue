<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useInventoryStore } from '@/stores/inventory'
import Modal from '@/components/ui/Modal.vue'
import EmptyState from '@/components/ui/EmptyState.vue'

const route = useRoute()
const inventoryStore = useInventoryStore()

const showModal = ref(false)
const editingItem = ref(null)
const filterCategory = ref('all')

const form = ref({
  name: '',
  category: 'fabric',
  quantity: 0,
  unit: 'yards',
  minStock: 5,
  color: '',
  notes: ''
})

onMounted(() => {
  if (route.query.action === 'add') {
    openAddModal()
  }
})

const openAddModal = () => {
  editingItem.value = null
  form.value = { name: '', category: 'fabric', quantity: 0, unit: 'yards', minStock: 5, color: '', notes: '' }
  showModal.value = true
}

const openEditModal = (item) => {
  editingItem.value = item
  form.value = { ...item }
  showModal.value = true
}

const handleSubmit = () => {
  if (editingItem.value) {
    inventoryStore.updateItem(editingItem.value.id, form.value)
  } else {
    inventoryStore.addItem(form.value)
  }
  showModal.value = false
}

const handleDelete = (id) => {
  if (confirm('Are you sure you want to delete this item?')) {
    inventoryStore.deleteItem(id)
  }
}

const adjustStock = (id, change) => {
  inventoryStore.updateStock(id, change)
}

const filteredItems = () => {
  if (filterCategory.value === 'all') return inventoryStore.items
  return inventoryStore.items.filter(item => item.category === filterCategory.value)
}

const isLowStock = (item) => item.quantity <= item.minStock
</script>

<template>
  <div class="p-4 lg:p-8">
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Inventory</h1>
        <p class="text-gray-500">Track fabrics and materials</p>
      </div>
      <button @click="openAddModal" class="btn-primary flex items-center gap-2">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        Add Item
      </button>
    </div>

    <div v-if="inventoryStore.lowStockCount > 0" class="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
      <div class="flex items-center gap-2 text-amber-800">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <span class="font-medium">{{ inventoryStore.lowStockCount }} items are running low on stock</span>
      </div>
    </div>

    <div class="flex gap-2 mb-6 overflow-x-auto pb-2">
      <button
        v-for="category in ['all', ...inventoryStore.categories]"
        :key="category"
        @click="filterCategory = category"
        :class="[
          'px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors capitalize',
          filterCategory === category
            ? 'bg-primary-500 text-white'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        ]"
      >
        {{ category }}
      </button>
    </div>

    <div v-if="filteredItems().length" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <div
        v-for="item in filteredItems()"
        :key="item.id"
        :class="[
          'card',
          isLowStock(item) ? 'border-amber-300 bg-amber-50/50' : ''
        ]"
      >
        <div class="flex items-start justify-between mb-3">
          <div>
            <h3 class="font-semibold text-gray-900">{{ item.name }}</h3>
            <p class="text-sm text-gray-500 capitalize">{{ item.category }}</p>
          </div>
          <span v-if="item.color" class="w-6 h-6 rounded-full border-2 border-white shadow" :style="{ backgroundColor: item.color }"></span>
        </div>
        
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-2">
            <button @click="adjustStock(item.id, -1)" class="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4" />
              </svg>
            </button>
            <span :class="['text-2xl font-bold', isLowStock(item) ? 'text-amber-600' : 'text-gray-900']">
              {{ item.quantity }}
            </span>
            <button @click="adjustStock(item.id, 1)" class="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
          <span class="text-sm text-gray-500">{{ item.unit }}</span>
        </div>

        <div v-if="isLowStock(item)" class="text-xs text-amber-600 mb-3">
          Low stock (min: {{ item.minStock }})
        </div>

        <div class="flex gap-2 pt-3 border-t border-gray-100">
          <button @click="openEditModal(item)" class="btn-ghost text-sm flex-1">Edit</button>
          <button @click="handleDelete(item.id)" class="btn-ghost text-sm text-red-600 hover:bg-red-50 flex-1">Delete</button>
        </div>
      </div>
    </div>

    <EmptyState
      v-else
      icon="inventory"
      title="No inventory items"
      description="Start tracking your fabrics, threads, and materials."
      action-label="Add Item"
      @action="openAddModal"
    />

    <Modal :show="showModal" :title="editingItem ? 'Edit Item' : 'Add Item'" @close="showModal = false">
      <form @submit.prevent="handleSubmit" class="space-y-4">
        <div>
          <label class="label">Name *</label>
          <input v-model="form.name" type="text" required class="input-field" placeholder="Item name" />
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="label">Category</label>
            <select v-model="form.category" class="input-field">
              <option v-for="cat in inventoryStore.categories" :key="cat" :value="cat" class="capitalize">
                {{ cat }}
              </option>
            </select>
          </div>
          <div>
            <label class="label">Color</label>
            <input v-model="form.color" type="color" class="input-field h-11" />
          </div>
        </div>
        <div class="grid grid-cols-3 gap-4">
          <div>
            <label class="label">Quantity</label>
            <input v-model.number="form.quantity" type="number" min="0" class="input-field" />
          </div>
          <div>
            <label class="label">Unit</label>
            <select v-model="form.unit" class="input-field">
              <option value="yards">Yards</option>
              <option value="meters">Meters</option>
              <option value="pieces">Pieces</option>
              <option value="rolls">Rolls</option>
              <option value="packs">Packs</option>
            </select>
          </div>
          <div>
            <label class="label">Min Stock</label>
            <input v-model.number="form.minStock" type="number" min="0" class="input-field" />
          </div>
        </div>
        <div>
          <label class="label">Notes</label>
          <textarea v-model="form.notes" rows="2" class="input-field" placeholder="Additional details..."></textarea>
        </div>
        <div class="flex gap-3 pt-4">
          <button type="button" @click="showModal = false" class="btn-ghost flex-1">Cancel</button>
          <button type="submit" class="btn-primary flex-1">
            {{ editingItem ? 'Update' : 'Add' }} Item
          </button>
        </div>
      </form>
    </Modal>
  </div>
</template>

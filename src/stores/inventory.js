import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useInventoryStore = defineStore('inventory', () => {
  const items = ref(JSON.parse(localStorage.getItem('inventory')) || [])

  const categories = ['fabric', 'thread', 'button', 'zipper', 'accessory', 'other']

  const totalItems = computed(() => items.value.length)

  const lowStockItems = computed(() => 
    items.value.filter(item => item.quantity <= item.minStock)
  )

  const lowStockCount = computed(() => lowStockItems.value.length)

  const itemsByCategory = computed(() => {
    return categories.reduce((acc, category) => {
      acc[category] = items.value.filter(item => item.category === category)
      return acc
    }, {})
  })

  function saveToStorage() {
    localStorage.setItem('inventory', JSON.stringify(items.value))
  }

  function addItem(item) {
    const newItem = {
      id: Date.now().toString(),
      ...item,
      minStock: item.minStock || 5,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    items.value.push(newItem)
    saveToStorage()
    return newItem
  }

  function updateItem(id, updates) {
    const index = items.value.findIndex(item => item.id === id)
    if (index !== -1) {
      items.value[index] = {
        ...items.value[index],
        ...updates,
        updatedAt: new Date().toISOString()
      }
      saveToStorage()
      return items.value[index]
    }
    return null
  }

  function updateStock(id, quantityChange) {
    const item = items.value.find(i => i.id === id)
    if (item) {
      item.quantity = Math.max(0, item.quantity + quantityChange)
      item.updatedAt = new Date().toISOString()
      saveToStorage()
      return item
    }
    return null
  }

  function deleteItem(id) {
    const index = items.value.findIndex(item => item.id === id)
    if (index !== -1) {
      items.value.splice(index, 1)
      saveToStorage()
      return true
    }
    return false
  }

  function getItemById(id) {
    return items.value.find(item => item.id === id)
  }

  return {
    items,
    categories,
    totalItems,
    lowStockItems,
    lowStockCount,
    itemsByCategory,
    addItem,
    updateItem,
    updateStock,
    deleteItem,
    getItemById
  }
})

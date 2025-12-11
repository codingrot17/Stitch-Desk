import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useCustomersStore = defineStore('customers', () => {
  const customers = ref(JSON.parse(localStorage.getItem('customers')) || [])
  const searchQuery = ref('')

  const filteredCustomers = computed(() => {
    if (!searchQuery.value) return customers.value
    const query = searchQuery.value.toLowerCase()
    return customers.value.filter(c => 
      c.name.toLowerCase().includes(query) ||
      c.email?.toLowerCase().includes(query) ||
      c.phone?.includes(query)
    )
  })

  const totalCustomers = computed(() => customers.value.length)

  const recentCustomers = computed(() => {
    return [...customers.value]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5)
  })

  function saveToStorage() {
    localStorage.setItem('customers', JSON.stringify(customers.value))
  }

  function addCustomer(customer) {
    const newCustomer = {
      id: Date.now().toString(),
      ...customer,
      measurements: [],
      orders: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    customers.value.push(newCustomer)
    saveToStorage()
    return newCustomer
  }

  function updateCustomer(id, updates) {
    const index = customers.value.findIndex(c => c.id === id)
    if (index !== -1) {
      customers.value[index] = {
        ...customers.value[index],
        ...updates,
        updatedAt: new Date().toISOString()
      }
      saveToStorage()
      return customers.value[index]
    }
    return null
  }

  function deleteCustomer(id) {
    const index = customers.value.findIndex(c => c.id === id)
    if (index !== -1) {
      customers.value.splice(index, 1)
      saveToStorage()
      return true
    }
    return false
  }

  function getCustomerById(id) {
    return customers.value.find(c => c.id === id)
  }

  function setSearchQuery(query) {
    searchQuery.value = query
  }

  return {
    customers,
    searchQuery,
    filteredCustomers,
    totalCustomers,
    recentCustomers,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    getCustomerById,
    setSearchQuery
  }
})

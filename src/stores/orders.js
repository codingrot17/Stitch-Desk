import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useOrdersStore = defineStore('orders', () => {
  const orders = ref(JSON.parse(localStorage.getItem('orders')) || [])

  const statusOptions = ['pending', 'in-progress', 'completed', 'delivered']

  const totalOrders = computed(() => orders.value.length)

  const activeOrders = computed(() => 
    orders.value.filter(o => o.status !== 'delivered')
  )

  const pendingOrders = computed(() => 
    orders.value.filter(o => o.status === 'pending')
  )

  const upcomingDeadlines = computed(() => {
    const now = new Date()
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    return orders.value
      .filter(o => {
        if (o.status === 'delivered') return false
        const dueDate = new Date(o.dueDate)
        return dueDate >= now && dueDate <= weekFromNow
      })
      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
      .slice(0, 5)
  })

  const ordersByStatus = computed(() => {
    return statusOptions.reduce((acc, status) => {
      acc[status] = orders.value.filter(o => o.status === status)
      return acc
    }, {})
  })

  function saveToStorage() {
    localStorage.setItem('orders', JSON.stringify(orders.value))
  }

  function addOrder(order) {
    const newOrder = {
      id: Date.now().toString(),
      orderNumber: `ORD-${String(orders.value.length + 1).padStart(4, '0')}`,
      status: 'pending',
      ...order,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    orders.value.push(newOrder)
    saveToStorage()
    return newOrder
  }

  function updateOrder(id, updates) {
    const index = orders.value.findIndex(o => o.id === id)
    if (index !== -1) {
      orders.value[index] = {
        ...orders.value[index],
        ...updates,
        updatedAt: new Date().toISOString()
      }
      saveToStorage()
      return orders.value[index]
    }
    return null
  }

  function updateOrderStatus(id, status) {
    return updateOrder(id, { status })
  }

  function deleteOrder(id) {
    const index = orders.value.findIndex(o => o.id === id)
    if (index !== -1) {
      orders.value.splice(index, 1)
      saveToStorage()
      return true
    }
    return false
  }

  function getOrderById(id) {
    return orders.value.find(o => o.id === id)
  }

  function getOrdersByCustomer(customerId) {
    return orders.value.filter(o => o.customerId === customerId)
  }

  return {
    orders,
    statusOptions,
    totalOrders,
    activeOrders,
    pendingOrders,
    upcomingDeadlines,
    ordersByStatus,
    addOrder,
    updateOrder,
    updateOrderStatus,
    deleteOrder,
    getOrderById,
    getOrdersByCustomer
  }
})

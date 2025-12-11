import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useMediaStore = defineStore('media', () => {
  const mediaItems = ref(JSON.parse(localStorage.getItem('media')) || [])

  const categories = ['customer-photo', 'fabric-sample', 'order-reference', 'design', 'other']

  const totalMedia = computed(() => mediaItems.value.length)

  const mediaByCategory = computed(() => {
    return categories.reduce((acc, category) => {
      acc[category] = mediaItems.value.filter(item => item.category === category)
      return acc
    }, {})
  })

  function saveToStorage() {
    localStorage.setItem('media', JSON.stringify(mediaItems.value))
  }

  function addMedia(media) {
    const newMedia = {
      id: Date.now().toString(),
      ...media,
      createdAt: new Date().toISOString()
    }
    mediaItems.value.push(newMedia)
    saveToStorage()
    return newMedia
  }

  function updateMedia(id, updates) {
    const index = mediaItems.value.findIndex(m => m.id === id)
    if (index !== -1) {
      mediaItems.value[index] = {
        ...mediaItems.value[index],
        ...updates
      }
      saveToStorage()
      return mediaItems.value[index]
    }
    return null
  }

  function deleteMedia(id) {
    const index = mediaItems.value.findIndex(m => m.id === id)
    if (index !== -1) {
      mediaItems.value.splice(index, 1)
      saveToStorage()
      return true
    }
    return false
  }

  function getMediaById(id) {
    return mediaItems.value.find(m => m.id === id)
  }

  function getMediaByCustomer(customerId) {
    return mediaItems.value.filter(m => m.customerId === customerId)
  }

  function getMediaByOrder(orderId) {
    return mediaItems.value.filter(m => m.orderId === orderId)
  }

  return {
    mediaItems,
    categories,
    totalMedia,
    mediaByCategory,
    addMedia,
    updateMedia,
    deleteMedia,
    getMediaById,
    getMediaByCustomer,
    getMediaByOrder
  }
})

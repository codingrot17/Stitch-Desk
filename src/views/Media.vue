  <!-- src/views/Media.vue - Fixed with proper file handling -->
<script setup>
import { ref, computed } from 'vue'
import { useMediaStore } from '@/stores/media'
import { useCustomersStore } from '@/stores/customers'
import Modal from '@/components/ui/Modal.vue'
import EmptyState from '@/components/ui/EmptyState.vue'

const mediaStore = useMediaStore()
const customersStore = useCustomersStore()

const showModal = ref(false)
const showPreview = ref(false)
const selectedMedia = ref(null)
const filterCategory = ref('all')
const selectedFile = ref(null)
const uploadPreview = ref(null)
const fileInputRef = ref(null)

const form = ref({
  name: '',
  category: 'fabric-sample',
  customerId: '',
  notes: ''
})

const filteredMedia = computed(() => {
  if (filterCategory.value === 'all') return mediaStore.mediaItems
  return mediaStore.mediaItems.filter(m => m.category === filterCategory.value)
})

const openAddModal = () => {
  // Reset everything
  form.value = { name: '', category: 'fabric-sample', customerId: '', notes: '' }
  selectedFile.value = null
  uploadPreview.value = null
  showModal.value = true
  
  // Reset file input after modal opens
  setTimeout(() => {
    if (fileInputRef.value) {
      fileInputRef.value.value = ''
    }
  }, 100)
}

const handleSubmit = async () => {
  if (!selectedFile.value) {
    alert('Please select a file to upload')
    return
  }

  try {
    console.log('🚀 Starting upload process...')
    console.log('File details:', {
      name: selectedFile.value.name,
      size: selectedFile.value.size,
      type: selectedFile.value.type
    })
    
    // Verify it's a proper File object
    if (!(selectedFile.value instanceof File)) {
      throw new Error('Selected file is not a valid File object')
    }
    
    await mediaStore.addMedia(selectedFile.value, {
      name: form.value.name || selectedFile.value.name,
      category: form.value.category,
      customerId: form.value.customerId,
      notes: form.value.notes
    })
    
    console.log('✅ Upload successful!')
    
    // Close modal and reset state
    showModal.value = false
    selectedFile.value = null
    uploadPreview.value = null
    
    // Reset file input
    if (fileInputRef.value) {
      fileInputRef.value.value = ''
    }
  } catch (error) {
    console.error('❌ Upload error:', error)
    alert('Upload failed: ' + error.message)
  }
}

const handleDelete = async (id) => {
  if (confirm('Are you sure you want to delete this item? This will also remove the file from storage.')) {
    try {
      await mediaStore.deleteMedia(id)
      showPreview.value = false
    } catch (error) {
      alert('Delete failed: ' + error.message)
    }
  }
}

const openPreview = (media) => {
  selectedMedia.value = media
  showPreview.value = true
}

const getCustomerName = (customerId) => {
  if (!customerId) return null
  const customer = customersStore.getCustomerById(customerId)
  return customer?.name
}

const getCategoryLabel = (category) => {
  const labels = {
    'customer-photo': 'Customer Photo',
    'fabric-sample': 'Fabric Sample',
    'order-reference': 'Order Reference',
    'design': 'Design',
    'other': 'Other'
  }
  return labels[category] || category
}

const handleFileSelect = (event) => {
  const file = event.target.files[0]
  if (!file) {
    console.log('No file selected')
    return
  }

  // Validate file size (5MB max)
  if (file.size > 5 * 1024 * 1024) {
    alert('File must be less than 5MB')
    event.target.value = ''
    return
  }

  // Validate file type
  if (!file.type.startsWith('image/')) {
    alert('Please upload an image file')
    event.target.value = ''
    return
  }

  console.log('📷 File selected:', file.name, file.size, 'bytes')

  // Store the actual File object
  selectedFile.value = file
  
  // Generate preview
  const reader = new FileReader()
  reader.onload = (e) => {
    uploadPreview.value = e.target.result
    if (!form.value.name) {
      form.value.name = file.name.split('.')[0]
    }
  }
  reader.onerror = (error) => {
    console.error('FileReader error:', error)
    alert('Failed to read file')
  }
  reader.readAsDataURL(file)
}

const formatFileSize = (bytes) => {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}
</script>

<template>
  <div class="p-4 lg:p-8">
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Media</h1>
        <p class="text-gray-500">Photos and reference images</p>
      </div>
      <button @click="openAddModal" class="btn-primary flex items-center gap-2">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        Upload Media
      </button>
    </div>

    <!-- Upload Progress Bar -->
    <div v-if="mediaStore.uploadProgress > 0" class="mb-6">
      <div class="bg-gray-200 rounded-full h-2 overflow-hidden">
        <div 
          class="bg-primary-500 h-full transition-all duration-300"
          :style="{ width: `${mediaStore.uploadProgress}%` }"
        ></div>
      </div>
      <p class="text-sm text-gray-600 mt-1">Uploading... {{ mediaStore.uploadProgress }}%</p>
    </div>

    <div class="flex gap-2 mb-6 overflow-x-auto pb-2">
      <button
        v-for="category in ['all', ...mediaStore.categories]"
        :key="category"
        @click="filterCategory = category"
        :class="[
          'px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
          filterCategory === category
            ? 'bg-primary-500 text-white'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        ]"
      >
        {{ category === 'all' ? 'All' : getCategoryLabel(category) }}
      </button>
    </div>

    <div v-if="filteredMedia.length" class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      <div
        v-for="media in filteredMedia"
        :key="media.id"
        @click="openPreview(media)"
        class="group cursor-pointer"
      >
        <div class="aspect-square bg-gray-100 rounded-lg overflow-hidden relative">
          <img
            v-if="media.url"
            :src="media.url"
            :alt="media.name"
            class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
            loading="lazy"
          />
          <div v-else class="w-full h-full flex items-center justify-center">
            <svg class="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <!-- Cloud icon for storage items -->
          <div v-if="mediaStore.isInStorage(media.id)" class="absolute top-2 right-2 w-6 h-6 bg-white/90 rounded-full flex items-center justify-center">
            <svg class="w-4 h-4 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
            </svg>
          </div>
          <div class="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
            <span class="text-white text-sm font-medium truncate">{{ media.name }}</span>
          </div>
        </div>
        <div class="mt-2">
          <p class="text-sm font-medium text-gray-900 truncate">{{ media.name }}</p>
          <p class="text-xs text-gray-500">{{ getCategoryLabel(media.category) }}</p>
        </div>
      </div>
    </div>

    <EmptyState
      v-else
      icon="media"
      title="No media yet"
      description="Upload photos of fabrics, customer references, and design inspirations."
      action-label="Upload Media"
      @action="openAddModal"
    />

    <!-- Upload Modal -->
    <Modal :show="showModal" title="Upload Media" @close="showModal = false">
      <form @submit.prevent="handleSubmit" class="space-y-4">
        <div>
          <label class="label">Upload Image</label>
          <input
            ref="fileInputRef"
            type="file"
            accept="image/*"
            @change="handleFileSelect"
            class="input-field file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-primary-50 file:text-primary-600 file:font-medium hover:file:bg-primary-100"
          />
          <p class="text-xs text-gray-500 mt-1">Max file size: 5MB</p>
        </div>
        
        <div v-if="uploadPreview" class="aspect-video bg-gray-100 rounded-lg overflow-hidden">
          <img :src="uploadPreview" class="w-full h-full object-contain" />
        </div>
        
        <div v-if="selectedFile" class="p-3 bg-gray-50 rounded-lg text-sm">
          <p class="text-gray-600">Selected: <span class="font-medium text-gray-900">{{ selectedFile.name }}</span></p>
          <p class="text-gray-500 text-xs mt-1">Size: {{ formatFileSize(selectedFile.size) }}</p>
        </div>
        
        <div>
          <label class="label">Name</label>
          <input v-model="form.name" type="text" class="input-field" placeholder="Image name" />
        </div>
        
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="label">Category</label>
            <select v-model="form.category" class="input-field">
              <option v-for="cat in mediaStore.categories" :key="cat" :value="cat">
                {{ getCategoryLabel(cat) }}
              </option>
            </select>
          </div>
          <div>
            <label class="label">Customer (optional)</label>
            <select v-model="form.customerId" class="input-field">
              <option value="">None</option>
              <option v-for="customer in customersStore.customers" :key="customer.id" :value="customer.id">
                {{ customer.name }}
              </option>
            </select>
          </div>
        </div>
        
        <div>
          <label class="label">Notes</label>
          <textarea v-model="form.notes" rows="2" class="input-field" placeholder="Additional notes..."></textarea>
        </div>
        
        <div class="flex gap-3 pt-4">
          <button type="button" @click="showModal = false" class="btn-ghost flex-1">Cancel</button>
          <button 
            type="submit" 
            :disabled="!selectedFile || mediaStore.loading" 
            class="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span v-if="mediaStore.loading">Uploading...</span>
            <span v-else>Upload</span>
          </button>
        </div>
      </form>
    </Modal>

    <!-- Preview Modal -->
    <Modal :show="showPreview" :title="selectedMedia?.name || 'Preview'" size="lg" @close="showPreview = false">
      <div v-if="selectedMedia" class="space-y-4">
        <div class="aspect-video bg-gray-100 rounded-lg overflow-hidden">
          <img :src="selectedMedia.url" :alt="selectedMedia.name" class="w-full h-full object-contain" />
        </div>
        
        <div class="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span class="text-gray-500">Category:</span>
            <span class="ml-2 font-medium">{{ getCategoryLabel(selectedMedia.category) }}</span>
          </div>
          <div v-if="getCustomerName(selectedMedia.customerId)">
            <span class="text-gray-500">Customer:</span>
            <span class="ml-2 font-medium">{{ getCustomerName(selectedMedia.customerId) }}</span>
          </div>
          <div>
            <span class="text-gray-500">Storage:</span>
            <span class="ml-2 font-medium">
              {{ mediaStore.isInStorage(selectedMedia.id) ? '☁️ Cloud' : '💾 Local' }}
            </span>
          </div>
        </div>
        
        <p v-if="selectedMedia.notes" class="text-gray-600">{{ selectedMedia.notes }}</p>
        
        <button @click="handleDelete(selectedMedia.id)" class="btn-ghost w-full text-red-600 hover:bg-red-50">
          Delete Media
        </button>
      </div>
    </Modal>
  </div>
</template>
<!-- src/views/Media.vue - UPDATED: Album view for batch uploads -->
<script setup>
import { ref, computed } from 'vue'
import { useMediaStore } from '@/stores/media'
import { useCustomersStore } from '@/stores/customers'
import Modal from '@/components/ui/Modal.vue'
import EmptyState from '@/components/ui/EmptyState.vue'

const mediaStore = useMediaStore()
const customersStore = useCustomersStore()

const showModal = ref(false)
const showAlbumView = ref(false)
const selectedAlbum = ref(null)
const filterCategory = ref('all')
const selectedFiles = ref([])
const uploadPreviews = ref([])
const fileInputRef = ref(null)
const uploadingCount = ref(0)
const uploadedCount = ref(0)
const totalFiles = ref(0)

const form = ref({
  albumName: '',
  category: 'fabric-sample',
  customerId: '',
  notes: ''
})

const filteredAlbums = computed(() => {
  if (filterCategory.value === 'all') return mediaStore.albums
  return mediaStore.albums.filter(a => a.category === filterCategory.value)
})

const isUploading = computed(() => uploadingCount.value > 0)

const uploadProgressText = computed(() => {
  if (totalFiles.value === 0) return ''
  return `Uploading ${uploadedCount.value} of ${totalFiles.value} files...`
})

const openAddModal = () => {
  form.value = { albumName: '', category: 'fabric-sample', customerId: '', notes: '' }
  selectedFiles.value = []
  uploadPreviews.value = []
  uploadingCount.value = 0
  uploadedCount.value = 0
  totalFiles.value = 0
  showModal.value = true
  
  setTimeout(() => {
    if (fileInputRef.value) {
      fileInputRef.value.value = ''
    }
  }, 100)
}

const handleSubmit = async () => {
  if (selectedFiles.value.length === 0) {
    alert('Please select at least one file to upload')
    return
  }

  try {
    console.log(`🚀 Starting batch upload of ${selectedFiles.value.length} files...`)
    
    totalFiles.value = selectedFiles.value.length
    uploadingCount.value = selectedFiles.value.length
    uploadedCount.value = 0
    
    // Generate album ID for batch upload
    const albumId = mediaStore.generateAlbumId()
    const albumName = form.value.albumName || `Album ${new Date().toLocaleDateString()}`
    const createdAt = new Date().toISOString()
    
    console.log(`📁 Creating album: ${albumName} (${albumId})`)
    
    // Upload all files with same albumId
    for (let i = 0; i < selectedFiles.value.length; i++) {
      const file = selectedFiles.value[i]
      
      console.log(`📤 Uploading file ${i + 1}/${selectedFiles.value.length}: ${file.name}`)
      
      try {
        await mediaStore.addMedia(file, {
          albumId: albumId,
          albumName: albumName,
          name: file.name.split('.')[0],
          category: form.value.category,
          customerId: form.value.customerId,
          notes: form.value.notes,
          createdAt: createdAt
        })
        
        uploadedCount.value++
        console.log(`✅ Uploaded ${uploadedCount.value}/${totalFiles.value}`)
      } catch (error) {
        console.error(`❌ Failed to upload ${file.name}:`, error)
        alert(`Failed to upload ${file.name}: ${error.message}`)
      }
      
      uploadingCount.value--
    }
    
    console.log(`✅ Album created! ${uploadedCount.value}/${totalFiles.value} files uploaded`)
    
    // Close modal and reset
    showModal.value = false
    selectedFiles.value = []
    uploadPreviews.value = []
    uploadingCount.value = 0
    uploadedCount.value = 0
    totalFiles.value = 0
    
    if (fileInputRef.value) {
      fileInputRef.value.value = ''
    }
  } catch (error) {
    console.error('❌ Batch upload error:', error)
    alert('Upload failed: ' + error.message)
  }
}

const openAlbumView = (album) => {
  selectedAlbum.value = album
  showAlbumView.value = true
}

const handleDeleteAlbum = async (albumId) => {
  const album = mediaStore.getAlbumById(albumId)
  const itemCount = album.items.length
  
  if (confirm(`Delete this ${itemCount > 1 ? `album with ${itemCount} images` : 'image'}? This will remove all files from storage.`)) {
    try {
      await mediaStore.deleteAlbum(albumId)
      showAlbumView.value = false
    } catch (error) {
      alert('Delete failed: ' + error.message)
    }
  }
}

const handleDeleteSingleImage = async (id) => {
  if (confirm('Delete this image? This will remove it from storage.')) {
    try {
      await mediaStore.deleteMedia(id)
      
      // If this was the last item in album, close the view
      if (selectedAlbum.value && selectedAlbum.value.items.length <= 1) {
        showAlbumView.value = false
      } else {
        // Refresh album data
        selectedAlbum.value = mediaStore.getAlbumById(selectedAlbum.value.albumId)
      }
    } catch (error) {
      alert('Delete failed: ' + error.message)
    }
  }
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
  const files = Array.from(event.target.files)
  if (files.length === 0) {
    console.log('No files selected')
    return
  }

  console.log(`📷 ${files.length} file(s) selected`)

  const validFiles = []
  const errors = []

  for (const file of files) {
    if (file.size > 5 * 1024 * 1024) {
      errors.push(`${file.name}: File too large (max 5MB)`)
      continue
    }

    if (!file.type.startsWith('image/')) {
      errors.push(`${file.name}: Not an image file`)
      continue
    }

    validFiles.push(file)
  }

  if (errors.length > 0) {
    alert('Some files were skipped:\n' + errors.join('\n'))
  }

  if (validFiles.length === 0) {
    event.target.value = ''
    return
  }

  selectedFiles.value = validFiles
  uploadPreviews.value = []

  console.log(`✅ ${validFiles.length} valid file(s) ready for upload`)

  validFiles.forEach((file) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      uploadPreviews.value.push({
        url: e.target.result,
        name: file.name,
        size: file.size
      })
    }
    reader.onerror = (error) => {
      console.error(`FileReader error for ${file.name}:`, error)
    }
    reader.readAsDataURL(file)
  })
}

const removeFile = (index) => {
  selectedFiles.value.splice(index, 1)
  uploadPreviews.value.splice(index, 1)
  
  if (selectedFiles.value.length === 0 && fileInputRef.value) {
    fileInputRef.value.value = ''
  }
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
    <div v-if="isUploading" class="mb-6">
      <div class="bg-gray-200 rounded-full h-2 overflow-hidden">
        <div 
          class="bg-primary-500 h-full transition-all duration-300"
          :style="{ width: `${(uploadedCount / totalFiles) * 100}%` }"
        ></div>
      </div>
      <p class="text-sm text-gray-600 mt-1">{{ uploadProgressText }}</p>
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

    <!-- Album Grid -->
    <div v-if="filteredAlbums.length" class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      <div
        v-for="album in filteredAlbums"
        :key="album.albumId"
        @click="openAlbumView(album)"
        class="group cursor-pointer"
      >
        <div class="aspect-square bg-gray-100 rounded-lg overflow-hidden relative">
          <!-- Main Image (first item) -->
          <img
            v-if="album.items[0]?.url"
            :src="album.items[0].url"
            :alt="album.name"
            class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
            loading="lazy"
          />
          
          <!-- Multiple Images Indicator -->
          <div v-if="album.items.length > 1" class="absolute top-2 right-2 flex items-center gap-1">
            <div class="bg-black/70 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1">
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {{ album.items.length }}
            </div>
          </div>
          
          <!-- Cloud Storage Badge -->
          <div v-if="mediaStore.isInStorage(album.items[0].id)" class="absolute top-2 left-2 w-6 h-6 bg-white/90 rounded-full flex items-center justify-center">
            <svg class="w-4 h-4 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
            </svg>
          </div>
          
          <!-- Album Name Overlay -->
          <div class="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
            <span class="text-white text-sm font-medium truncate">{{ album.name }}</span>
          </div>
        </div>
        
        <div class="mt-2">
          <p class="text-sm font-medium text-gray-900 truncate">{{ album.name }}</p>
          <p class="text-xs text-gray-500">
            {{ getCategoryLabel(album.category) }}
            <span v-if="album.items.length > 1"> • {{ album.items.length }} images</span>
          </p>
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
          <label class="label">Album Name (optional)</label>
          <input
            v-model="form.albumName"
            type="text"
            class="input-field"
            placeholder="e.g., Wedding Dress Fabrics"
          />
          <p class="text-xs text-gray-500 mt-1">Leave blank to auto-generate name</p>
        </div>
        
        <div>
          <label class="label">Select Images (multiple allowed)</label>
          <input
            ref="fileInputRef"
            type="file"
            accept="image/*"
            multiple
            @change="handleFileSelect"
            class="input-field file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-primary-50 file:text-primary-600 file:font-medium hover:file:bg-primary-100"
          />
          <p class="text-xs text-gray-500 mt-1">Max file size: 5MB per file</p>
        </div>
        
        <!-- Preview Grid -->
        <div v-if="uploadPreviews.length > 0" class="space-y-3">
          <p class="text-sm font-medium text-gray-700">
            {{ selectedFiles.length }} file(s) selected
          </p>
          
          <div class="grid grid-cols-2 gap-3 max-h-64 overflow-y-auto">
            <div 
              v-for="(preview, index) in uploadPreviews" 
              :key="index"
              class="relative group"
            >
              <div class="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                <img :src="preview.url" class="w-full h-full object-cover" />
              </div>
              
              <!-- Remove button -->
              <button
                type="button"
                @click="removeFile(index)"
                class="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-600 transition-colors shadow-lg"
                title="Remove"
              >
                <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              
              <!-- File info -->
              <div class="absolute bottom-0 left-0 right-0 bg-black/70 text-white p-2 text-xs">
                <p class="truncate font-medium">{{ preview.name }}</p>
                <p class="text-gray-300">{{ formatFileSize(preview.size) }}</p>
              </div>
            </div>
          </div>
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
          <label class="label">Notes (applies to all files)</label>
          <textarea v-model="form.notes" rows="2" class="input-field" placeholder="Additional notes..."></textarea>
        </div>
        
        <div class="flex gap-3 pt-4">
          <button type="button" @click="showModal = false" class="btn-ghost flex-1" :disabled="isUploading">
            Cancel
          </button>
          <button 
            type="submit" 
            :disabled="selectedFiles.length === 0 || isUploading" 
            class="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span v-if="isUploading">Uploading {{ uploadedCount }}/{{ totalFiles }}...</span>
            <span v-else>Upload {{ selectedFiles.length > 0 ? `(${selectedFiles.length})` : '' }}</span>
          </button>
        </div>
      </form>
    </Modal>

    <!-- Album View Modal -->
    <Modal :show="showAlbumView" :title="selectedAlbum?.name || 'Album'" size="xl" @close="showAlbumView = false">
      <div v-if="selectedAlbum" class="space-y-4">
        <!-- Album Info -->
        <div class="grid grid-cols-2 gap-4 text-sm pb-4 border-b border-gray-100">
          <div>
            <span class="text-gray-500">Category:</span>
            <span class="ml-2 font-medium">{{ getCategoryLabel(selectedAlbum.category) }}</span>
          </div>
          <div v-if="getCustomerName(selectedAlbum.customerId)">
            <span class="text-gray-500">Customer:</span>
            <span class="ml-2 font-medium">{{ getCustomerName(selectedAlbum.customerId) }}</span>
          </div>
          <div>
            <span class="text-gray-500">Images:</span>
            <span class="ml-2 font-medium">{{ selectedAlbum.items.length }}</span>
          </div>
          <div>
            <span class="text-gray-500">Created:</span>
            <span class="ml-2 font-medium">{{ new Date(selectedAlbum.createdAt).toLocaleDateString() }}</span>
          </div>
        </div>
        
        <p v-if="selectedAlbum.notes" class="text-gray-600 pb-4 border-b border-gray-100">{{ selectedAlbum.notes }}</p>
        
        <!-- Image Grid -->
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
          <div 
            v-for="item in selectedAlbum.items" 
            :key="item.id"
            class="relative group"
          >
            <div class="aspect-square bg-gray-100 rounded-lg overflow-hidden">
              <img 
                :src="item.url" 
                :alt="item.name" 
                class="w-full h-full object-cover cursor-pointer hover:scale-110 transition-transform"
                @click="window.open(item.url, '_blank')"
              />
            </div>
            
            <!-- Delete individual image button -->
            <button
              v-if="selectedAlbum.items.length > 1"
              @click.stop="handleDeleteSingleImage(item.id)"
              class="absolute top-2 right-2 w-7 h-7 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-600 transition-colors shadow-lg opacity-0 group-hover:opacity-100"
              title="Delete image"
            >
              <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            <p class="text-xs text-gray-500 mt-1 truncate">{{ item.name }}</p>
          </div>
        </div>
        
        <!-- Delete Album Button -->
        <button 
          @click="handleDeleteAlbum(selectedAlbum.albumId)" 
          class="btn-ghost w-full text-red-600 hover:bg-red-50 mt-4"
        >
          Delete {{ selectedAlbum.items.length > 1 ? 'Album' : 'Image' }}
        </button>
      </div>
    </Modal>
  </div>
</template>
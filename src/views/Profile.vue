<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const form = ref({
  name: authStore.user?.name || '',
  email: authStore.user?.email || '',
  phone: authStore.user?.phone || '',
  businessName: authStore.user?.businessName || '',
  logo: authStore.user?.logo || '',
  whatsapp: authStore.user?.whatsapp || '',
  instagram: authStore.user?.instagram || '',
  facebook: authStore.user?.facebook || '',
  twitter: authStore.user?.twitter || '',
  bio: authStore.user?.bio || ''
})

const success = ref(false)
const logoPreview = ref(form.value.logo || null)
const showLogoUpload = ref(false)

// Compute WhatsApp link for testing
const whatsappLink = computed(() => {
  if (!form.value.whatsapp) return null
  // Remove any non-digit characters
  const cleanNumber = form.value.whatsapp.replace(/\D/g, '')
  return `https://wa.me/${cleanNumber}`
})

const handleSubmit = async () => {
  try {
    await authStore.updateProfile({
      ...form.value,
      logo: logoPreview.value
    })
    success.value = true
    setTimeout(() => success.value = false, 3000)
  } catch (error) {
    console.error('Failed to update profile:', error)
  }
}

const handleLogoUpload = (event) => {
  const file = event.target.files[0]
  if (file) {
    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert('Logo file must be less than 2MB')
      return
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file')
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      logoPreview.value = e.target.result
      form.value.logo = e.target.result
    }
    reader.readAsDataURL(file)
  }
}

const removeLogo = () => {
  logoPreview.value = null
  form.value.logo = ''
}

const handleLogout = () => {
  authStore.logout()
  router.push('/login')
}

// Format WhatsApp number helper
const formatWhatsApp = (value) => {
  // Auto-format as user types
  const digits = value.replace(/\D/g, '')
  if (digits.length <= 3) return digits
  if (digits.length <= 6) return `${digits.slice(0, 3)} ${digits.slice(3)}`
  if (digits.length <= 10) return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`
  return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 10)}`
}

const onWhatsAppInput = (e) => {
  const formatted = formatWhatsApp(e.target.value)
  form.value.whatsapp = formatted
}
</script>

<template>
  <div class="p-4 lg:p-8">
    <div class="max-w-2xl mx-auto">
      <h1 class="text-2xl font-bold text-gray-900 mb-2">Profile Settings</h1>
      <p class="text-gray-500 mb-8">Manage your account and business information</p>

      <div class="card mb-6">
        <div class="flex items-start gap-6 mb-6 pb-6 border-b border-gray-100">
          <!-- Logo or Avatar -->
          <div class="relative">
            <div v-if="logoPreview" class="w-24 h-24 rounded-lg overflow-hidden border-2 border-gray-200">
              <img :src="logoPreview" :alt="form.businessName || 'Logo'" class="w-full h-full object-cover" />
            </div>
            <div v-else class="w-24 h-24 rounded-lg bg-gradient-to-br from-primary-400 to-secondary-400 flex items-center justify-center text-white text-2xl font-bold">
              {{ authStore.userInitials }}
            </div>
            
            <!-- Logo edit button -->
            <button 
              @click="showLogoUpload = !showLogoUpload" 
              class="absolute -bottom-2 -right-2 w-8 h-8 bg-white rounded-full shadow-lg border-2 border-gray-100 flex items-center justify-center hover:bg-gray-50"
            >
              <svg class="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
          </div>

          <div class="flex-1">
            <h2 class="text-xl font-semibold text-gray-900">{{ authStore.user?.name }}</h2>
            <p class="text-gray-500">{{ authStore.user?.email }}</p>
            <p v-if="form.businessName" class="text-primary-600 font-medium mt-1">{{ form.businessName }}</p>
            <span class="inline-block mt-2 px-3 py-1 bg-primary-100 text-primary-700 text-sm font-medium rounded-full capitalize">
              {{ authStore.user?.role || 'Admin' }}
            </span>
          </div>
        </div>

        <!-- Logo Upload Section -->
        <div v-if="showLogoUpload" class="mb-6 p-4 bg-gray-50 rounded-lg">
          <label class="label">Brand Logo</label>
          <div class="space-y-3">
            <input
              type="file"
              accept="image/*"
              @change="handleLogoUpload"
              class="input-field file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-primary-50 file:text-primary-600 file:font-medium hover:file:bg-primary-100"
            />
            <button v-if="logoPreview" @click="removeLogo" class="btn-ghost text-sm text-red-600 hover:bg-red-50">
              Remove Logo
            </button>
            <p class="text-xs text-gray-500">Recommended: Square image, max 2MB</p>
          </div>
        </div>

        <form @submit.prevent="handleSubmit" class="space-y-5">
          <div v-if="success" class="bg-green-50 text-green-600 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Profile updated successfully!
          </div>

          <!-- Basic Info Section -->
          <div class="space-y-4">
            <h3 class="font-semibold text-gray-900 flex items-center gap-2">
              <svg class="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Basic Information
            </h3>

            <div>
              <label class="label">Full Name</label>
              <input v-model="form.name" type="text" class="input-field" placeholder="Your name" />
            </div>

            <div>
              <label class="label">Email</label>
              <input v-model="form.email" type="email" class="input-field" placeholder="you@example.com" disabled />
              <p class="text-xs text-gray-400 mt-1">Email cannot be changed</p>
            </div>

            <div>
              <label class="label">Phone</label>
              <input v-model="form.phone" type="tel" class="input-field" placeholder="+234 123 456 7890" />
            </div>

            <div>
              <label class="label">Business Name</label>
              <input v-model="form.businessName" type="text" class="input-field" placeholder="Your tailor shop name" />
            </div>

            <div>
              <label class="label">Bio / Description</label>
              <textarea v-model="form.bio" rows="3" class="input-field" placeholder="Tell customers about your business..."></textarea>
            </div>
          </div>

          <!-- Social Handles Section -->
          <div class="space-y-4 pt-6 border-t border-gray-100">
            <h3 class="font-semibold text-gray-900 flex items-center gap-2">
              <svg class="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              Social & Contact
            </h3>
            <p class="text-sm text-gray-500">Add your social media handles so customers can reach you</p>

            <div>
              <label class="label flex items-center gap-2">
                <svg class="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                WhatsApp Number
              </label>
              <div class="relative">
                <input 
                  v-model="form.whatsapp" 
                  type="tel" 
                  class="input-field pl-12" 
                  placeholder="234 123 456 7890"
                  @input="onWhatsAppInput"
                />
                <span class="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm">+</span>
              </div>
              <a 
                v-if="whatsappLink" 
                :href="whatsappLink" 
                target="_blank" 
                class="text-xs text-green-600 hover:text-green-700 mt-1 inline-flex items-center gap-1"
              >
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                Test WhatsApp Link
              </a>
            </div>

            <div>
              <label class="label flex items-center gap-2">
                <svg class="w-4 h-4 text-pink-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
                Instagram
              </label>
              <div class="relative">
                <span class="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm">@</span>
                <input v-model="form.instagram" type="text" class="input-field pl-9" placeholder="username" />
              </div>
            </div>

            <div>
              <label class="label flex items-center gap-2">
                <svg class="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                Facebook
              </label>
              <input v-model="form.facebook" type="text" class="input-field" placeholder="facebook.com/yourpage" />
            </div>

            <div>
              <label class="label flex items-center gap-2">
                <svg class="w-4 h-4 text-sky-500" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                </svg>
                Twitter / X
              </label>
              <div class="relative">
                <span class="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm">@</span>
                <input v-model="form.twitter" type="text" class="input-field pl-9" placeholder="username" />
              </div>
            </div>
          </div>

          <button type="submit" class="btn-primary w-full">
            Save Changes
          </button>
        </form>
      </div>

      <div class="card">
        <h3 class="font-semibold text-gray-900 mb-4">Account Actions</h3>
        <button @click="handleLogout" class="w-full flex items-center justify-center gap-2 py-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Sign Out
        </button>
      </div>

      <div class="lg:hidden mt-8">
        <div class="grid grid-cols-3 gap-3">
          <router-link to="/measurements" class="card text-center py-4">
            <svg class="w-6 h-6 mx-auto mb-2 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5z" />
            </svg>
            <span class="text-xs text-gray-600">Measurements</span>
          </router-link>
          <router-link to="/inventory" class="card text-center py-4">
            <svg class="w-6 h-6 mx-auto mb-2 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <span class="text-xs text-gray-600">Inventory</span>
          </router-link>
          <router-link to="/media" class="card text-center py-4">
            <svg class="w-6 h-6 mx-auto mb-2 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span class="text-xs text-gray-600">Media</span>
          </router-link>
        </div>
      </div>
    </div>
  </div>
</template>
<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const form = ref({
  name: authStore.user?.name || '',
  email: authStore.user?.email || '',
  phone: authStore.user?.phone || '',
  businessName: authStore.user?.businessName || ''
})

const success = ref(false)

const handleSubmit = () => {
  authStore.updateProfile(form.value)
  success.value = true
  setTimeout(() => success.value = false, 3000)
}

const handleLogout = () => {
  authStore.logout()
  router.push('/login')
}
</script>

<template>
  <div class="p-4 lg:p-8">
    <div class="max-w-2xl mx-auto">
      <h1 class="text-2xl font-bold text-gray-900 mb-2">Profile Settings</h1>
      <p class="text-gray-500 mb-8">Manage your account information</p>

      <div class="card mb-6">
        <div class="flex items-center gap-4 mb-6 pb-6 border-b border-gray-100">
          <div class="w-20 h-20 rounded-full bg-gradient-to-br from-primary-400 to-secondary-400 flex items-center justify-center text-white text-2xl font-bold">
            {{ authStore.userInitials }}
          </div>
          <div>
            <h2 class="text-xl font-semibold text-gray-900">{{ authStore.user?.name }}</h2>
            <p class="text-gray-500">{{ authStore.user?.email }}</p>
            <span class="inline-block mt-2 px-3 py-1 bg-primary-100 text-primary-700 text-sm font-medium rounded-full capitalize">
              {{ authStore.user?.role || 'Admin' }}
            </span>
          </div>
        </div>

        <form @submit.prevent="handleSubmit" class="space-y-5">
          <div v-if="success" class="bg-green-50 text-green-600 px-4 py-3 rounded-lg text-sm">
            Profile updated successfully!
          </div>

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
            <input v-model="form.phone" type="tel" class="input-field" placeholder="+1 234 567 890" />
          </div>

          <div>
            <label class="label">Business Name</label>
            <input v-model="form.businessName" type="text" class="input-field" placeholder="Your tailor shop name" />
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

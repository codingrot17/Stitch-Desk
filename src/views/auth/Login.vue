<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const form = ref({
  email: '',
  password: ''
})

const error = ref('')
const loading = ref(false)

const handleSubmit = async () => {
  error.value = ''
  loading.value = true
  
  try {
    const storedUsers = JSON.parse(localStorage.getItem('users') || '[]')
    const user = storedUsers.find(u => u.email === form.value.email)
    
    if (!user) {
      throw new Error('No account found with this email')
    }
    
    if (user.password !== form.value.password) {
      throw new Error('Invalid password')
    }
    
    const { password, ...userData } = user
    const token = btoa(JSON.stringify({ id: user.id, email: user.email }))
    authStore.login(userData, token)
    router.push('/')
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-secondary-50 px-4">
    <div class="w-full max-w-md">
      <div class="text-center mb-8">
        <div class="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-2xl mb-4">
          <svg class="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
          </svg>
        </div>
        <h1 class="text-2xl font-bold text-gray-900">Welcome back</h1>
        <p class="text-gray-500 mt-1">Sign in to your StitchDesk account</p>
      </div>

      <div class="card">
        <form @submit.prevent="handleSubmit" class="space-y-5">
          <div v-if="error" class="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">
            {{ error }}
          </div>

          <div>
            <label class="label">Email</label>
            <input
              v-model="form.email"
              type="email"
              required
              class="input-field"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label class="label">Password</label>
            <input
              v-model="form.password"
              type="password"
              required
              class="input-field"
              placeholder="Enter your password"
            />
          </div>

          <button type="submit" :disabled="loading" class="btn-primary w-full">
            <span v-if="loading">Signing in...</span>
            <span v-else>Sign in</span>
          </button>
        </form>

        <p class="text-center text-sm text-gray-500 mt-6">
          Don't have an account?
          <router-link to="/signup" class="text-primary-600 hover:text-primary-700 font-medium">
            Sign up
          </router-link>
        </p>
      </div>
    </div>
  </div>
</template>

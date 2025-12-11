<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const form = ref({
  name: '',
  email: '',
  password: '',
  confirmPassword: ''
})

const error = ref('')
const loading = ref(false)

const handleSubmit = async () => {
  error.value = ''
  
  if (form.value.password !== form.value.confirmPassword) {
    error.value = 'Passwords do not match'
    return
  }
  
  if (form.value.password.length < 6) {
    error.value = 'Password must be at least 6 characters'
    return
  }
  
  loading.value = true
  
  try {
    const storedUsers = JSON.parse(localStorage.getItem('users') || '[]')
    
    if (storedUsers.find(u => u.email === form.value.email)) {
      throw new Error('An account with this email already exists')
    }
    
    const newUser = {
      id: Date.now().toString(),
      name: form.value.name,
      email: form.value.email,
      password: form.value.password,
      role: 'admin',
      createdAt: new Date().toISOString()
    }
    
    storedUsers.push(newUser)
    localStorage.setItem('users', JSON.stringify(storedUsers))
    
    const { password, ...userData } = newUser
    const token = btoa(JSON.stringify({ id: newUser.id, email: newUser.email }))
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
        <h1 class="text-2xl font-bold text-gray-900">Create your account</h1>
        <p class="text-gray-500 mt-1">Get started with StitchDesk</p>
      </div>

      <div class="card">
        <form @submit.prevent="handleSubmit" class="space-y-5">
          <div v-if="error" class="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">
            {{ error }}
          </div>

          <div>
            <label class="label">Full Name</label>
            <input
              v-model="form.name"
              type="text"
              required
              class="input-field"
              placeholder="John Doe"
            />
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
              placeholder="At least 6 characters"
            />
          </div>

          <div>
            <label class="label">Confirm Password</label>
            <input
              v-model="form.confirmPassword"
              type="password"
              required
              class="input-field"
              placeholder="Confirm your password"
            />
          </div>

          <button type="submit" :disabled="loading" class="btn-primary w-full">
            <span v-if="loading">Creating account...</span>
            <span v-else>Create account</span>
          </button>
        </form>

        <p class="text-center text-sm text-gray-500 mt-6">
          Already have an account?
          <router-link to="/login" class="text-primary-600 hover:text-primary-700 font-medium">
            Sign in
          </router-link>
        </p>
      </div>
    </div>
  </div>
</template>

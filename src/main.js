// src/main.js - Updated to initialize auth on app load
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './assets/main.css'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

// Initialize auth state before mounting app
import { useAuthStore } from '@/stores/auth'

// Check if user has active session
const authStore = useAuthStore()
authStore.init().finally(() => {
  // Mount app after auth check completes
  app.mount('#app')
})
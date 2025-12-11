import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(JSON.parse(localStorage.getItem('user')) || null)
  const token = ref(localStorage.getItem('token') || null)

  const isAuthenticated = computed(() => !!user.value && !!token.value)
  
  const userInitials = computed(() => {
    if (!user.value?.name) return 'U'
    return user.value.name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  })

  function login(userData, authToken) {
    user.value = userData
    token.value = authToken
    localStorage.setItem('user', JSON.stringify(userData))
    localStorage.setItem('token', authToken)
  }

  function signup(userData) {
    const newUser = {
      id: Date.now().toString(),
      ...userData,
      role: 'tailor',
      createdAt: new Date().toISOString()
    }
    const authToken = btoa(JSON.stringify({ id: newUser.id, email: newUser.email }))
    login(newUser, authToken)
    return newUser
  }

  function logout() {
    user.value = null
    token.value = null
    localStorage.removeItem('user')
    localStorage.removeItem('token')
  }

  function updateProfile(updates) {
    if (user.value) {
      user.value = { ...user.value, ...updates }
      localStorage.setItem('user', JSON.stringify(user.value))
    }
  }

  return {
    user,
    token,
    isAuthenticated,
    userInitials,
    login,
    signup,
    logout,
    updateProfile
  }
})

<script setup>
import { useRoute } from 'vue-router'

const route = useRoute()

const navItems = [
  { path: '/', label: 'Home', icon: 'home' },
  { path: '/customers', label: 'Customers', icon: 'users' },
  { path: '/orders', label: 'Orders', icon: 'clipboard' },
  { path: '/tasks', label: 'Tasks', icon: 'check-square' },
  { path: '/profile', label: 'Profile', icon: 'user' }
]

const isActive = (path) => {
  if (path === '/') return route.path === '/'
  return route.path.startsWith(path)
}
</script>

<template>
  <nav class="fixed bottom-0 left-0 right-0 bg-surface border-t border-gray-200 z-50 safe-area-inset-bottom">
    <div class="flex justify-around items-center h-16 px-2">
      <router-link
        v-for="item in navItems"
        :key="item.path"
        :to="item.path"
        :class="['mobile-nav-item flex-1', { active: isActive(item.path) }]"
      >
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <template v-if="item.icon === 'home'">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </template>
          <template v-else-if="item.icon === 'users'">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </template>
          <template v-else-if="item.icon === 'clipboard'">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </template>
          <template v-else-if="item.icon === 'check-square'">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </template>
          <template v-else-if="item.icon === 'user'">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </template>
        </svg>
        <span class="text-xs">{{ item.label }}</span>
      </router-link>
    </div>
  </nav>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import Sidebar from '@/components/layout/Sidebar.vue'
import MobileNav from '@/components/layout/MobileNav.vue'

const route = useRoute()
const authStore = useAuthStore()

const isAuthPage = computed(() => {
  return route.meta.requiresGuest
})

const isAuthenticated = computed(() => authStore.isAuthenticated)
</script>

<template>
  <div class="min-h-screen bg-background">
    <template v-if="isAuthPage || !isAuthenticated">
      <router-view />
    </template>
    
    <template v-else>
      <div class="flex">
        <Sidebar class="hidden lg:block" />
        
        <main class="flex-1 lg:ml-64 pb-20 lg:pb-0 min-h-screen">
          <router-view />
        </main>
        
        <MobileNav class="lg:hidden" />
      </div>
    </template>
  </div>
</template>

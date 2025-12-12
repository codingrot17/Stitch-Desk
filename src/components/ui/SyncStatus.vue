<script setup>
import { ref, onMounted, onUnmounted } from "vue";
import { syncManager } from "@/services/syncManager";
import { isOnline } from "@/services/appwrite";

const syncStatus = ref({ pendingOperations: 0, isOnline: true });
const showDetails = ref(false);
let interval;

const updateStatus = () => {
    syncStatus.value = syncManager.getSyncStatus();
};

const handleSync = async () => {
    await syncManager.syncNow();
    updateStatus();
};

onMounted(() => {
    updateStatus();
    interval = setInterval(updateStatus, 5000); // Update every 5 seconds
});

onUnmounted(() => {
    if (interval) clearInterval(interval);
});
</script>

<template>
    <div class="fixed bottom-4 left-4 z-40">
        <!-- Status Indicator -->
        <div class="relative">
            <button
                @click="showDetails = !showDetails"
                :class="[
                    'flex items-center gap-2 px-3 py-2 rounded-lg shadow-lg text-sm font-medium transition-all',
                    syncStatus.isOnline
                        ? 'bg-white text-gray-700 hover:bg-gray-50'
                        : 'bg-amber-500 text-white'
                ]"
            >
                <!-- Status Icon -->
                <div class="relative">
                    <svg
                        :class="[
                            'w-5 h-5',
                            syncStatus.isOnline
                                ? 'text-green-500'
                                : 'text-white'
                        ]"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M5.636 18.364a9 9 0 010-12.728m12.728 0a9 9 0 010 12.728m-9.9-2.829a5 5 0 010-7.07m7.072 0a5 5 0 010 7.07M13 12a1 1 0 11-2 0 1 1 0 012 0z"
                        />
                    </svg>

                    <!-- Pending badge -->
                    <span
                        v-if="syncStatus.pendingOperations > 0"
                        class="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 text-white text-xs rounded-full flex items-center justify-center"
                    >
                        {{ syncStatus.pendingOperations }}
                    </span>
                </div>

                <span class="hidden sm:inline">
                    {{ syncStatus.isOnline ? "Online" : "Offline" }}
                </span>
            </button>

            <!-- Expanded Details -->
            <Transition name="slide-up">
                <div
                    v-if="showDetails"
                    class="absolute bottom-full left-0 mb-2 bg-white rounded-lg shadow-xl border border-gray-200 p-4 w-72"
                >
                    <div class="flex items-center justify-between mb-3">
                        <h3 class="font-semibold text-gray-900">Sync Status</h3>
                        <button
                            @click="showDetails = false"
                            class="text-gray-400 hover:text-gray-600"
                        >
                            <svg
                                class="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="2"
                                    d="M6 18L18 6M6 6l12 12"
                                />
                            </svg>
                        </button>
                    </div>

                    <div class="space-y-3 text-sm">
                        <!-- Connection Status -->
                        <div class="flex items-center justify-between">
                            <span class="text-gray-600">Connection</span>
                            <span
                                :class="[
                                    'font-medium',
                                    syncStatus.isOnline
                                        ? 'text-green-600'
                                        : 'text-amber-600'
                                ]"
                            >
                                {{
                                    syncStatus.isOnline
                                        ? "✓ Online"
                                        : "⚠ Offline"
                                }}
                            </span>
                        </div>

                        <!-- Pending Operations -->
                        <div class="flex items-center justify-between">
                            <span class="text-gray-600">Pending Changes</span>
                            <span class="font-medium text-gray-900">
                                {{ syncStatus.pendingOperations }}
                            </span>
                        </div>

                        <!-- Last Sync -->
                        <div class="flex items-center justify-between">
                            <span class="text-gray-600">Last Synced</span>
                            <span class="font-medium text-gray-900">
                                {{
                                    syncStatus.lastSyncTime
                                        ? new Date(
                                              syncStatus.lastSyncTime
                                          ).toLocaleTimeString()
                                        : "Never"
                                }}
                            </span>
                        </div>

                        <!-- Sync Button -->
                        <button
                            @click="handleSync"
                            :disabled="
                                !syncStatus.isOnline ||
                                syncStatus.syncInProgress
                            "
                            class="w-full btn-primary text-sm py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <span v-if="syncStatus.syncInProgress"
                                >Syncing...</span
                            >
                            <span v-else>Sync Now</span>
                        </button>

                        <!-- Info Message -->
                        <p
                            class="text-xs text-gray-500 text-center pt-2 border-t border-gray-100"
                        >
                            Changes are saved locally and synced automatically
                            when online
                        </p>
                    </div>
                </div>
            </Transition>
        </div>
    </div>
</template>

<style scoped>
.slide-up-enter-active,
.slide-up-leave-active {
    transition: all 0.2s ease;
}

.slide-up-enter-from,
.slide-up-leave-to {
    opacity: 0;
    transform: translateY(10px);
}
</style>

<script setup>
import { useToast } from "@/services/toast";

const { toasts, remove } = useToast();

const getIcon = type => {
    const icons = {
        success: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
        error: "M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z",
        warning:
            "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z",
        info: "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
    };
    return icons[type] || icons.info;
};

const getColor = type => {
    const colors = {
        success: "bg-green-50 border-green-200 text-green-800",
        error: "bg-red-50 border-red-200 text-red-800",
        warning: "bg-amber-50 border-amber-200 text-amber-800",
        info: "bg-blue-50 border-blue-200 text-blue-800"
    };
    return colors[type] || colors.info;
};

const getIconColor = type => {
    const colors = {
        success: "text-green-500",
        error: "text-red-500",
        warning: "text-amber-500",
        info: "text-blue-500"
    };
    return colors[type] || colors.info;
};
</script>

<template>
    <div class="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
        <TransitionGroup name="toast">
            <div
                v-for="toast in toasts"
                :key="toast.id"
                :class="[
                    'flex items-center gap-3 p-4 rounded-lg border shadow-lg',
                    getColor(toast.type)
                ]"
            >
                <svg
                    :class="['w-5 h-5 flex-shrink-0', getIconColor(toast.type)]"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        :d="getIcon(toast.type)"
                    />
                </svg>
                <p class="text-sm font-medium flex-1">{{ toast.message }}</p>
                <button
                    @click="remove(toast.id)"
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
        </TransitionGroup>
    </div>
</template>

<style scoped>
.toast-enter-active,
.toast-leave-active {
    transition: all 0.3s ease;
}

.toast-enter-from {
    opacity: 0;
    transform: translateX(100%);
}

.toast-leave-to {
    opacity: 0;
    transform: translateY(-20px);
}
</style>

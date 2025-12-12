// src/services/toast.js
import { ref } from "vue";

const toasts = ref([]);

export function useToast() {
    const add = (message, type = "info", duration = 3000) => {
        const id = Date.now();
        toasts.value.push({ id, message, type });

        setTimeout(() => {
            remove(id);
        }, duration);
    };

    const remove = id => {
        const index = toasts.value.findIndex(t => t.id === id);
        if (index > -1) {
            toasts.value.splice(index, 1);
        }
    };

    return {
        toasts,
        add,
        remove,
        success: msg => add(msg, "success"),
        error: msg => add(msg, "error"),
        warning: msg => add(msg, "warning"),
        info: msg => add(msg, "info")
    };
}

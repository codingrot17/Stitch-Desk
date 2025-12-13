// src/stores/tasks.js - Updated with Appwrite integration
import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { syncManager } from "@/services/syncManager";
import { COLLECTIONS } from "@/services/appwrite";

const STORAGE_KEY = "tasks";

export const useTasksStore = defineStore("tasks", () => {
    // State
    const tasks = ref(JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"));
    const loading = ref(false);
    const error = ref(null);

    // Constants
    const priorities = ["high", "medium", "low"];
    const statuses = ["todo", "in-progress", "done"];

    // Computed properties
    const totalTasks = computed(() => tasks.value.length);

    const pendingTasks = computed(() =>
        tasks.value.filter(t => t.status !== "done")
    );

    const todayTasks = computed(() => {
        const today = new Date().toISOString().split("T")[0];
        return tasks.value.filter(
            t => t.dueDate?.startsWith(today) && t.status !== "done"
        );
    });

    const tasksByStatus = computed(() => {
        return statuses.reduce((acc, status) => {
            acc[status] = tasks.value.filter(t => t.status === status);
            return acc;
        }, {});
    });

    const highPriorityTasks = computed(() =>
        tasks.value.filter(t => t.priority === "high" && t.status !== "done")
    );

    // Actions

    /**
     * Fetch tasks from Appwrite (syncs with localStorage)
     */
    async function fetchTasks() {
        loading.value = true;
        error.value = null;

        try {
            const items = await syncManager.fetch(
                COLLECTIONS.TASKS,
                STORAGE_KEY
            );
            tasks.value = items;
            return items;
        } catch (e) {
            error.value = e.message;
            console.error("Failed to fetch tasks:", e);
        } finally {
            loading.value = false;
        }
    }

    /**
     * Add new task (hybrid storage)
     */
    async function addTask(task) {
        loading.value = true;
        error.value = null;

        try {
            const newTask = {
                status: "todo",
                priority: "medium",
                ...task
            };

            const result = await syncManager.create(
                COLLECTIONS.TASKS,
                newTask,
                STORAGE_KEY
            );

            // Reload from localStorage to get updated data
            tasks.value = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");

            return result;
        } catch (e) {
            error.value = e.message;
            console.error("Failed to add task:", e);
            throw e;
        } finally {
            loading.value = false;
        }
    }

    /**
     * Update existing task (hybrid storage)
     */
    async function updateTask(id, updates) {
        loading.value = true;
        error.value = null;

        try {
            const result = await syncManager.update(
                COLLECTIONS.TASKS,
                id,
                updates,
                STORAGE_KEY
            );

            // Reload from localStorage
            tasks.value = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");

            return result;
        } catch (e) {
            error.value = e.message;
            console.error("Failed to update task:", e);
            throw e;
        } finally {
            loading.value = false;
        }
    }

    /**
     * Update task status (convenience method)
     */
    async function updateTaskStatus(id, status) {
        return updateTask(id, { status });
    }

    /**
     * Delete task (hybrid storage)
     */
    async function deleteTask(id) {
        loading.value = true;
        error.value = null;

        try {
            await syncManager.delete(COLLECTIONS.TASKS, id, STORAGE_KEY);

            // Reload from localStorage
            tasks.value = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");

            return true;
        } catch (e) {
            error.value = e.message;
            console.error("Failed to delete task:", e);
            throw e;
        } finally {
            loading.value = false;
        }
    }

    /**
     * Get task by ID (local only)
     */
    function getTaskById(id) {
        return tasks.value.find(t => t.id === id);
    }

    /**
     * Trigger manual sync
     */
    async function syncNow() {
        await syncManager.syncNow();
        await fetchTasks();
    }

    return {
        // State
        tasks,
        loading,
        error,

        // Constants
        priorities,
        statuses,

        // Computed
        totalTasks,
        pendingTasks,
        todayTasks,
        tasksByStatus,
        highPriorityTasks,

        // Actions
        fetchTasks,
        addTask,
        updateTask,
        updateTaskStatus,
        deleteTask,
        getTaskById,
        syncNow
    };
});

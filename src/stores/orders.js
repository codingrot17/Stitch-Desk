// src/stores/orders.js - Updated with Appwrite integration
import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { syncManager } from "@/services/syncManager";
import { COLLECTIONS } from "@/services/appwrite";

const STORAGE_KEY = "orders";

export const useOrdersStore = defineStore("orders", () => {
    // State
    const orders = ref(JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"));
    const loading = ref(false);
    const error = ref(null);

    // Constants
    const statusOptions = ["pending", "in-progress", "completed", "delivered"];

    // Computed properties
    const totalOrders = computed(() => orders.value.length);

    const activeOrders = computed(() =>
        orders.value.filter(o => o.status !== "delivered")
    );

    const pendingOrders = computed(() =>
        orders.value.filter(o => o.status === "pending")
    );

    const upcomingDeadlines = computed(() => {
        const now = new Date();
        const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        return orders.value
            .filter(o => {
                if (o.status === "delivered") return false;
                const dueDate = new Date(o.dueDate);
                return dueDate >= now && dueDate <= weekFromNow;
            })
            .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
            .slice(0, 5);
    });

    const ordersByStatus = computed(() => {
        return statusOptions.reduce((acc, status) => {
            acc[status] = orders.value.filter(o => o.status === status);
            return acc;
        }, {});
    });

    // Actions

    /**
     * Fetch orders from Appwrite (syncs with localStorage)
     */
    async function fetchOrders() {
        loading.value = true;
        error.value = null;

        try {
            const items = await syncManager.fetch(
                COLLECTIONS.ORDERS,
                STORAGE_KEY
            );
            orders.value = items;
            return items;
        } catch (e) {
            error.value = e.message;
            console.error("Failed to fetch orders:", e);
        } finally {
            loading.value = false;
        }
    }

    /**
     * Add new order (hybrid storage)
     */
    async function addOrder(order) {
        loading.value = true;
        error.value = null;

        try {
            // Generate order number
            const currentOrders = JSON.parse(
                localStorage.getItem(STORAGE_KEY) || "[]"
            );
            const orderNumber = `ORD-${String(
                currentOrders.length + 1
            ).padStart(4, "0")}`;

            const newOrder = {
                orderNumber,
                status: "pending",
                ...order
            };

            const result = await syncManager.create(
                COLLECTIONS.ORDERS,
                newOrder,
                STORAGE_KEY
            );

            // Reload from localStorage to get updated data
            orders.value = JSON.parse(
                localStorage.getItem(STORAGE_KEY) || "[]"
            );

            return result;
        } catch (e) {
            error.value = e.message;
            console.error("Failed to add order:", e);
            throw e;
        } finally {
            loading.value = false;
        }
    }

    /**
     * Update order (hybrid storage)
     */
    async function updateOrder(id, updates) {
        loading.value = true;
        error.value = null;

        try {
            const result = await syncManager.update(
                COLLECTIONS.ORDERS,
                id,
                updates,
                STORAGE_KEY
            );

            // Reload from localStorage
            orders.value = JSON.parse(
                localStorage.getItem(STORAGE_KEY) || "[]"
            );

            return result;
        } catch (e) {
            error.value = e.message;
            console.error("Failed to update order:", e);
            throw e;
        } finally {
            loading.value = false;
        }
    }

    /**
     * Update order status (convenience method)
     */
    async function updateOrderStatus(id, status) {
        return updateOrder(id, { status });
    }

    /**
     * Delete order (hybrid storage)
     */
    async function deleteOrder(id) {
        loading.value = true;
        error.value = null;

        try {
            await syncManager.delete(COLLECTIONS.ORDERS, id, STORAGE_KEY);

            // Reload from localStorage
            orders.value = JSON.parse(
                localStorage.getItem(STORAGE_KEY) || "[]"
            );

            return true;
        } catch (e) {
            error.value = e.message;
            console.error("Failed to delete order:", e);
            throw e;
        } finally {
            loading.value = false;
        }
    }

    /**
     * Get order by ID (local only)
     */
    function getOrderById(id) {
        return orders.value.find(o => o.id === id);
    }

    /**
     * Get orders by customer ID (local only)
     */
    function getOrdersByCustomer(customerId) {
        return orders.value.filter(o => o.customerId === customerId);
    }

    /**
     * Trigger manual sync
     */
    async function syncNow() {
        await syncManager.syncNow();
        await fetchOrders();
    }

    return {
        // State
        orders,
        loading,
        error,

        // Constants
        statusOptions,

        // Computed
        totalOrders,
        activeOrders,
        pendingOrders,
        upcomingDeadlines,
        ordersByStatus,

        // Actions
        fetchOrders,
        addOrder,
        updateOrder,
        updateOrderStatus,
        deleteOrder,
        getOrderById,
        getOrdersByCustomer,
        syncNow
    };
});

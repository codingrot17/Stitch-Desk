// src/stores/inventory.js - Updated with Appwrite integration
import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { syncManager } from "@/services/syncManager";
import { COLLECTIONS } from "@/services/appwrite";

const STORAGE_KEY = "inventory";

export const useInventoryStore = defineStore("inventory", () => {
    // State
    const items = ref(JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"));
    const loading = ref(false);
    const error = ref(null);

    // Constants
    const categories = [
        "fabric",
        "thread",
        "button",
        "zipper",
        "accessory",
        "other"
    ];

    // Computed properties
    const totalItems = computed(() => items.value.length);

    const lowStockItems = computed(() =>
        items.value.filter(item => item.quantity <= item.minStock)
    );

    const lowStockCount = computed(() => lowStockItems.value.length);

    const itemsByCategory = computed(() => {
        return categories.reduce((acc, category) => {
            acc[category] = items.value.filter(
                item => item.category === category
            );
            return acc;
        }, {});
    });

    // Actions

    /**
     * Fetch inventory from Appwrite (syncs with localStorage)
     */
    async function fetchInventory() {
        loading.value = true;
        error.value = null;

        try {
            const fetchedItems = await syncManager.fetch(
                COLLECTIONS.INVENTORY,
                STORAGE_KEY
            );
            items.value = fetchedItems;
            return fetchedItems;
        } catch (e) {
            error.value = e.message;
            console.error("Failed to fetch inventory:", e);
        } finally {
            loading.value = false;
        }
    }

    /**
     * Add new inventory item (hybrid storage)
     */
    async function addItem(item) {
        loading.value = true;
        error.value = null;

        try {
            const newItem = {
                ...item,
                minStock: item.minStock || 5
            };

            const result = await syncManager.create(
                COLLECTIONS.INVENTORY,
                newItem,
                STORAGE_KEY
            );

            // Reload from localStorage to get updated data
            items.value = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");

            return result;
        } catch (e) {
            error.value = e.message;
            console.error("Failed to add inventory item:", e);
            throw e;
        } finally {
            loading.value = false;
        }
    }

    /**
     * Update inventory item (hybrid storage)
     */
    async function updateItem(id, updates) {
        loading.value = true;
        error.value = null;

        try {
            const result = await syncManager.update(
                COLLECTIONS.INVENTORY,
                id,
                updates,
                STORAGE_KEY
            );

            // Reload from localStorage
            items.value = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");

            return result;
        } catch (e) {
            error.value = e.message;
            console.error("Failed to update inventory item:", e);
            throw e;
        } finally {
            loading.value = false;
        }
    }

    /**
     * Update stock quantity (convenience method)
     * @param {string} id - Item ID
     * @param {number} quantityChange - Can be positive (add) or negative (subtract)
     */
    async function updateStock(id, quantityChange) {
        loading.value = true;
        error.value = null;

        try {
            // Get current item from localStorage
            const currentItems = JSON.parse(
                localStorage.getItem(STORAGE_KEY) || "[]"
            );
            const item = currentItems.find(i => i.id === id);

            if (!item) {
                throw new Error("Item not found");
            }

            // Calculate new quantity (ensure it doesn't go below 0)
            const newQuantity = Math.max(0, item.quantity + quantityChange);

            // Update with new quantity
            const result = await syncManager.update(
                COLLECTIONS.INVENTORY,
                id,
                { quantity: newQuantity },
                STORAGE_KEY
            );

            // Reload from localStorage
            items.value = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");

            return result;
        } catch (e) {
            error.value = e.message;
            console.error("Failed to update stock:", e);
            throw e;
        } finally {
            loading.value = false;
        }
    }

    /**
     * Delete inventory item (hybrid storage)
     */
    async function deleteItem(id) {
        loading.value = true;
        error.value = null;

        try {
            await syncManager.delete(COLLECTIONS.INVENTORY, id, STORAGE_KEY);

            // Reload from localStorage
            items.value = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");

            return true;
        } catch (e) {
            error.value = e.message;
            console.error("Failed to delete inventory item:", e);
            throw e;
        } finally {
            loading.value = false;
        }
    }

    /**
     * Get item by ID (local only)
     */
    function getItemById(id) {
        return items.value.find(item => item.id === id);
    }

    /**
     * Trigger manual sync
     */
    async function syncNow() {
        await syncManager.syncNow();
        await fetchInventory();
    }

    return {
        // State
        items,
        loading,
        error,

        // Constants
        categories,

        // Computed
        totalItems,
        lowStockItems,
        lowStockCount,
        itemsByCategory,

        // Actions
        fetchInventory,
        addItem,
        updateItem,
        updateStock,
        deleteItem,
        getItemById,
        syncNow
    };
});

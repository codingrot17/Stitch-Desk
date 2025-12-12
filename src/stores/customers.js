// src/stores/customers.js - Updated with Appwrite integration
import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { syncManager } from "@/services/syncManager";
import { COLLECTIONS } from "@/services/appwrite";

const STORAGE_KEY = "customers";

export const useCustomersStore = defineStore("customers", () => {
    const customers = ref(
        JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]")
    );
    const searchQuery = ref("");
    const loading = ref(false);
    const error = ref(null);

    const filteredCustomers = computed(() => {
        if (!searchQuery.value) return customers.value;
        const query = searchQuery.value.toLowerCase();
        return customers.value.filter(
            c =>
                c.name.toLowerCase().includes(query) ||
                c.email?.toLowerCase().includes(query) ||
                c.phone?.includes(query)
        );
    });

    const totalCustomers = computed(() => customers.value.length);

    const recentCustomers = computed(() => {
        return [...customers.value]
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, 5);
    });

    // Fetch customers from Appwrite (syncs with localStorage)
    async function fetchCustomers() {
        loading.value = true;
        error.value = null;

        try {
            const items = await syncManager.fetch(
                COLLECTIONS.CUSTOMERS,
                STORAGE_KEY
            );
            customers.value = items;
            return items;
        } catch (e) {
            error.value = e.message;
            console.error("Failed to fetch customers:", e);
        } finally {
            loading.value = false;
        }
    }

    // Add customer (hybrid storage)
    async function addCustomer(customer) {
        loading.value = true;
        error.value = null;

        try {
            const result = await syncManager.create(
                COLLECTIONS.CUSTOMERS,
                customer,
                STORAGE_KEY
            );

            // Reload from localStorage to get updated data
            customers.value = JSON.parse(
                localStorage.getItem(STORAGE_KEY) || "[]"
            );

            return result;
        } catch (e) {
            error.value = e.message;
            console.error("Failed to add customer:", e);
            throw e;
        } finally {
            loading.value = false;
        }
    }

    // Update customer (hybrid storage)
    async function updateCustomer(id, updates) {
        loading.value = true;
        error.value = null;

        try {
            const result = await syncManager.update(
                COLLECTIONS.CUSTOMERS,
                id,
                updates,
                STORAGE_KEY
            );

            // Reload from localStorage
            customers.value = JSON.parse(
                localStorage.getItem(STORAGE_KEY) || "[]"
            );

            return result;
        } catch (e) {
            error.value = e.message;
            console.error("Failed to update customer:", e);
            throw e;
        } finally {
            loading.value = false;
        }
    }

    // Delete customer (hybrid storage)
    async function deleteCustomer(id) {
        loading.value = true;
        error.value = null;

        try {
            await syncManager.delete(COLLECTIONS.CUSTOMERS, id, STORAGE_KEY);

            // Reload from localStorage
            customers.value = JSON.parse(
                localStorage.getItem(STORAGE_KEY) || "[]"
            );

            return true;
        } catch (e) {
            error.value = e.message;
            console.error("Failed to delete customer:", e);
            throw e;
        } finally {
            loading.value = false;
        }
    }

    function getCustomerById(id) {
        return customers.value.find(c => c.id === id);
    }

    function setSearchQuery(query) {
        searchQuery.value = query;
    }

    // Trigger manual sync
    async function syncNow() {
        await syncManager.syncNow();
        await fetchCustomers();
    }

    return {
        customers,
        searchQuery,
        filteredCustomers,
        totalCustomers,
        recentCustomers,
        loading,
        error,
        fetchCustomers,
        addCustomer,
        updateCustomer,
        deleteCustomer,
        getCustomerById,
        setSearchQuery,
        syncNow
    };
});

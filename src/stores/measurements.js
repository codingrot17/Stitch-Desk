// src/stores/measurements.js - Updated with Appwrite integration
import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { syncManager } from "@/services/syncManager";
import { COLLECTIONS } from "@/services/appwrite";

const STORAGE_KEY = "measurements";

export const useMeasurementsStore = defineStore("measurements", () => {
    // State
    const measurements = ref(
        JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]")
    );
    const loading = ref(false);
    const error = ref(null);

    // Default measurement fields
    const defaultFields = [
        { key: "chest", label: "Chest", unit: "in" },
        { key: "waist", label: "Waist", unit: "in" },
        { key: "hips", label: "Hips", unit: "in" },
        { key: "shoulder", label: "Shoulder", unit: "in" },
        { key: "sleeveLength", label: "Sleeve Length", unit: "in" },
        { key: "armHole", label: "Arm Hole", unit: "in" },
        { key: "neckSize", label: "Neck Size", unit: "in" },
        { key: "backLength", label: "Back Length", unit: "in" },
        { key: "frontLength", label: "Front Length", unit: "in" },
        { key: "inseam", label: "Inseam", unit: "in" },
        { key: "outseam", label: "Outseam", unit: "in" },
        { key: "thigh", label: "Thigh", unit: "in" },
        { key: "knee", label: "Knee", unit: "in" },
        { key: "calf", label: "Calf", unit: "in" },
        { key: "ankle", label: "Ankle", unit: "in" }
    ];

    // Computed properties
    const totalMeasurements = computed(() => measurements.value.length);

    // Actions

    /**
     * Fetch measurements from Appwrite (syncs with localStorage)
     */
    async function fetchMeasurements() {
        loading.value = true;
        error.value = null;

        try {
            const items = await syncManager.fetch(
                COLLECTIONS.MEASUREMENTS,
                STORAGE_KEY
            );

            // Parse values back from JSON string to object
            const parsedItems = items.map(item => ({
                ...item,
                values:
                    typeof item.values === "string"
                        ? JSON.parse(item.values)
                        : item.values
            }));

            measurements.value = parsedItems;

            // Update localStorage with parsed data
            localStorage.setItem(STORAGE_KEY, JSON.stringify(parsedItems));

            return parsedItems;
        } catch (e) {
            error.value = e.message;
            console.error("Failed to fetch measurements:", e);
        } finally {
            loading.value = false;
        }
    }

    /**
     * Add new measurement (hybrid storage)
     * IMPORTANT: Appwrite needs values as JSON string
     */
    async function addMeasurement(measurement) {
        loading.value = true;
        error.value = null;

        try {
            // Prepare data for Appwrite (values must be JSON string)
            const dataForAppwrite = {
                ...measurement,
                values: JSON.stringify(measurement.values)
            };

            const result = await syncManager.create(
                COLLECTIONS.MEASUREMENTS,
                dataForAppwrite,
                STORAGE_KEY
            );

            // Reload from localStorage and parse values
            const stored = JSON.parse(
                localStorage.getItem(STORAGE_KEY) || "[]"
            );
            measurements.value = stored.map(item => ({
                ...item,
                values:
                    typeof item.values === "string"
                        ? JSON.parse(item.values)
                        : item.values
            }));

            return result;
        } catch (e) {
            error.value = e.message;
            console.error("Failed to add measurement:", e);
            throw e;
        } finally {
            loading.value = false;
        }
    }

    /**
     * Update measurement (hybrid storage)
     */
    async function updateMeasurement(id, updates) {
        loading.value = true;
        error.value = null;

        try {
            // Prepare data for Appwrite (values must be JSON string if provided)
            const dataForAppwrite = {
                ...updates,
                values: updates.values
                    ? JSON.stringify(updates.values)
                    : undefined
            };

            const result = await syncManager.update(
                COLLECTIONS.MEASUREMENTS,
                id,
                dataForAppwrite,
                STORAGE_KEY
            );

            // Reload from localStorage and parse values
            const stored = JSON.parse(
                localStorage.getItem(STORAGE_KEY) || "[]"
            );
            measurements.value = stored.map(item => ({
                ...item,
                values:
                    typeof item.values === "string"
                        ? JSON.parse(item.values)
                        : item.values
            }));

            return result;
        } catch (e) {
            error.value = e.message;
            console.error("Failed to update measurement:", e);
            throw e;
        } finally {
            loading.value = false;
        }
    }

    /**
     * Delete measurement (hybrid storage)
     */
    async function deleteMeasurement(id) {
        loading.value = true;
        error.value = null;

        try {
            await syncManager.delete(COLLECTIONS.MEASUREMENTS, id, STORAGE_KEY);

            // Reload from localStorage
            measurements.value = JSON.parse(
                localStorage.getItem(STORAGE_KEY) || "[]"
            );

            return true;
        } catch (e) {
            error.value = e.message;
            console.error("Failed to delete measurement:", e);
            throw e;
        } finally {
            loading.value = false;
        }
    }

    /**
     * Get measurement by ID (local only)
     */
    function getMeasurementById(id) {
        return measurements.value.find(m => m.id === id);
    }

    /**
     * Get measurements by customer ID (local only)
     */
    function getMeasurementsByCustomer(customerId) {
        return measurements.value.filter(m => m.customerId === customerId);
    }

    /**
     * Trigger manual sync
     */
    async function syncNow() {
        await syncManager.syncNow();
        await fetchMeasurements();
    }

    return {
        // State
        measurements,
        loading,
        error,

        // Constants
        defaultFields,

        // Computed
        totalMeasurements,

        // Actions
        fetchMeasurements,
        addMeasurement,
        updateMeasurement,
        deleteMeasurement,
        getMeasurementById,
        getMeasurementsByCustomer,
        syncNow
    };
});

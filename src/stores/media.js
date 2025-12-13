// src/stores/media.js - Updated with Appwrite integration
import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { syncManager } from "@/services/syncManager";
import { COLLECTIONS } from "@/services/appwrite";

const STORAGE_KEY = "media";

export const useMediaStore = defineStore("media", () => {
    // State
    const mediaItems = ref(
        JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]")
    );
    const loading = ref(false);
    const error = ref(null);

    // Constants
    const categories = [
        "customer-photo",
        "fabric-sample",
        "order-reference",
        "design",
        "other"
    ];

    // Computed properties
    const totalMedia = computed(() => mediaItems.value.length);

    const mediaByCategory = computed(() => {
        return categories.reduce((acc, category) => {
            acc[category] = mediaItems.value.filter(
                item => item.category === category
            );
            return acc;
        }, {});
    });

    // Actions

    /**
     * Fetch media from Appwrite (syncs with localStorage)
     */
    async function fetchMedia() {
        loading.value = true;
        error.value = null;

        try {
            const items = await syncManager.fetch(
                COLLECTIONS.MEDIA,
                STORAGE_KEY
            );
            mediaItems.value = items;
            return items;
        } catch (e) {
            error.value = e.message;
            console.error("Failed to fetch media:", e);
        } finally {
            loading.value = false;
        }
    }

    /**
     * Add new media (hybrid storage)
     *
     * NOTE: For images stored as base64:
     * - They will be saved to localStorage for offline access
     * - Base64 URLs are NOT synced to Appwrite (too large)
     * - Only metadata (name, category, etc.) syncs to cloud
     *
     * For production, consider uploading images to Appwrite Storage
     * and storing the file URL instead of base64.
     */
    async function addMedia(media) {
        loading.value = true;
        error.value = null;

        try {
            // Check if URL is base64 (starts with 'data:')
            const isBase64 = media.url?.startsWith("data:");

            if (isBase64) {
                // For base64 images: Save to localStorage only
                // Don't sync large base64 to Appwrite
                const newMedia = {
                    id: Date.now().toString(),
                    ...media,
                    _localOnly: true, // Flag to indicate not synced
                    createdAt: new Date().toISOString()
                };

                const localData = JSON.parse(
                    localStorage.getItem(STORAGE_KEY) || "[]"
                );
                localData.push(newMedia);
                localStorage.setItem(STORAGE_KEY, JSON.stringify(localData));

                mediaItems.value = localData;

                console.warn(
                    "Base64 images are stored locally only and not synced to Appwrite"
                );

                return newMedia;
            } else {
                // For external URLs: Sync normally
                const result = await syncManager.create(
                    COLLECTIONS.MEDIA,
                    media,
                    STORAGE_KEY
                );

                // Reload from localStorage
                mediaItems.value = JSON.parse(
                    localStorage.getItem(STORAGE_KEY) || "[]"
                );

                return result;
            }
        } catch (e) {
            error.value = e.message;
            console.error("Failed to add media:", e);
            throw e;
        } finally {
            loading.value = false;
        }
    }

    /**
     * Update media metadata (hybrid storage)
     */
    async function updateMedia(id, updates) {
        loading.value = true;
        error.value = null;

        try {
            // Get current item to check if it's base64
            const currentItems = JSON.parse(
                localStorage.getItem(STORAGE_KEY) || "[]"
            );
            const item = currentItems.find(m => m.id === id);

            if (item?._localOnly || item?.url?.startsWith("data:")) {
                // Update localStorage only for base64 images
                const updatedItems = currentItems.map(m =>
                    m.id === id ? { ...m, ...updates, _localOnly: true } : m
                );
                localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedItems));
                mediaItems.value = updatedItems;

                return updatedItems.find(m => m.id === id);
            } else {
                // Normal sync for external URLs
                const result = await syncManager.update(
                    COLLECTIONS.MEDIA,
                    id,
                    updates,
                    STORAGE_KEY
                );

                // Reload from localStorage
                mediaItems.value = JSON.parse(
                    localStorage.getItem(STORAGE_KEY) || "[]"
                );

                return result;
            }
        } catch (e) {
            error.value = e.message;
            console.error("Failed to update media:", e);
            throw e;
        } finally {
            loading.value = false;
        }
    }

    /**
     * Delete media (hybrid storage)
     */
    async function deleteMedia(id) {
        loading.value = true;
        error.value = null;

        try {
            await syncManager.delete(COLLECTIONS.MEDIA, id, STORAGE_KEY);

            // Reload from localStorage
            mediaItems.value = JSON.parse(
                localStorage.getItem(STORAGE_KEY) || "[]"
            );

            return true;
        } catch (e) {
            error.value = e.message;
            console.error("Failed to delete media:", e);
            throw e;
        } finally {
            loading.value = false;
        }
    }

    /**
     * Get media by ID (local only)
     */
    function getMediaById(id) {
        return mediaItems.value.find(m => m.id === id);
    }

    /**
     * Get media by customer ID (local only)
     */
    function getMediaByCustomer(customerId) {
        return mediaItems.value.filter(m => m.customerId === customerId);
    }

    /**
     * Get media by order ID (local only)
     */
    function getMediaByOrder(orderId) {
        return mediaItems.value.filter(m => m.orderId === orderId);
    }

    /**
     * Trigger manual sync
     */
    async function syncNow() {
        await syncManager.syncNow();
        await fetchMedia();
    }

    return {
        // State
        mediaItems,
        loading,
        error,

        // Constants
        categories,

        // Computed
        totalMedia,
        mediaByCategory,

        // Actions
        fetchMedia,
        addMedia,
        updateMedia,
        deleteMedia,
        getMediaById,
        getMediaByCustomer,
        getMediaByOrder,
        syncNow
    };
});

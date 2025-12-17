// src/stores/media.js - Updated with Appwrite Storage
import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { syncManager } from "@/services/syncManager";
import { COLLECTIONS } from "@/services/appwrite";
import {
    uploadMedia,
    deleteFile,
    isStorageUrl,
    extractFileId,
    getFilePreview
} from "@/services/storage";

const STORAGE_KEY = "media";

export const useMediaStore = defineStore("media", () => {
    // State
    const mediaItems = ref(
        JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]")
    );
    const loading = ref(false);
    const error = ref(null);
    const uploadProgress = ref(0);

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
     * Add new media - WITH APPWRITE STORAGE
     * @param {File} file - File object from input
     * @param {Object} metadata - Additional metadata
     */
    async function addMedia(file, metadata = {}) {
        loading.value = true;
        error.value = null;
        uploadProgress.value = 0;

        try {
            console.log("📤 Uploading media to Appwrite Storage...");

            // Upload file to Appwrite Storage
            const uploadResult = await uploadMedia(file, metadata);

            console.log("✅ Media uploaded:", uploadResult);

            // Create media record with Appwrite URL
            const mediaData = {
                name: metadata.name || file.name,
                category: metadata.category || "other",
                customerId: metadata.customerId || "",
                orderId: metadata.orderId || "",
                notes: metadata.notes || "",
                // Storage info
                url: uploadResult.url,
                fileId: uploadResult.fileId
                // Note: fileSize, fileType, fileName removed because
                // they're not in the database schema
            };

            // Save to Appwrite database
            const result = await syncManager.create(
                COLLECTIONS.MEDIA,
                mediaData,
                STORAGE_KEY
            );

            // Reload from localStorage
            mediaItems.value = JSON.parse(
                localStorage.getItem(STORAGE_KEY) || "[]"
            );

            uploadProgress.value = 100;

            console.log("✅ Media record created");
            return result;
        } catch (e) {
            error.value = e.message;
            console.error("Failed to add media:", e);
            throw e;
        } finally {
            loading.value = false;
            setTimeout(() => {
                uploadProgress.value = 0;
            }, 1000);
        }
    }

    /**
     * Add media from base64 (for backward compatibility)
     * This will still work but stores in Appwrite Storage
     */
    async function addMediaFromBase64(base64Data, metadata = {}) {
        try {
            // Convert base64 to File object
            const response = await fetch(base64Data);
            const blob = await response.blob();
            const fileName = metadata.name || `media_${Date.now()}.png`;
            const file = new File([blob], fileName, { type: blob.type });

            // Upload using regular flow
            return await addMedia(file, metadata);
        } catch (error) {
            console.error("Failed to add media from base64:", error);
            throw error;
        }
    }

    /**
     * Update media metadata (hybrid storage)
     */
    async function updateMedia(id, updates) {
        loading.value = true;
        error.value = null;

        try {
            // Don't allow changing URL/fileId
            const { url, fileId, ...safeUpdates } = updates;

            const result = await syncManager.update(
                COLLECTIONS.MEDIA,
                id,
                safeUpdates,
                STORAGE_KEY
            );

            // Reload from localStorage
            mediaItems.value = JSON.parse(
                localStorage.getItem(STORAGE_KEY) || "[]"
            );

            return result;
        } catch (e) {
            error.value = e.message;
            console.error("Failed to update media:", e);
            throw e;
        } finally {
            loading.value = false;
        }
    }

    /**
     * Delete media - WITH STORAGE CLEANUP
     */
    async function deleteMedia(id) {
        loading.value = true;
        error.value = null;

        try {
            // Get media item to find fileId
            const mediaItem = mediaItems.value.find(m => m.id === id);

            if (mediaItem?.fileId) {
                // Delete file from Appwrite Storage
                await deleteFile(mediaItem.fileId);
                console.log("🗑️ Deleted media file from storage");
            }

            // Delete database record
            await syncManager.delete(COLLECTIONS.MEDIA, id, STORAGE_KEY);

            // Reload from localStorage
            mediaItems.value = JSON.parse(
                localStorage.getItem(STORAGE_KEY) || "[]"
            );

            console.log("✅ Media deleted");
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
     * Get preview URL for media
     * @param {string} id - Media ID
     * @param {number} width - Width in pixels
     * @param {number} height - Height in pixels
     * @returns {string|null} - Preview URL
     */
    function getPreviewUrl(id, width = 400, height = 400) {
        const media = getMediaById(id);
        if (!media?.fileId) return null;

        return getFilePreview(media.fileId, width, height);
    }

    /**
     * Check if media is stored in Appwrite Storage
     * @param {string} id - Media ID
     * @returns {boolean}
     */
    function isInStorage(id) {
        const media = getMediaById(id);
        return media?.url ? isStorageUrl(media.url) : false;
    }

    /**
     * Trigger manual sync
     */
    async function syncNow() {
        await syncManager.syncNow();
        await fetchMedia();
    }

    /**
     * Migrate old base64 media to Appwrite Storage
     * Run this once to upgrade existing data
     */
    async function migrateToStorage() {
        console.log("🔄 Starting media migration to Appwrite Storage...");

        let migrated = 0;
        let failed = 0;

        for (const media of mediaItems.value) {
            // Skip if already in storage
            if (isStorageUrl(media.url)) {
                console.log(`⏭️ Skipping ${media.name} - already in storage`);
                continue;
            }

            // Skip if no valid URL
            if (!media.url || !media.url.startsWith("data:")) {
                console.log(`⏭️ Skipping ${media.name} - no valid data`);
                continue;
            }

            try {
                console.log(`📤 Migrating ${media.name}...`);

                // Convert base64 to File
                const response = await fetch(media.url);
                const blob = await response.blob();
                const file = new File([blob], media.fileName || media.name, {
                    type: blob.type
                });

                // Upload to storage
                const uploadResult = await uploadMedia(file);

                // Update media record
                await syncManager.update(
                    COLLECTIONS.MEDIA,
                    media.id,
                    {
                        url: uploadResult.url,
                        fileId: uploadResult.fileId
                        // Removed fileSize, fileType as they're not in schema
                    },
                    STORAGE_KEY
                );

                migrated++;
                console.log(`✅ Migrated ${media.name}`);
            } catch (error) {
                failed++;
                console.error(`❌ Failed to migrate ${media.name}:`, error);
            }
        }

        // Reload data
        await fetchMedia();

        console.log(
            `✅ Migration complete: ${migrated} migrated, ${failed} failed`
        );

        return { migrated, failed };
    }

    return {
        // State
        mediaItems,
        loading,
        error,
        uploadProgress,

        // Constants
        categories,

        // Computed
        totalMedia,
        mediaByCategory,

        // Actions
        fetchMedia,
        addMedia,
        addMediaFromBase64,
        updateMedia,
        deleteMedia,
        getMediaById,
        getMediaByCustomer,
        getMediaByOrder,
        getPreviewUrl,
        isInStorage,
        syncNow,
        migrateToStorage
    };
});

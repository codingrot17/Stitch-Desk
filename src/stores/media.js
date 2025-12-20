// src/stores/media.js - REIMPLEMENTED: Using profile logo pattern (NO database records)
import { defineStore } from "pinia";
import { ref, computed } from "vue";
import {
    uploadMedia,
    deleteFile,
    isStorageUrl,
    getFilePreview
} from "@/services/storage";

const STORAGE_KEY = "media";

export const useMediaStore = defineStore("media", () => {
    // State - Now we only store metadata in localStorage, files go to Appwrite Storage
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

    /**
     * Get current user ID
     */
    function getCurrentUserId() {
        const user = JSON.parse(localStorage.getItem("user") || "null");
        return user?.id || null;
    }

    /**
     * Generate unique local ID
     */
    function generateLocalId() {
        return `media_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Fetch media from localStorage (filtered by user)
     */
    async function fetchMedia() {
        loading.value = true;
        error.value = null;

        try {
            const userId = getCurrentUserId();
            if (!userId) {
                console.error("No user ID found");
                mediaItems.value = [];
                return [];
            }

            // Load from localStorage and filter by current user
            const allMedia = JSON.parse(
                localStorage.getItem(STORAGE_KEY) || "[]"
            );
            const userMedia = allMedia.filter(m => m.userId === userId);

            mediaItems.value = userMedia;
            console.log(`✅ Loaded ${userMedia.length} media items for user`);

            return userMedia;
        } catch (e) {
            error.value = e.message;
            console.error("Failed to fetch media:", e);
            return [];
        } finally {
            loading.value = false;
        }
    }

    /**
     * Add new media - SIMPLIFIED: Storage + localStorage only
     * @param {File} file - File object from input
     * @param {Object} metadata - Additional metadata
     */
    async function addMedia(file, metadata = {}) {
        loading.value = true;
        error.value = null;
        uploadProgress.value = 0;

        try {
            const userId = getCurrentUserId();
            if (!userId) {
                throw new Error("User not authenticated");
            }

            console.log("📤 Starting upload...", {
                name: file.name,
                size: file.size,
                type: file.type
            });

            // Validate file
            if (!(file instanceof File)) {
                throw new Error("Invalid file object");
            }

            if (file.size > 5 * 1024 * 1024) {
                throw new Error("File must be less than 5MB");
            }

            if (!file.type.startsWith("image/")) {
                throw new Error("Only image files are allowed");
            }

            uploadProgress.value = 10;

            // STEP 1: Upload to Appwrite Storage
            console.log("☁️ Uploading to storage...");
            const uploadResult = await uploadMedia(file, metadata);

            console.log("✅ Storage upload successful:", {
                fileId: uploadResult.fileId,
                url: uploadResult.url
            });

            uploadProgress.value = 70;

            // STEP 2: Save metadata to localStorage (NO DATABASE)
            const localId = generateLocalId();

            const mediaItem = {
                id: localId,
                userId: userId, // Tag with user ID
                name: metadata.name || file.name,
                category: metadata.category || "other",
                customerId: metadata.customerId || "",
                orderId: metadata.orderId || "",
                notes: metadata.notes || "",
                url: uploadResult.url,
                fileId: uploadResult.fileId,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            console.log("💾 Saving to localStorage...");

            // Load all media, add new one, save back
            const allMedia = JSON.parse(
                localStorage.getItem(STORAGE_KEY) || "[]"
            );
            allMedia.push(mediaItem);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(allMedia));

            // Update state
            mediaItems.value = allMedia.filter(m => m.userId === userId);

            uploadProgress.value = 100;

            console.log("✅ Media added successfully:", localId);
            return mediaItem;
        } catch (e) {
            error.value = e.message;
            console.error("❌ Upload failed:", e);
            throw e;
        } finally {
            loading.value = false;
            setTimeout(() => {
                uploadProgress.value = 0;
            }, 1000);
        }
    }

    /**
     * Update media metadata (localStorage only)
     */
    async function updateMedia(id, updates) {
        loading.value = true;
        error.value = null;

        try {
            const userId = getCurrentUserId();
            if (!userId) {
                throw new Error("User not authenticated");
            }

            // Don't allow changing URL/fileId/userId
            const { url, fileId, userId: _, ...safeUpdates } = updates;

            console.log("📝 Updating media:", id);

            // Load all media
            const allMedia = JSON.parse(
                localStorage.getItem(STORAGE_KEY) || "[]"
            );

            // Find and update
            const mediaIndex = allMedia.findIndex(
                m => m.id === id && m.userId === userId
            );

            if (mediaIndex === -1) {
                throw new Error("Media not found or access denied");
            }

            allMedia[mediaIndex] = {
                ...allMedia[mediaIndex],
                ...safeUpdates,
                updatedAt: new Date().toISOString()
            };

            // Save back
            localStorage.setItem(STORAGE_KEY, JSON.stringify(allMedia));

            // Update state
            mediaItems.value = allMedia.filter(m => m.userId === userId);

            console.log("✅ Media updated");
            return allMedia[mediaIndex];
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
            const userId = getCurrentUserId();
            if (!userId) {
                throw new Error("User not authenticated");
            }

            console.log("🗑️ Deleting media:", id);

            // Load all media
            const allMedia = JSON.parse(
                localStorage.getItem(STORAGE_KEY) || "[]"
            );

            // Find the item
            const mediaItem = allMedia.find(
                m => m.id === id && m.userId === userId
            );

            if (!mediaItem) {
                throw new Error("Media not found or access denied");
            }

            // Delete from Appwrite Storage
            if (mediaItem.fileId) {
                console.log("☁️ Deleting from storage:", mediaItem.fileId);
                await deleteFile(mediaItem.fileId);
                console.log("✅ Deleted from storage");
            }

            // Remove from localStorage
            const filteredMedia = allMedia.filter(m => m.id !== id);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(filteredMedia));

            // Update state
            mediaItems.value = filteredMedia.filter(m => m.userId === userId);

            console.log("✅ Media deleted successfully");
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
     * Get media by ID (must belong to current user)
     */
    function getMediaById(id) {
        const userId = getCurrentUserId();
        return mediaItems.value.find(m => m.id === id && m.userId === userId);
    }

    /**
     * Get media by customer ID
     */
    function getMediaByCustomer(customerId) {
        return mediaItems.value.filter(m => m.customerId === customerId);
    }

    /**
     * Get media by order ID
     */
    function getMediaByOrder(orderId) {
        return mediaItems.value.filter(m => m.orderId === orderId);
    }

    /**
     * Get preview URL for media
     */
    function getPreviewUrl(id, width = 400, height = 400) {
        const media = getMediaById(id);
        if (!media?.fileId) return null;
        return getFilePreview(media.fileId, width, height);
    }

    /**
     * Check if media is stored in Appwrite Storage
     */
    function isInStorage(id) {
        const media = getMediaById(id);
        return media?.url ? isStorageUrl(media.url) : false;
    }

    /**
     * Clear all media for current user (useful for debugging)
     */
    function clearUserMedia() {
        const userId = getCurrentUserId();
        if (!userId) return;

        const allMedia = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
        const otherUsersMedia = allMedia.filter(m => m.userId !== userId);

        localStorage.setItem(STORAGE_KEY, JSON.stringify(otherUsersMedia));
        mediaItems.value = [];

        console.log("🗑️ Cleared all media for current user");
    }

    /**
     * Migrate old base64 media to Appwrite Storage (one-time operation)
     */
    async function migrateBase64ToStorage() {
        console.log("🔄 Starting migration...");

        const userId = getCurrentUserId();
        if (!userId) {
            throw new Error("User not authenticated");
        }

        let migrated = 0;
        let failed = 0;

        const allMedia = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
        const userMedia = allMedia.filter(m => m.userId === userId);

        for (const media of userMedia) {
            // Skip if already in storage
            if (isStorageUrl(media.url)) {
                console.log(`⏭️ Skipping ${media.name} - already in storage`);
                continue;
            }

            // Skip if no valid base64 data
            if (!media.url || !media.url.startsWith("data:")) {
                console.log(`⏭️ Skipping ${media.name} - no valid data`);
                continue;
            }

            try {
                console.log(`📤 Migrating ${media.name}...`);

                // Convert base64 to File
                const response = await fetch(media.url);
                const blob = await response.blob();
                const file = new File([blob], media.name, { type: blob.type });

                // Upload to storage
                const uploadResult = await uploadMedia(file);

                // Update media item in all media
                const mediaIndex = allMedia.findIndex(m => m.id === media.id);
                if (mediaIndex !== -1) {
                    allMedia[mediaIndex] = {
                        ...allMedia[mediaIndex],
                        url: uploadResult.url,
                        fileId: uploadResult.fileId,
                        updatedAt: new Date().toISOString()
                    };
                }

                migrated++;
                console.log(`✅ Migrated ${media.name}`);
            } catch (error) {
                failed++;
                console.error(`❌ Failed to migrate ${media.name}:`, error);
            }
        }

        // Save updated media
        localStorage.setItem(STORAGE_KEY, JSON.stringify(allMedia));

        // Reload user media
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
        updateMedia,
        deleteMedia,
        getMediaById,
        getMediaByCustomer,
        getMediaByOrder,
        getPreviewUrl,
        isInStorage,
        clearUserMedia,
        migrateBase64ToStorage
    };
});

// src/services/storage.js - Appwrite Storage Service
import { storage, MEDIA_BUCKET_ID, ID } from "./appwrite";

// Get project ID from environment or config
const APPWRITE_PROJECT_ID = "692e8f170024827e1d6c"; // Same as in appwrite.js

/**
 * Upload file to Appwrite Storage
 * @param {File} file - File object from input
 * @param {string} folder - Folder name (e.g., 'logos', 'media')
 * @returns {Promise<string>} - File URL
 */
export async function uploadFile(file, folder = "uploads") {
    try {
        // Validate file
        if (!file) throw new Error("No file provided");

        // Ensure file is a proper File or Blob object
        if (!(file instanceof File) && !(file instanceof Blob)) {
            throw new Error("Invalid file object");
        }

        console.log("📤 Uploading file:", {
            name: file.name,
            size: file.size,
            type: file.type
        });

        // Create unique file ID
        const fileId = ID.unique();

        // Upload to Appwrite Storage
        // IMPORTANT: Appwrite expects the file as the third parameter
        const response = await storage.createFile(
            MEDIA_BUCKET_ID,
            fileId,
            file,
            [] // permissions - empty array for default bucket permissions
        );

        // Get file URL - Build the complete view URL
        // Appwrite SDK's getFileView returns a URL object, but sometimes .href is undefined
        // So we build the URL manually to be safe
        const urlString = `https://cloud.appwrite.io/v1/storage/buckets/${MEDIA_BUCKET_ID}/files/${response.$id}/view?project=${APPWRITE_PROJECT_ID}`;

        console.log("✅ File uploaded:", urlString);

        return {
            fileId: response.$id,
            url: urlString,
            name: file.name || "unnamed",
            size: file.size || 0,
            type: file.type || "unknown"
        };
    } catch (error) {
        console.error("Failed to upload file:", error);
        throw new Error(error.message || "File upload failed");
    }
}

/**
 * Delete file from Appwrite Storage
 * @param {string} fileId - File ID to delete
 * @returns {Promise<boolean>}
 */
export async function deleteFile(fileId) {
    try {
        if (!fileId) return false;

        await storage.deleteFile(MEDIA_BUCKET_ID, fileId);
        console.log("✅ File deleted:", fileId);

        return true;
    } catch (error) {
        console.error("Failed to delete file:", error);
        return false;
    }
}

/**
 * Get file preview/thumbnail
 * @param {string} fileId - File ID
 * @param {number} width - Width in pixels
 * @param {number} height - Height in pixels
 * @returns {string} - Preview URL
 */
export function getFilePreview(fileId, width = 400, height = 400) {
    try {
        // Build preview URL manually
        const previewUrl = `https://cloud.appwrite.io/v1/storage/buckets/${MEDIA_BUCKET_ID}/files/${fileId}/preview?project=${APPWRITE_PROJECT_ID}&width=${width}&height=${height}&gravity=center&quality=100`;

        return previewUrl;
    } catch (error) {
        console.error("Failed to get preview:", error);
        return null;
    }
}

/**
 * Get direct file download URL
 * @param {string} fileId - File ID
 * @returns {string} - Download URL
 */
export function getFileDownload(fileId) {
    try {
        const downloadUrl = `https://cloud.appwrite.io/v1/storage/buckets/${MEDIA_BUCKET_ID}/files/${fileId}/download?project=${APPWRITE_PROJECT_ID}`;
        return downloadUrl;
    } catch (error) {
        console.error("Failed to get download URL:", error);
        return null;
    }
}

/**
 * Upload user logo (specific for profile)
 * @param {File} file - Logo file
 * @returns {Promise<Object>} - File info with ID and URL
 */
export async function uploadLogo(file) {
    try {
        // Validate logo requirements
        if (file.size > 2 * 1024 * 1024) {
            throw new Error("Logo must be less than 2MB");
        }

        if (!file.type.startsWith("image/")) {
            throw new Error("Logo must be an image file");
        }

        // Upload with 'logos' folder prefix
        const result = await uploadFile(file, "logos");

        return result;
    } catch (error) {
        console.error("Logo upload failed:", error);
        throw error;
    }
}

/**
 * Upload media file (for Media gallery)
 * @param {File} file - Media file
 * @param {Object} metadata - Additional metadata
 * @returns {Promise<Object>} - File info
 */
export async function uploadMedia(file, metadata = {}) {
    try {
        // Validate media file
        if (file.size > 5 * 1024 * 1024) {
            throw new Error("Media file must be less than 5MB");
        }

        const result = await uploadFile(file, "media");

        return {
            ...result,
            ...metadata
        };
    } catch (error) {
        console.error("Media upload failed:", error);
        throw error;
    }
}

/**
 * Check if URL is Appwrite Storage URL
 * @param {string} url - URL to check
 * @returns {boolean}
 */
export function isStorageUrl(url) {
    if (!url) return false;
    return (
        url.includes("cloud.appwrite.io") &&
        url.includes("/storage/buckets/") &&
        url.includes("/files/")
    );
}

/**
 * Extract file ID from Appwrite Storage URL
 * @param {string} url - Storage URL
 * @returns {string|null} - File ID
 */
export function extractFileId(url) {
    if (!isStorageUrl(url)) return null;

    try {
        const match = url.match(/\/files\/([^/]+)/);
        return match ? match[1] : null;
    } catch (error) {
        console.error("Failed to extract file ID:", error);
        return null;
    }
}

/**
 * Migrate base64 image to Appwrite Storage
 * Useful for upgrading existing base64 data
 * @param {string} base64Data - Base64 encoded image
 * @param {string} fileName - Original file name
 * @returns {Promise<Object>} - New file info
 */
export async function migrateBase64ToStorage(
    base64Data,
    fileName = "image.png"
) {
    try {
        // Convert base64 to File object
        const response = await fetch(base64Data);
        const blob = await response.blob();
        const file = new File([blob], fileName, { type: blob.type });

        // Upload to storage
        const result = await uploadFile(file);

        return result;
    } catch (error) {
        console.error("Migration failed:", error);
        throw error;
    }
}

export default {
    uploadFile,
    deleteFile,
    getFilePreview,
    getFileDownload,
    uploadLogo,
    uploadMedia,
    isStorageUrl,
    extractFileId,
    migrateBase64ToStorage
};

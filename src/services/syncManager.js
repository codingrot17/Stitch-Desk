// src/services/syncManager.js
import {
    databases,
    isOnline,
    handleAppwriteError,
    DATABASE_ID
} from "./appwrite";
import { useToast } from "./toast";

/**
 * Hybrid Storage Manager
 * - Uses localStorage as primary storage (instant access)
 * - Syncs with Appwrite when online
 * - Queues changes when offline
 * - Auto-syncs when connection restored
 */

const SYNC_QUEUE_KEY = "sync_queue";
const LAST_SYNC_KEY = "last_sync_timestamp";

class SyncManager {
    constructor() {
        this.syncInProgress = false;
        this.setupOnlineListener();
    }

    // Setup online/offline listener
    setupOnlineListener() {
        window.addEventListener("online", () => {
            console.log("📡 Back online - starting sync...");
            useToast().success("Back online - syncing data...");
            this.processSyncQueue();
        });

        window.addEventListener("offline", () => {
            console.log("📴 Offline - changes will be queued");
            useToast().warning("Offline - changes will sync when online");
        });
    }

    // Get sync queue from localStorage
    getSyncQueue() {
        const queue = localStorage.getItem(SYNC_QUEUE_KEY);
        return queue ? JSON.parse(queue) : [];
    }

    // Add operation to sync queue
    addToQueue(operation) {
        const queue = this.getSyncQueue();
        queue.push({
            ...operation,
            timestamp: new Date().toISOString(),
            id: `${operation.collection}_${operation.docId}_${Date.now()}`
        });
        localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
    }

    // Clear sync queue
    clearQueue() {
        localStorage.removeItem(SYNC_QUEUE_KEY);
    }

    // Get last sync timestamp
    getLastSync() {
        return localStorage.getItem(LAST_SYNC_KEY);
    }

    // Update last sync timestamp
    updateLastSync() {
        localStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
    }

    /**
     * CREATE operation with hybrid storage
     */
    async create(collection, data, localStorageKey) {
        // 1. Save to localStorage immediately (instant UX)
        const localData = JSON.parse(
            localStorage.getItem(localStorageKey) || "[]"
        );
        const newItem = {
            id: Date.now().toString(),
            ...data,
            _localOnly: true, // Flag for items not yet synced
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        localData.push(newItem);
        localStorage.setItem(localStorageKey, JSON.stringify(localData));

        // 2. Try to sync to Appwrite if online
        if (isOnline()) {
            try {
                const response = await databases.createDocument(
                    DATABASE_ID,
                    collection,
                    "unique()",
                    {
                        ...data,
                        createdAt: newItem.createdAt,
                        updatedAt: newItem.updatedAt
                    }
                );

                // Update local item with Appwrite ID and remove _localOnly flag
                const updatedData = localData.map(item =>
                    item.id === newItem.id
                        ? { ...item, id: response.$id, _localOnly: false }
                        : item
                );
                localStorage.setItem(
                    localStorageKey,
                    JSON.stringify(updatedData)
                );

                return response;
            } catch (error) {
                console.error("Sync failed, queuing for later:", error);

                // Add to sync queue for later
                this.addToQueue({
                    operation: "create",
                    collection,
                    docId: newItem.id,
                    data,
                    localStorageKey
                });

                useToast().warning("Saved locally - will sync when online");
                return newItem;
            }
        } else {
            // Offline - queue for sync
            this.addToQueue({
                operation: "create",
                collection,
                docId: newItem.id,
                data,
                localStorageKey
            });
            return newItem;
        }
    }

    /**
     * UPDATE operation with hybrid storage
     */
    async update(collection, docId, updates, localStorageKey) {
        // 1. Update localStorage immediately
        const localData = JSON.parse(
            localStorage.getItem(localStorageKey) || "[]"
        );
        const updatedData = localData.map(item =>
            item.id === docId
                ? { ...item, ...updates, updatedAt: new Date().toISOString() }
                : item
        );
        localStorage.setItem(localStorageKey, JSON.stringify(updatedData));

        // 2. Try to sync to Appwrite if online
        if (isOnline()) {
            try {
                const response = await databases.updateDocument(
                    DATABASE_ID,
                    collection,
                    docId,
                    {
                        ...updates,
                        updatedAt: new Date().toISOString()
                    }
                );
                return response;
            } catch (error) {
                console.error("Sync failed, queuing for later:", error);

                this.addToQueue({
                    operation: "update",
                    collection,
                    docId,
                    data: updates,
                    localStorageKey
                });

                useToast().warning("Updated locally - will sync when online");
                return updatedData.find(item => item.id === docId);
            }
        } else {
            // Offline - queue for sync
            this.addToQueue({
                operation: "update",
                collection,
                docId,
                data: updates,
                localStorageKey
            });
            return updatedData.find(item => item.id === docId);
        }
    }

    /**
     * DELETE operation with hybrid storage
     */
    async delete(collection, docId, localStorageKey) {
        // 1. Delete from localStorage immediately
        const localData = JSON.parse(
            localStorage.getItem(localStorageKey) || "[]"
        );
        const filteredData = localData.filter(item => item.id !== docId);
        localStorage.setItem(localStorageKey, JSON.stringify(filteredData));

        // 2. Try to sync to Appwrite if online
        if (isOnline()) {
            try {
                await databases.deleteDocument(DATABASE_ID, collection, docId);
                return true;
            } catch (error) {
                console.error("Delete sync failed, queuing for later:", error);

                this.addToQueue({
                    operation: "delete",
                    collection,
                    docId,
                    localStorageKey
                });

                useToast().warning("Deleted locally - will sync when online");
                return true;
            }
        } else {
            // Offline - queue for sync
            this.addToQueue({
                operation: "delete",
                collection,
                docId,
                localStorageKey
            });
            return true;
        }
    }

    /**
     * FETCH operation - pull from Appwrite, update localStorage
     */
    async fetch(collection, localStorageKey) {
        if (!isOnline()) {
            // Return local data when offline
            return JSON.parse(localStorage.getItem(localStorageKey) || "[]");
        }

        try {
            const response = await databases.listDocuments(
                DATABASE_ID,
                collection
            );
            const items = response.documents.map(doc => ({
                id: doc.$id,
                ...doc,
                _localOnly: false
            }));

            // Update localStorage with server data
            localStorage.setItem(localStorageKey, JSON.stringify(items));
            this.updateLastSync();

            return items;
        } catch (error) {
            console.error("Fetch failed, using local data:", error);
            useToast().error("Could not fetch latest data");

            // Fallback to local data
            return JSON.parse(localStorage.getItem(localStorageKey) || "[]");
        }
    }

    /**
     * Process sync queue (run all pending operations)
     */
    async processSyncQueue() {
        if (this.syncInProgress || !isOnline()) return;

        this.syncInProgress = true;
        const queue = this.getSyncQueue();

        if (queue.length === 0) {
            this.syncInProgress = false;
            return;
        }

        console.log(`🔄 Processing ${queue.length} queued operations...`);
        let successCount = 0;
        let failedOps = [];

        for (const op of queue) {
            try {
                switch (op.operation) {
                    case "create":
                        await databases.createDocument(
                            DATABASE_ID,
                            op.collection,
                            op.docId,
                            op.data
                        );
                        break;

                    case "update":
                        await databases.updateDocument(
                            DATABASE_ID,
                            op.collection,
                            op.docId,
                            op.data
                        );
                        break;

                    case "delete":
                        await databases.deleteDocument(
                            DATABASE_ID,
                            op.collection,
                            op.docId
                        );
                        break;
                }

                successCount++;
            } catch (error) {
                console.error(`Failed to sync operation:`, op, error);
                failedOps.push(op);
            }
        }

        // Update queue with only failed operations
        if (failedOps.length > 0) {
            localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(failedOps));
            useToast().warning(
                `Synced ${successCount}/${queue.length} changes`
            );
        } else {
            this.clearQueue();
            useToast().success(`All ${successCount} changes synced!`);
        }

        this.syncInProgress = false;
        this.updateLastSync();
    }

    /**
     * Manual sync trigger
     */
    async syncNow() {
        if (!isOnline()) {
            useToast().error("Cannot sync - you are offline");
            return false;
        }

        useToast().info("Starting sync...");
        await this.processSyncQueue();
        return true;
    }

    /**
     * Get sync status
     */
    getSyncStatus() {
        const queue = this.getSyncQueue();
        const lastSync = this.getLastSync();

        return {
            pendingOperations: queue.length,
            lastSyncTime: lastSync,
            isOnline: isOnline(),
            syncInProgress: this.syncInProgress
        };
    }
}

// Export singleton instance
export const syncManager = new SyncManager();

// src/services/syncManager.js - Updated with user-scoped data
import {
    databases,
    isOnline,
    handleAppwriteError,
    DATABASE_ID,
    createQuery
} from "./appwrite";
import { useToast } from "./toast";

const SYNC_QUEUE_KEY = "sync_queue";
const LAST_SYNC_KEY = "last_sync_timestamp";

class SyncManager {
    constructor() {
        this.syncInProgress = false;
        this.setupOnlineListener();
    }

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

    /**
     * Get current user ID from localStorage
     */
    getCurrentUserId() {
        const user = JSON.parse(localStorage.getItem("user") || "null");
        return user?.id || null;
    }

    getSyncQueue() {
        const queue = localStorage.getItem(SYNC_QUEUE_KEY);
        return queue ? JSON.parse(queue) : [];
    }

    addToQueue(operation) {
        const queue = this.getSyncQueue();
        queue.push({
            ...operation,
            timestamp: new Date().toISOString(),
            id: `${operation.collection}_${operation.docId}_${Date.now()}`
        });
        localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
    }

    clearQueue() {
        localStorage.removeItem(SYNC_QUEUE_KEY);
    }

    getLastSync() {
        return localStorage.getItem(LAST_SYNC_KEY);
    }

    updateLastSync() {
        localStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
    }

    /**
     * CREATE - Add userId to all documents
     */
    async create(collection, data, localStorageKey) {
        const userId = this.getCurrentUserId();
        if (!userId) {
            console.error("No user ID found - cannot create document");
            throw new Error("User not authenticated");
        }

        // Add userId to data
        const dataWithUser = {
            ...data,
            userId, // CRITICAL: Tag data with user ID
            $createdAt: new Date().toISOString(),
            $updatedAt: new Date().toISOString()
        };

        // Save to localStorage immediately
        const localData = JSON.parse(
            localStorage.getItem(localStorageKey) || "[]"
        );
        const newItem = {
            id: Date.now().toString(),
            ...dataWithUser,
            _localOnly: true
        };
        localData.push(newItem);
        localStorage.setItem(localStorageKey, JSON.stringify(localData));

        // Try to sync to Appwrite if online
        if (isOnline()) {
            try {
                const response = await databases.createDocument(
                    DATABASE_ID,
                    collection,
                    "unique()",
                    dataWithUser
                );

                // Update with Appwrite ID
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

                this.addToQueue({
                    operation: "create",
                    collection,
                    docId: newItem.id,
                    data: dataWithUser,
                    localStorageKey
                });

                useToast().warning("Saved locally - will sync when online");
                return newItem;
            }
        } else {
            this.addToQueue({
                operation: "create",
                collection,
                docId: newItem.id,
                data: dataWithUser,
                localStorageKey
            });
            return newItem;
        }
    }

    /**
     * UPDATE - Ensure userId is preserved
     */
    async update(collection, docId, updates, localStorageKey) {
        // Don't allow changing userId
        const { userId, ...safeUpdates } = updates;

        const localData = JSON.parse(
            localStorage.getItem(localStorageKey) || "[]"
        );
        const updatedData = localData.map(item =>
            item.id === docId
                ? {
                      ...item,
                      ...safeUpdates,
                      updatedAt: new Date().toISOString()
                  }
                : item
        );
        localStorage.setItem(localStorageKey, JSON.stringify(updatedData));

        if (isOnline()) {
            try {
                const response = await databases.updateDocument(
                    DATABASE_ID,
                    collection,
                    docId,
                    {
                        ...safeUpdates,
                        $updatedAt: new Date().toISOString()
                    }
                );
                return response;
            } catch (error) {
                console.error("Sync failed, queuing for later:", error);

                this.addToQueue({
                    operation: "update",
                    collection,
                    docId,
                    data: safeUpdates,
                    localStorageKey
                });

                useToast().warning("Updated locally - will sync when online");
                return updatedData.find(item => item.id === docId);
            }
        } else {
            this.addToQueue({
                operation: "update",
                collection,
                docId,
                data: safeUpdates,
                localStorageKey
            });
            return updatedData.find(item => item.id === docId);
        }
    }

    /**
     * DELETE
     */
    async delete(collection, docId, localStorageKey) {
        const localData = JSON.parse(
            localStorage.getItem(localStorageKey) || "[]"
        );
        const filteredData = localData.filter(item => item.id !== docId);
        localStorage.setItem(localStorageKey, JSON.stringify(filteredData));

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
     * FETCH - Filter by current user
     */
    async fetch(collection, localStorageKey) {
        const userId = this.getCurrentUserId();

        if (!userId) {
            console.error("No user ID - cannot fetch data");
            return [];
        }

        if (!isOnline()) {
            // Return local data filtered by user
            const allLocal = JSON.parse(
                localStorage.getItem(localStorageKey) || "[]"
            );
            return allLocal.filter(item => item.userId === userId);
        }

        try {
            // Query Appwrite for THIS user's data only
            const response = await databases.listDocuments(
                DATABASE_ID,
                collection,
                [
                    createQuery.equal("userId", userId) // CRITICAL: Filter by user
                ]
            );

            const items = response.documents.map(doc => ({
                id: doc.$id,
                ...doc,
                _localOnly: false
            }));

            // Update localStorage with user's data
            localStorage.setItem(localStorageKey, JSON.stringify(items));
            this.updateLastSync();

            console.log(
                `✅ Fetched ${items.length} ${collection} for user ${userId}`
            );

            return items;
        } catch (error) {
            console.error("Fetch failed, using local data:", error);
            useToast().error("Could not fetch latest data");

            // Fallback to local data filtered by user
            const allLocal = JSON.parse(
                localStorage.getItem(localStorageKey) || "[]"
            );
            return allLocal.filter(item => item.userId === userId);
        }
    }

    /**
     * Process sync queue
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

    async syncNow() {
        if (!isOnline()) {
            useToast().error("Cannot sync - you are offline");
            return false;
        }

        useToast().info("Starting sync...");
        await this.processSyncQueue();
        return true;
    }

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

export const syncManager = new SyncManager();

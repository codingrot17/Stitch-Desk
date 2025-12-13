// src/services/syncManager.js - Fixed version
import {
    databases,
    isOnline,
    handleAppwriteError,
    DATABASE_ID
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
     * CREATE operation with hybrid storage
     */
    async create(collection, data, localStorageKey) {
        const localData = JSON.parse(
            localStorage.getItem(localStorageKey) || "[]"
        );
        const newItem = {
            id: Date.now().toString(),
            ...data,
            _localOnly: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        localData.push(newItem);
        localStorage.setItem(localStorageKey, JSON.stringify(localData));

        if (isOnline()) {
            try {
                const response = await databases.createDocument(
                    DATABASE_ID,
                    collection,
                    "unique()",
                    {
                        ...data,
                        $createdAt: newItem.createdAt,
                        $updatedAt: newItem.updatedAt
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
     * FIX: Check if item has valid Appwrite ID before syncing
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

        // Get the updated item to check if it has a valid Appwrite ID
        const updatedItem = updatedData.find(item => item.id === docId);

        // Check if item exists and has valid Appwrite ID
        if (!updatedItem) {
            console.error("Item not found in localStorage:", docId);
            return null;
        }

        // Check if this is a local-only item (not yet synced to Appwrite)
        if (updatedItem._localOnly || !docId || docId.length < 10) {
            console.log("Item not yet synced to Appwrite, queueing update...");
            this.addToQueue({
                operation: "update",
                collection,
                docId,
                data: updates,
                localStorageKey
            });
            return updatedItem;
        }

        // 2. Try to sync to Appwrite if online and item has valid ID
        if (isOnline()) {
            try {
                const response = await databases.updateDocument(
                    DATABASE_ID,
                    collection,
                    docId, // Use the actual Appwrite document ID
                    {
                        ...updates,
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
                    data: updates,
                    localStorageKey
                });

                useToast().warning("Updated locally - will sync when online");
                return updatedItem;
            }
        } else {
            this.addToQueue({
                operation: "update",
                collection,
                docId,
                data: updates,
                localStorageKey
            });
            return updatedItem;
        }
    }

    /**
     * DELETE operation with hybrid storage
     * FIX: Check if item has valid Appwrite ID before syncing
     */
    async delete(collection, docId, localStorageKey) {
        // 1. Get item before deleting to check if it's synced
        const localData = JSON.parse(
            localStorage.getItem(localStorageKey) || "[]"
        );
        const itemToDelete = localData.find(item => item.id === docId);

        // 2. Delete from localStorage immediately
        const filteredData = localData.filter(item => item.id !== docId);
        localStorage.setItem(localStorageKey, JSON.stringify(filteredData));

        // Check if item was synced to Appwrite (has valid ID and not _localOnly)
        if (
            !itemToDelete ||
            itemToDelete._localOnly ||
            !docId ||
            docId.length < 10
        ) {
            console.log("Item was local-only, no need to sync deletion");
            return true;
        }

        // 3. Try to sync to Appwrite if online and item was synced
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
     * FETCH operation - pull from Appwrite, update localStorage
     */
    async fetch(collection, localStorageKey) {
        if (!isOnline()) {
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

            // Merge with local-only items (items not yet synced)
            const localData = JSON.parse(
                localStorage.getItem(localStorageKey) || "[]"
            );
            const localOnlyItems = localData.filter(item => item._localOnly);

            // Combine: Appwrite items + local-only items
            const mergedItems = [...items, ...localOnlyItems];

            localStorage.setItem(localStorageKey, JSON.stringify(mergedItems));
            this.updateLastSync();

            return mergedItems;
        } catch (error) {
            console.error("Fetch failed, using local data:", error);
            useToast().error("Could not fetch latest data");

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
                // Skip operations with invalid IDs
                if (
                    op.operation !== "create" &&
                    (!op.docId || op.docId.length < 10)
                ) {
                    console.log("Skipping operation with invalid ID:", op);
                    continue;
                }

                switch (op.operation) {
                    case "create":
                        await databases.createDocument(
                            DATABASE_ID,
                            op.collection,
                            "unique()",
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

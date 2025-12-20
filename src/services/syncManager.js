// src/services/syncManager.js - FIXED: Better unique ID generation
import {
    databases,
    isOnline,
    handleAppwriteError,
    DATABASE_ID,
    createQuery,
    ID
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
     * FIXED: Generate truly unique ID with multiple entropy sources
     */
    generateUniqueId() {
        // Combine multiple sources of randomness for better uniqueness
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 15);
        const random2 = Math.random().toString(36).substring(2, 15);
        const counter = (window.idCounter = (window.idCounter || 0) + 1);

        return `${timestamp}_${random}${random2}_${counter}`;
    }

    /**
     * CREATE - FIXED: Better unique ID generation
     */
    async create(collection, data, localStorageKey) {
        const userId = this.getCurrentUserId();
        if (!userId) {
            console.error("No user ID found - cannot create document");
            throw new Error("User not authenticated");
        }

        const dataWithUser = {
            ...data,
            userId,
            $createdAt: new Date().toISOString(),
            $updatedAt: new Date().toISOString()
        };

        if (isOnline()) {
            try {
                console.log("📤 Creating document in Appwrite...");

                // CRITICAL FIX: Use ID.unique() which is Appwrite's built-in unique ID generator
                // This ensures no collisions
                const response = await databases.createDocument(
                    DATABASE_ID,
                    collection,
                    ID.unique(), // Let Appwrite handle ID generation
                    dataWithUser
                );

                console.log("✅ Document created:", response.$id);

                // Save to localStorage with Appwrite's ID
                const localData = JSON.parse(
                    localStorage.getItem(localStorageKey) || "[]"
                );

                const newItem = {
                    id: response.$id,
                    ...response,
                    _localOnly: false
                };

                localData.push(newItem);
                localStorage.setItem(
                    localStorageKey,
                    JSON.stringify(localData)
                );

                return response;
            } catch (error) {
                console.error("❌ Appwrite sync failed:", error);

                // IMPORTANT: If we get a 409 (document already exists),
                // it means there's a collision. Retry with a new ID.
                if (error.code === 409) {
                    console.log(
                        "🔄 Document ID collision detected, retrying..."
                    );
                    // Wait a tiny bit and retry
                    await new Promise(resolve => setTimeout(resolve, 100));
                    return this.create(collection, data, localStorageKey);
                }

                // Save locally with unique temp ID
                const tempId = this.generateUniqueId();
                const localData = JSON.parse(
                    localStorage.getItem(localStorageKey) || "[]"
                );

                const newItem = {
                    id: tempId,
                    ...dataWithUser,
                    _localOnly: true
                };

                localData.push(newItem);
                localStorage.setItem(
                    localStorageKey,
                    JSON.stringify(localData)
                );

                this.addToQueue({
                    operation: "create",
                    collection,
                    docId: tempId,
                    data: dataWithUser,
                    localStorageKey
                });

                useToast().warning("Saved locally - will sync when online");
                return newItem;
            }
        } else {
            // Offline: save with unique temp ID
            const tempId = this.generateUniqueId();
            const localData = JSON.parse(
                localStorage.getItem(localStorageKey) || "[]"
            );

            const newItem = {
                id: tempId,
                ...dataWithUser,
                _localOnly: true
            };

            localData.push(newItem);
            localStorage.setItem(localStorageKey, JSON.stringify(localData));

            this.addToQueue({
                operation: "create",
                collection,
                docId: tempId,
                data: dataWithUser,
                localStorageKey
            });

            return newItem;
        }
    }

    /**
     * UPDATE
     */
    async update(collection, docId, updates, localStorageKey) {
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
     * FETCH
     */
    async fetch(collection, localStorageKey) {
        const userId = this.getCurrentUserId();

        if (!userId) {
            console.error("No user ID - cannot fetch data");
            return [];
        }

        if (!isOnline()) {
            const allLocal = JSON.parse(
                localStorage.getItem(localStorageKey) || "[]"
            );
            return allLocal.filter(item => item.userId === userId);
        }

        try {
            const response = await databases.listDocuments(
                DATABASE_ID,
                collection,
                [createQuery.equal("userId", userId)]
            );

            const items = response.documents.map(doc => ({
                id: doc.$id,
                ...doc,
                _localOnly: false
            }));

            localStorage.setItem(localStorageKey, JSON.stringify(items));
            this.updateLastSync();

            console.log(
                `✅ Fetched ${items.length} ${collection} for user ${userId}`
            );

            return items;
        } catch (error) {
            console.error("Fetch failed, using local data:", error);
            useToast().error("Could not fetch latest data");

            const allLocal = JSON.parse(
                localStorage.getItem(localStorageKey) || "[]"
            );
            return allLocal.filter(item => item.userId === userId);
        }
    }

    /**
     * Process sync queue - FIXED: Better error handling for 409 conflicts
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
                        try {
                            const response = await databases.createDocument(
                                DATABASE_ID,
                                op.collection,
                                ID.unique(),
                                op.data
                            );

                            // Update localStorage with new Appwrite ID
                            const localData = JSON.parse(
                                localStorage.getItem(op.localStorageKey) || "[]"
                            );
                            const updatedData = localData.map(item =>
                                item.id === op.docId
                                    ? {
                                          ...item,
                                          id: response.$id,
                                          _localOnly: false
                                      }
                                    : item
                            );
                            localStorage.setItem(
                                op.localStorageKey,
                                JSON.stringify(updatedData)
                            );
                        } catch (createError) {
                            // If 409, the document might already exist, skip it
                            if (createError.code === 409) {
                                console.warn(
                                    "Document already synced, skipping"
                                );
                            } else {
                                throw createError;
                            }
                        }
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

// src/utils/migrate.js
// Run this once to migrate existing localStorage data to Appwrite

import { databases, DATABASE_ID, COLLECTIONS } from "@/services/appwrite";
import { useToast } from "@/services/toast";

const toast = useToast();

/**
 * Migrate all localStorage data to Appwrite
 * Run this from browser console: window.migrateToAppwrite()
 */
export async function migrateToAppwrite() {
    console.log("🚀 Starting migration to Appwrite...");

    const results = {
        customers: 0,
        orders: 0,
        measurements: 0,
        inventory: 0,
        tasks: 0,
        media: 0,
        errors: []
    };

    try {
        // Migrate Customers
        console.log("📦 Migrating customers...");
        const customers = JSON.parse(localStorage.getItem("customers") || "[]");
        for (const customer of customers) {
            try {
                const { id, _localOnly, ...data } = customer;
                await databases.createDocument(
                    DATABASE_ID,
                    COLLECTIONS.CUSTOMERS,
                    id,
                    data
                );
                results.customers++;
            } catch (error) {
                if (error.code !== 409) {
                    // Skip if already exists
                    console.error(
                        "Failed to migrate customer:",
                        customer,
                        error
                    );
                    results.errors.push({
                        type: "customer",
                        id: customer.id,
                        error: error.message
                    });
                }
            }
        }

        // Migrate Orders
        console.log("📦 Migrating orders...");
        const orders = JSON.parse(localStorage.getItem("orders") || "[]");
        for (const order of orders) {
            try {
                const { id, _localOnly, ...data } = order;
                await databases.createDocument(
                    DATABASE_ID,
                    COLLECTIONS.ORDERS,
                    id,
                    data
                );
                results.orders++;
            } catch (error) {
                if (error.code !== 409) {
                    console.error("Failed to migrate order:", order, error);
                    results.errors.push({
                        type: "order",
                        id: order.id,
                        error: error.message
                    });
                }
            }
        }

        // Migrate Measurements
        console.log("📦 Migrating measurements...");
        const measurements = JSON.parse(
            localStorage.getItem("measurements") || "[]"
        );
        for (const measurement of measurements) {
            try {
                const { id, _localOnly, ...data } = measurement;
                // Convert values object to JSON string
                const processedData = {
                    ...data,
                    values: JSON.stringify(data.values)
                };
                await databases.createDocument(
                    DATABASE_ID,
                    COLLECTIONS.MEASUREMENTS,
                    id,
                    processedData
                );
                results.measurements++;
            } catch (error) {
                if (error.code !== 409) {
                    console.error(
                        "Failed to migrate measurement:",
                        measurement,
                        error
                    );
                    results.errors.push({
                        type: "measurement",
                        id: measurement.id,
                        error: error.message
                    });
                }
            }
        }

        // Migrate Inventory
        console.log("📦 Migrating inventory...");
        const inventory = JSON.parse(localStorage.getItem("inventory") || "[]");
        for (const item of inventory) {
            try {
                const { id, _localOnly, ...data } = item;
                await databases.createDocument(
                    DATABASE_ID,
                    COLLECTIONS.INVENTORY,
                    id,
                    data
                );
                results.inventory++;
            } catch (error) {
                if (error.code !== 409) {
                    console.error("Failed to migrate inventory:", item, error);
                    results.errors.push({
                        type: "inventory",
                        id: item.id,
                        error: error.message
                    });
                }
            }
        }

        // Migrate Tasks
        console.log("📦 Migrating tasks...");
        const tasks = JSON.parse(localStorage.getItem("tasks") || "[]");
        for (const task of tasks) {
            try {
                const { id, _localOnly, ...data } = task;
                await databases.createDocument(
                    DATABASE_ID,
                    COLLECTIONS.TASKS,
                    id,
                    data
                );
                results.tasks++;
            } catch (error) {
                if (error.code !== 409) {
                    console.error("Failed to migrate task:", task, error);
                    results.errors.push({
                        type: "task",
                        id: task.id,
                        error: error.message
                    });
                }
            }
        }

        // Migrate Media (metadata only, not base64 data)
        console.log("📦 Migrating media metadata...");
        const media = JSON.parse(localStorage.getItem("media") || "[]");
        for (const item of media) {
            try {
                const { id, _localOnly, url, ...data } = item;
                // Skip base64 URLs for now (too large for database)
                if (!url.startsWith("data:")) {
                    await databases.createDocument(
                        DATABASE_ID,
                        COLLECTIONS.MEDIA,
                        id,
                        { ...data, url }
                    );
                    results.media++;
                }
            } catch (error) {
                if (error.code !== 409) {
                    console.error("Failed to migrate media:", item, error);
                    results.errors.push({
                        type: "media",
                        id: item.id,
                        error: error.message
                    });
                }
            }
        }

        // Summary
        console.log("✅ Migration complete!");
        console.log("Results:", results);

        const totalMigrated =
            results.customers +
            results.orders +
            results.measurements +
            results.inventory +
            results.tasks +
            results.media;

        toast.success(`Migrated ${totalMigrated} items to Appwrite!`);

        if (results.errors.length > 0) {
            console.warn(
                `⚠️ ${results.errors.length} errors occurred:`,
                results.errors
            );
            toast.warning(
                `${results.errors.length} items had errors - check console`
            );
        }

        return results;
    } catch (error) {
        console.error("❌ Migration failed:", error);
        toast.error("Migration failed - check console");
        throw error;
    }
}

/**
 * Verify migration by comparing counts
 */
export async function verifyMigration() {
    console.log("🔍 Verifying migration...");

    const localCounts = {
        customers: JSON.parse(localStorage.getItem("customers") || "[]").length,
        orders: JSON.parse(localStorage.getItem("orders") || "[]").length,
        measurements: JSON.parse(localStorage.getItem("measurements") || "[]")
            .length,
        inventory: JSON.parse(localStorage.getItem("inventory") || "[]").length,
        tasks: JSON.parse(localStorage.getItem("tasks") || "[]").length,
        media: JSON.parse(localStorage.getItem("media") || "[]").length
    };

    const appwriteCounts = {};

    try {
        for (const [key, collectionId] of Object.entries(COLLECTIONS)) {
            const response = await databases.listDocuments(
                DATABASE_ID,
                collectionId
            );
            appwriteCounts[key.toLowerCase()] = response.total;
        }

        console.log("Local counts:", localCounts);
        console.log("Appwrite counts:", appwriteCounts);

        const differences = Object.keys(localCounts).filter(
            key => localCounts[key] !== appwriteCounts[key]
        );

        if (differences.length === 0) {
            console.log("✅ All data migrated successfully!");
            toast.success("Migration verified - all data synced!");
            return true;
        } else {
            console.warn("⚠️ Differences found:", differences);
            differences.forEach(key => {
                console.log(
                    `${key}: Local=${localCounts[key]}, Appwrite=${appwriteCounts[key]}`
                );
            });
            toast.warning("Some items may not have migrated - check console");
            return false;
        }
    } catch (error) {
        console.error("Verification failed:", error);
        toast.error("Could not verify migration");
        return false;
    }
}

/**
 * Backup localStorage before migration
 */
export function backupLocalStorage() {
    const backup = {
        timestamp: new Date().toISOString(),
        data: {
            customers: localStorage.getItem("customers"),
            orders: localStorage.getItem("orders"),
            measurements: localStorage.getItem("measurements"),
            inventory: localStorage.getItem("inventory"),
            tasks: localStorage.getItem("tasks"),
            media: localStorage.getItem("media")
        }
    };

    const blob = new Blob([JSON.stringify(backup, null, 2)], {
        type: "application/json"
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `stitchdesk-backup-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);

    console.log("✅ Backup created and downloaded");
    toast.success("Backup downloaded successfully");
}

// Expose to window for easy access from console
if (typeof window !== "undefined") {
    window.migrateToAppwrite = migrateToAppwrite;
    window.verifyMigration = verifyMigration;
    window.backupLocalStorage = backupLocalStorage;
}

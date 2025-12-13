// src/utils/debugSync.js - Debugging tool for Appwrite sync issues

import {
    databases,
    DATABASE_ID,
    COLLECTIONS,
    isOnline
} from "@/services/appwrite";
import { syncManager } from "@/services/syncManager";

/**
 * Comprehensive debug tool to check Appwrite connection
 * Run from browser console: window.debugAppwrite()
 */
export async function debugAppwrite() {
    console.log("🔍 Starting Appwrite Debug...\n");

    const results = {
        step1_online: false,
        step2_connection: false,
        step3_database: false,
        step4_permissions: false,
        step5_data: {},
        errors: []
    };

    // ===== STEP 1: Check Online Status =====
    console.log("📡 STEP 1: Checking connection...");
    results.step1_online = navigator.onLine;
    console.log(`Online: ${results.step1_online ? "✅ YES" : "❌ NO"}`);

    if (!results.step1_online) {
        console.error("❌ You are OFFLINE. Connect to internet first.");
        return results;
    }

    // ===== STEP 2: Test Appwrite Connection =====
    console.log("\n🔌 STEP 2: Testing Appwrite connection...");
    try {
        const health = await fetch("https://cloud.appwrite.io/v1/health");
        results.step2_connection = health.ok;
        console.log(
            `Appwrite Server: ${health.ok ? "✅ REACHABLE" : "❌ UNREACHABLE"}`
        );
    } catch (error) {
        console.error("❌ Cannot reach Appwrite server:", error.message);
        results.errors.push({ step: 2, error: error.message });
        return results;
    }

    // ===== STEP 3: Test Database Access =====
    console.log("\n💾 STEP 3: Testing database access...");
    try {
        const response = await databases.listDocuments(
            DATABASE_ID,
            COLLECTIONS.CUSTOMERS
        );
        results.step3_database = true;
        console.log("✅ Database accessible");
        console.log(`Found ${response.documents.length} customers in Appwrite`);
        results.step5_data.customers = response.documents.length;
    } catch (error) {
        console.error("❌ Database access failed:", error);
        results.errors.push({
            step: 3,
            error: error.message,
            code: error.code,
            type: error.type
        });

        // Detailed error analysis
        if (error.code === 401) {
            console.error("\n🔴 ERROR: Unauthorized (401)");
            console.error("Your Project ID might be wrong or API key missing");
            console.error(
                "Current PROJECT_ID:",
                "Check src/services/appwrite.js"
            );
        } else if (error.code === 404) {
            console.error("\n🔴 ERROR: Not Found (404)");
            console.error("Database ID or Collection ID is wrong");
            console.error("Current DATABASE_ID:", DATABASE_ID);
            console.error("Current COLLECTION:", COLLECTIONS.CUSTOMERS);
        } else if (error.code === 403) {
            console.error("\n🔴 ERROR: Forbidden (403)");
            console.error("Permission denied - check collection permissions");
        }

        return results;
    }

    // ===== STEP 4: Test Write Permissions =====
    console.log("\n✍️ STEP 4: Testing write permissions...");
    try {
        const testDoc = {
            name: "Debug Test Customer",
            email: "test@debug.com",
            phone: "1234567890",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        const created = await databases.createDocument(
            DATABASE_ID,
            COLLECTIONS.CUSTOMERS,
            "unique()",
            testDoc
        );

        console.log(
            "✅ Write permission OK - Test document created:",
            created.$id
        );

        // Clean up test document
        await databases.deleteDocument(
            DATABASE_ID,
            COLLECTIONS.CUSTOMERS,
            created.$id
        );
        console.log("✅ Test document cleaned up");

        results.step4_permissions = true;
    } catch (error) {
        console.error("❌ Write permission failed:", error);
        results.errors.push({
            step: 4,
            error: error.message,
            code: error.code
        });

        if (error.code === 401 || error.code === 403) {
            console.error("\n🔴 PERMISSION ERROR");
            console.error(
                "Go to Appwrite Console → Database → customers collection"
            );
            console.error("Settings → Permissions → Add rule:");
            console.error("  Role: Any");
            console.error(
                "  Permissions: ✅ Create, ✅ Read, ✅ Update, ✅ Delete"
            );
        }
    }

    // ===== STEP 5: Check All Collections =====
    console.log("\n📊 STEP 5: Checking all collections...");
    for (const [name, collectionId] of Object.entries(COLLECTIONS)) {
        try {
            const response = await databases.listDocuments(
                DATABASE_ID,
                collectionId
            );
            results.step5_data[name.toLowerCase()] = response.documents.length;
            console.log(`${name}: ${response.documents.length} documents`);
        } catch (error) {
            console.error(`❌ ${name}: ${error.message}`);
            results.errors.push({ collection: name, error: error.message });
        }
    }

    // ===== STEP 6: Check Sync Queue =====
    console.log("\n⏳ STEP 6: Checking sync queue...");
    const queue = syncManager.getSyncQueue();
    console.log(`Pending operations: ${queue.length}`);

    if (queue.length > 0) {
        console.log("Queued operations:", queue);
        console.log("\n💡 TIP: Run syncManager.syncNow() to process queue");
    }

    // ===== STEP 7: Compare Local vs Cloud Data =====
    console.log("\n🔄 STEP 7: Comparing local vs cloud data...");
    const localData = {
        customers: JSON.parse(localStorage.getItem("customers") || "[]").length,
        orders: JSON.parse(localStorage.getItem("orders") || "[]").length,
        tasks: JSON.parse(localStorage.getItem("tasks") || "[]").length,
        inventory: JSON.parse(localStorage.getItem("inventory") || "[]").length,
        measurements: JSON.parse(localStorage.getItem("measurements") || "[]")
            .length,
        media: JSON.parse(localStorage.getItem("media") || "[]").length
    };

    console.table({
        "Local Storage": localData,
        "Appwrite Cloud": results.step5_data
    });

    // ===== SUMMARY =====
    console.log("\n📋 SUMMARY");
    console.log("=".repeat(50));
    console.log(`1. Online: ${results.step1_online ? "✅" : "❌"}`);
    console.log(`2. Connection: ${results.step2_connection ? "✅" : "❌"}`);
    console.log(`3. Database: ${results.step3_database ? "✅" : "❌"}`);
    console.log(`4. Permissions: ${results.step4_permissions ? "✅" : "❌"}`);
    console.log(`5. Sync Queue: ${queue.length} pending`);

    if (results.errors.length > 0) {
        console.log("\n❌ ERRORS FOUND:");
        results.errors.forEach((err, i) => {
            console.log(`${i + 1}. ${err.error}`);
        });
    }

    // ===== RECOMMENDATIONS =====
    console.log("\n💡 RECOMMENDATIONS:");

    if (!results.step3_database) {
        console.log("1. ❌ Fix database connection first");
        console.log("   - Check PROJECT_ID in src/services/appwrite.js");
        console.log("   - Check DATABASE_ID matches Appwrite Console");
    } else if (!results.step4_permissions) {
        console.log("1. ❌ Fix permissions in Appwrite Console");
        console.log("   - Go to each collection → Settings → Permissions");
        console.log('   - Add role "Any" with all permissions');
    } else if (queue.length > 0) {
        console.log("1. ⚠️ You have pending operations");
        console.log("   - Run: syncManager.syncNow()");
    } else {
        console.log("1. ✅ Everything looks good!");
        console.log("   - Try adding a new item to test sync");
    }

    return results;
}

/**
 * Quick test to create a document in Appwrite
 */
export async function testCreate() {
    console.log("🧪 Testing direct Appwrite create...");

    try {
        const testDoc = {
            name: "Test Customer " + Date.now(),
            email: "test@example.com",
            phone: "1234567890",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        const result = await databases.createDocument(
            DATABASE_ID,
            COLLECTIONS.CUSTOMERS,
            "unique()",
            testDoc
        );

        console.log("✅ SUCCESS! Document created:", result);
        console.log("Document ID:", result.$id);

        return result;
    } catch (error) {
        console.error("❌ FAILED:", error);
        console.error("Error code:", error.code);
        console.error("Error type:", error.type);
        console.error("Error message:", error.message);

        throw error;
    }
}

/**
 * Test sync manager directly
 */
export async function testSyncManager() {
    console.log("🧪 Testing syncManager...");

    const testCustomer = {
        name: "Sync Test " + Date.now(),
        email: "sync@test.com",
        phone: "9876543210"
    };

    try {
        console.log("Calling syncManager.create...");
        const result = await syncManager.create(
            COLLECTIONS.CUSTOMERS,
            testCustomer,
            "customers"
        );

        console.log("✅ syncManager.create succeeded:", result);

        // Check if it's in localStorage
        const localData = JSON.parse(localStorage.getItem("customers") || "[]");
        const found = localData.find(c => c.name === testCustomer.name);
        console.log("In localStorage?", found ? "✅ YES" : "❌ NO");

        // Check if it's in Appwrite
        const cloudData = await databases.listDocuments(
            DATABASE_ID,
            COLLECTIONS.CUSTOMERS
        );
        const inCloud = cloudData.documents.find(
            d => d.name === testCustomer.name
        );
        console.log("In Appwrite?", inCloud ? "✅ YES" : "❌ NO");

        return result;
    } catch (error) {
        console.error("❌ syncManager test failed:", error);
        throw error;
    }
}

/**
 * Check specific error scenarios
 */
export function checkCommonIssues() {
    console.log("🔍 Checking common issues...\n");

    // Check 1: Navigator online
    console.log(
        "1. Browser online status:",
        navigator.onLine ? "✅ Online" : "❌ Offline"
    );

    // Check 2: localStorage access
    try {
        localStorage.setItem("test", "test");
        localStorage.removeItem("test");
        console.log("2. localStorage access: ✅ OK");
    } catch (e) {
        console.log("2. localStorage access: ❌ BLOCKED");
    }

    // Check 3: Sync queue
    const queue = localStorage.getItem("sync_queue");
    const queueLength = queue ? JSON.parse(queue).length : 0;
    console.log(`3. Sync queue: ${queueLength} operations pending`);

    if (queueLength > 0) {
        console.log("   Operations:", JSON.parse(queue));
    }

    // Check 4: Last sync
    const lastSync = localStorage.getItem("last_sync_timestamp");
    console.log("4. Last sync:", lastSync || "Never");

    // Check 5: Appwrite config
    console.log("5. Appwrite config:");
    console.log("   DATABASE_ID:", DATABASE_ID);
    console.log("   Collections:", Object.keys(COLLECTIONS));
}

// Expose to window
if (typeof window !== "undefined") {
    window.debugAppwrite = debugAppwrite;
    window.testCreate = testCreate;
    window.testSyncManager = testSyncManager;
    window.checkCommonIssues = checkCommonIssues;
}

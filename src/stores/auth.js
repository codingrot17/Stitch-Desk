// src/stores/auth.js - Fixed with proper logout cleanup
import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { account } from "@/services/appwrite";

export const useAuthStore = defineStore("auth", () => {
    const user = ref(JSON.parse(localStorage.getItem("user")) || null);
    const session = ref(null);
    const loading = ref(false);
    const error = ref(null);

    const isAuthenticated = computed(() => !!user.value);

    const userInitials = computed(() => {
        if (!user.value?.name) return "U";
        return user.value.name
            .split(" ")
            .map(n => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);
    });

    /**
     * Initialize auth state on app load
     */
    async function init() {
        try {
            const currentUser = await account.get();
            user.value = {
                id: currentUser.$id,
                name: currentUser.name,
                email: currentUser.email,
                role: "tailor"
            };
            localStorage.setItem("user", JSON.stringify(user.value));

            // Load user's data after confirming they're logged in
            await loadUserData();
        } catch (e) {
            // No active session - clear everything
            await clearAllData();
        }
    }

    /**
     * Login with email and password
     */
    async function login(email, password) {
        loading.value = true;
        error.value = null;

        try {
            // Create session
            const sessionResponse = await account.createEmailPasswordSession(
                email,
                password
            );
            session.value = sessionResponse;

            // Get user details
            const currentUser = await account.get();

            user.value = {
                id: currentUser.$id,
                name: currentUser.name,
                email: currentUser.email,
                role: "tailor"
            };

            localStorage.setItem("user", JSON.stringify(user.value));

            // Load this user's data from Appwrite
            await loadUserData();

            return user.value;
        } catch (e) {
            error.value = handleAuthError(e);
            console.error("Login failed:", e);
            throw new Error(error.value);
        } finally {
            loading.value = false;
        }
    }

    /**
     * Signup new user
     */
    async function signup(userData) {
        loading.value = true;
        error.value = null;

        try {
            // Create account in Appwrite
            await account.create(
                "unique()",
                userData.email,
                userData.password,
                userData.name
            );

            // Auto-login after signup
            await login(userData.email, userData.password);

            return user.value;
        } catch (e) {
            error.value = handleAuthError(e);
            console.error("Signup failed:", e);
            throw new Error(error.value);
        } finally {
            loading.value = false;
        }
    }

    /**
     * Logout - CRITICAL: Clear all user data
     */
    async function logout() {
        loading.value = true;
        error.value = null;

        try {
            // Delete session in Appwrite
            await account.deleteSession("current");
        } catch (e) {
            console.error("Logout error:", e);
        } finally {
            // Clear all data regardless of API success
            await clearAllData();
            loading.value = false;
        }
    }

    /**
     * Load user's data from Appwrite
     */
    async function loadUserData() {
        if (!user.value?.id) return;

        try {
            console.log("Loading data for user:", user.value.id);

            // Import stores dynamically to avoid circular dependencies
            const { useCustomersStore } = await import("./customers");
            const { useOrdersStore } = await import("./orders");
            const { useTasksStore } = await import("./tasks");
            const { useInventoryStore } = await import("./inventory");
            const { useMeasurementsStore } = await import("./measurements");
            const { useMediaStore } = await import("./media");

            // Fetch each store's data
            const customersStore = useCustomersStore();
            const ordersStore = useOrdersStore();
            const tasksStore = useTasksStore();
            const inventoryStore = useInventoryStore();
            const measurementsStore = useMeasurementsStore();
            const mediaStore = useMediaStore();

            // Fetch data from Appwrite (filtered by user)
            await Promise.allSettled([
                customersStore.fetchCustomers(),
                ordersStore.fetchOrders(),
                tasksStore.fetchTasks(),
                inventoryStore.fetchInventory(),
                measurementsStore.fetchMeasurements(),
                mediaStore.fetchMedia()
            ]);

            console.log("✅ User data loaded");
        } catch (e) {
            console.error("Failed to load user data:", e);
        }
    }

    /**
     * Clear ALL user data from localStorage
     * CRITICAL for proper logout
     */
    async function clearAllData() {
        console.log("🗑️ Clearing all user data...");

        // Clear auth data
        user.value = null;
        session.value = null;
        localStorage.removeItem("user");
        localStorage.removeItem("token");

        // Clear all app data
        const dataKeys = [
            "customers",
            "orders",
            "tasks",
            "inventory",
            "measurements",
            "media",
            "sync_queue",
            "last_sync_timestamp"
        ];

        dataKeys.forEach(key => {
            localStorage.removeItem(key);
            console.log(`  ✓ Cleared ${key}`);
        });

        // Reset all stores to empty state
        try {
            const { useCustomersStore } = await import("./customers");
            const { useOrdersStore } = await import("./orders");
            const { useTasksStore } = await import("./tasks");
            const { useInventoryStore } = await import("./inventory");
            const { useMeasurementsStore } = await import("./measurements");
            const { useMediaStore } = await import("./media");

            useCustomersStore().$reset();
            useOrdersStore().$reset();
            useTasksStore().$reset();
            useInventoryStore().$reset();
            useMeasurementsStore().$reset();
            useMediaStore().$reset();

            console.log("✅ All data cleared");
        } catch (e) {
            console.error("Error resetting stores:", e);
        }
    }

    /**
     * Update user profile
     */
    async function updateProfile(updates) {
        loading.value = true;
        error.value = null;

        try {
            if (updates.name && updates.name !== user.value.name) {
                await account.updateName(updates.name);
            }

            if (updates.phone || updates.businessName) {
                await account.updatePrefs({
                    phone: updates.phone,
                    businessName: updates.businessName
                });
            }

            const currentUser = await account.get();
            user.value = {
                id: currentUser.$id,
                name: currentUser.name,
                email: currentUser.email,
                phone: currentUser.prefs?.phone || updates.phone,
                businessName:
                    currentUser.prefs?.businessName || updates.businessName,
                role: "tailor"
            };

            localStorage.setItem("user", JSON.stringify(user.value));

            return user.value;
        } catch (e) {
            error.value = handleAuthError(e);
            console.error("Update profile failed:", e);
            throw new Error(error.value);
        } finally {
            loading.value = false;
        }
    }

    /**
     * Handle auth errors
     */
    function handleAuthError(error) {
        const errorMessages = {
            401: "Invalid email or password",
            409: "An account with this email already exists",
            429: "Too many attempts. Please try again later",
            user_invalid_credentials: "Invalid email or password",
            user_already_exists: "An account with this email already exists",
            user_not_found: "No account found with this email",
            password_mismatch: "Current password is incorrect"
        };

        return (
            errorMessages[error.code] ||
            errorMessages[error.type] ||
            error.message ||
            "Authentication failed. Please try again."
        );
    }

    return {
        user,
        session,
        loading,
        error,
        isAuthenticated,
        userInitials,
        init,
        login,
        signup,
        logout,
        updateProfile,
        loadUserData,
        clearAllData
    };
});

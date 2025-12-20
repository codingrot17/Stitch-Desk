// src/stores/auth.js - Updated to handle new media system
import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { account } from "@/services/appwrite";
import { uploadLogo, deleteFile, isStorageUrl } from "@/services/storage";

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
            const prefs = currentUser.prefs || {};

            user.value = {
                id: currentUser.$id,
                name: currentUser.name,
                email: currentUser.email,
                role: "tailor",
                phone: prefs.phone || "",
                businessName: prefs.businessName || "",
                logo: prefs.logo || "",
                logoFileId: prefs.logoFileId || "",
                whatsapp: prefs.whatsapp || "",
                instagram: prefs.instagram || "",
                facebook: prefs.facebook || "",
                twitter: prefs.twitter || "",
                bio: prefs.bio || ""
            };
            localStorage.setItem("user", JSON.stringify(user.value));

            await loadUserData();
        } catch (e) {
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
            const sessionResponse = await account.createEmailPasswordSession(
                email,
                password
            );
            session.value = sessionResponse;

            const currentUser = await account.get();
            const prefs = currentUser.prefs || {};

            user.value = {
                id: currentUser.$id,
                name: currentUser.name,
                email: currentUser.email,
                role: "tailor",
                phone: prefs.phone || "",
                businessName: prefs.businessName || "",
                logo: prefs.logo || "",
                logoFileId: prefs.logoFileId || "",
                whatsapp: prefs.whatsapp || "",
                instagram: prefs.instagram || "",
                facebook: prefs.facebook || "",
                twitter: prefs.twitter || "",
                bio: prefs.bio || ""
            };

            localStorage.setItem("user", JSON.stringify(user.value));
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
            await account.create(
                "unique()",
                userData.email,
                userData.password,
                userData.name
            );

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
     * Logout
     */
    async function logout() {
        loading.value = true;
        error.value = null;

        try {
            await account.deleteSession("current");
        } catch (e) {
            console.error("Logout error:", e);
        } finally {
            await clearAllData();
            loading.value = false;
        }
    }

    /**
     * Load user's data from stores
     */
    async function loadUserData() {
        if (!user.value?.id) return;

        try {
            console.log("Loading data for user:", user.value.id);

            const { useCustomersStore } = await import("./customers");
            const { useOrdersStore } = await import("./orders");
            const { useTasksStore } = await import("./tasks");
            const { useInventoryStore } = await import("./inventory");
            const { useMeasurementsStore } = await import("./measurements");
            const { useMediaStore } = await import("./media");

            const customersStore = useCustomersStore();
            const ordersStore = useOrdersStore();
            const tasksStore = useTasksStore();
            const inventoryStore = useInventoryStore();
            const measurementsStore = useMeasurementsStore();
            const mediaStore = useMediaStore();

            await Promise.allSettled([
                customersStore.fetchCustomers(),
                ordersStore.fetchOrders(),
                tasksStore.fetchTasks(),
                inventoryStore.fetchInventory(),
                measurementsStore.fetchMeasurements(),
                mediaStore.fetchMedia() // Now loads from localStorage filtered by user
            ]);

            console.log("✅ User data loaded");
        } catch (e) {
            console.error("Failed to load user data:", e);
        }
    }

    /**
     * Clear ALL user data from localStorage
     * NOTE: Media is now per-user in localStorage, so we only clear current user's data
     */
    async function clearAllData() {
        console.log("🗑️ Clearing user data...");

        user.value = null;
        session.value = null;
        localStorage.removeItem("user");
        localStorage.removeItem("token");

        // Clear other data (these are still per-user via syncManager)
        const dataKeys = [
            "customers",
            "orders",
            "tasks",
            "inventory",
            "measurements",
            // Media is NOT cleared here - it's filtered by userId in the store
            "sync_queue",
            "last_sync_timestamp"
        ];

        dataKeys.forEach(key => {
            localStorage.removeItem(key);
            console.log(`  ✓ Cleared ${key}`);
        });

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
            console.log("🔄 Updating profile...");

            // Update name if changed
            if (updates.name && updates.name !== user.value.name) {
                await account.updateName(updates.name);
            }

            // Handle logo upload/deletion
            let logoUrl = user.value.logo || "";
            let logoFileId = user.value.logoFileId || "";

            if (updates.logoFile) {
                console.log("📤 Uploading new logo...");

                // Delete old logo if exists
                if (logoFileId) {
                    await deleteFile(logoFileId);
                    console.log("🗑️ Deleted old logo");
                }

                // Upload new logo
                const uploadResult = await uploadLogo(updates.logoFile);
                logoUrl = uploadResult.url;
                logoFileId = uploadResult.fileId;

                console.log("✅ Logo uploaded:", logoUrl);
            } else if (updates.removeLogo && logoFileId) {
                console.log("🗑️ Removing logo...");
                await deleteFile(logoFileId);
                logoUrl = "";
                logoFileId = "";
            }

            // Prepare preferences object
            const prefsToUpdate = {
                phone:
                    updates.phone !== undefined
                        ? updates.phone
                        : user.value.phone,
                businessName:
                    updates.businessName !== undefined
                        ? updates.businessName
                        : user.value.businessName,
                logo: logoUrl,
                logoFileId: logoFileId,
                whatsapp:
                    updates.whatsapp !== undefined
                        ? updates.whatsapp
                        : user.value.whatsapp,
                instagram:
                    updates.instagram !== undefined
                        ? updates.instagram
                        : user.value.instagram,
                facebook:
                    updates.facebook !== undefined
                        ? updates.facebook
                        : user.value.facebook,
                twitter:
                    updates.twitter !== undefined
                        ? updates.twitter
                        : user.value.twitter,
                bio: updates.bio !== undefined ? updates.bio : user.value.bio
            };

            console.log("💾 Updating preferences...");

            // Update preferences
            await account.updatePrefs(prefsToUpdate);

            // Fetch updated user data
            const currentUser = await account.get();
            const prefs = currentUser.prefs || {};

            user.value = {
                id: currentUser.$id,
                name: currentUser.name,
                email: currentUser.email,
                role: "tailor",
                phone: prefs.phone || "",
                businessName: prefs.businessName || "",
                logo: prefs.logo || "",
                logoFileId: prefs.logoFileId || "",
                whatsapp: prefs.whatsapp || "",
                instagram: prefs.instagram || "",
                facebook: prefs.facebook || "",
                twitter: prefs.twitter || "",
                bio: prefs.bio || ""
            };

            localStorage.setItem("user", JSON.stringify(user.value));

            console.log("✅ Profile updated successfully");
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

// src/stores/auth.js - Updated with Appwrite Authentication
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
     * Checks if user has an active session
     */
    async function init() {
        try {
            // Check if user has active session in Appwrite
            const currentUser = await account.get();
            user.value = {
                id: currentUser.$id,
                name: currentUser.name,
                email: currentUser.email,
                role: "tailor"
            };
            localStorage.setItem("user", JSON.stringify(user.value));
        } catch (e) {
            // No active session - user needs to login
            user.value = null;
            localStorage.removeItem("user");
        }
    }

    /**
     * Login with email and password using Appwrite
     */
    async function login(email, password) {
        loading.value = true;
        error.value = null;

        try {
            // Create session in Appwrite
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
     * Signup new user using Appwrite
     */
    async function signup(userData) {
        loading.value = true;
        error.value = null;

        try {
            // Create account in Appwrite Auth
            const newUser = await account.create(
                "unique()", // Let Appwrite generate ID
                userData.email,
                userData.password,
                userData.name
            );

            // Automatically login after signup
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
     * Logout - delete session from Appwrite
     */
    async function logout() {
        loading.value = true;
        error.value = null;

        try {
            // Delete current session in Appwrite
            await account.deleteSession("current");
        } catch (e) {
            console.error("Logout error:", e);
        } finally {
            user.value = null;
            session.value = null;
            localStorage.removeItem("user");
            localStorage.removeItem("token");
            loading.value = false;
        }
    }

    /**
     * Update user profile
     */
    async function updateProfile(updates) {
        loading.value = true;
        error.value = null;

        try {
            // Update name in Appwrite (only field we can update)
            if (updates.name && updates.name !== user.value.name) {
                await account.updateName(updates.name);
            }

            // Update phone if provided (requires prefs)
            if (updates.phone) {
                await account.updatePrefs({ phone: updates.phone });
            }

            // Update business name (stored in prefs)
            if (updates.businessName) {
                await account.updatePrefs({
                    businessName: updates.businessName,
                    ...(updates.phone && { phone: updates.phone })
                });
            }

            // Get updated user data
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
     * Change password
     */
    async function changePassword(oldPassword, newPassword) {
        loading.value = true;
        error.value = null;

        try {
            await account.updatePassword(newPassword, oldPassword);
            return true;
        } catch (e) {
            error.value = handleAuthError(e);
            console.error("Password change failed:", e);
            throw new Error(error.value);
        } finally {
            loading.value = false;
        }
    }

    /**
     * Send password recovery email
     */
    async function recoverPassword(email) {
        loading.value = true;
        error.value = null;

        try {
            const resetUrl = `${window.location.origin}/reset-password`;
            await account.createRecovery(email, resetUrl);
            return true;
        } catch (e) {
            error.value = handleAuthError(e);
            console.error("Password recovery failed:", e);
            throw new Error(error.value);
        } finally {
            loading.value = false;
        }
    }

    /**
     * Complete password recovery
     */
    async function completePasswordRecovery(userId, secret, newPassword) {
        loading.value = true;
        error.value = null;

        try {
            await account.updateRecovery(userId, secret, newPassword);
            return true;
        } catch (e) {
            error.value = handleAuthError(e);
            console.error("Password reset failed:", e);
            throw new Error(error.value);
        } finally {
            loading.value = false;
        }
    }

    /**
     * Handle Appwrite auth errors
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
        changePassword,
        recoverPassword,
        completePasswordRecovery
    };
});

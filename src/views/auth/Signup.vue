<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";

const router = useRouter();
const authStore = useAuthStore();

const form = ref({
    name: "",
    email: "",
    password: "",
    confirmPassword: ""
});

const localError = ref("");

const handleSubmit = async () => {
    localError.value = "";

    if (form.value.password !== form.value.confirmPassword) {
        localError.value = "Passwords do not match";
        return;
    }

    if (form.value.password.length < 8) {
        localError.value = "Password must be at least 8 characters";
        return;
    }

    try {
        await authStore.signup(form.value);
        router.push("/");
    } catch (error) {
        // Error is already set in authStore.error
        console.error("Signup error:", error);
    }
};
</script>

<template>
    <div
        class="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-secondary-50 px-4"
    >
        <div class="w-full max-w-md">
            <div class="text-center mb-8">
                <div
                    class="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-2xl mb-4"
                >
                    <svg
                        class="w-10 h-10 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                        />
                    </svg>
                </div>
                <h1 class="text-2xl font-bold text-gray-900">
                    Create your account
                </h1>
                <p class="text-gray-500 mt-1">Get started with StitchDesk</p>
            </div>

            <div class="card">
                <form @submit.prevent="handleSubmit" class="space-y-5">
                    <div
                        v-if="authStore.error || localError"
                        class="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm"
                    >
                        {{ authStore.error || localError }}
                    </div>

                    <div>
                        <label class="label">Full Name</label>
                        <input
                            v-model="form.name"
                            type="text"
                            required
                            class="input-field"
                            placeholder="John Doe"
                            :disabled="authStore.loading"
                        />
                    </div>

                    <div>
                        <label class="label">Email</label>
                        <input
                            v-model="form.email"
                            type="email"
                            required
                            class="input-field"
                            placeholder="you@example.com"
                            :disabled="authStore.loading"
                        />
                    </div>

                    <div>
                        <label class="label">Password</label>
                        <input
                            v-model="form.password"
                            type="password"
                            required
                            class="input-field"
                            placeholder="At least 8 characters"
                            :disabled="authStore.loading"
                        />
                    </div>

                    <div>
                        <label class="label">Confirm Password</label>
                        <input
                            v-model="form.confirmPassword"
                            type="password"
                            required
                            class="input-field"
                            placeholder="Confirm your password"
                            :disabled="authStore.loading"
                        />
                    </div>

                    <button
                        type="submit"
                        :disabled="authStore.loading"
                        class="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <span v-if="authStore.loading"
                            >Creating account...</span
                        >
                        <span v-else>Create account</span>
                    </button>
                </form>

                <p class="text-center text-sm text-gray-500 mt-6">
                    Already have an account?
                    <router-link
                        to="/login"
                        class="text-primary-600 hover:text-primary-700 font-medium"
                    >
                        Sign in
                    </router-link>
                </p>
            </div>
        </div>
    </div>
</template>

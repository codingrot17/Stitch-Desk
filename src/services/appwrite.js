// src/services/appwrite.js
import { Client, Account, Databases, Storage, Query } from "appwrite";

// Appwrite Configuration
const APPWRITE_ENDPOINT = "https://cloud.appwrite.io/v1";
const APPWRITE_PROJECT_ID = "692e8f170024827e1d6c"; // Replace with your project ID

// Initialize Appwrite Client
const client = new Client()
    .setEndpoint(APPWRITE_ENDPOINT)
    .setProject(APPWRITE_PROJECT_ID);

// Initialize Services
export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);

// Database & Collection IDs (will be created in Appwrite Console)
export const DATABASE_ID = "693bd3da000741f6a52d";
export const COLLECTIONS = {
    CUSTOMERS: "customers",
    ORDERS: "orders",
    MEASUREMENTS: "measurements",
    INVENTORY: "inventory",
    TASKS: "tasks",
    MEDIA: "media"
};

// Storage Bucket ID
export const MEDIA_BUCKET_ID = "693c33860005a7b9a2a0";

// Query helpers
export const createQuery = Query;

// Error handler
export const handleAppwriteError = error => {
    console.error("Appwrite Error:", error);

    const errorMessages = {
        401: "Unauthorized. Please login again.",
        404: "Resource not found.",
        409: "Conflict. Item already exists.",
        500: "Server error. Please try again.",
        network_error: "Network error. Check your connection."
    };

    return errorMessages[error.code] || error.message || "An error occurred";
};

// Check online status
export const isOnline = () => {
    return navigator.onLine;
};

export default client;

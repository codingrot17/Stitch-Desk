# StitchDesk - Tailor Shop Management System

## Overview
StitchDesk is a comprehensive web-based tailor shop management system that centralizes all tailoring operations into one clean, intuitive dashboard. It enables tailors and fashion businesses to manage customers, orders, measurements, inventory, tasks, and media files with a mobile-first approach.

## Tech Stack
- **Frontend**: Vue 3 (Composition API) with Vite
- **Styling**: TailwindCSS with custom color palette
- **State Management**: Pinia
- **Routing**: Vue Router with authentication guards
- **Storage**: Local Storage (MVP - can be upgraded to Appwrite)

## Project Structure
```
├── src/
│   ├── assets/
│   │   └── main.css          # TailwindCSS with custom utilities
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Sidebar.vue   # Desktop navigation sidebar
│   │   │   └── MobileNav.vue # Mobile bottom navigation
│   │   └── ui/
│   │       ├── Modal.vue     # Reusable modal component
│   │       └── EmptyState.vue # Empty state placeholder
│   ├── router/
│   │   └── index.js          # Vue Router configuration
│   ├── stores/
│   │   ├── auth.js           # Authentication state
│   │   ├── customers.js      # Customer management
│   │   ├── orders.js         # Order tracking
│   │   ├── measurements.js   # Measurement profiles
│   │   ├── inventory.js      # Inventory management
│   │   ├── tasks.js          # Task board state
│   │   └── media.js          # Media gallery state
│   ├── views/
│   │   ├── auth/
│   │   │   ├── Login.vue
│   │   │   └── Signup.vue
│   │   ├── Dashboard.vue
│   │   ├── Customers.vue
│   │   ├── CustomerDetail.vue
│   │   ├── Orders.vue
│   │   ├── OrderDetail.vue
│   │   ├── Measurements.vue
│   │   ├── Inventory.vue
│   │   ├── Tasks.vue
│   │   ├── Media.vue
│   │   └── Profile.vue
│   ├── App.vue
│   └── main.js
├── public/
│   └── favicon.svg
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
└── postcss.config.js
```

## Color Palette
- Primary: #6366F1 (indigo)
- Secondary: #8B5CF6 (purple)
- Accent: #EC4899 (pink)
- Success: #10B981 (emerald)
- Warning: #F59E0B (amber)
- Background: #F9FAFB (light grey)
- Surface: #FFFFFF (white)
- Text: #111827 (dark slate)

## Features
1. **Authentication**: Email/password signup and login with local storage persistence
2. **Dashboard**: Overview of active orders, customers, tasks, and inventory alerts
3. **Customers**: Full CRUD operations with search functionality
4. **Orders**: Status workflow (Pending → In Progress → Completed → Delivered)
5. **Measurements**: Custom measurement profiles with 15+ default fields
6. **Inventory**: Track fabrics/materials with low-stock alerts
7. **Tasks**: Kanban-style task board with priorities
8. **Media**: Image upload and gallery with categories
9. **Profile**: User account management

## Development
- Server runs on port 5000
- Mobile-first responsive design
- Desktop sidebar navigation, mobile bottom navigation

## Recent Changes
- December 10, 2025: Initial project setup with all core features

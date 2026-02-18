# Technology Stack - presentationCreator

## Frontend Framework
- **Next.js (App Router):** The core React framework for the application.
- **TypeScript:** Ensuring type safety across the geospatial and 3D logic.
- **Tailwind CSS:** For rapid, utility-first UI styling.

## 3D & Geospatial Engines
- **CesiumJS:** The primary engine for global-scale geospatial visualization and terrain rendering.
- **Three.js (React Three Fiber):** Used for high-fidelity subsurface models (block models, detailed borehole geometry) where local-scale precision and custom shaders are required.
- **proj4:** For coordinate transformations between local mining grids and global geospatial systems.

## UI & Animation
- **Radix UI:** Headless UI primitives for accessible components (modals, dropdowns, etc.).
- **Framer Motion:** Powering the cinematic UI transitions and smooth overlay animations.
- **Lucide React:** A consistent and clean iconography set.
- **Recharts:** For data-dense technical overlays and statistical analysis charts.

## AI & Data Processing
- **Firebase Genkit:** Integration for AI-driven data insights or generative features.
- **Zod:** Runtime schema validation for complex geological data imports.

## Backend & Infrastructure
- **Firebase:** Utilizing Firebase App Hosting for deployment and potentially other Firebase services (Auth, Firestore) for collaborative features.

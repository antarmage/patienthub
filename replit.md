# Saivie - Women's Health Intelligence Platform

## Overview

Saivie is a premium women's health platform (called a "Reproductive Biology Intelligence System") that serves three user personas through distinct portals:

1. **Patient Portal** — A calm, visual interface that translates complex genomics and biology into clear daily life guidance. Includes cycle tracking, hormone visualization, metabolic insights, and personalized recommendations across modes (Cycle Health, TTC/Trying to Conceive, IVF Support).

2. **Clinician Portal (EMR)** — A full clinician workspace supporting fertility care, pregnancy monitoring, and postpartum recovery. Features include SOAP-based clinical documentation, patient queues with risk flags, hormone/cycle intelligence graphs, AI clinical insights, genomic risk panels, care pathway routing (Hormone & Cycle, Natural Conception, IUI, Pregnancy, Postpartum), and analytics dashboards.

3. **Staff Portal** — Supports allied health professionals (nutritionists, psychologists, fitness coaches) with patient protocol management, care plan creation, check-in workflows, and appointment booking.

The design philosophy prioritizes emotional safety, non-clinical language for patients, and reduced cognitive overload for clinicians. The aesthetic is "Apple Health meets luxury wellness brand" — soft gradients, glassmorphism, feminine but not stereotypical.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight client-side router)
- **State Management**: TanStack React Query for server state; local React state for UI
- **Styling**: Tailwind CSS v4 with CSS variables for theming, using `@tailwindcss/vite` plugin
- **UI Components**: shadcn/ui (new-york style) built on Radix UI primitives
- **Animations**: Framer Motion for transitions and micro-interactions
- **Charts**: Recharts for hormone graphs, cycle analytics, and clinical data visualization
- **Fonts**: DM Sans (body) and Lora (serif headings)
- **Build Tool**: Vite with path aliases (`@/` → `client/src/`, `@shared/` → `shared/`)

### Backend Architecture
- **Runtime**: Node.js with Express 5
- **Language**: TypeScript, executed via tsx
- **API Pattern**: RESTful JSON API under `/api/` prefix
- **Development**: Vite dev server proxied through Express with HMR support
- **Production**: Client built to `dist/public/`, server bundled with esbuild to `dist/index.cjs`

### Data Storage
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM with `drizzle-zod` for schema validation
- **Schema Location**: `shared/schema.ts` (shared between client and server)
- **Migrations**: Drizzle Kit with `drizzle-kit push` for schema sync
- **Connection**: `pg` Pool via `DATABASE_URL` environment variable
- **Key Tables**: `users`, `patients`, `providers`, `services`, `appointments`, `labTasks`, `nutritionPlans`, `workouts`, `hormoneReadings`, `pregnancyMetrics`, `follicleData`, `usgData`, `labResults`, `visitHistory`, `medications`, `clinicalNotes`, `referrals`, `invoices`, `consentForms`, `documents`
- **JSON Storage**: Extensive use of `jsonb` columns for flexible medical data (genomics, functional assessments, intervention plans, medical history)
- **Google Sheets Integration**: Connected to spreadsheet ID `1mj3hkqjoQFrckIGC9Y0Jjlh6kYIYPHBVuPKAl7k-bxo`, reads "Form Responses 1" sheet (patient registration form data). Sync matches patients by phone number or name to avoid duplicates. Patients table extended with phone, email, address, lmp, height, bp columns.

### API Structure
All routes are registered in `server/routes.ts`. Key endpoints:
- `GET/POST /api/patients` — Patient CRUD
- `GET/PATCH /api/patients/:id` — Individual patient operations
- `GET/POST /api/providers` — Provider management
- `GET/POST /api/services` — Service catalog
- `GET/POST /api/appointments` — Appointment scheduling
- `GET /api/appointments?date=` — Date-filtered appointments
- `GET /api/appointments?patientId=` — Patient-specific appointments
- `GET/POST /api/lab-tasks` — Lab order management
- `GET/POST /api/nutrition-plans` — Nutrition plan management
- `GET/POST /api/workouts` — Workout plan management
- `GET/POST /api/hormone-readings` — Hormone data tracking
- `GET/POST /api/pregnancy-metrics` — Pregnancy monitoring data
- `GET/POST /api/follicle-data` — Fertility tracking (follicle scans)
- `GET/POST /api/usg-data` — Ultrasound data
- `GET/POST /api/patients/:id/visit-history` — Patient visit history with SOAP notes
- `GET/POST/PATCH/DELETE /api/patients/:id/medications` — Medication management
- `GET/POST/PATCH/DELETE /api/patients/:id/clinical-notes` — Clinical notes
- `GET/POST/PATCH/DELETE /api/patients/:id/referrals` — Referral tracking
- `GET/POST /api/patients/:id/invoices`, `PATCH/DELETE /api/invoices/:id` — Billing
- `GET/POST/PATCH/DELETE /api/patients/:id/consent-forms` — Consent form tracking
- `GET/POST/PATCH/DELETE /api/patients/:id/documents` — Document metadata
- `POST /api/auth/passcode` — Unified passcode login (returns role + redirects to appropriate portal)
- `POST /api/google-sheets/sync` — Import/sync patient data from Google Sheet (Form Responses 1)
- `GET /api/google-sheets/status` — Check Google Sheet connection status and row count

### Authentication
- Unified passcode-based login on the Landing page for Clinician and Staff portals
- Users enter a passcode; API returns their role (clinician/staff) and the frontend redirects accordingly
- Patient Portal remains open (no passcode required)
- Default passcodes: dr.priya=1234, dr.ramesh=5678, staff.reception=0000, staff.nurse=1111

### Storage Layer
- Abstracted through `IStorage` interface in `server/storage.ts`
- Database implementation using Drizzle ORM queries
- Seed data in `server/seed.ts` populates demo patients with rich clinical data

### Client Pages & Routing
| Route | Page | Purpose |
|-------|------|---------|
| `/` | Landing | Portal selection (Patient/Clinician/Staff) |
| `/patient` | PatientPortal | Home, Biology, Insights tabs with cycle wheel |
| `/clinician` | ClinicianPortal | Full EMR workspace with dashboards |
| `/staff` | StaffPortal | Allied health professional dashboard |
| `/staff/check-in` | CheckIn | Patient check-in workflow |
| `/staff/booking` | NewBooking | Appointment scheduling |
| `/staff/protocol/:id` | StaffPatientProtocol | Patient-specific protocols |
| `/staff/create-plan/:id?` | StaffCarePlan | Care plan creation |

### Key Design Patterns
- **Shared Schema**: The `shared/` directory contains Drizzle schema definitions and Zod validation schemas used by both client and server
- **Glass Morphism UI**: Extensive use of `backdrop-blur`, translucent backgrounds, and soft gradients
- **Mode-Aware Rendering**: Patient portal adapts visuals based on selected mode (Cycle Health, TTC, IVF)
- **Phase-Aware Content**: Dynamic content changes based on menstrual cycle phase (colors, recommendations, insights)
- **Collapsible Card System**: Clinical data organized in priority-colored cards (red=critical, orange=attention, green=stable)

## External Dependencies

### Database
- **PostgreSQL** — Primary data store, connected via `DATABASE_URL` environment variable
- **connect-pg-simple** — PostgreSQL session store (available for session management)

### Key NPM Packages
- **drizzle-orm** + **drizzle-kit** — Database ORM and migration tooling
- **express** v5 — HTTP server framework
- **@tanstack/react-query** — Async state management
- **framer-motion** — Animation library
- **recharts** — Chart/graph rendering
- **react-day-picker** — Calendar component
- **wouter** — Client-side routing
- **zod** — Runtime type validation
- **embla-carousel-react** — Carousel component
- **vaul** — Drawer component
- **cmdk** — Command palette
- **date-fns** — Date manipulation

### Replit-Specific
- **@replit/vite-plugin-runtime-error-modal** — Development error overlay
- **@replit/vite-plugin-cartographer** — Development tooling (dev only)
- **@replit/vite-plugin-dev-banner** — Development banner (dev only)
- Custom `vite-plugin-meta-images` for OpenGraph image handling on Replit deployments

### Asset Pipeline
- Static images stored in `client/src/assets/images/` (imported as modules)
- Design specification documents in `attached_assets/` directory
- Google Fonts loaded via CDN (DM Sans, Lora)
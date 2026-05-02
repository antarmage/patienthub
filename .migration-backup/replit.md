# Saivie - Women's Health Intelligence Platform

## Overview

Saivie is a premium "Reproductive Biology Intelligence System" designed for women's health. It provides distinct portals for three user types: Patients, Clinicians, and Staff. The platform aims to translate complex biological data into actionable daily guidance for patients, offer a comprehensive EMR for clinicians focusing on fertility, pregnancy, and postpartum care, and support allied health professionals with patient protocol and care plan management. The core vision is to offer emotional safety, reduce cognitive overload, and present a sophisticated, non-clinical user experience.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter
- **State Management**: TanStack React Query (server state), React local state (UI)
- **Styling**: Tailwind CSS v4 with CSS variables, shadcn/ui components (Radix UI primitives)
- **Animations**: Framer Motion
- **Charts**: Recharts
- **Fonts**: DM Sans, Lora
- **Build Tool**: Vite

### Backend
- **Runtime**: Node.js with Express 5
- **Language**: TypeScript
- **API**: RESTful JSON API
- **Development**: Vite dev server proxied through Express with HMR
- **Production**: Client served from `dist/public/`, server bundled to `dist/index.cjs`

### Data Storage
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM with `drizzle-zod`
- **Schema**: Shared between client and server in `shared/schema.ts`
- **Migrations**: Drizzle Kit
- **Key Tables**: `users`, `patients`, `providers`, `services`, `appointments`, `labTasks`, `nutritionPlans`, `workouts`, `hormoneReadings`, `pregnancyMetrics`, `follicleData`, `usgData`, `labResults`, `visitHistory`, `medications`, `clinicalNotes`, `referrals`, `invoices`, `consentForms`, `documents`, `billingCatalog`.
- **Flexible Data**: `jsonb` columns for genomics, functional assessments, intervention plans.

### API Structure
Comprehensive RESTful API for managing patients, providers, appointments, services, lab tasks, care plans (nutrition, workout), medical data (hormones, pregnancy, follicle, USG), clinical documentation (SOAP notes, medications, referrals), billing, consent forms, and document management. Includes endpoints for Google Sheets/Drive integration, WhatsApp communication, and AI features.

### Authentication
Unified passcode-based login for Clinician and Staff portals. Patient portal is open access.

### Client Pages & Routing
Main portals include `/patient`, `/clinician`, `/staff`, and `/owner`, with sub-routes for specific functionalities like check-in, booking, patient protocols, and care plan creation.

### Key Design Patterns
- **Shared Schema**: Centralized Drizzle and Zod schemas.
- **Glass Morphism UI**: Utilizes `backdrop-blur`, translucent backgrounds, and soft gradients.
- **Mode-Aware Rendering**: Patient portal adapts content and visuals based on health mode (Cycle Health, TTC, IVF).
- **Phase-Aware Content**: Dynamic content based on menstrual cycle phase.
- **Collapsible Card System**: Clinical data organized with priority-colored cards.

### AI Features
- **Risk Intelligence**: Gemini 2.5 Flash-powered patient risk scoring and trimester checklist generation, triggering automatically on new data. Integrates into Clinician Portal with risk alerts and assessment dialogs. Patient Portal provides AI-generated summaries.
- **AI Triage Queue**: Sorts appointments by `triageScore` based on risk, visit history, and gestational urgency.
- **WhatsApp Virtual Assistant**: Handles inbound messages for booking, rescheduling, and queries using Gemini, creating appointments and clinical notes as needed.
- **Voice-to-SOAP Documentation**: Transcribes audio to structured SOAP notes using Gemini multimodal model, auto-populating fields in the Clinician Portal.
- **Post-Visit WhatsApp Summary**: Generates and sends plain-language visit summaries via WhatsApp using Gemini.
- **AI Schedule Optimisation**: Gemini analyzes appointments to suggest optimized schedules for staff.
- **Owner AI Insights**: Aggregates clinic metrics for Gemini-generated structured insights reports.
- **AI Audit Log**: Records AI-driven actions for transparency and review.
- **Pregnancy Hub (Patient Self-Trackers)**: Patients in pregnancy/TTC mode get a dedicated "Track" tab with Water Intake tracker (circular ring, quick-add 250/500/750ml, daily goal 2500ml), Weight tracker (bar chart history), Blood Pressure tracker (severity badges, history), and Medicine taken checklist (mark/unmark today's meds). All backed by `water_logs`, `medication_logs` tables.
- **Week-by-Week Timeline**: 40-week browsable pregnancy timeline (weeks 4–40) with fruit size comparison, development milestones, symptoms, dos & don'ts, and nutrition tip per week. Auto-scrolls to current gestational week.
- **Patient Document Upload**: Patients can upload diagnostic reports and prescriptions (stored as base64 in `patient_documents` table), with trimester tagging and delete.

## External Dependencies

### Database
- PostgreSQL
- connect-pg-simple (for session store)

### Key NPM Packages
- drizzle-orm, drizzle-kit
- express
- @tanstack/react-query
- framer-motion
- recharts
- react-day-picker
- wouter
- zod
- embla-carousel-react
- vaul
- cmdk
- date-fns

### Replit-Specific
- @replit/vite-plugin-runtime-error-modal
- @replit/vite-plugin-cartographer
- @replit/vite-plugin-dev-banner
- Custom `vite-plugin-meta-images`

### Integrations
- **Google Sheets**: Reads patient registration data from a specified sheet.
- **Google Drive**: Imports lab report PDFs from a designated folder, matching to patients.
- **Jitsi Meet**: Generates video links for telemedicine appointments.
- **WhatsApp**: Used for patient notifications, custom messages, and virtual assistant interactions (via Meta's WhatsApp Business Platform).
- **Gemini 2.5 Flash**: Powers AI features for risk intelligence, WhatsApp virtual assistant, voice-to-SOAP, post-visit summaries, schedule optimization, and owner insights.
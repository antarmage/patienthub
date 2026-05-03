# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Artifacts

- **`artifacts/saivie/`** — Saivie clinician/patient web portal (React + Vite, preview path: `/`)
- **`artifacts/saivie-recover/`** — SaivieRecover tablet app for nursing staff post-op data collection (React + Vite, preview path: `/recover/`)
- **`artifacts/saivie-desk/`** — SaivieDesk receptionist/front-desk patient intake app (React + Vite, preview path: `/desk/`)
- **`artifacts/mamacare-mobile/`** — SaivieMom maternal health mobile app (Expo React Native)
- **`artifacts/saiviegene/`** — SaivieGene premium genome analysis web app (React + Vite, preview path: `/saiviegene/`); dark navy + gold mobile-first design
- **`artifacts/api-server/`** — Backend API server (Express 5, preview path: `/api`)
- **`artifacts/mockup-sandbox/`** — Design/mockup canvas (pre-existing)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## Backend Structure

- `artifacts/api-server/src/routes/routes.ts` — all app route handlers (legacy registerRoutes pattern); includes `/api/postop/*` routes for SaivieRecover, `/api/desk/*` routes for SaivieDesk, and `/api/genome/*` routes for SaivieGene (upload, status polling, results, PDF report)
- `artifacts/api-server/src/genome-engine.ts` — SNP-to-health-association analysis engine (parses VCF/23andMe/AncestryDNA files)
- `artifacts/api-server/src/storage.ts` — data access layer
- `artifacts/api-server/src/db.ts` — database connection + ensureSchema migrations (includes `genome_analyses` table)
- `artifacts/api-server/src/google-drive.ts` — Google Drive integration
- `artifacts/api-server/src/google-sheets.ts` — Google Sheets integration
- `artifacts/api-server/src/whatsapp.ts` — WhatsApp messaging integration
- `artifacts/api-server/src/risk-engine.ts` — AI risk scoring engine
- `artifacts/api-server/src/replit_integrations/` — OCR and AI image integrations

## Database

- Schema: `lib/db/src/schema/schema.ts` + `lib/db/src/schema/models/chat.ts`
- ORM: Drizzle with pg driver
- Migration: `pnpm --filter @workspace/db run push`
- `genome_analyses` table: added via `ensureSchema()` in `db.ts` — stores SNP count, health risks, predispositions, pharmacogenomics, traits as JSONB

## Frontend Structure

- `artifacts/saivie/src/App.tsx` — root component with wouter Router (base=BASE_URL)
- `artifacts/saivie/src/lib/queryClient.ts` — custom QueryClient with fetch helpers
- `artifacts/saivie/src/pages/` — all page components
- `artifacts/saivie/src/components/` — shared UI components
- Uses Tailwind v4 via `@tailwindcss/vite` plugin
- Font: DM Sans (Google Fonts)

## SaivieGene Genome App

Mobile-first React + Vite web app at `/saiviegene/`. Dark navy (#0a0e1a) + gold (hsl 44 87% 55%) branding.

**Screens:**
- `Onboarding.tsx` — 3-slide animated onboarding (DNA decoded, health risks, personalised medicine)
- `Auth.tsx` — Phone OTP login (reuses `/api/mobile/auth/login`)
- `Paywall.tsx` — Monthly/Annual subscription plans (simulated purchase flow)
- `Upload.tsx` — Drag-and-drop genome file upload (VCF, 23andMe, AncestryDNA)
- `Processing.tsx` — Animated DNA analysis progress screen (polls `/api/genome/status/:jobId`)
- `Dashboard.tsx` — Results overview with 4 section cards + PDF download
- `Section.tsx` — Detailed view for each section (Health Risks, Predispositions, Pharmacogenomics, Traits)

**Backend routes (`/api/genome/*`):**
- `POST /api/genome/upload` — multer file upload + async genome analysis
- `GET /api/genome/status/:jobId` — poll analysis status
- `GET /api/genome/results` — most recent analysis for authenticated patient
- `GET /api/genome/results/patient/:patientId` — clinician portal: patient genome insights
- `GET /api/genome/report` — download HTML report

**Genome Insights Badge:** Added to `ClinicianPortal.tsx` patient detail header — shows gold "Genome Insights" badge when the selected patient has a completed genome analysis.

**LocalStorage keys:**
- `saiviegene_token` — mobile auth token
- `saiviegene_patient_id` — bound patient ID
- `saiviegene_subscribed` — subscription status ("true"/"false")
- `saiviegene_plan` — selected plan ("monthly"/"annual")
- `saiviegene_onboarded` — whether onboarding was completed

## SaivieKiosk — Patient Self-Service Check-In

Patient-facing tablet kiosk at `/kiosk/` (served via the `saivie` artifact at `/`). Dark navy + indigo branding, large-touch-friendly layout, no staff UI.

**Screens (single `Kiosk.tsx` component — screen state machine):**
- `phone` — Large numeric keypad + phone display, "Find My Appointment" lookup
- `appointments` — Today's appointments for the matched patient, tap to proceed
- `confirm-checkin` — Shows appointment details (time, provider, service), confirm button
- `intake` — Pre-visit form: chief complaint, current medications, allergies, new symptoms
- `status` — Live appointment status (Waiting → With Doctor → Completed) with 30s polling

**Idle reset:** 90-second inactivity timer (any pointer/touch/keyboard event resets it); shows countdown warning at ≤20s; auto-returns to phone screen.

**Security:**
- Lookup rate-limited (max 10 req/min per IP). All subsequent kiosk endpoints require `X-Kiosk-Session` header (token issued at lookup, 30-min TTL, bound to patient + appointment IDs).

**Backend routes (`/api/kiosk/*`):**
- `POST /api/kiosk/lookup` — phone → patient + today's appointments + session token (rate-limited)
- `POST /api/kiosk/checkin/:id` — sets `checkedInAt` + `status: "checked-in"` (session-gated)
- `POST /api/kiosk/intake/:id` — saves `chiefComplaint` + `notes` to appointment (session-gated; all intake data stored on appointment only, never overwrites patient history)
- `GET /api/kiosk/appointment/:id` — poll live appointment status/timestamps (session-gated)

**Key file:** `artifacts/saivie/src/pages/Kiosk.tsx`

**Note:** The project is at the 7-artifact maximum, so the kiosk is a route within the `saivie` artifact rather than a standalone artifact. It is fully accessible at `/kiosk/` from the preview pane.

## SaivieMom Postpartum Care Hub

All screens live under `artifacts/mamacare-mobile/app/(postpartum)/`:

- `index.tsx` — Hub index; shows baby DOB modal on first entry, two-section card grid (Your Recovery / Your Baby)
- `pp-vaccines.tsx` — Mom postpartum vaccine checklist (Tdap, flu, MMR, COVID, HPV, HepB) — checkable, persisted
- `pp-lactation.tsx` — Breastfeeding tips + FAQ accordion + support CTA
- `pp-mental-health.tsx` — 3-question mood check-in with concern detection and resource links
- `pp-fitness.tsx` — Week-phased fitness plan (Weeks 1–2 rest, 3–6 gentle, 6+ progressive)
- `pp-massage.tsx` — Postpartum massage guide with timing recommendations
- `pp-weight-loss.tsx` — Weight loss tracker with start/target setup, progress ring, and weight log history
- `pp-milestones-early.tsx` — Month-by-month 0–6 month developmental milestone checklist (persisted)
- `pp-milestones-late.tsx` — Month-by-month 6–12 month developmental milestone checklist (persisted)
- `pp-baby-vaccines.tsx` — Infant vaccine schedule with due-date countdown (from baby DOB), notification reminders 1 week before

**AsyncStorage keys:**
- `@saiviemom_pp_baby_dob` — baby date of birth (drives milestone age + vaccine due dates)
- `@saiviemom_pp_mom_vaccines` — mom vaccine checklist state
- `@saiviemom_pp_mental_health` — mood check-in answers + date
- `@saiviemom_pp_milestones_early` / `_late` — milestone checked states
- `@saiviemom_pp_weight_program` — weight program (startWeight, targetWeight, logs[])
- `@saiviemom_pp_bvax_notif_<id>` — per-vaccine notification enabled state

**Entry points:**
- `app/(tabs)/care.tsx` — always shows Postpartum Care Hub card at top of Care Plan screen
- `app/(tabs)/index.tsx` — shows Postpartum Care Hub card on Today tab when EDD ≤ 14 days away or past

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

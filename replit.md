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
- **`artifacts/api-server/`** — Backend API server (Express 5, preview path: `/api`)
- **`artifacts/mockup-sandbox/`** — Design/mockup canvas (pre-existing)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## Backend Structure

- `artifacts/api-server/src/routes/routes.ts` — all app route handlers (legacy registerRoutes pattern); includes `/api/postop/*` routes for SaivieRecover and `/api/desk/*` routes for SaivieDesk (staff auth, patient CRUD, providers, appointments — receptionist/admin only via bearer token)
- `artifacts/api-server/src/storage.ts` — data access layer
- `artifacts/api-server/src/db.ts` — database connection + ensureSchema migrations
- `artifacts/api-server/src/google-drive.ts` — Google Drive integration
- `artifacts/api-server/src/google-sheets.ts` — Google Sheets integration
- `artifacts/api-server/src/whatsapp.ts` — WhatsApp messaging integration
- `artifacts/api-server/src/risk-engine.ts` — AI risk scoring engine
- `artifacts/api-server/src/replit_integrations/` — OCR and AI image integrations

## Database

- Schema: `lib/db/src/schema/schema.ts` + `lib/db/src/schema/models/chat.ts`
- ORM: Drizzle with pg driver
- Migration: `pnpm --filter @workspace/db run push`

## Frontend Structure

- `artifacts/saivie/src/App.tsx` — root component with wouter Router (base=BASE_URL)
- `artifacts/saivie/src/lib/queryClient.ts` — custom QueryClient with fetch helpers
- `artifacts/saivie/src/pages/` — all page components
- `artifacts/saivie/src/components/` — shared UI components
- Uses Tailwind v4 via `@tailwindcss/vite` plugin
- Font: DM Sans (Google Fonts)

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

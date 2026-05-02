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
- **`artifacts/api-server/`** — Backend API server (Express 5, preview path: `/api`)
- **`artifacts/mockup-sandbox/`** — Design/mockup canvas (pre-existing)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## Backend Structure

- `artifacts/api-server/src/routes/routes.ts` — all app route handlers (legacy registerRoutes pattern)
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

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

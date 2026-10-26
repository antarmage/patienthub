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
- **`artifacts/saiviegene/`** — SaivieGene premium genome analysis web app (React + Vite, preview path: `/saiviegene/`)
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

## Staff personal names and receptionist greeting

- Owner Portal -> Staff Accounts -> Edit includes an optional Personal name (up to 100 characters). Only authenticated owners can update it.
- API startup adds `users.display_name` with an idempotent migration. Deploy/restart the API with the frontend.
- Successful staff login stores the account's personal name for the welcome greeting. Name changes take effect after signing in again; older or unnamed accounts use the login username rather than an invented name.
- On the receptionist dashboard, the time-of-day greeting and full date appear in the content immediately below the top navigation bar.

## Shared medicine autocomplete

- Manual prescription entry and clinician medication Add/Edit use the same saved medicine suggestions, matching medicine and generic names.
- Selecting a suggestion fills its saved dose, frequency, duration, instructions and route where supported. All details remain editable and must be reviewed for the current patient; typing alone does not select a regimen.
- Suggestions come from the existing medicine catalog, saved visit prescriptions and saved patient medications. Different regimens remain separate options; identical details are deduplicated. New entries become reusable only after saving, without replacing catalog defaults.
- Patient identifiers, dates, status and patient-specific notes are excluded from suggestions. Keep reusable administration directions in Instructions and private clinical context in Notes.
- Doctor medication duration and instructions use dedicated columns added by the idempotent API startup migration. Deploy/restart the API together with the frontend.
- Automatic trimester medication templates are not enabled.
- Prescription entry, clinician medication Add/Edit and catalog Add/Edit share a frequency grid: OD, BD, TDS, HS, SOS, AC/PC and Weekly. Subtle teal gradients distinguish the shortcuts; the selected value has a dark background, border and check mark. Custom/legacy frequency text remains editable and is saved unchanged unless explicitly replaced.
- AC/PC remains one combined shortcut; specify the intended before/after-food timing in Instructions. No frequency is automatically chosen.

## Receptionist follow-up queue

- Staff Portal -> Follow-Up Cold Calls automatically creates persisted pending tasks at API startup, hourly, and when the queue is refreshed. The UI refreshes every minute.
- Completed appointments become due for a check-in 7 days after the visit, including overdue visits. Missed calls remain pending even when notes are entered.
- Pregnancy milestones use the same schedule as the reception dashboard. Patient review dates and recorded immunisation/investigation dates also trigger reminders, starting 1 day before the due date.
- Prescription follow-up instructions support ISO/Indian dates and explicit relative intervals (for example, "after 2 weeks"). Unclear timing generates a task asking staff to confirm with the clinician; no clinical date is guessed.
- Pending lab orders trigger calls 3 days after ordering; recorded results trigger a separate clinician-review call. Matching results or completed/cancelled orders withdraw pending-test tasks. Result-review calls are reminders, not an automatic clinical interpretation.
- Lab tasks now record `ordered_at`. Legacy tasks without an order timestamp are not assigned a guessed order date; prescription visit orders still use their recorded visit date.
- Generated tasks have unique source keys to prevent repeat creation across refreshes/restarts/server instances. Completed calls and manual/imported records are preserved; no-longer-applicable automatic tasks are shown as cancelled in All.
- `ensureSchema()` adds the follow-up source/reason/due-date columns and unique index on restart. No external messaging or automatic phone calls are sent.

## Prescription entry dates and dosage units

- Patient type includes Irregular period and MTP, each with its own suggested labs/scans (suggestions only, never auto-selected). Pregnancy-only fields (EDD, antenatal exam, pregnancy status) remain limited to Pregnant patients; record MTP gestation in the note.
- EDD and POG populate from LMP and the prescription date, using calendar dates without timezone shifts. Changing either source recalculates both; clinicians can still edit the values. With unknown LMP, the existing POG/EDD/dated-scan estimate remains separate from patient-reported LMP.
- Follow-up instructions such as "after 5 days", "after a week", or "2 weeks" populate an editable follow-up date relative to the prescription date. The date is saved on the appointment and visit for the receptionist queue, which starts reminders one day before it is due. Unclear timing is flagged for confirmation, not guessed.
- Prescription medicines, clinician medication Add/Edit, and catalog default doses share selectable dosage units. Doses remain stored as existing combined strings (for example, "500 mg"), preserving saved suggestions and print output. Unrecognized legacy dose text remains editable without an assumed unit.

## Frontend Structure

### Pre-visit survey and clinician review

- Patient onboarding includes optional discussion topics (up to three) with the former Explore questions. Patients answer before the visit; unanswered questions are not interpreted as negative findings.
- Shared topic/question definitions live in `artifacts/saivie/src/lib/consultationSurvey.ts`. Changing concerns removes unrelated topics and answers from submission, while preserving back-navigation drafts.
- Submission saves the survey in `history.onboarding.consultation` and stamps `history.onboardingAppointmentId` on the server. The clinician's History step displays the patient survey for the matching visit, already selected, without a second questionnaire.
- Opening a patient refreshes their data; the clinician patient list also refreshes every 30 seconds so newly submitted surveys appear without reopening the portal.
- Clinical assessment and evidence remain doctor-entered. Survey answers enter the SOAP note only through "Add reviewed answers to note". The intake summary and patient printout also include the submitted answers.
- Consultation headings and actions are compact; instructional paragraphs and direction rationales have been removed.

### Consultation workspace

- Opening a patient now lands on Summary, a patient-specific pre-consultation dashboard, not the legacy Record editor. Summary and Consultation share the new patient rail/navigation; drafts remain intact when switching tabs.
- Summary combines dated BP/weight logs and visit vitals, hemoglobin, and numeric sugar lab results with the latest visit/plan, visit timeline, medications, check-in vitals and appointment-matched patient survey. Pregnancy adds LMP-estimated gestation/EDD and recorded fetal-heart/fundal-height trends. No sample readings or inferred diagnoses are introduced.
- Patient header tabs: Summary, Consultation, Record, Post-Op, Genome (shortcut buttons removed). Record is a newest-first visit list; selecting a visit shows its saved prescription (vitals, complaint, O/E, diagnosis, Rx, tests, advice, follow-up). The legacy detailed record (no patient search column) is only opened by medication/investigation shortcuts.
- Sugar charts remain separate by recorded test name and unit (for example fasting glucose, PPBS and HbA1c are never combined). Identical same-day readings are deduplicated; pounds in weight logs are converted to kg. Missing/qualitative results are not plotted. Each data-source failure is shown with a retry action.
- Desktop consultation uses a persistent dark-teal patient context rail, compact patient navigation, a central five-step editor and blood-pressure trends, and a clinical support/action rail. Smaller screens stack the panels and expose patient context in an expandable card.
- History reviews the patient-filled survey; Examination, Assessment and Plan remain clinician-entered. Quick actions open the existing investigation and medication editors or focus the working assessment. Record, Post-Op and Genome views remain accessible.
- Weekly, monthly and three-month trends show only recorded blood pressures in the selected calendar period, with an explicit empty state. Missing vitals are not replaced by sample temperatures or normal findings.
- The persistent footer offers Save note, Preview note and Save & Continue. Notes save explicitly to the visit record, not via autosave; editing a saved note returns the status to unsaved. Save & Continue advances only on successful persistence and opens the preview after the last step, without automatically completing or billing the appointment.

### Doctor patient-directory date filters

- Patient-directory appointment dates use their own range query, independent of the dashboard/schedule dates. `GET /api/appointments?from=YYYY-MM-DD&to=YYYY-MM-DD` supports inclusive boundaries and either open end, without the dashboard's 31-day fetch limit. Deploy the API and frontend together.
- A patient appears once if any non-cancelled appointment matches the selected range, including completed and missed visits. Search still narrows those matching patients; clearing filters restores the directory. Loading and fetch errors are displayed explicitly, with a retry action.
- Directory fetch errors include the HTTP status and API error message. HTML responses (for example a frontend fallback when the API is not routed) and malformed appointment lists are reported explicitly, not interpreted as empty results.

- `artifacts/saivie/src/App.tsx` — root component with wouter Router (base=BASE_URL)
- `artifacts/saivie/src/lib/queryClient.ts` — custom QueryClient with fetch helpers
- `artifacts/saivie/src/pages/` — all page components
- `artifacts/saivie/src/components/` — shared UI components
- Uses Tailwind v4 via `@tailwindcss/vite` plugin
- Font: DM Sans (Google Fonts)

## Saivie Brand Colours

- Production web apps import shared [brand tokens](./lib/brand/tokens.css) through [Tailwind brand utilities](./lib/brand/saivie.css). Use `saivie-*` utilities rather than inventing per-screen brand shades.
- Core colours are Warm Ivory `#FFFFFC`, Soft Sage `#CFE2DC`, and Soft Blush `#E5C4DB`. Aim for an ivory-led 61.8/23.6/14.6 visual balance, not a rigid per-screen pixel quota.
- Deep Plum `#3E3440` is for text; Deep Teal `#2F6B60` is for actions; Muted Rose `#8D5B7B` is an accent. Champagne Gold `#B38B56` is decorative, not small text on ivory.
- Keep clinical alerts, warnings, success indicators, and distinct chart series semantically recognisable; they are not brand accents.
- Standalone clinical print windows copy the live brand variables using `getPrintBrandStyles`. Keep paper white, pastel fills limited, and the existing letterhead space clear.
- Test palette fidelity, text contrast, shared imports, and print token propagation with `pnpm --filter @workspace/saivie exec tsx --test src/lib/brand.test.ts`.

## SaivieGene Genome App

Mobile-first React + Vite web app at `/saiviegene/`, using the shared Saivie brand palette.

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

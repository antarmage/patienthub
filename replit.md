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

- WHO ICD credentials are injected into the API container as `WHO_ICD_CLIENT_ID` and `WHO_ICD_CLIENT_SECRET` from separate plaintext AWS Secrets Manager secrets in `ap-south-1`. The ECS execution role's existing `saivie/prod/*` read policy covers them. Task-definition mappings take effect on the next API deployment. ICD search and doctor-confirmed diagnoses use the local WHO ICD-10 2019 English catalog; startup creates its table but does not populate it. Before using diagnosis search, an administrator must run `node --enable-source-maps /app/dist/icd-catalog-import.mjs --import` inside the deployed API container (AWS ECS Exec), where `DATABASE_URL` and both WHO credentials are configured. Wait for the importer's success message, then verify `SELECT count(*) FROM icd10_catalog;` is nonzero and clinician diagnosis search returns results. The importer downloads the catalog before replacing it atomically; no patient data is sent to WHO. An empty catalog returns HTTP 503 from `/api/icd10/search`. Reimport only when intentionally refreshing the catalog, not on every deployment.

- `artifacts/api-server/src/routes/routes.ts` — all app route handlers (legacy registerRoutes pattern); includes `/api/postop/*` routes for SaivieRecover, `/api/desk/*` routes for SaivieDesk, and `/api/genome/*` routes for SaivieGene (upload, status polling, results, PDF report)
- `artifacts/api-server/src/genome-engine.ts` — SNP-to-health-association analysis engine (parses VCF/23andMe/AncestryDNA files)
- `artifacts/api-server/src/storage.ts` — data access layer
- `artifacts/api-server/src/db.ts` — database connection + ensureSchema migrations (includes `genome_analyses` table)
- `artifacts/api-server/src/google-drive.ts` — Google Drive integration
- `artifacts/api-server/src/google-sheets.ts` — Google Sheets integration
- `artifacts/api-server/src/whatsapp.ts` — WhatsApp messaging integration
- `artifacts/api-server/src/risk-engine.ts` — AI risk scoring engine
- `artifacts/api-server/src/replit_integrations/` — OCR and AI image integrations

## Pregnancy episodes and summary

- Doctor Summary and reception's Pregnancy tab share a saved, episode-specific overview. Doctors/owners create and edit episodes; staff/receptionists can read them only when clinical viewing is enabled. Patient sessions may read their own episodes, never author them.
- `GET/POST /api/patients/:id/pregnancy-episodes` and `PUT /api/patients/:id/pregnancy-episodes/:episodeId` persist dating, current/past status, outcome, delivery mode, conception and explicitly chosen appointment, consultation and lab-result associations. Updates require the saved `version`; stale updates return 409.
- Startup creates the episode/link tables idempotently. On a doctor's/owner's first Summary opening with no saved episodes, `POST /api/patients/:id/pregnancy-episodes/auto-detect` automatically establishes episodes from a saved total pregnancy count and clear current status. Existing episodes are never overwritten or automatically reassigned; read-only users never trigger writes. Profile LMP is unchanged. Dating/outcomes that are unknown remain unknown, and automatic provenance is recorded in episode notes with the initiating account.
- Automatic links require pregnancy-specific labels, matching recorded LMP, or the matching current-pregnancy intake plus a valid date inside LMP through 44 weeks. A single reported earlier pregnancy can receive one pregnancy-labelled appointment group spanning at most 44 weeks, separated from current LMP by more than 44 weeks; conflicting LMPs or multiple earlier pregnancies are left for review. Plain dates, general consultations, ambiguous legacy LMP strings, and unlinked lab results are never enough. Same-day bookings remain separate. Detection is transactional and idempotent under concurrent opening. Only one episode can be current; pregnancy numbers and record associations are unique per patient. An appointment and its consultation cannot be assigned to different episodes.
- Gestation uses the saved LMP or clinically established EDD. Earlier pregnancies use their recorded end date, not today's date. Trends and today's check-in use only linked records; unassigned bookings remain in All patient dates. Missing information is presented separately from previously recorded, patient-level clinical risk.
- Measurement trends retain BP, weight, hemoglobin, pulse, fetal heart rate, fundal height and separate blood-sugar test/unit series. Selected pregnancy uses only explicitly linked records. Overall patient history includes all recorded appointments/consultations/labs and standalone BP/weight logs, with a non-pregnancy-specific label; it remains accessible before episodes are saved. Loading or failed log sources are shown explicitly.
- Summary age prefers valid profile/intake DOB, then recorded profile/intake age, then the latest dated appointment/consultation age. A prior recorded age is retained unchanged until corrected, not increased from visit dates. Empty/zero placeholders, future records and invalid ages do not override a recorded value; this display fallback does not rewrite patient profiles.
- Risk scoring uses the same DOB/recorded-age resolver as the summary instead of the raw numeric age placeholder. Legacy assessments consisting solely of explicit missing-data factors (missing/invalid age, absent vitals/baseline data, undetermined gestation, lack of clinical history) are displayed as “Review required,” not Critical or Low; the original score, level and evidence remain in the review dialog and database. Mixed assessments or genuine age-related clinical risks retain their recorded level. New scoring instructions separate missing demographics from clinical risk.
- The clinical patient directory also resolves DOB/intake age instead of rendering zero placeholders. Data-only assessments marked for review show a review notice rather than their obsolete factors as current patient flags; the original evidence remains available in the assessment dialog.
- Doctor patient-directory/summary refreshes synchronize saved pregnancy follow-up plans via authenticated `POST /api/pregnancy-follow-ups/sync` (unique IDs, batches up to 500, clinician/owner only). Existing current episodes scope prescriptions to explicit linked consultations/appointments. The latest documented prescription date/instructions take priority, then an existing patient review date; ambiguous instructions require confirmation rather than a silent milestone fallback. With no booking or prescribed review, the app's existing scan/test/vaccine milestone windows establish a saved date (today within an active window, otherwise its next start), with weekly contacts at weeks 38/39/40. Plans and changes persist with actor/time/before/after audit in `pregnancy_follow_up_plans`; patient row locks serialize synchronization. Overdue saved plans do not drift forward; a completed linked contact on/after the due date advances follow-up timing without asserting that tests/vaccines were done. No appointments/orders are generated, no patient.nextReview or episode dating is overwritten. Booking dates, prescribed follow-ups and milestone plans are labelled distinctly in the directory and shared summary; high-risk care explicitly needs clinician review. Unknown/ended dating requires review and past/absent current episodes do not schedule. Reception/patients only read saved plans through the clinical-permission/own-patient-gated GET `/api/patients/:id/pregnancy-episodes/follow-up`.
- Selected-pregnancy graphs distinguish measured dots from reference strokes and link their sources. Episode editing optionally records confirmed maternal height (cm), pre-pregnancy weight (kg) and baby count in the existing versioned details JSON. No current/first-visit weight is inferred as a baseline, and legacy episodes remain valid. Singleton weight bands illustrate IOM/NRC 2009 Table S-1 rates from week 14 to 40 using pre-pregnancy BMI; this derived envelope is not a validated centile chart or individual target. No first-trimester, multiple-pregnancy or post-term curve is guessed. BP shows NICE 140/90 hypertension thresholds, not treatment targets; Hb shows CDC Table 6 trimester screening cutoffs (11/10.5/11 g/dL), unadjusted for altitude/smoking. References use episode-specific LMP or clinical EDD at each measurement date, with trimester transition points but no fabricated readings, and stop at a saved pregnancy end. Overall patient history does not use a selected episode's reference. Pulse, isolated antenatal FHR, fundal height and unspecified glucose tests do not get generic “ideal” lines; their context limitations are explicit. These overlays do not diagnose, score risk or rewrite measured values.
- Isolated database tests use `TEST_PREGNANCY_DATABASE_URL`; the tests create and remove their own schema. Never point this variable at production.

## Clinical document reading

- `OCR_PROVIDER=glm-ocr` enables an opt-in self-hosted GLM-OCR gateway plus a separate self-hosted text-structuring model. Without this setting, document reading uses the existing Gemini provider.
- Staff prescription/lab/USG uploads and both prescription-reading endpoints share schema validation and never silently fall back to a hosted provider when local OCR fails.
- Extraction is read-only. Staff and prescription-entry screens require review before save; clinician Read Reports is explicit and returns editable lab results instead of automatically saving on patient opening.
- Self-hosted deployment, limits, secret configuration and clinical acceptance testing are documented in [aws/glm-ocr/README.md](aws/glm-ocr/README.md). A GPU deployment must be provisioned separately; the normal API/frontend deployment does not start the model servers.
- The macOS [local lab-report importer](tools/local-reports/README.md) uses Apple Vision/PDFKit plus a local Ollama model, verifies the destination `patientId`, and produces reviewable JSON outside Git. Its authenticated API imports the original, reviewed results and idempotency receipt in one database transaction; only a matching committed receipt permits local working-file deletion. Originals are never deleted. This path does not require an AWS GPU or change the web OCR provider.

## Database

- Schema: `lib/db/src/schema/schema.ts` + `lib/db/src/schema/models/chat.ts`
- ORM: Drizzle with pg driver
- Migration: `pnpm --filter @workspace/db run push`
- `genome_analyses` table: added via `ensureSchema()` in `db.ts` — stores SNP count, health risks, predispositions, pharmacogenomics, traits as JSONB

## Staff personal names and receptionist greeting

- Reception tasks show only unbooked Pending/Delayed investigations and refresh every 30 seconds. Confirm Booking saves the actual investigation's date and Scheduled status; scheduled orders remain in the investigation queue, not the pending booking count.
- API startup removes the three legacy demo lab orders only when their original patient/test/due/status match, `ordered_at` is null, and no lab result references them. Dated or clinically linked orders are preserved; new database seeds no longer create these demo tasks. Deploy/restart the API with the frontend for the cleanup.

- Owner Portal -> Staff Accounts -> Edit includes an optional Personal name (up to 100 characters). Only authenticated owners can update it.
- API startup adds `users.display_name` with an idempotent migration. Deploy/restart the API with the frontend.
- Successful staff login stores the account's personal name for the welcome greeting. Name changes take effect after signing in again; older or unnamed accounts use the login username rather than an invented name.
- On the receptionist dashboard, the time-of-day greeting and full date appear in the content immediately below the top navigation bar.

## Shared Saivie web UI

- Online appointments use each assigned doctor's connected Google Meet account, not generated public Jitsi URLs. Doctor Profile & Settings -> Google Meet manages connection; Owner -> Staff Accounts assigns provider mappings. Booking returns a private patient consultation page with a separate Join Google Meet action and explicitly shared appointment prescriptions/reports. Patient access expires 30 days after the appointment day; cancellation and revocation deny access. Clinical sharing is doctor/owner-only and empty by default. OAuth/deployment configuration and endpoint contracts are documented in [API authorization contracts](artifacts/api-server/AUTHORIZATION.md).

- Receptionist Dashboard retains the subtle summary cards, today's patient flow, waiting queue and bounded Work/Reminders/Tools rail in `ReceptionDashboard`. Its logistics-only mode hides general clinical records, independent prescribing, clinical-state editing and clinical reminder controls while retaining one-tap check-in. My Patients separately uses `ReceptionPatientList`: Today timeline, This week and Last week, phone-first search, doctor/status/payment/follow-up/tomorrow-reminder filters, daily booking counts, collapsed past-day groups and sticky headers. Check-in sets `checked-in` and `checkedInAt` in one authenticated request so the doctor queue sees the arrival. Registration, booking/walk-in, rescheduling, reminders, billing and rebooking are linked to the existing workflows. Walk-ins are booked for today with arrival state atomically. General clinical queries are disabled for reception. Cream/white surfaces and muted status accents match the doctor dashboard.
- Receptionist Add/Edit prescription actions on the dashboard and patient timeline open the paper-transcription workflow. A JPEG, PNG, WebP photo or PDF scan (up to 8 MB) of the doctor-issued prescription and explicit verification are mandatory. Transcriptions save immediately (no doctor approval queue), with source evidence, transcriber identity and edit revisions retained by the API. Edits are limited to source-backed paper transcriptions; receptionist access does not expose unrelated clinical records or restore unrestricted prescribing. Each transcription is a separate visit record and does not complete appointments or change clinician-authored encounters, patient history or ICD diagnoses. Its active medicines are updated atomically without changing unrelated medicines. The editor uses the dedicated authenticated `/api/patients/:id/prescription-transcriptions` API, never the generic clinical-write/upload fallback. Deploy both API and frontend together.
- Doctors can enable clinic-wide receptionist clinical viewing in **Profile & Settings → Receptionist permissions**. The persisted switch defaults off; only clinicians/owners can change it. Enabled receptionists get a separate read-only patient view for history, prescriptions/medicines, reports and pregnancy. General clinical editing and independent prescribing remain blocked. The client checks the policy every 15 seconds, closes clinical views and clears their cache when access is revoked or policy loading fails.
- Receptionist **Record vitals** is available on today's pre-consultation dashboard and patient-list rows independently of clinical viewing permission. The dedicated authenticated appointment vitals API saves arrival measurements and patient-reported LMP without changing queue/consultation status; one-tap Check in remains separate. Prescription-date and LMP pickers use a calendar layer above the prescription editor, and initial history loading no longer clears a new paper-entry date/LMP draft.
- Dashboard patient-flow and waiting-queue rows keep one compact primary action (Check in, View or Reinstate). The three-dot menu contains Record vitals, Add/Edit prescription and additional permitted actions, avoiding overlapping buttons in the bounded dashboard column.
- Receptionist patient details opens full-screen with a Back button and defaults to Visit dates: newest-first dates, grouped same-day records, and only the selected date's consultations/transcriptions visible. Patient history, medicines, reports and pregnancy remain separate tabs; the tab strip scrolls on small screens. Nested clinical data uses single-column sections rather than recursively narrowing grids; long text wraps on desktop and mobile. Doctor viewing permissions and revocation behavior are unchanged.
- Doctor Summary/Record and receptionist Visit dates now combine saved encounters, historical appointments and report-only dates. The authenticated `/api/patients/:id/appointment-history` route is patient-scoped and requires existing clinical-view permissions. Encounters join appointments only by appointment ID, never by date; same-day distinct records and suspected duplicates remain visible. Appointment-only rows retain recorded vitals, notes, follow-up and billing status but cannot generate a prescription. Upcoming, completed and cancelled bookings are labelled separately. Report dates are not treated as clinical encounter linkage. Summary clinical trends still use saved clinical data; appointment entries are not invented consultations. No patient merging, pregnancy reassignment or database backfill is performed by this view.
- The receptionist patient workspace uses a muted green header, overlapping patient identity card, underlined tabs and spacious white section cards. Desktop keeps the header/tabs above an internally scrolling record; on mobile the whole workspace scrolls so the header cannot crowd out the record. Patient history groups recorded onboarding/profile answers into reason, cycle, medical/family, gynecological, pregnancy and lifestyle sections, with missing fields explicitly marked and full structured history still available. Its date trail links recorded visits and reports; current profile history is never presented as a visit-day snapshot, and unsupported completion scores, cycle charts, change comparisons and follow-up claims are not fabricated.
- Receptionist pages omit the redundant top header bar; navigation remains in the left sidebar. Search, registration and booking remain in the patient workspace and dashboard tools. Other staff roles retain their header.
- Receptionist **Edit patient details** is immediately available from the dashboard action menu, patient list and full-screen patient view, independently of the doctor's clinical-encounter viewing switch. The dedicated authenticated patient-edit API permits registration details, patient history and pregnancy fields with server audit/revisions; it does not grant doctor-note, visit, ICD diagnosis, medication or prescription authoring. The full-screen editor includes pregnancy history controls and an advanced structured history editor. Generic clinical mutation endpoints remain protected.
- `authenticatedFetch` carries the signed-in staff token only to same-origin `/api/` requests, preserving explicit headers, credentials and multipart uploads. UI role hiding is not authorization: the API must enforce its clinical permission rules.
- The API enforces clinician/owner-only shared prescription, medication, diagnosis and clinical-record authoring, including OCR/import aliases. Receptionist patient, appointment and invoice responses exclude clinical fields, and clinical diagnosis linkage on invoices requires clinical authorization. Staff retain registration, appointment/check-in and payment logistics. See [API authorization contracts](artifacts/api-server/AUTHORIZATION.md). Existing generic staff accounts do not grant separate nurse/nutritionist clinical-authoring privileges.

- The clinician navigation defaults to a 64px icon rail. Mouse hover or keyboard focus reveals labels in an overlay without shifting the workspace; the pin button keeps the wider sidebar open. Small screens retain the compact rail.
- Staff, owner and clinician sidebars use the configured clinic logo without a separate brand wordmark. The logo is enlarged in expanded navigation; collapsed navigation centers icons and retains accessible names and hover labels.
- Frontend deployment publishes recovery both to its standalone bucket and to `saivie-app/recover/` using a second `/recover/`-based build. Main-app `/recover/` links redirect to `/recover/index.html`, which S3 can serve directly without a directory-index rule. Recovery uses the main origin's existing `/api/` behavior; the main sync excludes `recover/*` so it cannot delete the recovery bundle.

- The clinician patient directory uses `ClinicalPatientList` with Today, Pregnant, PCOS, High-risk, Follow-ups due and All patients filters. Pregnancy trimester and due-date estimates come from valid recorded LMP (explicitly labeled), not sample data; delivered patients are excluded and missing dating is shown separately. Risk uses recorded scores/status and defaults to "Not assessed". Follow-ups due require a valid ISO `nextReview` on or before today. Upcoming appointment data polls every 30 seconds independently of the directory's optional appointment-date range. Name/contact/pathway search and patient-record actions are preserved.

- Calendars use a shared horizontal, scrollable 14-day strip with blue selected-date pills, previous/next-week arrows, and month/year controls for distant dates. Staff and clinician schedules list appointments for the selected local calendar date instead of month/week grids.
- Date fields use `DateInput`: an editable ISO (`YYYY-MM-DD`) field with the same strip in a popover. Minimum/maximum dates, required/disabled fields, clearing optional dates, and local-date arithmetic are preserved. Use `onValueChange` for date strings; non-date inputs retain `onChange`.

- The doctor dashboard uses a cream background with yellow/pink/sage/blue summaries, a searchable patient list and visit preview, and a date-picker/day timeline. Summaries use the selected day's appointments; visit durations require actual start/completion timestamps and risk levels use recorded scores. Preview selection never changes appointment status; Open details and Start consultation retain appointment context and existing actions.
- Full date-range patient flow, triage sorting, category shortcuts and clinical alerts remain available under "Detailed patient flow, triage & clinic insights". The compact calendar selects one day; full scheduling and settings remain accessible.

- Receptionist Billing has separate New bill and All invoices tabs. New bill uses compact patient/template controls and searchable category-based items, with the selected patient's last invoice linked from the summary. Switching tabs preserves the draft.
- Patient, Template, Items and Invoice summary sections have sage backgrounds. Items shows only the selected catalog category or Products; there is no Suggested/all-items tab. All invoices displays 10 rows per page after searching/sorting, with Previous/Next controls and result counts; search resets to page 1 and shortened lists clamp to an available page.
- Receptionists can save current items, create/edit/delete personal billing templates and organize them with named groups. Built-in templates can be copied into a personal template; defaults stay unchanged. Only item IDs and quantities are stored, so applying a template uses current prices/GST and fails explicitly for unavailable items.
- Personal templates persist in `personal_billing_templates`, scoped by the authenticated staff user on every API operation. Web staff OTP login now issues the existing eight-hour staff token, kept in session storage and cleared on sign-out. Existing sessions must sign in again. Deploy/restart the API with the frontend for the new table and routes.
- All invoices lists every patient's saved bills newest first, searchable by patient name or invoice number (`53`, `#53`, `SAI-53`), with view/print, email, edit, delete, explicit load errors and refresh. Existing server quotes, discounts, GST, inventory checks and preview-before-create flow are unchanged.

- The main Saivie web app uses softly rounded ivory cards with restrained shadows, pill buttons/tabs/badges, and rounded fields. The page background adds subtle sage/blush radial washes; solid page wrappers retain their own backgrounds.
- Shared primitives keep existing sizes, semantics, clinical status colours and caller class overrides. Form boundaries and placeholder colours have explicit contrast; keyboard focus uses a two-pixel ring. Dialogs default to 16px mobile side margins. Print output omits the background wash.
- Styles are local to `artifacts/saivie`, not the separate Desk, Recover, Gene or native mobile apps. Page-specific/custom elements retain their explicit styling rather than being overridden by broad CSS.
- Doctor category lists, including Today's Appointments, have an Open details link to the patient Summary. Today's list includes the appointment ID so its complaint and check-in vitals remain attached when opening Consultation; opening details does not start or change the appointment status.

## Shared medicine autocomplete

- Manual prescription entry and clinician medication Add/Edit use the same saved medicine suggestions, matching medicine and generic names.
- Suggestion clicks retain input focus until selection completes, preventing blur from dismissing the list before saved dosage and instructions can prefill.
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
- HPV vaccination is asked for every consultation onboarding immediately after name and date of birth, with all doses, some doses, no and not-sure choices. It remains optional and saves to the existing `history.onboarding.gyn.hpvVaccine` field; review and print show it with personal details.
- Original SVG HPV vaccination seals appear in patient summaries, doctor dashboard rows/visit details, and receptionist appointment lists/dashboard even with clinical details hidden. All doses and partial vaccination have distinct wording; status comes from the narrow authenticated HPV endpoint combining saved patient answers with clinic doses. Vaccination badges do not claim immunity and retain advice to continue cervical screening.
- Surgery planning is doctor/owner-only, accessible from the doctor patient workspace and Owner Portal header. Save procedure, planned date, surgeon and notes, then explicitly confirm surgery completion with the actual date to enroll recovery. Planned/cancelled cases are excluded; discharge removes active recovery access. Each surgery has separate observations; existing unlinked observations are retained without enrolling patients. Deploy API and both main/recovery frontends together.
- Receptionist appointment rows/dashboard show server-derived survey filled/pending flags even with clinical history hidden. Print summary is restored in both layouts, enabled only with doctor-granted clinical visibility, and loads the correct patient/appointment measurements before the explicit print action.
- Patient onboarding restores the original dark-green left navigation and grouped related questions per section. Concern-based branching, optional extra history, secure private links, HPV immediately after personal details, saved history and print/review compatibility are retained.
- Doctor consultation examination includes quick-select antenatal findings and explicit yes/no radio tiles, with conditional contractions, FHR and performed speculum findings. The antenatal panel is shown only in pregnancy context; other consultations retain general vitals and examination notes without an antenatal entry point. Previously saved findings remain preserved. Nothing is preselected. The current visit stores structured `examination.obstetric` plus free notes and a readable objective/findings summary; existing scan data is preserved. Prior visits are not copied into a new examination, and receptionist transcription is unchanged.
- Clinician workspace navigation keeps patient/appointment IDs, the selected patient tab and consultation step in the URL using replacement history. Refresh restores the same saved encounter and section after directory/schedule loading; leaving patient details clears stale patient parameters. Existing patient links default to Summary, and unfinished note drafts are not automatically saved by navigation.
- Printed patient summaries and onboarding history include an HPV vaccination status badge: all doses, doses started, patient-reported not vaccinated, unknown or not recorded. Clinic dose status takes precedence over a negative/unknown survey answer; unanswered is never labelled not vaccinated. Completed/partial badges reuse the vaccination seal artwork.
- Doctor investigation suggestions derive the pathway from patient type/status and fall back to recorded mode, never fertility by default. Pregnancy uses gestation-specific scans, while MTP, PCOS, irregular periods, postpartum and general/gynecology use their matching test options. Manual pathway overrides are visit-keyed; previously selected investigations remain visible.
- Receptionist Check in opens arrival vitals for consultations in both dashboard and patient list; saving measurements completes check-in, with an explicit Skip vitals option. Lab appointments check in directly without vitals. A failed queue update leaves the dialog open and reports that any saved measurements are retained.
- Antenatal examination also records performed/deferred PV assessment (dilatation, effacement, station, cervix, membranes, presenting part, caput/moulding) and conditional patient-reported leakage characteristics. Reported leakage, clinician rupture assessment and speculum-observed fluid are separate; hidden findings are excluded from saved records and summaries, with no automatic diagnosis or normal defaults.
- Uterine activity uses Relaxed / Irritable / Contractions present tiles. Contraction count/intensity appears for Contractions present; legacy Yes/No records remain explicitly identified until clinician review rather than being reinterpreted as new findings.
- PV examination includes explicit pelvis adequacy tiles (clinically adequate, suspected inadequate, uncertain, not assessed), head/presenting-part station and remarks. Pelvis adequacy is not preselected or automatically inferred.
- Pregnancy-only antenatal examination uses an interactive SVG body map and six labelled area shortcuts with a focused findings panel, a live note preview and a six-area documented count (not a clinical completeness score). Marker symbols and accessible labels distinguish normal, abnormal, recorded, unrecorded, not examined and deferred states without relying on colour. The figure is illustrative, not gestational-size guidance. Existing clinical fields and conditional leakage/PV/speculum controls remain available; old records derive marker states from their findings. Explicit area statuses round-trip in `examination.obstetric` and appear in saved summaries for abnormal/not-examined/deferred decisions. Scoped normal actions cover pallor/edema, abdominal inspection/scar tenderness/uterine activity or reported leakage only, never fetal or invasive examinations. Existing findings must be explicitly cleared before replacement; there is no blanket normal action.
- Doctor consultation and receptionist read-only visit records offer an A4 prescription preview with full clinic letterhead, saved provider qualifications/registration and uploaded logo. When no custom logo is configured, an explicit notice explains the default Saivie text letterhead; missing doctor details or malformed logo settings still surface errors. The pad layout places complaint/history/investigations/O/E on the left and medicines/advice on the right. Selected-visit date and prescriptions are used, never unrelated medication history. Unsaved doctor drafts are preview-only; printing requires a saved visit. Preview and print share the same escaped HTML.
- Shared topic/question definitions live in `artifacts/saivie/src/lib/consultationSurvey.ts`. Changing concerns removes unrelated topics and answers from submission, while preserving back-navigation drafts.
- Submission saves the survey in `history.onboarding.consultation` and stamps `history.onboardingAppointmentId` on the server. In the clinician's consultation, Reason shows all concern options and History shows the possible directions and their questions. Survey choices and answers for the matching visit come preselected/prefilled (tagged "Patient"); the doctor can change selections and fill or edit answers when the patient did not. Save note persists the selected concerns, topics and answers in the current visit's `examination.consultationHistory`, preserving other examination fields and the patient's original survey. Saved history restores on reopening and appears in note/prescription previews and reception visit records. History changes count as unsaved changes; new appointments never inherit another visit's answers.
- Opening a patient refreshes their data; the clinician patient list also refreshes every 30 seconds so newly submitted surveys appear without reopening the portal.
- Clinical assessment and evidence remain doctor-entered. Survey answers enter the SOAP note only through "Add reviewed answers to note". The intake summary and patient printout also include the submitted answers.
- Consultation headings and actions are compact; instructional paragraphs and direction rationales have been removed.

### Consultation workspace

- Pregnant patients have a shared "How conceived" editor in Summary and Consultation History, with natural conception, ovulation induction/timed intercourse, IUI, IVF/ICSI, other and unknown choices plus optional details. Onboarding asks the same question only for a reported current pregnancy, including review/print output. Explicit patient answers prefill with a Patient-reported label; doctor edits save independently through `PATCH /api/patients/:id/conception`, merging into existing history and labelled Clinician. Care mode or treatment history never establishes conception method. Saved doctor history takes precedence for matching LMP; without LMP, entries are appointment-specific. A new LMP does not inherit the previous pregnancy's method. The value is available as sourced assessment evidence; no database migration is needed.

- Empty results illustrations belong inside the relevant table/list container, beneath its headers, never outside as detached artwork. The Lab/USG reports table uses the shared woman-and-folder `NoRecordsIllustration` in a full-width empty body row; loading/errors remain distinct and do not display no-results artwork.

- Assessment is a doctor-led composer: free-text impression with previous patient diagnosis typeahead, optional certainty (working/confirmed/problem/undetermined), and optional reasoning. No diagnosis, certainty or normal finding is inferred.
- Evidence is assembled from the matching appointment's survey/history answers, today's reason/examination note, recorded LMP, prior visit assessments/plans, stored laboratory results and uploaded lab/USG reports. Each finding retains its value, source and available date; missing dates are explicit. Report links open the stored original. Relevant view prioritizes up to five items; fertility prioritization uses recorded survey topics and a small lab-name filter, not diagnostic scoring. All sources remain available.
- Optional reviewed and supporting/challenging/contextual controls apply to exact value/source/date snapshots. Changed or unavailable sources do not inherit review; saved snapshots remain inspectable/removable. Different numeric values for the same lab name are shown together for review, without declaring a clinical conflict. Review never means independent verification.
- Save note persists the composer and evidence snapshots atomically in `visit_history.assessment_details` alongside a human-readable `assessment` for preview, Record and prescription output. No separate copy-to-Plan action is needed. Legacy assessment text remains readable without invented certainty/review. API startup adds the nullable JSONB column through `ensureSchema`; deploy/restart the API before using the updated frontend.
- Missing records, pending status as recorded by the lab source, unreviewed evidence and source-load errors are distinct. Orders do not prove a pending or completed result: when result linkage is unavailable the UI says so. AI diagnosis suggestions, automatic clinical verification, terminology coding and measured completion-time claims are not part of this pilot.

- Opening a patient now lands on Summary, a patient-specific pre-consultation dashboard, not the legacy Record editor. Summary and Consultation share the new patient rail/navigation; drafts remain intact when switching tabs.
- Summary combines dated BP/weight logs and visit vitals, hemoglobin, and numeric sugar lab results with the latest visit/plan, visit timeline, medications, check-in vitals and appointment-matched patient survey. Pregnancy adds LMP-estimated gestation/EDD and recorded fetal-heart/fundal-height trends. No sample readings or inferred diagnoses are introduced.
- Patient header tabs: Summary, Consultation, Record, Medicine, Investigations, Post-Op, Genome. Record is a newest-first visit list; selecting a visit shows its saved prescription (vitals, complaint, O/E, diagnosis, assessment, Rx, tests, advice, follow-up). Empty visit history uses the responsive `NoRecordsIllustration` SVG (decorative beside the existing message; informative title/description supported for standalone reuse). The legacy detailed record and hidden patient-search column have been removed; no workspace links open that screen.
- Medicine reuses the former inline medication table (drug, dose, frequency, date, status, notes), including saved-medicine autocomplete, selectable units/frequency, Add/Edit/Delete and immediate per-row saves. The table scrolls horizontally on narrow screens. Investigations reuses the former workup cards, pregnancy-stage history/upcoming groups, custom investigations, report reading and original-report access. Existing record matches are labelled "On file", not proof of completed/normal tests; tests with a record remain selectable for repeat orders. Custom tests are selected when added.
- All medicine/investigation quick actions and review links open their corresponding tabs, with Back to consultation preserving visit drafts. Investigation selections share the consultation's `labsOrdered` draft; Save orders saves them and the current consultation note in one request. Reload restores saved selections; patient/appointment changes clear unsaved medicine/custom-test edits. Patient-type suggestions include MTP and irregular periods; stage-specific pregnancy options require valid dating.
- Uploaded reports: staff uploads (Prescriptions/Blood/USG) store the original file in S3 when `AWS_S3_BUCKET` is set, otherwise base64 in `patient_documents`; the `documents` row links it via `metadata.patientDocumentId`. `GET /api/patients/:id/documents/:docId/file` serves it (S3 → presigned redirect; DB → inline PDF/JPEG/PNG/WebP only, other types download; other patients' sessions get 403). Record tab shows a Reports list (Lab/USG, newest first) with a View dialog; staff "Uploads" log and the legacy Lab Reports card use the same View button. Google Drive imports open their Drive link.
- Scan referral prices are per diagnostic centre (`referral_partner_services`). Owner Portal → Referrals → centre → "Scan prices" to add, paste ("Name 1200" per line), edit or remove. "Refer for scan" lists the chosen centre's scans with price prefilled; centres without a list fall back to USG/scan items in the billing catalog. SP Diagnostic's USG rate card (`api-server/src/referral-rate-cards.ts`) loads once into any centre named like "SP Diagnostic(s)" (on startup, create or rename), tracked by `referral_partners.price_list_seeded` so owner edits/deletes are never overwritten.
- Sugar charts remain separate by recorded test name and unit (for example fasting glucose, PPBS and HbA1c are never combined). Identical same-day readings are deduplicated; pounds in weight logs are converted to kg. Missing/qualitative results are not plotted. Each data-source failure is shown with a retry action.
- Desktop consultation uses a persistent dark-teal patient context rail, compact patient navigation, a central five-step editor and blood-pressure trends, and a clinical support/action rail. Smaller screens stack the panels and expose patient context in an expandable card.
- History shows the survey preselected and lets the doctor change it; Examination, Assessment and Plan remain clinician-entered. Reason also preselects Pregnancy-related concern from the current pregnancy context, including follow-ups without a new survey. This selects only the concern, never old survey answers or symptom topics; doctor deselection takes priority. Quick actions open the Medicine/Investigations tabs or focus the working assessment. Save note also persists test selections to the visit's `labsOrdered` (including clearing orders). The Plan and note preview show selected tests; prescription printing includes saved visit tests. Medication saves immediately to the patient's medication record, with errors retaining the draft. Order drafts reset when switching patient/appointment. Record, Post-Op and Genome views remain accessible.
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

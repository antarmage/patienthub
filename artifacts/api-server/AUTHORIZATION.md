# Patient logistics and clinical access

## Google Meet and private patient consultation pages

- Enable Google Meet REST API in the clinic's Google Cloud project. Configure a Web OAuth client with redirect URI `https://<patient-portal-host>/api/online/google/callback` and scope `https://www.googleapis.com/auth/meetings.space.created`. Complete Google's OAuth publishing/verification requirements as applicable; testing-mode refresh tokens can expire and are not suitable for unattended production booking.
- Set `PUBLIC_APP_URL` to the HTTPS frontend origin, `GOOGLE_MEET_CLIENT_ID`, `GOOGLE_MEET_CLIENT_SECRET`, and `GOOGLE_MEET_TOKEN_KEY` (a random 32-byte key encoded as 64 hexadecimal characters) using deployment secrets, never source code. Preserve the encryption key across deployments; changing it makes saved connections and private links unreadable. Existing Drive/Sheets service-account credentials do not authorize Meet.
- For ECS deployment, create the OAuth/client-key secrets first, then add their environment-variable mappings and `PUBLIC_APP_URL` to the API task definition. The current deployment template does not inject these new settings; configuring only GitHub secrets is insufficient. Do not add references to nonexistent AWS secrets, which would prevent the API task from starting.
- Deploy API and frontend together and restart the API for the idempotent database migration. In Owner Portal -> Staff Accounts -> Edit, assign each clinician to the correct provider. One account per provider is enforced. Known legacy clinician accounts are backfilled only on exact provider-name matches; otherwise the owner must assign them. Each doctor then opens Profile & Settings -> Google Meet and connects their own Google account.
- `GET /api/online/google/status`, `POST /api/online/google/connect`, and `DELETE /api/online/google/connection` use persisted clinician/owner authentication and server-owned provider mapping. OAuth state is random, hashed, single-use, persisted for 10 minutes and bound to a Secure/HttpOnly/SameSite=Lax callback cookie. Refresh tokens and redisplayable patient-link secrets are AES-256-GCM encrypted; raw token secrets are never returned in account status.
- POST online appointment creation requires a patient, assigned doctor, valid date/time and connected Google account. Google receives only empty meeting-space configuration, not patient identities or clinical content. Creation uses restricted-access Google Meet spaces; the doctor must admit outside participants. Appointment and patient-link persistence is atomic. Failures return explicit errors rather than public Jitsi/demo URLs. Existing `/api/appointments/:id/telemedicine` creates or reuses a meeting/page; it does not refresh an already-issued link.
- Staff may retrieve `GET /api/appointments/:id/online-session` to copy the patient URL. The private token is 256-bit, supplied in the URL fragment (not query/path or HTTP referrer) and sent to the patient API only in `X-Consultation-Token`, without session cookies. The patient page opens Google Meet in a separate tab; Google Meet is not embedded. Treat the URL as a bearer credential: anyone holding it can read explicitly shared records.
- `GET /api/online/patient` and `/api/online/patient/reports/:id/file` are rate-limited and return no-store/no-referrer responses. Access expires at the end of the appointment's calendar day plus 30 days, in India time, and is denied on cancellation/no-show/in-person conversion or explicit revocation. Cancellation and conversion persist revocation, so reinstatement does not silently restore access. Rescheduling recalculates expiry. Changing an existing online booking's doctor requires cancellation and rebooking.
- Records start unshared. `GET/PATCH /api/appointments/:id/online-sharing` allows only the assigned clinician or owner to select prescriptions with the exact appointment ID (including source-backed paper transcriptions with an explicit server-recorded linked appointment ID) and explicitly select the patient's reports. Same-date inference is not used. Patients receive a projection of shared medicines, advice and follow-up, not diagnoses, private notes, original prescription scans, audit or unknown fields. Shared report downloads independently verify token, current sharing and original-file patient ownership. `DELETE /api/appointments/:id/online-session` permanently revokes patient access.
- Expiry/revocation protects the Saivie page and downloads, not the Google meeting URI after it has been disclosed or already-downloaded files. The host must manage Google Meet admission separately. Disconnecting Google stops new meeting creation but does not delete existing meetings. WhatsApp submission does not guarantee delivery; unconfigured/failed notification paths instruct staff to share manually.

## Client authentication

Recovery temporarily uses `POST /api/postop/auth/passcode` with an individual staff passcode only, without a username or WhatsApp OTP. The passcode must match exactly one persisted account with an allowed staff role; duplicate passcodes are rejected instead of choosing an arbitrary user. The endpoint permits 10 attempts per IP per 15 minutes and returns the existing expiring staff bearer session. Existing OTP/ticket login endpoints and all other portal login flows remain unchanged. Administrators must assign unique staff passcodes; this temporary single-factor flow has weaker protection than OTP.

### Surgery planning and recovery enrollment

- Doctors (`clinician`) and owners use **Surgery planning** in the patient workspace or Owner Portal header. `GET/POST /api/patients/:id/surgeries` lists/creates plans; `PATCH /api/patients/:id/surgeries/:surgeryId` edits planned procedure/date/surgeon/notes or performs explicit lifecycle actions. Receptionists, staff, admins and patients cannot manage plans.
- The clinician's patient-header button opens an in-page surgery workspace (`tab=surgery`); owner/resource entry points retain the planning dialog. Both share the same save/edit/completion/recovery implementation. Delivery-mode shortcuts populate the saved procedure name; LMP date shortcuts are estimates, not timing recommendations. Structured indications, draft saving, theatre requests, consent generation and fasting notifications are explicitly unavailable. Readiness is unassessed (not inferred from missing records); supported checklist buttons navigate to existing record, investigation and consultation screens.
- **Manage care network** in the surgery workspace/planning dialog and **Profile & Settings -> My Care Network** use the same persistent, clinic-wide directory. `GET/POST /api/surgery-care-network` lists/creates entries; `PATCH /api/surgery-care-network/:memberId` updates contact details and archives/restores entries. These routes require clinician/owner authentication and return `private, no-store` responses. Roles are `nursing_home`, `anesthetist`, `pediatrician` and `ot_assistant`; an entry's role cannot change. Name is required; affiliation, phone and email are optional.
- Surgery create/edit accepts optional `assignments` with all four role keys, each a directory ID or `null`. IDs must exist and match the role. Entries must be active for new assignments; an unchanged archived assignment can be retained during edits. Omitted `assignments` preserves existing selections when editing (legacy clients); explicit `null` unassigns a role. Responses include a `team` object with the four directory records or `null`. Assignments remain optional and never default to a contact.
- Archive rather than delete contacts: existing surgery references are preserved, labelled archived in the UI and excluded from new selections. Directory contact updates are reflected on saved plans; this is a live directory reference, not a historical contact snapshot. Startup migration creates `surgery_care_network` and adds nullable role-specific foreign keys to existing surgery plans. Creator/updater identities and directory timestamps are persisted.
- Directory entries and surgery assignments do **not** create user accounts, send invitations, verify availability, request acceptance, reserve an OT slot/bed or confirm a facility booking. Those coordination workflows are not implemented. Existing recovery enrollment and its narrow staff-facing projection remain unchanged.
- Lifecycle: `planned` → `completed` or `cancelled`; `completed` → `discharged`. Completion requires a valid actual surgery date no later than today in India time. Saving a plan or reaching its planned date never automatically enrolls a patient. Closed plans cannot be reopened; another surgery creates a new episode.
- One open plan/recovery episode per patient is enforced by a partial unique index and patient-row locks. Status changes and observations lock the surgery row; a discharged case cannot accept a later observation. Creator/updater and completion/closure timestamps are persisted.
- `GET /api/postop/patients` returns only completed, not-yet-discharged surgery patients (up to 20 matching name/phone search), with minimal identity and surgery context. It does not expose full patient history or surgery notes. Planned/cancelled/discharged cases and patients without a plan are excluded, including with no search filter.
- Recovery staff roles may read/write observations only for an active completed episode belonging to the supplied patient. GET requires `X-Patient-Id` and `X-Surgery-Plan-Id`; POST requires numeric `patientId`/`surgeryPlanId`, observation time and validated measurements. Server resolves the recording staff identity. Missing/mismatched/closed episodes fail explicitly. Histories are filtered by surgery episode, not just patient.
- Startup migration adds `surgery_plans` and nullable `postop_observations.surgery_plan_id`. Legacy observations are preserved unlinked; no automatic surgery enrollment or historical relinking occurs. Deploy API, main frontend and recovery frontend together; restart the API for the idempotent migration. Existing unrelated patient `procedureDate`/historical surgery fields do not enroll recovery patients.
- Run the authorization suite with `TEST_SURGERY_DATABASE_URL` pointing to an isolated local test database to include migration/transaction/episode-isolation tests. That test creates and drops its own schema and must not target production.

### HPV vaccination badges

`GET /api/hpv-protection?patientIds=1,2` provides a narrow HPV badge-status projection to authenticated staff/receptionist/admin/clinician/owner accounts, independent of receptionist clinical-detail visibility. Up to 500 positive patient IDs are accepted; malformed requests are rejected. It combines clinic-recorded HPV doses with the saved onboarding vaccination answer, returning only patient-ID-to-status entries, never history, dose records, or other clinical data. `protected` is the legacy identifier for all doses reported or recorded, not a guarantee of immunity; `in-progress` represents some doses. No/unknown/unanswered responses alone produce no badge. Responses are private/no-store. Deploy the API and frontend together for receptionist access to these badges.

### Private onboarding links

Appointment list responses include the server-derived `surveyCompleted` flag matched to that patient's `history.onboardingAppointmentId`. Receptionists can see filled/pending status without clinical history permission, but cannot author this flag. The new receptionist patient list and dashboard restore **Print summary** using an explicit load-then-print dialog. Printing is enabled only while doctor-controlled clinical visibility is granted; it loads authorized patient details and that exact appointment's narrow vitals record, never prints a logistics-only record as though it were a complete clinical summary.

Staff create or replace an appointment's private intake link with `POST /api/onboarding-links/:id`. The random 256-bit token is hashed in `onboarding_links`, expires 30 days after issuance, and is included only in the frontend URL fragment. Creating another link invalidates the previous one. Cancellation/no-show removes the saved link permanently.

The frontend sends `X-Onboarding-Token` to the onboarding GET/POST endpoints without cookies or staff credentials. The access policy validates the token against the exact appointment and grants only that patient's intake access, not other clinical endpoints. The intake-history allowlist includes the current form's patient-reported medical/surgical/drug/allergy/family sections and dating estimate, but not diagnoses or private clinical history. Number-only URLs still require existing authentication; patients must receive a new private link. Receptionists can generate one on the booking confirmation or by opening an existing numbered onboarding URL while signed in.

Deploy API and frontend together and restart the API for the new table migration. Loading uses one shared query with a 15-second timeout and explicit error/retry UI; failed requests never mount a second form that restarts the loading loop.

- `GET /api/reception/follow-up-patients` is a narrow receptionist/clinician/owner read for call planning, independent of full clinical-view permission. It returns only patient ID, name, phone, latest recorded past visit and a current-pregnancy flag. Recent visitors cover today and the preceding 13 India calendar dates; completed appointments, recorded visits and saved last-visit dates are deduplicated per patient. The separate pregnant list includes explicitly recorded active/pregnant/antenatal/ANC patients even without a visit or scheduled call. It exposes no LMP, clinical history, diagnoses or encounter content.

- Staff requests send `Authorization: Bearer <staffToken>`, returned by `/api/auth/passcode` after OTP verification (also by the existing staff/desk logins). Staff tokens expire one hour after issuance (not extended by activity) and are invalidated by server restart. Deploy/restart the API and sign in again for the updated lifetime. OTP and patient-link lifetimes are unchanged. Staff cookies are **not** supported.
- The existing appointment `X-Staff-Token` header remains supported with the same token expiry and persisted-user role checks. Prefer `Authorization` for all new requests.
- Patient-specific reads accept the patient's existing `/api/auth/patient-login` session cookie, or their separate mobile-login Bearer token. Send cookies with same-origin requests or `credentials: "include"` where appropriate. An invalid explicitly supplied token never falls back to cookies.
- A client-supplied role, username, patient ID, or provider ID is not authentication. `X-Patient-Id` only filters appointments after authentication; patient tokens/sessions always constrain appointment results to their own patient.
- Missing/invalid/expired authentication returns 401; authenticated but unauthorized requests return 403. Register the access policy before all main and desk handlers.

The persisted roles `clinician` and `owner` can author shared clinical records. `staff`, `receptionist`, and `admin` cannot. Existing `staff` accounts do not have separate persisted receptionist/nurse/nutritionist roles; frontend username-based labels do not grant prescribing permissions. Allied protocol/planning, nursing observations, billing, and patient self-tracking endpoints are not reclassified as shared prescription authoring.

The explicitly authorized receptionist patient-details editor below is a narrow exception for registration, patient history, and pregnancy details only. It does not grant encounter, diagnosis, prescription, clinical-note, or care-plan authoring.

## Protected paths

The following require clinical authorization for writes; patient-specific GET/HEAD requests also allow the corresponding patient session/mobile token. Receptionist/staff reads are denied by default, but may be enabled clinic-wide as described below:

`/api/patients/:id/{conception,pregnancy-status,visit-history,medications,clinical-notes,diagnoses,documents,hormones,pregnancy-metrics,weight-logs,bp-logs,follicle-data,usg-data,lab-results,referrals,risk-score,trimester-checklist,manual-prescription,extract-prescription,parse-prescription,extract-lab-results}`

This includes `/api/patients/:id/documents/:docId/file`. Own-patient clinical-note responses exclude notes marked private. The existing diagnosis endpoint still validates doctor-confirmed encounter ownership and imported ICD codes.

Shared `/api/{visit-history,clinical-notes,documents,medications,referrals}` collections and their `/:id` mutations require clinical authorization. So do `/api/ocr/prescription`, `/api/icd10/search`, `/api/patients/batch-risk-score`, `/api/google-sheets/sync`, `/api/google-drive/import-lab-reports`, `/api/voice/soap-transcribe`, `/api/appointments/:id/post-visit-summary`, `/api/appointments/triage`, and `/api/appointments/optimise-schedule`.

Prescription extraction remains read-for-review only; saving is independently protected. Local reviewed lab imports do not create medication orders. Existing patient-session document uploads and own-mobile-token medication self-tracking stay separately authenticated and do not authorize shared clinical mutations.

`/api/onboarding` (with `X-Appointment-Id`) and `/api/onboarding/:appointmentId` require clinical authorization or the appointment's own patient. Patient-submitted history is confined to `onboarding` and `labSurvey` namespaces; it cannot overwrite clinician history/diagnosis namespaces.

## Receptionist response and write contracts

Authenticated nonclinical staff can use `/api/patients`, `/api/patients/:id`, `/api/desk/patients`, `/api/desk/patients/:id`, and `/api/prime-members`. The separate `/api/postop/patients` endpoint is restricted to active completed surgery episodes and additionally includes only the surgery ID, procedure, planned/completed dates and surgeon name. With clinical visibility off, ordinary list, detail, registration, and update responses allow only:

`id, name, phone, age, email, address, dob, avatar, mode, referredBy, insurance, lastVisit, nextReview, isPrimeMember, primeMemberSince`

Condition, patient type, gestation/LMP, pregnancy status, risk, history, diagnoses, plans, clinical notes, measurements, and future unknown fields are omitted. Registration/update bodies allow only:

`name, phone, age, email, address, dob, avatar, mode, referredBy, insurance`

Clinical or unknown submitted keys return 403, not silent acceptance. Prime membership remains a separate logistics operation. Category lists are limited to `all`, `all-patients`, and `today-appointments` for nonclinical staff; clinical cohort categories return 403.

Authenticated receptionist appointment responses allow:

`id, patientId, providerId, serviceId, date, time, endTime, duration, type, status, visitType, visitMode, surveyType, priority, room, billingCode, billingAmount, paymentStatus, insuranceClaim, checkedInAt, seenAt, completedAt, followUpDate, telemedicineLink, whatsappReminderSent`

No `reason`, `chiefComplaint`, `notes`, `vitals`, `followUpNotes`, or triage text is returned. Booking may submit `reason` as a scheduling prefill, but never as a patient clinical field. Staff can book, reschedule, check in, cancel, mark no-show, and handle payment logistics. They cannot write `seenAt`/`completedAt` or clinical appointment states. Allowed staff statuses are `scheduled`, `booked`, `confirmed`, `checked-in`, `cancelled`, and `no-show`.

Walk-ins may atomically POST `status: "checked-in"` plus an ISO `checkedInAt`; the date must be today in the clinic's India timezone. Changing a receptionist appointment's date, time, or provider resets `status` to `scheduled` and clears `checkedInAt`. Once a consultation has begun, nonclinical staff cannot change its schedule or arrival/consultation state; billing updates remain allowed. Receptionist completion does not trigger automatic clinical-summary authoring. Existing appointment persistence does **not** enforce overlapping-slot availability; clients must not claim that it does.

## Immediate receptionist patient-details editing

`GET` and `PATCH /api/patients/:id/reception-details-edit` independently authenticate the persisted roles `staff`, `receptionist`, `clinician`, and `owner`. Admins, patients (including the corresponding patient), and unknown roles return 403; missing/invalid authentication returns 401. This explicit editing permission is available immediately, **regardless of `clinicalDetailsVisible`**, with no separate doctor switch. It does not change generic patient/desk or clinical middleware permissions.

Both methods return the editable projection **directly**, not `{patient: ...}`:

`id, name, age, phone, email, address, dob, type, lmp, height, weight, pregnancyStatus, condition, contraception, history`

`id` is a read-only number. `history` is always an object with protected namespaces omitted, including nested protected keys. No clinician note, risk score, plan, genomics, visit record, encounter, prescription, or clinical-note collection is returned. Both methods send `Cache-Control: private, no-store`. Patient IDs must be canonical positive decimal PostgreSQL integers (1–2,147,483,647). Missing patients return 404.

PATCH must be a nonempty object containing only the editable fields above, excluding `id`. All fields are optional; omitted fields remain unchanged. Unknown/protected fields and invalid values return 400 with no write:

| Field | Constraint |
| --- | --- |
| `name` | String, trimmed, 1–200 characters; not null |
| `age` | JSON integer, 0–130; not string/null |
| `phone` | String ≤ 50 characters or null |
| `email` | Valid email ≤ 254 characters, empty string, or null |
| `address` | String ≤ 2,000 characters or null |
| `type` | String ≤ 100 characters or null |
| `condition`, `contraception` | String ≤ 2,000 characters or null |
| `dob`, `lmp` | Real `YYYY-MM-DD` date, year ≥ 0001, no later than today's date in India, or null; empty string is invalid |
| `height` | Numeric decimal **string**, 30–250 cm, or null |
| `weight` | JSON number, 0.1–500 kg, or null; numeric strings invalid |
| `pregnancyStatus` | `active`, `pregnant`, `completed`, `aborted`, `not_continuing`, or null (case-sensitive) |
| `history` | JSON object, ≤ 100,000 UTF-8 serialized bytes, depth ≤ 20, ≤ 20,000 values; no null/array/scalar root |

History accepts arbitrary patient-history keys such as `medical`, `surgical`, `drug`, `allergies`, `family`, `onboarding`, `labSurvey`, and `obstetric`. Nested reported-history values, including `obstetric.eod`, are JSON rather than typed date fields; future expected-delivery dates are allowed. Object updates recursively merge: omitted keys at every level remain, arrays/scalars replace the submitted value, and explicit null clears that key. Sending the complete editable GET history is supported. Replacing/clearing a section or array containing hidden protected descendants returns 400; edit its individual editable fields instead. The merged editable history is also bounded to 100,000 UTF-8 bytes.

At **every history depth**, keys beginning `_` are protected. Other keys normalize by removing non-alphanumeric characters and lowercasing. Exact protected normalized names are:

`proto, prototype, constructor, conception, patientconception, patientreportedlmp, onboardingappointmentid, receptiondetailseditaudit, recordedat, recordedby, updatedat, updatedby, createdat, createdby, appointmentid, source, diagnosisencounterid, cliniciannote, riskscore, plan, diagnosis, diagnoses, diagnosisencounters, clinicalnotes, prescriptions, visithistory`

(`__proto__` is also protected by its leading underscore.) Normalized names beginning `audit`, `provenance`, `private`, `clinician`, `assessment`, `server`, `secret`, `password`, `credential`, or `token`, or ending `audit`/`provenance`, are protected. These namespaces are omitted from GET/PATCH responses, rejected if submitted, and preserved in storage. In particular, existing clinician `conception`, patient-intake `patientConception`/`onboardingAppointmentId`, and preconsult `patientReportedLmp` provenance cannot be overwritten.

PATCH reads the patient using `SELECT ... FOR UPDATE` inside a database transaction before merging. Every successful save appends a server-authored `history.receptionDetailsEditAudit` revision with `source: "reception-details-edit"`, authenticated `editedBy`/`role`, server `editedAt`, submitted field paths, and the complete previous editable projection. Previous revisions are retained (legacy non-array audit values are retained in an entry). Audit history is not exposed to the editor and is not included in the editable-history byte limit. Registration-only edits are audited too. Concurrent saves through this endpoint serialize on the same patient row; rejected/failed transactions do not save either patient changes or audit revisions.

Only the allowlisted patient columns and merged history are written. `clinicianNote`, `riskScore`, `plan`, visits, appointments, diagnosis encounters, medications, and clinical notes remain unchanged. Generic patient PATCH, encounter/diagnosis authoring, manual prescriptions, and clinical-note mutations remain independently protected.

## Doctor-controlled receptionist clinical visibility

`GET /api/clinic/reception-access` accepts authenticated `staff`, `receptionist`, `admin`, `clinician`, and `owner` tokens and returns `{clinicalDetailsVisible: boolean, canRecordVitals: true}`. `PUT` accepts only `clinician`/`owner`, with the strict body `{clinicalDetailsVisible: boolean}`, and returns the same shape. Patients, unknown roles, and admins cannot configure this permission. Reading the clinic setting does not grant admins clinical read or measurement-entry access.

The singleton `clinic_reception_access` database setting defaults to false. Updates persist the authenticated `updated_by` and server `updated_at`; startup's idempotent `ensureSchema` initializes the row without overwriting previous decisions. Tokens themselves retain their existing lifetime; permission decisions are read from persistence on each applicable request, not cached per token.

When enabled, **only** `staff` and `receptionist` gain clinical GET/HEAD access to the protected patient records and shared clinical collections above, including doctor-confirmed diagnoses and stored report files. Patient lists/details and clinical cohort categories return known shared clinical fields in addition to logistics. Unknown top-level fields, `clinicianNote`, and raw `genomics` remain excluded. Both shared and patient-specific clinical-note lists exclude `isPrivate: true`/`1`. Patient ownership checks remain unchanged. Reads send `Cache-Control: private, no-store`; clients must discard cached clinical data and close read-only views on revocation or permission errors.

Report metadata retains `metadata.patientDocumentId`. Fetch `GET /api/patients/:patientId/documents/:docId/file` with the staff token; the handler verifies the document and stored file both belong to that patient. It sends safe inline PDF/image bytes (other types download), or redirects to an S3 signed download URL. This is read access, not permission to upload/import a report.

This toggle never grants authoring: generic patient/appointment field restrictions, invoice diagnosis protection, manual prescriptions, medication mutations, ICD selection/diagnosis writes, clinical tools, import/OCR writes, and intake ownership remain unchanged. Existing narrowly scoped paper transcription and reviewed local-report workflows retain their separate authorization, validation, and audit requirements. Registration/update responses and ordinary appointment responses remain logistics-only even when clinical reads are enabled. `admin` does not gain clinical access from this flag.

## Receptionist preconsultation measurements

`GET/POST /api/appointments/:id/reception-vitals` is independent of clinical visibility. Authenticated `staff`, `receptionist`, `clinician`, and `owner` may use it; patient tokens/sessions, admins, and unknown roles cannot. IDs must be plain positive safe integers; an appointment without an existing associated patient returns 404.

Both methods return `{appointmentId, patientId, vitals, lmp}`. GET contains only that appointment's whitelisted measurement payload and its patient-reported LMP, never patient history, clinical notes, previous-visit measurements, or clinician-confirmed pregnancy dates. It remains available when clinical read access is off.

POST accepts the strict body `{vitals: {bp?, pulse?, temp?, spo2?, weight?, height?, bmi?, recordedAt?} | null, lmp: string | null}`. An object must contain at least one measurement. Numeric fields accept finite numbers or numeric decimal strings and persist as numbers:

- `bp`: `systolic/diastolic` string; systolic 50–260, diastolic 30–180, systolic greater than diastolic.
- Pulse 20–250 bpm; temperature 86–113 °F (matching check-in and clinical display units); SpO2 50–100%; weight 0.1–500 kg; height 30–250 cm; BMI 0.1–150. Temperature input is explicitly Fahrenheit; Celsius values are rejected with a unit-specific error, not silently converted. Deploy the API and frontend together for this correction. Existing measurements are not rewritten.
- LMP: a real `YYYY-MM-DD` date, not in the future in clinic India time, or null. Unknown keys, clinical fields, submitted actor/source fields, booleans, blank strings, and invalid/range-exceeding measurements return 400. Submitted `recordedAt` is ignored; `recordedAt`/`recordedBy` are generated server-side.

Measurement objects merge into the current appointment vitals; `vitals: null` leaves them unchanged. POST never advances the queue/check-in state or creates a visit, medication, diagnosis, or clinical note. A locked transaction permits updates only for `scheduled`, `booked`, `confirmed`, or `checked-in` appointments with neither `seenAt` nor `completedAt`; consultation-started, completed, cancelled, no-show, or unknown states return 409 without writes, even for a doctor using this receptionist endpoint.

LMP is stored as `{value, source: "patient-reported", recordedAt, recordedBy}` in `appointments.patientReportedLmp` and in `patient.history.patientReportedLmp` (also containing `appointmentId`). The clinician's existing `patient.lmp`/conception history is deliberately not overwritten. Clinician clients should display the reported date separately and explicitly confirm it through their existing clinical workflow. Other history namespaces remain intact.

## Receptionist paper prescription transcription

`GET/POST /api/patients/:id/prescription-transcriptions` is a dedicated route (not a relaxation of `manual-prescription`, `visit-history`, `medications`, `documents` or OCR, which stay clinician-only). It authenticates through the same resolver; persisted roles `staff`, `receptionist`, `clinician` and `owner` are allowed. `admin`, unknown roles and patient sessions/tokens get 403; missing/invalid auth gets 401. The patient ID must be a plain positive integer of an existing patient.

- GET returns only records whose `prescriptions.source` is `receptionist-paper-transcription` with `doctorIssuedPaper: true` for that patient—never clinician encounters—including the integrity-checked original (`name`, `mimeType`, base64 `fileData`, `sha256`) needed to edit.
- POST requires `sourceReviewed: true` and, for every new record, `originalPrescription: { name, mimeType, fileData }` as base64 JPG/PNG/WebP/PDF ≤ 8 MB whose bytes match the declared type. URLs or server document references are rejected. On edit (`transcriptionId`), `originalPrescription` may be `null` or the identical original to retain the stored file, which is re-verified by SHA-256; a different file replaces it while the previous file is kept.
- Unknown body fields return 400. The paper's date cannot be in the future. Optional `appointmentId` must belong to the patient. It is kept only as metadata: the transcription is an isolated visit row (`appointmentId: null`) and never updates appointments, queue/consult state, patient demographics/history, ICD diagnoses or any other visit.
- Medicines are saved immediately as `active` medication rows linked by ID from the transcription record. Edits update, create or remove only those linked rows for the same patient, matched by name. The visit, medications and source document commit in one database transaction.
- `enteredBy/At` and `updatedBy/At` record the authenticated user. Every edit appends a revision with the previous content and original-file reference.

Deploy the API and frontend together for this workflow. If the transcription list receives HTML (for example `<!DOCTYPE html>`) instead of JSON, check that same-origin `/api/*` requests route to the API, not the frontend SPA, and that the running API includes the transcription routes. A correctly routed unauthenticated request returns JSON with HTTP 401, not a web page. Retry cannot install a missing API route; update/restart the backend first. The frontend displays the API error and disables Add until the list successfully loads.

## Regression tests

Run `node artifacts/api-server/scripts/test-authorization.mjs` from the repository root (or `pnpm --filter @workspace/api-server run test:authorization`). Tests exercise the actual registered middleware through HTTP with deterministic authentication dependencies, including denied writes before storage, role enforcement, paper-transcription source validation/edit ownership/rollback, immediate details-edit projection/strict validation/deep merge/provenance/revisions/transaction rollback, future-field privacy, aliases, malformed IDs/case, patient ownership, registration, and walk-in logistics. No real database or credentials are needed.

Backend typecheck: `node node_modules/typescript/bin/tsc -p artifacts/api-server/tsconfig.json --noEmit`.

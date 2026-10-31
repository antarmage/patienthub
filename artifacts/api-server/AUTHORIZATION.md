# Patient logistics and clinical access

## Client authentication

- Staff requests send `Authorization: Bearer <staffToken>`, returned by `/api/auth/passcode` after OTP verification (also by the existing staff/desk logins). Staff tokens expire after eight hours and are invalidated by server restart. Staff cookies are **not** supported.
- The existing appointment `X-Staff-Token` header remains supported with the same token expiry and persisted-user role checks. Prefer `Authorization` for all new requests.
- Patient-specific reads accept the patient's existing `/api/auth/patient-login` session cookie, or their separate mobile-login Bearer token. Send cookies with same-origin requests or `credentials: "include"` where appropriate. An invalid explicitly supplied token never falls back to cookies.
- A client-supplied role, username, patient ID, or provider ID is not authentication. `X-Patient-Id` only filters appointments after authentication; patient tokens/sessions always constrain appointment results to their own patient.
- Missing/invalid/expired authentication returns 401; authenticated but unauthorized requests return 403. Register the access policy before all main and desk handlers.

The persisted roles `clinician` and `owner` can author shared clinical records. `staff`, `receptionist`, and `admin` cannot. Existing `staff` accounts do not have separate persisted receptionist/nurse/nutritionist roles; frontend username-based labels do not grant prescribing permissions. Allied protocol/planning, nursing observations, billing, and patient self-tracking endpoints are not reclassified as shared prescription authoring.

## Protected paths

The following require clinical authorization for writes; patient-specific GET/HEAD requests also allow the corresponding patient session/mobile token. Receptionist/staff reads are denied by default, but may be enabled clinic-wide as described below:

`/api/patients/:id/{conception,pregnancy-status,visit-history,medications,clinical-notes,diagnoses,documents,hormones,pregnancy-metrics,weight-logs,bp-logs,follicle-data,usg-data,lab-results,referrals,risk-score,trimester-checklist,manual-prescription,extract-prescription,parse-prescription,extract-lab-results}`

This includes `/api/patients/:id/documents/:docId/file`. Own-patient clinical-note responses exclude notes marked private. The existing diagnosis endpoint still validates doctor-confirmed encounter ownership and imported ICD codes.

Shared `/api/{visit-history,clinical-notes,documents,medications,referrals}` collections and their `/:id` mutations require clinical authorization. So do `/api/ocr/prescription`, `/api/icd10/search`, `/api/patients/batch-risk-score`, `/api/google-sheets/sync`, `/api/google-drive/import-lab-reports`, `/api/voice/soap-transcribe`, `/api/appointments/:id/post-visit-summary`, `/api/appointments/triage`, and `/api/appointments/optimise-schedule`.

Prescription extraction remains read-for-review only; saving is independently protected. Local reviewed lab imports do not create medication orders. Existing patient-session document uploads and own-mobile-token medication self-tracking stay separately authenticated and do not authorize shared clinical mutations.

`/api/onboarding` (with `X-Appointment-Id`) and `/api/onboarding/:appointmentId` require clinical authorization or the appointment's own patient. Patient-submitted history is confined to `onboarding` and `labSurvey` namespaces; it cannot overwrite clinician history/diagnosis namespaces.

## Receptionist response and write contracts

Authenticated nonclinical staff can use `/api/patients`, `/api/patients/:id`, `/api/desk/patients`, `/api/desk/patients/:id`, `/api/prime-members`, and `/api/postop/patients`. With clinical visibility off, their list, detail, registration, and update responses allow only:

`id, name, phone, age, email, address, dob, avatar, mode, referredBy, insurance, lastVisit, nextReview, isPrimeMember, primeMemberSince`

Condition, patient type, gestation/LMP, pregnancy status, risk, history, diagnoses, plans, clinical notes, measurements, and future unknown fields are omitted. Registration/update bodies allow only:

`name, phone, age, email, address, dob, avatar, mode, referredBy, insurance`

Clinical or unknown submitted keys return 403, not silent acceptance. Prime membership remains a separate logistics operation. Category lists are limited to `all`, `all-patients`, and `today-appointments` for nonclinical staff; clinical cohort categories return 403.

Authenticated receptionist appointment responses allow:

`id, patientId, providerId, serviceId, date, time, endTime, duration, type, status, visitType, visitMode, surveyType, priority, room, billingCode, billingAmount, paymentStatus, insuranceClaim, checkedInAt, seenAt, completedAt, followUpDate, telemedicineLink, whatsappReminderSent`

No `reason`, `chiefComplaint`, `notes`, `vitals`, `followUpNotes`, or triage text is returned. Booking may submit `reason` as a scheduling prefill, but never as a patient clinical field. Staff can book, reschedule, check in, cancel, mark no-show, and handle payment logistics. They cannot write `seenAt`/`completedAt` or clinical appointment states. Allowed staff statuses are `scheduled`, `booked`, `confirmed`, `checked-in`, `cancelled`, and `no-show`.

Walk-ins may atomically POST `status: "checked-in"` plus an ISO `checkedInAt`; the date must be today in the clinic's India timezone. Changing a receptionist appointment's date, time, or provider resets `status` to `scheduled` and clears `checkedInAt`. Once a consultation has begun, nonclinical staff cannot change its schedule or arrival/consultation state; billing updates remain allowed. Receptionist completion does not trigger automatic clinical-summary authoring. Existing appointment persistence does **not** enforce overlapping-slot availability; clients must not claim that it does.

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
- Pulse 20–250 bpm; temperature 30–45 °C; SpO2 50–100%; weight 0.1–500 kg; height 30–250 cm; BMI 0.1–150.
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

Run `node artifacts/api-server/scripts/test-authorization.mjs` from the repository root (or `pnpm --filter @workspace/api-server run test:authorization`). Tests exercise the actual registered middleware through HTTP with deterministic authentication dependencies, including denied writes before storage, role enforcement, paper-transcription source validation/edit ownership/rollback, future-field privacy, aliases, malformed IDs/case, patient ownership, registration, and walk-in logistics. No real database or credentials are needed.

Backend typecheck: `node node_modules/typescript/bin/tsc -p artifacts/api-server/tsconfig.json --noEmit`.

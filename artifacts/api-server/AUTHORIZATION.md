# Patient logistics and clinical access

## Client authentication

- Staff requests send `Authorization: Bearer <staffToken>`, returned by `/api/auth/passcode` after OTP verification (also by the existing staff/desk logins). Staff tokens expire after eight hours and are invalidated by server restart. Staff cookies are **not** supported.
- The existing appointment `X-Staff-Token` header remains supported with the same token expiry and persisted-user role checks. Prefer `Authorization` for all new requests.
- Patient-specific reads accept the patient's existing `/api/auth/patient-login` session cookie, or their separate mobile-login Bearer token. Send cookies with same-origin requests or `credentials: "include"` where appropriate. An invalid explicitly supplied token never falls back to cookies.
- A client-supplied role, username, patient ID, or provider ID is not authentication. `X-Patient-Id` only filters appointments after authentication; patient tokens/sessions always constrain appointment results to their own patient.
- Missing/invalid/expired authentication returns 401; authenticated but unauthorized requests return 403. Register the access policy before all main and desk handlers.

The persisted roles `clinician` and `owner` can author shared clinical records. `staff`, `receptionist`, and `admin` cannot. Existing `staff` accounts do not have separate persisted receptionist/nurse/nutritionist roles; frontend username-based labels do not grant prescribing permissions. Allied protocol/planning, nursing observations, billing, and patient self-tracking endpoints are not reclassified as shared prescription authoring.

## Protected paths

The following require clinical authorization for writes; patient-specific GET/HEAD requests also allow the corresponding patient session/mobile token. Receptionists cannot read these clinical records:

`/api/patients/:id/{conception,pregnancy-status,visit-history,medications,clinical-notes,diagnoses,documents,pregnancy-metrics,weight-logs,bp-logs,follicle-data,usg-data,lab-results,referrals,risk-score,trimester-checklist,manual-prescription,extract-prescription,parse-prescription,extract-lab-results}`

This includes `/api/patients/:id/documents/:docId/file`. Own-patient clinical-note responses exclude notes marked private. The existing diagnosis endpoint still validates doctor-confirmed encounter ownership and imported ICD codes.

Shared `/api/{visit-history,clinical-notes,documents,medications,referrals}` collections and their `/:id` mutations require clinical authorization. So do `/api/ocr/prescription`, `/api/icd10/search`, `/api/patients/batch-risk-score`, `/api/google-sheets/sync`, `/api/google-drive/import-lab-reports`, `/api/voice/soap-transcribe`, `/api/appointments/:id/post-visit-summary`, `/api/appointments/triage`, and `/api/appointments/optimise-schedule`.

Prescription extraction remains read-for-review only; saving is independently protected. Local reviewed lab imports do not create medication orders. Existing patient-session document uploads and own-mobile-token medication self-tracking stay separately authenticated and do not authorize shared clinical mutations.

`/api/onboarding` (with `X-Appointment-Id`) and `/api/onboarding/:appointmentId` require clinical authorization or the appointment's own patient. Patient-submitted history is confined to `onboarding` and `labSurvey` namespaces; it cannot overwrite clinician history/diagnosis namespaces.

## Receptionist response and write contracts

Authenticated nonclinical staff can use `/api/patients`, `/api/patients/:id`, `/api/desk/patients`, `/api/desk/patients/:id`, `/api/prime-members`, and `/api/postop/patients`. Their list, detail, registration, and update responses allow only:

`id, name, phone, age, email, address, dob, avatar, mode, referredBy, insurance, lastVisit, nextReview, isPrimeMember, primeMemberSince`

Condition, patient type, gestation/LMP, pregnancy status, risk, history, diagnoses, plans, clinical notes, measurements, and future unknown fields are omitted. Registration/update bodies allow only:

`name, phone, age, email, address, dob, avatar, mode, referredBy, insurance`

Clinical or unknown submitted keys return 403, not silent acceptance. Prime membership remains a separate logistics operation. Category lists are limited to `all`, `all-patients`, and `today-appointments` for nonclinical staff; clinical cohort categories return 403.

Authenticated receptionist appointment responses allow:

`id, patientId, providerId, serviceId, date, time, endTime, duration, type, status, visitType, visitMode, surveyType, priority, room, billingCode, billingAmount, paymentStatus, insuranceClaim, checkedInAt, seenAt, completedAt, followUpDate, telemedicineLink, whatsappReminderSent`

No `reason`, `chiefComplaint`, `notes`, `vitals`, `followUpNotes`, or triage text is returned. Booking may submit `reason` as a scheduling prefill, but never as a patient clinical field. Staff can book, reschedule, check in, cancel, mark no-show, and handle payment logistics. They cannot write `seenAt`/`completedAt` or clinical appointment states. Allowed staff statuses are `scheduled`, `booked`, `confirmed`, `checked-in`, `cancelled`, and `no-show`.

Walk-ins may atomically POST `status: "checked-in"` plus an ISO `checkedInAt`; the date must be today in the clinic's India timezone. Changing a receptionist appointment's date, time, or provider resets `status` to `scheduled` and clears `checkedInAt`. Once a consultation has begun, nonclinical staff cannot change its schedule or arrival/consultation state; billing updates remain allowed. Receptionist completion does not trigger automatic clinical-summary authoring. Existing appointment persistence does **not** enforce overlapping-slot availability; clients must not claim that it does.

## Regression tests

Run `node artifacts/api-server/scripts/test-authorization.mjs` from the repository root (or `pnpm --filter @workspace/api-server run test:authorization`). Tests exercise the actual registered middleware through HTTP with deterministic authentication dependencies, including denied writes before storage, role enforcement, future-field privacy, aliases, malformed IDs/case, patient ownership, registration, and walk-in logistics. No real database or credentials are needed.

Backend typecheck: `node node_modules/typescript/bin/tsc -p artifacts/api-server/tsconfig.json --noEmit`.

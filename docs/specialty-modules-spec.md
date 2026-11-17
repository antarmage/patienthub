# Specialty modules spec — fetal medicine & cosmetic gynecology

Status: **planning** (not implemented). This document captures the agreed design for onboarding
fetal medicine and cosmetic gynecology clinics, and how specialty modules fit the longer-term
multi-clinic (SaaS) direction.

## Context and goals

- Saivie today serves a single obs/gyn clinic. Two new specialty clinic types are planned:
  **fetal medicine** and **cosmetic gynecology**.
- Both modules must be **additive**: new tables and routes only, no changes to existing clinical
  flows, so they slot into either the instance-per-clinic deployment model or a future
  multi-tenant model without rework.
- Each module is gated by a per-clinic **module flag** (`fetal_medicine`, `cosmetic`). Flags are
  deployment/DB configuration today and become tenant configuration later.

### Specialty = onboarding template

The booking catalogue is already database-driven (`booking_categories`,
`booking_service_assignments`). At clinic onboarding, the chosen specialty seeds categories,
services and module flags:

| Specialty picker | Seeds | Enables modules | Hides |
|---|---|---|---|
| Obs/Gyn (current) | existing categories | pregnancy, menopause, ANC | — |
| Fetal medicine | scan types as services | episodes, referrals, scan reports | menopause, cosmetic |
| Cosmetic gynae | procedures + packages | surgery, recovery, packages, photos, leads | ANC surveys |

## Module 1 — Fetal medicine: structured scan reports

Fetal medicine is a referral business: obstetricians send patients for scans and expect a
structured report back. The core clinical spine already exists (pregnancy episodes with LMP/EDD
dating, multi-baby support, USG data endpoints, report uploads, PDF generation, diagnostic
referrals and referral partners, WhatsApp delivery).

### What must be built

1. Structured scan report templates: dating, NT, anomaly, growth, Doppler.
2. Fetal biometry capture (BPD, HC, AC, FL, EFW, NT, AFI) with percentile/growth charting.
3. Referring-doctor loop: deliver the finalized report PDF to the referring partner.
4. External screening-result recording (aneuploidy risk) and procedure tracking (amnio/CVS).
5. Scan-slot scheduling (time-boxed machine slots) — later phase.

### Data model

```
fetal_scans
  id, patient_id → patients, episode_id → pregnancy_episodes,
  appointment_id (nullable), scan_type ('dating'|'nt'|'anomaly'|'growth'|'doppler'),
  scan_date, ga_weeks, ga_days,                -- snapshot at scan time, never recomputed
  performed_by → users, referring_partner_id → referral_partners (nullable),
  indication text, findings jsonb, impression text,
  template_id → fetal_scan_templates, status ('draft'|'finalized'),
  version, finalized_at, finalized_by

fetal_scan_fetuses                             -- multiple pregnancy support (mirrors babies pattern)
  scan_id, fetus_position (1..n), presentation,
  biometry jsonb,                              -- {crl, bpd, hc, ac, fl, efw, afi, nt_mm, ...}
  percentiles jsonb,                           -- computed once at save, stored
  doppler jsonb,                               -- {ua_pi, mca_pi, cpr, uta_pi, ...}
  anomalies jsonb,                             -- structured per-system checklist outcomes
  cardiac_activity, fhr

fetal_scan_images
  scan_id, s3_key, caption, sort_order         -- same S3 pattern as patient_documents

fetal_scan_templates
  id, scan_type, name, schema jsonb, active    -- DB-driven, clinic-tunable (like booking catalogue)
```

### Design decisions

- `findings` is keyed by a versioned **template**; anomaly scans are a per-organ-system checklist
  (normal / abnormal / not visualized), NT scans a handful of fields.
- **Percentiles are computed at save time and stored**, not recomputed on read. Reference charts
  (e.g., Hadlock EFW) change editions; a finalized report must reproduce exactly. Growth charts
  plot the episode's stored scans.
- Draft → **finalize is one-way** (same philosophy as approved menopause plans). Finalized
  reports are immutable; corrections create a new version with retained history.
- **Referrer delivery:** on finalize, generate the PDF via the existing print pipeline and send
  through the existing WhatsApp integration to the `referral_partners` contact, recording
  delivery status. Unconfirmed delivery instructs staff to share manually (existing pattern).
- GA snapshot lives on the scan row.
- Authoring is clinician/owner-only; responses `private, no-store`; versioned saves reject stale
  writes with HTTP 409 (existing conventions).

### Build order (~2–3 weeks)

1. Dating + growth scans (simplest templates, immediate value)
2. NT scan
3. Anomaly checklist
4. Doppler
5. Referrer PDF delivery

## Module 2 — Cosmetic gynecology: photos, consent, leads

Cosmetic practices are package-and-payment-plan driven and marketing-led. Already reusable:
service packages, billing catalogue, invoices, surgery planning, SaivieRecover post-procedure
follow-up, online consultations (discreet video consults).

### What must be built

1. Before/after photo management with consent-controlled side-by-side comparison.
2. Digital consent forms per procedure (photo consent especially).
3. Lead/inquiry management: enquiry → consult → package pipeline.
4. Heightened privacy posture (socially sensitive records; per-record visibility controls).

### Data model

```
procedure_photos
  id, patient_id, surgery_id → patient_surgeries (nullable),
  s3_key, stage ('before'|'after'|'progress'), taken_on date,
  body_region, notes, captured_by → users,
  consent_id → photo_consents NOT NULL         -- no photo without consent, enforced by schema

photo_consents
  id, patient_id,
  scope jsonb,                                 -- {clinical_record: true, internal_teaching: bool, marketing: bool}
  signed_at, method ('in_clinic_signature'|'otp'), otp_phone_hash,
  revoked_at, revoked_by                       -- revocation hides teaching/marketing use, never deletes clinical record

procedure_leads                                -- deliberately OUTSIDE patient tables
  id, name, phone, source ('instagram'|'website'|'walk_in'|'referral'),
  interest, status ('new'|'contacted'|'consult_booked'|'converted'|'closed'),
  assigned_to, notes, created_at,
  converted_patient_id (nullable)              -- conversion creates the patient and links back
```

### Design decisions

- **No photo without consent** — the NOT NULL foreign key enforces it, not UI convention.
  Consent is captured in-clinic (signature pad / staff attestation) or via patient-phone OTP,
  reusing existing OTP infrastructure.
- Consent **scope is tiered**: clinical record vs. internal teaching vs. marketing are separate
  grants. Revoking marketing consent does not touch the clinical record. Views of
  marketing-scoped photos are audited.
- Photos stored in S3 (existing pattern), served only through authorized endpoints — never
  public URLs. Clinician/owner-only by default; explicit sharing to the patient's own portal
  follows the online-consultation record-sharing model.
- **Comparison view** is pure frontend: two photos of the same `body_region`, side-by-side
  slider, over the list endpoint.
- **Leads are not patients**: an enquiry holds no health data, keeping DPDP exposure minimal for
  the marketing funnel. Conversion creates the patient record.

### Build order (~2.5–3 weeks)

1. Consent + photo capture/storage (~1.5 weeks)
2. Leads pipeline (~1 week)
3. Comparison UI polish (~2–3 days)

## Rollout plan

1. Onboard one fetal medicine clinic manually first (instance-per-clinic deployment); build the
   scan-report module against their real workflow.
2. Build the cosmetic module for the second clinic type.
3. Both modules become permanent specialty templates for future clinic onboarding, regardless of
   the eventual single-vs-multi-tenant architecture choice.

## Compliance notes

- Both modules handle health data under India's DPDP Act; photos in particular require the
  consent tiering above and auditable access.
- Data export and retention policy for offboarded clinics must be decided before multi-clinic
  rollout.

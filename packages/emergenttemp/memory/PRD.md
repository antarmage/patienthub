# Saivie Mama — Product Requirements (MVP)

## Vision
An AI-assisted postpartum care platform that continuously understands a mother's physical, emotional and behavioural state, provides personalized daily care, and connects her to clinicians when intervention is required. **Mother-first**, not a baby tracker.

## MVP Scope
Two products in one Expo app:
1. **Mother app** (primary, bottom-tab navigation)
2. **Clinician view** (accessible via Profile → "Open clinician view")

## Users
- **Primary:** First-time mothers 24-40, urban India → global, 0-12 weeks postpartum
- **Clinician:** gynaecologists, nurses, lactation consultants, psychologists

## Features Delivered

### Mother App
- **Google Auth** (Emergent-managed) — one-tap sign in
- **Onboarding (4 steps):** basics, delivery info, baby/feeding, mood/pain baseline
- **Home / Care Cockpit:**
  - Postpartum day + risk label
  - Tri-domain **Wellbeing Rings** (Mental, Physical, Sleep) rendered with SVG
  - Today's care tasks (dynamic based on delivery type + postpartum day)
  - Alert banner if care team notified
  - Quick actions: "Is this normal?" triage, "Talk to Saivie"
- **Daily check-in (10 steps):** mood, anxiety, overwhelm, enjoyment, pain, bleeding, energy, sleep hours, hydration, symptoms
- **Wellbeing engine** computes 6 dimensions and a deterministic risk level (green/yellow/orange/red)
- **Ask Saivie AI Companion** — Claude Sonnet 4.6 via Emergent Universal LLM Key with warm/empathetic system prompt, patient context injection, persistent conversation history, red-flag escalation instructions
- **"Is this normal?" symptom triage** — deterministic decision tree for bleeding / mood / pain → Monitor / Contact / Urgent
- **Care module hub:** Recovery, Breastfeeding, Nutrition, Sleep programs
- **Progress screen** — 14-day trend charts (Mental, Physical, Sleep) + Nutrition/Recovery/Support bars
- **Profile:** care team, consent grid, clinician role toggle, sign out

### Clinician View
- **Dashboard summary:** total mothers + Stable/Watch/Review/Urgent counts + active alerts
- **Risk filter chips** (horizontal, sticky, non-wrapping)
- **Patient list** sorted by risk severity with color-coded risk chips
- **Patient detail:**
  - Overview (Mental/Physical/Sleep trend charts)
  - Timeline (delivery → risk events)
  - Notes (add + view clinical notes)
  - Active alerts + acknowledge

### Backend
FastAPI + MongoDB, all routes prefixed `/api`:
- Auth: `POST /auth/session`, `GET /auth/me`, `POST /auth/logout`
- Mother: `POST /mothers/onboarding`, `GET /mothers/me`
- Check-in & wellbeing: `POST/GET /checkins`, `GET /wellbeing/today`, `GET /wellbeing/trends`
- Care plan: `GET /care-plan/today`, `POST /care-plan/complete`
- AI chat: `POST /ai/chat`, `GET /ai/history`
- Triage: `POST /symptoms/triage`
- Alerts: `GET /alerts`
- Clinician: `GET /clinician/dashboard`, `/clinician/mothers`, `/clinician/mothers/:id`, `POST /clinician/mothers/:id/notes`, `POST /clinician/alerts/:id/acknowledge`
- Demo: `POST /demo/seed` (auto-runs on startup)

### Design
- **Palette:** Warm terracotta brand (`#A85A46`), sage success, ochre warning, off-white surface. Zero blue/purple/lavender.
- **Typography:** Georgia serif (display) + system sans (body/metrics).
- **Rings, charts:** custom SVG components.

## Non-goals (deferred)
- Partner mode, WhatsApp layer, marketplace, Hindi/Bengali/Odia, EPDS licensed screening, streaming AI, push notifications, CMS.

## Key Integrations
- **Emergent Google Auth** (mobile + web)
- **Emergent Universal LLM Key** → Claude Sonnet 4.6 (`claude-sonnet-4-6`) via `emergentintegrations`

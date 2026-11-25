# Recommendation engine: staff testing

This backend prototype is disabled by default. Set
`SAIVIE_RECOMMENDATION_STAFF_TESTING=true` only in a controlled testing
environment. Only authenticated clinicians and owners can access the routes.
Use synthetic patient records and test data. These outputs and activity values
have not been clinically reviewed and must not be used for care or exposed to
patients.

The routes are under `/api/recommendation-testing/patients/:id`. All dates are
calendar dates in `YYYY-MM-DD` format:

- `PUT /period-starts/:date` with `{}` records a period start; `DELETE` removes it.
- `GET /period-starts?asOf=YYYY-MM-DD` lists starts on or before that date.
- `PUT /check-ins/:date` records or replaces a check-in; `DELETE` removes it and
  its feedback.
- `PUT /feedback/:date` saves `{ "activityId": "WORK_001", "action": "helpful" }`.
  Supported actions are `completed`, `helpful`, `accepted`, `snoozed`,
  `dismissed`, and `didnt_suit`. Feedback is stored but does not yet change the
  ranking.
- `GET /feedback?date=YYYY-MM-DD` lists saved feedback for that date.
- `GET /insights?date=YYYY-MM-DD` returns the check-in, experimental forecast
  and recommendations. Responses are marked `notForClinicalUse`.

Example check-in:

```json
{
  "readiness": {
    "energy": 4,
    "focus": 4,
    "mood": 3,
    "confidence": 4,
    "social_battery": 3,
    "physical_capacity": 4
  },
  "stage": "cycle",
  "regularity": "regular",
  "flags": [],
  "nowHour": 8,
  "freeSlots": [{ "start": 9, "end": 12 }],
  "goals": { "work": 0.8 }
}
```

Readiness values are whole numbers from 1 to 5; slot and current hours are local
hours from 0 to 24 for the specified date. Stage and regularity are test inputs,
not verified patient history. Flags are `heavy_bleeding`, `severe_pain`, or
`red_flag`; any flag or a stage other than `cycle` withholds recommendations.
Only non-physical activities marked `none` intensity are considered. No
contraindication screening is implied.

The test forecast requires a check-in marked as a regular cycle and at least
four period starts. It uses the mean of the three most recent intervals. As
experimental safeguards, intervals outside 15–60 days or varying by more than
seven days are withheld, and a past predicted date is marked stale. These
thresholds and the scoring weights are engineering choices, **not validated
clinical rules**. The forecast does not predict ovulation, hormone levels or
fertility and is not contraception.

The API stores testing records in PostgreSQL, separately from existing clinical
records. Patient-facing access, clinical rules, symptom escalation, catalog
approval, real-patient consent and retention policy, feedback-driven learning,
sleep and preference inputs, and integration with the existing check-in are
prerequisites for any later production release. The prototype does not use
chronotype or deadlines and does not provide weekly planning.

## User-reported cycle context

Test check-ins may optionally include `periodContext`, for example:

```json
{
  "phase": "menstrual",
  "flow": "light",
  "symptoms": ["cramps", "fatigue"]
}
```

Allowed phases are `menstrual`, `follicular`, `ovulation`, `luteal` and
`unsure`. They are user reports, not phase or fertility predictions. Flow is
optional and can be `none`, `light`, `moderate`, `heavy` or `unsure`.
Symptoms can include `cramps`, `fatigue`, `headache`, `mood_changes` and
`severe_pain`. Heavy flow or severe pain also withholds experimental outputs,
even if no safety flag was supplied. Withholding is not symptom triage or a
substitute for clinical care.

The separate `/api/recommendations/patients/:id` prototype is disabled unless
`SAIVIE_RECOMMENDATION_PATIENT_TESTING=true`; it is for controlled testing with
synthetic records only. Its mobile test controls additionally require
`EXPO_PUBLIC_RECOMMENDATION_TESTING=true`. The mobile journal does not submit
recommendation check-ins: its mood and symptoms do not supply the required
readiness dimensions or availability.

For the web Today screen, set `VITE_SAIVIE_RECOMMENDATION_TESTING=true` at
frontend build time and enable the patient-testing API flag in the same
isolated test environment. Sign in with an authorized synthetic patient record
and open Today in cycle mode. Record period starts and enter the six explicit
readiness ratings, stage, regularity, reported phase and optional free slots;
save the check-in to refresh the experimental output. Use `24:00` for a slot
ending at midnight. Reported phase is not used to rank activity suggestions.
Heavy flow, severe pain or a safety flag withholds suggestions; this is not
clinical triage. If either flag is off, the feature is not available. Never
enable these test flags for real patient data or in the production deployment.

No period-care content has been approved. The prototype returns
`periodCare.status: "awaiting_clinical_review"` with no blocks. The existing
content feed only assembles pregnancy content; a reviewed menstrual-content
catalogue and its integration must be completed before period-care advice can
be released. No external AI service is used for this context.

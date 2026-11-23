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

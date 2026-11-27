# Cycle Body content

The period Body tab requests `/api/patients/:id/cycle-body-content`. This
patient-only endpoint selects content using the recorded LMP, period prompt
response or onboarding date, typical cycle length and reported regularity.
Missing, future, stale or irregular cycle data and pregnancy/postpartum/
menopause stages withhold cycle education rather than invent a day.

The content engine uses the configured Gemini client to generate a generic
four-phase education catalogue. **No patient identifiers, dates, symptoms or
records are sent to the model.** The generated catalogue is schema-validated
and persisted in `cycle_body_content_catalogue` by asset version. Generation
is serialized across API instances, and subsequent requests reuse it.

Headlines, Today's Read, hormone explanation, temperature education, signal
cards and Patterns introduction all come from the engine. Chart geometry and
reported cycle values remain deterministic. Hormone curves are illustrative,
not measurements. The UI labels generated content as not clinically reviewed
and not medical advice. This does not enable reviewed period-care content in
the recommendation engine.

Generation requires the existing server-side Gemini configuration. Failures
are returned through the API error handler and shown with a retry action; no
frontend educational fallback is substituted. Bump the catalogue asset
version when deliberately regenerating generic content. API and frontend
changes both need deployment.

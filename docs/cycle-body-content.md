# Cycle Body content

## Daily background worker

The API starts a background worker after its schema and routes are ready.
At **12:00 AM India time (IST, UTC+05:30)**, each eligible patient becomes
due for a separate daily edition. A minute-level scheduler detects the date
rollover and catches up on API restarts, newly eligible patients and changed
period records. Generation is sequential, so editions finish progressively
after midnight rather than all being ready at exactly 12:00 AM.

A PostgreSQL advisory lock prevents concurrent generation across API instances.
`cycle_body_daily_editions` persists each patient's IST date, version, cycle
context, generated content, state and attempt count. An existing matching
edition is not regenerated after a restart. Failed editions are retried up to
three times per day/context; failures are logged and one failure does not stop
other patients' editions. A stopped worker finishes its in-flight generation
but does not begin another.

The engine uses `gemini-3.8-flash` with low thinking and a three-minute generation
deadline. It makes a separate generic education request per patient edition;
**no patient identifiers, dates, symptoms or records are sent to the model**.
The response is schema-validated. The patient's cycle context selects the
appropriate phase locally. AI-generated content is not clinically reviewed.

## Body endpoint

`GET /api/patients/:id/cycle-body-content` is restricted to the owning patient.
It selects today's edition using recorded LMP, period-prompt response or
onboarding date, typical cycle length and reported regularity. Missing, future,
stale or irregular data and pregnancy/postpartum/menopause stages withhold
cycle education rather than invent a day.

The endpoint **never generates content or waits on a generation lock**.
Ready editions return HTTP 200. Pending editions return HTTP 202 with an
explicit preparation message; the Body tab polls every five seconds. Exhausted
generation attempts return HTTP 503. Available editions refresh every minute
to pick up the new IST date. Neither yesterday's edition nor a shared catalogue
is silently substituted.

Headlines, Today's Read, hormone explanation, temperature education, signal
cards and Patterns introduction come from the engine. Chart geometry and
reported values remain deterministic. Hormone curves are illustrative, not
measurements, and generated content is labeled not medical advice.

Both API and frontend require deployment. Schema initialization creates the
daily-edition table; no external cron service is required while the API runs.
If the API is offline at midnight, startup catches up on the current day's
editions. Bump `cycleBodyVersion` when deliberately changing the generation
prompt. Old versions are retained but are not served as current daily editions.

## Basal temperature logging

**Log temperature** opens a dialog for Celsius/Fahrenheit, measurement time
and optional notes. Patient-only `GET` and `POST
/api/patients/:id/basal-temperature-logs` persist readings in
`basal_temperature_logs`. The list returns the latest 30 measurements.
Units are stored as entered, future times are rejected and failed saves leave
the dialog open. One reading does not confirm ovulation. Logs are not sent to
Gemini.

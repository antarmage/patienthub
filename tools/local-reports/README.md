# Local lab-report importer (macOS)

This workflow reads a report on your Mac, writes private temporary JSON, lets you
review it, and uploads the original plus confirmed lab results to Saivie using a
`patientId`. No patient files are committed to Git. No AWS GPU is needed.
This local path uses Apple's OCR and a local Ollama model, not GLM-OCR or PyMuPDF.

## Requirements

- macOS with Apple Vision/PDFKit and Swift command-line tools (`swift --version`).
- Node.js 24 and this workspace's installed dependencies.
- A local Ollama installation and a downloaded model, for example `qwen3:4b`.
  Model downloads do not contain patient documents. Start Ollama with cloud
  features disabled and its default loopback binding:

  ```sh
  OLLAMA_NO_CLOUD=1 ollama serve
  # In another terminal, before reading patient files:
  ollama pull qwen3:4b
  ```

- Deploy the updated API first. Its normal startup migration creates
  `local_report_imports`. No changes to AWS infrastructure are required.
- A staff account with owner/admin/receptionist access and existing OTP delivery.
  Login uses the same credentials, OTP verification and staff tokens as the app.
  The tool never stores credentials on disk. Existing clinician staff tokens are
  accepted too; the interactive desk login supports owner/admin/receptionist.

The default 4B model is a starting point for this 16GB Apple Silicon Mac, not a
clinical-accuracy guarantee. Tune only after testing on de-identified reports.
The model must already be downloaded. Cloud-backed Ollama models are rejected.
OCR and extraction calls go to Apple on-device APIs and `127.0.0.1:11434`, not
Gemini or a hosted OCR API. Disable any prompt logging or third-party monitoring.

## Prepare, review, upload

From the repository root:

```sh
node artifacts/api-server/scripts/local-reports.mjs prepare \
  --api https://YOUR-SAIVIE-APP \
  --patient 123 \
  --file "/Users/you/Reports/report.pdf"
```

Use the **patient record ID**, not a staff user ID. Login prompts for credentials
and OTP without echoing secrets. Verify the displayed name and type the patient
ID before extraction. Preparation fetches patient identity but does **not** upload
the report or extracted text.

The command prints the job UUID and the path to `reading.json`. Working files
live outside this repository in:

```text
~/Library/Application Support/Saivie/local-reports/<UUID>/
```

Directories are private (0700), files private (0600), and no original-source path
is recorded for deletion. Use FileVault and a non-synced local account/directory;
permissions alone are not disk encryption.

Open `reading.json` in a local editor. Compare it to your original report and
correct the date, patient name, test names, decimal values, units, reference
ranges, flags and any warnings. Do not remove quotes around values such as
`"<0.01"` or `"Negative"`. Dates must be real `YYYY-MM-DD` dates. Remove incorrect
result rows or add missing rows using the same JSON shape.

Then:

```sh
node artifacts/api-server/scripts/local-reports.mjs upload --job JOB-UUID
```

Log in again if required. The server verifies the patient still matches.
Type `REVIEWED 123` only after checking every result. The tool freezes the
submission in `submitted.json` before the first upload.

The API stores the original file, document metadata (including reviewed JSON,
transcription and reviewer), lab rows, and a durable receipt in **one PostgreSQL
transaction**. The original is stored using the app's existing database file
format; this path does not require S3. Numeric values are populated only for
plain numbers; qualified/qualitative values retain their exact raw text.

Only a matching committed receipt permits removal of the working files and job
directory. **Your selected original report is never changed or deleted.**
The API receipt remains for safe retries; it is not a Git commit.
Refresh the patient's reports/lab-results screen in the web app to see imports.

## Failure and retry

- A failed/uncertain upload keeps all working files. Re-run `upload --job` with
  the **same UUID**, even if the request timed out after the server saved it.
- Concurrent/repeated submissions with that UUID return the same receipt and
  do not create duplicate results. Reusing an ID with different data returns 409.
- After any upload attempt, retries use frozen `submitted.json`, not subsequent
  edits to `reading.json`. To correct already imported results, use the app's
  normal editing workflow. Do not create another job to bypass a conflict.
- Duplicate detection is per import ID, not across separately prepared jobs
  for the same report. Check the patient history before preparing another job.
- A model/extraction failure leaves the working original for manual inspection.
  Nothing has been uploaded. Correct local model setup, then run
  `node artifacts/api-server/scripts/local-reports.mjs read --job JOB-UUID`.
  This requires confirmation before replacing an unsent job's extracted JSON.
  It is forbidden after any upload attempt; use `upload` to retry that frozen
  submission instead.
- An interrupted post-save cleanup can be resumed with `upload --job`; its
  committed receipt permits cleanup without sending the report again.
- A concurrent upload is blocked by `.lock`. After a crashed process, first
  verify no importer is running, then remove **only that job's `.lock` file** and
  retry. Never delete working data to resolve an uncertain server response.
- Local-file deletion is ordinary unlinking, not guaranteed forensic erasure on
  SSDs/backups. FileVault, retention controls and backup exclusions still matter.

Existing API authentication tokens are process-local and expire; after an API
restart or expiry, sign in again. Secrets must not be passed as command-line
arguments. For an existing authenticated staff session, advanced users may
provide `SAIVIE_STAFF_TOKEN` in the process environment; never put it in Git.

## Limits and clinical acceptance

- PDF, PNG, JPEG or WebP; nonempty, at most 10MB.
- At most ten PDF pages; embedded PDF text is used where present, otherwise
  Apple Vision reads a rendered page. All pages must return text.
- Images: one frame, at most 20 megapixels. Source-page text is numbered.
- Local model input: conservatively limited to 9,000 UTF-8 bytes for the numbered
  source plus its extraction schema, leaving room for the prompt and output in
  its 16K context. Split longer reports; text is never silently truncated. The API accepts up to
  100,000 characters of reviewed transcription. Empty, truncated or malformed
  model responses fail explicitly.
- Model result values are constrained to verbatim source spans of up to three
  whitespace-separated tokens (or blank for unknown values). Unsupported test
  names/values reject extraction. Optional units, ranges, statuses and flags not
  found in the transcription are cleared with explicit review warnings, never
  accepted as clinical facts. Longer/complex values require manual correction.
  Source matching does not prove a field belongs to the correct test; review is
  still mandatory.
- Printed lab reports are the intended first use. Handwriting, unusual layouts,
  mixed text/scanned pages and local languages require separate validation.
  OCR can omit text or misread decimals even when validation succeeds.
- This importer saves lab results, not prescriptions or diagnoses. There is no
  silent cloud fallback and no automatic unreviewed upload.

Tests use synthetic documents and an isolated PostgreSQL schema. A real-patient
import has not been performed. Before clinical use, validate field-level accuracy
with approved de-identified documents and clinical acceptance criteria.

# Self-hosted clinical document reading

The API has an opt-in `OCR_PROVIDER=glm-ocr` path. It sends documents only to
the configured GLM-OCR gateway, then sends the OCR text to a **separate
self-hosted, OpenAI-compatible text model** for structured clinical extraction.
The supplied Compose example uses Qwen3-4B-Instruct for this second step.
GLM-OCR is not used as a general-purpose clinical reasoning model.

No hosted Z.ai API or Gemini fallback is used on this path. Gemini remains the
default when `OCR_PROVIDER` is absent or `gemini`. Other AI features in the app
still use their existing providers; this switch is for document reading only.

## Architecture

```text
Saivie API
  -> authenticated gateway:5002/glmocr/parse
       -> in-memory PDF rendering / image validation
       -> GLM-OCR SDK layout detection (CPU)
       -> private vLLM GLM-OCR inference (GPU)
  -> authenticated structuring-model:8000/v1/chat/completions (GPU)
  -> schema validation -> editable human review -> explicit save
```

The small gateway is necessary because the SDK's example HTTP server accepts
image URLs but does not directly decode our PDF data URLs. The gateway decodes
uploads, renders PDF pages and passes image bytes to the SDK. It returns
numbered source-page transcriptions. It rejects a document if any page fails;
it never silently processes just the first pages of an oversized PDF.

## Requirements and startup

Use a private Linux GPU host with NVIDIA Container Toolkit, Docker Compose GPU
support, and sufficient RAM/VRAM/model-cache storage. The example runs two GPU
models on one GPU with memory fractions 0.25 and 0.65; this is a starting
configuration, **not a guaranteed minimum hardware specification**. Adjust
context length, concurrency and memory reservations after benchmarking. A
CPU-only ECS/Fargate API task does not run these GPU services.

1. Provision the host and download the pinned container images/model weights.
   The initial build downloads Python dependencies and model weights. These
   downloads must not include patient data. For restricted environments,
   pre-populate caches and restrict outbound traffic before processing uploads.
2. Set `GLM_OCR_API_KEY` and `OCR_STRUCTURING_API_KEY` in the host's secret
   environment. Generate distinct random values, for example with
   `openssl rand -hex 32`. Do not put real keys in tracked files.
3. From the repository root:

   ```sh
   docker compose -f aws/glm-ocr/compose.yaml up --build -d
   docker compose -f aws/glm-ocr/compose.yaml ps
   curl --fail http://127.0.0.1:5002/health
   curl --fail http://127.0.0.1:5003/health
   ```

4. Configure the **API process**, not a frontend build:

   ```dotenv
   OCR_PROVIDER=glm-ocr
   GLM_OCR_BASE_URL=http://127.0.0.1:5002
   GLM_OCR_API_KEY=<same gateway secret>
   OCR_STRUCTURING_BASE_URL=http://127.0.0.1:5003/v1
   OCR_STRUCTURING_MODEL=clinical-extractor
   OCR_STRUCTURING_API_KEY=<same structuring service secret>
   OCR_TIMEOUT_MS=120000
   ```

   Restart the API. Deploy the API and main Saivie frontend together.
   The sample addresses work only when the API runs on the same host. For ECS
   or another host, expose services through an authenticated private TLS
   reverse proxy/private network, and use those private URLs. Do not bind the
   example ports publicly. Add corresponding ECS environment/Secrets Manager
   entries to your actual task definition; the existing deployment does not
   provision a GPU host automatically.

5. Test using synthetic or properly de-identified PDFs/images first. Only enable
   production patient processing after privacy approval, operational monitoring
   and clinical acceptance testing.

To roll back document reading, set `OCR_PROVIDER=gemini` and restart the API
(requires `AI_INTEGRATIONS_GEMINI_API_KEY`). There is intentionally no automatic
provider fallback: a local service outage must not disclose documents to a
hosted provider.

## Limits, errors and review

- Upload limit: 10MB. Gateway PDF limit: **10 pages**, rejected before inference
  if exceeded. Images: 20 megapixels maximum; multi-frame images and encrypted
  PDFs are rejected. Split larger documents before uploading.
- Up to 100,000 characters of OCR text, with numbered source pages; no silent
  truncation. The extraction model also needs enough context for the schema,
  source and output. Incomplete model outputs are rejected.
- One gateway document at a time; overload returns an explicit error. The API
  has one overall local-pipeline deadline (default 120s, configurable 1–300s).
  Align reverse-proxy/load-balancer request limits with it. These are bounded,
  synchronous pilot requests, not a durable background job queue. A client
  timeout does not guarantee GPU work already in progress is cancelled.
- Staff uploads and prescription entry show warnings and require an explicit
  review acknowledgment. Correct extracted fields before saving.
  Staff uploads and report-result review require a confirmed document date;
  an unknown date is not silently replaced with today's date.
- `/api/patients/:id/extract-prescription` and `/parse-prescription` are both
  **read-only**, returning `medicines`, `tests`, `rawText`, `warnings`,
  `provider`, and `requiresReview`. The legacy auto-import response
  (`inserted`/`skipped`) has deliberately been removed.
- Clinician **Read Reports** reads existing Drive-linked lab PDFs for review;
  it no longer runs automatically on patient opening or saves results while
  extracting. Staff-uploaded reports are read in the upload dialog.
- Staff upload saves the original document, transcription, source pages and
  provider/review metadata. Prescription entry stores the original on explicit
  save. Existing Drive reports remain the source for reviewed lab results.
- Exact source values are retained. Qualifiers such as `<0.01` and qualitative
  results are not converted into fabricated numeric values. Unknown routes,
  dates and statuses are not guessed by the OCR model.
- Model confidence labels are not calibrated accuracy estimates. All medication
  names, strengths, decimal points, frequencies, routes and lab units require
  verification. This feature transcribes **written** imaging reports; it does
  not diagnose from ultrasound/radiology images.
- The legacy rescan CLI is dry-run only when GLM-OCR is selected. Use the review
  UI to save verified fields.

Use restrictive access controls, encrypted disks/caches and private networking.
Do not enable request/prompt/body logging on the model servers or proxy. The
gateway logs only the exception class on inference failure, not document text.
Apply the normal patient-document retention/deletion policy to stored originals
and extraction metadata.

## Validation and release gate

The checked-in tests use synthetic documents and mocked inference:

- `artifacts/api-server/src/replit_integrations/ocr/ocr.test.ts`
- `artifacts/saivie/src/lib/labReading.test.ts`
- `aws/glm-ocr/test_gateway.py` (run `python -m unittest discover -s aws/glm-ocr -p 'test_*.py'`
  in an environment with Flask, Pillow and PyMuPDF).

Before clinical release, measure field-level exact matches on a held-out,
de-identified set: medicine name/strength/frequency/route, decimal lab
value/unit/reference range, date and source-page completeness. Include difficult
handwriting, rotated/blurred photos, tables, qualitative/inequality results,
multi-page PDFs and local languages. Agree acceptance thresholds with the
clinical team; general OCR benchmark scores do not establish clinical safety.
Record latency/throughput and failure rates on the actual deployment hardware.

## Upstream and licensing

- [GLM-OCR source and SDK](https://github.com/zai-org/GLM-OCR)
- [Model card](https://huggingface.co/zai-org/GLM-OCR)
- [SDK self-hosting protocol](https://github.com/zai-org/GLM-OCR/tree/main/examples/self-host)
- [Qwen3-4B-Instruct model card](https://huggingface.co/Qwen/Qwen3-4B-Instruct-2507)

GLM-OCR code and its PP-DocLayoutV3 layout dependency use Apache-2.0; GLM-OCR
weights use MIT. Retain applicable license/notice files when distributing.
The SDK/gateway also depend on **PyMuPDF (AGPL/commercial licensing)**. Obtain
legal review and an appropriate commercial license if your use cannot comply
with AGPL; the permissive model license does not cover this dependency.
Review the licenses and terms of the chosen structuring model and all deployed
components separately. Model IDs are upstream release repositories, not
immutable weight revisions: pin vetted model revisions/container digests in
your production deployment after acceptance testing.

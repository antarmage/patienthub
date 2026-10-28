import assert from "node:assert/strict";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import test from "node:test";
import express from "express";
import { z } from "zod/v4";
import {
  clinicalDocumentSchema,
  extractionPrompt,
  OcrError,
  parseClinicalDocument,
  prescriptionForReview,
  validateDocument,
  type ClinicalDocument,
} from "./document";
import { scanWithGlm } from "./glm-client";
import {
  registerOcrRoutes,
  registerPrescriptionReadingRoutes,
  scanClinicalDocument,
} from "./routes";

const blank: ClinicalDocument = {
  doctorName: "",
  patientName: "",
  labName: "",
  date: "",
  reportType: "",
  diagnosis: "",
  chiefComplaint: "",
  examination: "",
  advice: "",
  followUp: "",
  notes: "",
  impression: "",
  gestationalAge: "",
  edd: "",
  endometrialThickness: "",
  medications: [],
  investigations: [],
  results: [],
  findings: [],
  follicles: [],
  fetalParameters: {
    crl: "",
    bpd: "",
    hc: "",
    ac: "",
    fl: "",
    efw: "",
    heartRate: "",
    presentation: "",
    placenta: "",
    afi: "",
    doppler: "",
  },
  rawText: "",
  confidence: "low",
  warnings: [],
};
const env = {
  GLM_OCR_BASE_URL: "http://ocr.internal:5002",
  GLM_OCR_API_KEY: "test-ocr-key",
  OCR_STRUCTURING_BASE_URL: "http://extractor.internal/v1",
  OCR_STRUCTURING_MODEL: "test-extractor",
  OCR_STRUCTURING_API_KEY: "test-extractor-key",
};
const syntheticText =
  "Synthetic example only\nTSH 0.01 mIU/L\nUnclear handwritten medicine";
const json = (body: unknown, status = 200) => Response.json(body, { status });
const completion = (document: unknown = blank, finish = "stop") =>
  json({
    choices: [
      { finish_reason: finish, message: { content: JSON.stringify(document) } },
    ],
  });

test("validates supported files, data URLs, exact 10MB limit and document categories before sending", () => {
  assert.equal(
    validateDocument("data:image/png;base64,YQ==", "image/png", "prescription")
      .data,
    "YQ==",
  );
  assert.equal(
    validateDocument("YQ==", "image/jpg", "blood").mimeType,
    "image/jpeg",
  );
  assert.equal(
    validateDocument(
      Buffer.alloc(10 * 1024 * 1024).toString("base64"),
      "application/pdf",
      "usg",
    ).docType,
    "usg",
  );
  for (const [data, mime, type] of [
    ["", "image/png", "blood"],
    ["!!!", "image/png", "blood"],
    ["data:text/plain;base64,YQ==", "image/png", "blood"],
    ["YQ==", "text/html", "blood"],
    ["YQ==", "image/png", "unknown"],
    [42, "image/png", "blood"],
    [
      Buffer.alloc(10 * 1024 * 1024 + 1).toString("base64"),
      "application/pdf",
      "blood",
    ],
  ]) {
    assert.throws(
      () => validateDocument(data, mime, type),
      (error) => error instanceof OcrError && error.statusCode === 400,
    );
  }
});

test("rejects malformed clinical fields instead of returning success-shaped empty data", () => {
  assert.deepEqual(parseClinicalDocument(blank), blank);
  for (const value of [
    {},
    [],
    { ...blank, medications: "not-an-array" },
    { ...blank, results: [{ value: 1 }] },
  ]) {
    assert.throws(() => parseClinicalDocument(value), OcrError);
  }
});

test("preserves exact dose, lab value, reference range, and uncalibrated confidence strings", () => {
  const document = clinicalDocumentSchema.parse({
    ...blank,
    medications: [
      {
        name: "Synthetic medicine",
        dosage: "0.5 mg",
        frequency: "",
        duration: "",
        route: "",
        instructions: "",
      },
    ],
    results: [
      {
        testName: "Synthetic test",
        value: "<0.01",
        unit: "mIU/L",
        referenceRange: "0.4 - 4.0",
        status: "",
        flag: "",
      },
    ],
    warnings: ["Dose on second line unreadable"],
  });
  const review = prescriptionForReview(document);
  assert.equal(review.medicines[0].dose, "0.5 mg");
  assert.equal(review.medicines[0].route, "");
  assert.equal(review.prescriptionDate, null);
  assert.equal(review.requiresReview, true);
  assert.equal(document.results[0].value, "<0.01");
  assert.ok(
    extractionPrompt("prescription").includes("Never guess medication names"),
  );
});

test("uses only the two configured self-hosted endpoints and preserves OCR source pages", async () => {
  const requests: {
    url: string;
    body: Record<string, unknown>;
    authorization: string | null;
  }[] = [];
  const fetcher: typeof fetch = async (input, init) => {
    requests.push({
      url: String(input),
      body: JSON.parse(String(init?.body)),
      authorization: new Headers(init?.headers).get("Authorization"),
    });
    return requests.length === 1
      ? json({
          markdown_result: syntheticText,
          pages: [{ pageNumber: 1, text: syntheticText }],
        })
      : completion({
          ...blank,
          rawText: "Do not replace the original transcription",
        });
  };
  const result = await scanWithGlm(
    "YQ==",
    "application/pdf",
    "blood",
    env,
    fetcher,
  );
  assert.deepEqual(
    requests.map((request) => request.url),
    [
      "http://ocr.internal:5002/glmocr/parse",
      "http://extractor.internal/v1/chat/completions",
    ],
  );
  assert.equal(requests[0].body.file, "data:application/pdf;base64,YQ==");
  assert.equal(requests[0].authorization, "Bearer test-ocr-key");
  assert.equal(requests[1].authorization, "Bearer test-extractor-key");
  assert.equal(requests[1].body.model, "test-extractor");
  assert.equal(result.rawText, syntheticText);
  assert.equal(result.sourcePages[0].pageNumber, 1);
  assert.equal(result.provider, "glm-ocr");
  assert.equal(result.requiresReview, true);
});

test("validates all self-hosted settings before sending patient data", async () => {
  let calls = 0;
  const fetcher: typeof fetch = async () => {
    calls++;
    return json({});
  };
  for (const settings of [
    { ...env, GLM_OCR_BASE_URL: undefined },
    { ...env, OCR_STRUCTURING_BASE_URL: undefined },
    { ...env, OCR_STRUCTURING_MODEL: undefined },
    { ...env, GLM_OCR_API_KEY: undefined },
    { ...env, OCR_STRUCTURING_API_KEY: undefined },
    { ...env, GLM_OCR_BASE_URL: "file:///tmp/ocr" },
    { ...env, GLM_OCR_BASE_URL: "http://secret:password@localhost" },
    { ...env, OCR_TIMEOUT_MS: "0" },
  ]) {
    await assert.rejects(
      scanWithGlm("YQ==", "image/png", "prescription", settings, fetcher),
      OcrError,
    );
  }
  assert.equal(calls, 0);
});

test("upstream failures never trigger a cloud fallback or expose upstream content", async () => {
  let calls = 0;
  const fetcher: typeof fetch = async () => {
    calls++;
    return new Response("sensitive upstream body", { status: 500 });
  };
  await assert.rejects(
    scanWithGlm("YQ==", "image/png", "prescription", env, fetcher),
    (error) =>
      error instanceof OcrError &&
      error.statusCode === 502 &&
      !error.message.includes("sensitive"),
  );
  assert.equal(calls, 1);
});

test("rejects empty/oversized OCR and incomplete or invalid structured responses", async () => {
  for (const ocr of [
    { markdown_result: "" },
    { markdown_result: "x".repeat(100_001) },
  ]) {
    await assert.rejects(
      scanWithGlm("YQ==", "image/png", "usg", env, async () => json(ocr)),
      OcrError,
    );
  }
  for (const output of [
    completion(blank, "length"),
    completion({}),
    json({ choices: [] }),
    json({
      choices: [{ finish_reason: "stop", message: { content: "not JSON" } }],
    }),
  ]) {
    let calls = 0;
    await assert.rejects(
      scanWithGlm("YQ==", "image/png", "prescription", env, async () =>
        ++calls === 1 ? json({ md_results: syntheticText }) : output,
      ),
      OcrError,
    );
    assert.equal(calls, 2);
  }
});

test("bounds the whole local pipeline with one deadline", async () => {
  const fetcher: typeof fetch = async (_input, init) =>
    new Promise((_resolve, reject) => {
      init?.signal?.addEventListener(
        "abort",
        () => reject(new Error("aborted")),
        { once: true },
      );
    });
  // Keep the test alive: AbortSignal.timeout itself uses an unreferenced timer.
  const keepAlive = setTimeout(() => {}, 2000);
  try {
    await assert.rejects(
      scanWithGlm(
        "YQ==",
        "image/png",
        "blood",
        { ...env, OCR_TIMEOUT_MS: "1000" },
        fetcher,
      ),
      (error) => error instanceof OcrError && error.statusCode === 504,
    );
  } finally {
    clearTimeout(keepAlive);
  }
});

test("provider selection is opt-in and does not fall back when GLM is unconfigured", async () => {
  const previous = {
    provider: process.env.OCR_PROVIDER,
    key: process.env.AI_INTEGRATIONS_GEMINI_API_KEY,
    url: process.env.GLM_OCR_BASE_URL,
  };
  try {
    delete process.env.OCR_PROVIDER;
    delete process.env.AI_INTEGRATIONS_GEMINI_API_KEY;
    await assert.rejects(
      scanClinicalDocument("YQ==", "image/png"),
      /Gemini OCR is not configured/,
    );
    process.env.OCR_PROVIDER = "glm-ocr";
    delete process.env.GLM_OCR_BASE_URL;
    await assert.rejects(
      scanClinicalDocument("YQ==", "image/png"),
      /GLM_OCR_BASE_URL/,
    );
    process.env.OCR_PROVIDER = "unknown";
    await assert.rejects(
      scanClinicalDocument("YQ==", "image/png"),
      /OCR_PROVIDER/,
    );
  } finally {
    for (const [name, value] of [
      ["OCR_PROVIDER", previous.provider],
      ["AI_INTEGRATIONS_GEMINI_API_KEY", previous.key],
      ["GLM_OCR_BASE_URL", previous.url],
    ]) {
      if (value === undefined) delete process.env[name!];
      else process.env[name!] = value;
    }
  }
});

test("both patient prescription endpoints are read-only and preserve the review response shape", async () => {
  const app = express();
  app.use(express.json());
  const scans: unknown[] = [];
  registerPrescriptionReadingRoutes(
    app,
    async (id) => (id === 7 ? { id } : null),
    async (...args) => {
      scans.push(args);
      return {
        ...blank,
        provider: "glm-ocr",
        requiresReview: true,
        sourcePages: [{ pageNumber: 1, text: syntheticText }],
      };
    },
  );
  registerOcrRoutes(app);
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  try {
    for (const path of ["extract-prescription", "parse-prescription"]) {
      const response = await fetch(`${base}/api/patients/7/${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileData: "YQ==", mimeType: "image/png" }),
      });
      assert.equal(response.status, 200);
      const body = z
        .object({
          medicines: z.array(z.unknown()),
          sourcePages: z.array(
            z.object({ pageNumber: z.number(), text: z.string() }),
          ),
          requiresReview: z.boolean(),
          inserted: z.unknown().optional(),
          message: z.string(),
        })
        .parse(await response.json());
      assert.deepEqual(body.medicines, []);
      assert.deepEqual(body.sourcePages, [
        { pageNumber: 1, text: syntheticText },
      ]);
      assert.equal(body.requiresReview, true);
      assert.equal(body.inserted, undefined);
      assert.match(body.message, /Nothing has been saved/);
    }
    for (const [id, status] of [
      ["7oops", 400],
      ["8", 404],
    ]) {
      const response = await fetch(
        `${base}/api/patients/${id}/parse-prescription`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "{}",
        },
      );
      assert.equal(response.status, status);
    }
    assert.equal(scans.length, 2);
    const invalid = await fetch(`${base}/api/ocr/prescription`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: "!!!", mimeType: "image/png" }),
    });
    assert.equal(invalid.status, 400);
  } finally {
    server.close();
    await once(server, "close");
  }
});

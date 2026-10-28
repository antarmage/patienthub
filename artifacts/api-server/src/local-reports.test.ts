import assert from "node:assert/strict";
import { once } from "node:events";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import type { AddressInfo } from "node:net";
import test from "node:test";
import express from "express";
import pg from "pg";
import { createLocalReportStore } from "./local-report-store";
import {
  registerLocalReportRoutes,
  sha256,
  validateImport,
} from "./local-reports";
import type { LocalReportUpload } from "./local-reports";
import {
  apiBase,
  createLocalJob,
  extractLocalReading,
  openJob,
  submitLocalJob,
} from "./local-reports-client";
import { OcrError } from "./replit_integrations/ocr/document";

const reading = {
  date: "2026-10-28",
  patientName: "Synthetic Patient",
  labName: "Synthetic lab",
  rawText: "Synthetic Patient\nTSH <0.01 mIU/L\nHb 12.5 g/dL",
  warnings: [],
  results: [
    {
      testName: "TSH",
      value: "<0.01",
      unit: "mIU/L",
      referenceRange: "0.4 - 4.0",
      status: "",
      flag: "",
    },
    {
      testName: "Hb",
      value: "12.5",
      unit: "g/dL",
      referenceRange: "",
      status: "",
      flag: "",
    },
  ],
};
const bytes = Buffer.from("%PDF-synthetic fixture only");
function upload(): LocalReportUpload {
  return {
    importId: randomUUID(),
    confirmedPatientName: "Synthetic Patient",
    reviewed: true,
    file: {
      name: "synthetic.pdf",
      mimeType: "application/pdf",
      data: bytes.toString("base64"),
      sha256: sha256(bytes),
    },
    reading: structuredClone(reading),
  };
}

test("validates real dates, explicit review, patient IDs, filenames and original checksums", () => {
  const valid = upload();
  assert.equal(validateImport(valid, 7, "staff").file.sha256, sha256(bytes));
  for (const invalid of [
    { ...valid, reviewed: false },
    { ...valid, reading: { ...reading, date: "2026-02-30" } },
    { ...valid, file: { ...valid.file, sha256: "0".repeat(64) } },
    { ...valid, file: { ...valid.file, name: "../patient.pdf" } },
    { ...valid, reading: { ...reading, results: [] } },
  ])
    assert.throws(() => validateImport(invalid, 7, "staff"), OcrError);
  for (const url of [
    "http://example.com",
    "https://example.com/path",
    "https://user:pass@example.com",
    "https://example.com/?token=x",
  ]) {
    assert.throws(() => apiBase(url));
  }
});

test("local cleanup requires a matching durable receipt and retry freezes the submitted JSON", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "saivie-import-test-"));
  const original = path.join(root, "my-original.pdf");
  await fs.writeFile(original, bytes);
  const job = await createLocalJob(path.join(root, "jobs"), {
    apiUrl: "https://app.example",
    patient: { id: 7, name: "Synthetic Patient" },
    fileName: "synthetic.pdf",
    mimeType: "application/pdf",
    bytes,
  });
  await fs.writeFile(
    path.join(job.directory, "reading.json"),
    JSON.stringify(reading),
  );
  const payloads: unknown[] = [];
  let mode = "timeout";
  const fetcher: typeof fetch = async (_url, init) => {
    if (!init?.body) return Response.json({ id: 7, name: "Synthetic Patient" });
    const body = JSON.parse(String(init.body));
    payloads.push(body);
    if (mode === "timeout") throw new Error("Synthetic lost acknowledgment");
    const input = validateImport(body, 7, "staff");
    return Response.json({
      importId: mode === "mismatch" ? randomUUID() : body.importId,
      patientId: 7,
      documentId: 10,
      patientDocumentId: 11,
      resultIds: [12, 13],
      fileSha256: input.file.sha256,
      payloadSha256: input.payloadSha256,
      committed: true,
    });
  };
  const jobs = path.join(root, "jobs");
  const confirm = async () => true;
  await assert.rejects(
    submitLocalJob(jobs, job.id, "token", fetcher),
    /not confirmed/,
  );
  assert.equal(payloads.length, 0);
  await assert.rejects(
    submitLocalJob(jobs, job.id, "token", fetcher, confirm),
    /retained/,
  );
  assert.deepEqual(
    await fs.readFile(path.join(job.directory, "original.bin")),
    bytes,
  );
  await fs.writeFile(
    path.join(job.directory, "reading.json"),
    JSON.stringify({ ...reading, labName: "Later edit" }),
  );
  mode = "mismatch";
  await assert.rejects(
    submitLocalJob(jobs, job.id, "token", fetcher, confirm),
    /receipt does not match/,
  );
  mode = "success";
  await submitLocalJob(jobs, job.id, "token", fetcher, confirm);
  assert.deepEqual(payloads[0], payloads[2]);
  assert.deepEqual(await fs.readFile(original), bytes);
  await assert.rejects(fs.stat(job.directory), { code: "ENOENT" });
  await fs.unlink(original);
  await fs.rmdir(jobs);
  await fs.rmdir(root);
});

test("refuses symlinks, unknown working files and traversal without deleting anything", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "saivie-import-paths-"));
  const job = await createLocalJob(root, {
    apiUrl: "https://app.example",
    patient: { id: 7, name: "Synthetic Patient" },
    fileName: "test.pdf",
    mimeType: "application/pdf",
    bytes,
  });
  const extra = path.join(job.directory, "unexpected.txt");
  await fs.writeFile(extra, "retain me");
  await assert.rejects(openJob(root, job.id), /Unexpected/);
  await fs.unlink(extra);
  await fs.unlink(path.join(job.directory, "original.bin"));
  await fs.symlink(
    path.join(job.directory, "manifest.json"),
    path.join(job.directory, "original.bin"),
  );
  await assert.rejects(openJob(root, job.id), /Unexpected/);
  await assert.rejects(openJob(root, "../escape"), /UUID/);
  await fs.unlink(path.join(job.directory, "original.bin"));
  await fs.unlink(path.join(job.directory, "manifest.json"));
  await fs.rmdir(job.directory);
  await fs.rmdir(root);
});

test(
  "PostgreSQL import is atomic, serializes simultaneous retries and enforces immutable receipts",
  {
    skip: !process.env.LOCAL_REPORT_TEST_DATABASE_URL,
  },
  async () => {
    const connectionString = process.env.LOCAL_REPORT_TEST_DATABASE_URL!;
    const url = new URL(connectionString);
    assert.ok(
      ["127.0.0.1", "localhost"].includes(url.hostname),
      "Tests require an isolated loopback database",
    );
    const schema = `import_test_${randomUUID().replaceAll("-", "")}`;
    const admin = new pg.Pool({ connectionString });
    await admin.query(`CREATE SCHEMA ${schema}`);
    const pool = new pg.Pool({
      connectionString,
      options: `-c search_path=${schema}`,
    });
    try {
      await pool.query(`
      CREATE TABLE patients (id integer PRIMARY KEY, name text NOT NULL);
      INSERT INTO patients VALUES (7, 'Synthetic Patient');
      CREATE TABLE patient_documents (
        id serial PRIMARY KEY, patient_id integer REFERENCES patients(id), file_name text, file_data text,
        mime_type text, doc_type text, label text, uploaded_at text
      );
      CREATE TABLE documents (
        id serial PRIMARY KEY, patient_id integer REFERENCES patients(id), name text, type text, category text, date date, metadata jsonb
      );
      CREATE TABLE lab_results (
        id serial PRIMARY KEY, patient_id integer REFERENCES patients(id), test_name text, date date,
        value real, unit text, status text, results jsonb, CHECK (test_name <> 'FAIL')
      );
      CREATE TABLE local_report_imports (
        import_id uuid PRIMARY KEY, patient_id integer REFERENCES patients(id), payload_sha256 text, receipt jsonb, created_at timestamptz DEFAULT now()
      );
    `);
      const store = createLocalReportStore(pool);
      const payload = upload();
      const input = validateImport(payload, 7, "staff");
      const receipts = await Promise.all([
        store.commit(input),
        store.commit(input),
        store.commit(input),
      ]);
      assert.deepEqual(receipts[0], receipts[1]);
      assert.deepEqual(receipts[1], receipts[2]);
      const counts = async () =>
        (
          await pool.query(
            "SELECT (SELECT count(*)::int FROM documents) docs, (SELECT count(*)::int FROM patient_documents) files, (SELECT count(*)::int FROM lab_results) results, (SELECT count(*)::int FROM local_report_imports) receipts",
          )
        ).rows[0];
      assert.deepEqual(await counts(), {
        docs: 1,
        files: 1,
        results: 2,
        receipts: 1,
      });
      const labs = (
        await pool.query("SELECT value, results FROM lab_results ORDER BY id")
      ).rows;
      assert.equal(labs[0].value, null);
      assert.equal(labs[0].results.rawValue, "<0.01");
      assert.equal(labs[1].value, 12.5);
      const savedFile = (
        await pool.query("SELECT file_data, file_name FROM patient_documents")
      ).rows[0];
      assert.deepEqual(Buffer.from(savedFile.file_data, "base64"), bytes);
      assert.equal(savedFile.file_name, "synthetic.pdf");
      const metadata = (await pool.query("SELECT metadata FROM documents"))
        .rows[0].metadata;
      assert.deepEqual(metadata.reading, reading);
      assert.equal(metadata.reviewedBy, "staff");
      await assert.rejects(
        store.commit(
          validateImport(
            { ...payload, reading: { ...reading, labName: "Changed" } },
            7,
            "staff",
          ),
        ),
        /different data/,
      );

      const failed = upload();
      failed.reading.results[1].testName = "FAIL";
      await assert.rejects(
        store.commit(validateImport(failed, 7, "staff")),
        /check constraint/,
      );
      assert.deepEqual(
        await counts(),
        { docs: 1, files: 1, results: 2, receipts: 1 },
        "failed row rolls back original, document, earlier lab rows and receipt",
      );

      const app = express();
      app.use(express.json());
      registerLocalReportRoutes(
        app,
        (req, res, next) => {
          if (req.headers.authorization !== "Bearer test-staff") {
            res.sendStatus(401);
            return;
          }
          res.locals.importActorId = "staff";
          next();
        },
        store,
      );
      app.use(
        (
          err: Error,
          _req: express.Request,
          res: express.Response,
          _next: express.NextFunction,
        ) =>
          res
            .status(err instanceof OcrError ? err.statusCode : 500)
            .json({ error: err.message }),
      );
      const server = app.listen(0, "127.0.0.1");
      await once(server, "listening");
      const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
      try {
        assert.equal(
          (await fetch(`${base}/api/local-reports/patients/7`)).status,
          401,
        );
        const request = (id: string, body: unknown) =>
          fetch(`${base}/api/local-reports/patients/${id}/imports`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: "Bearer test-staff",
            },
            body: JSON.stringify(body),
          });
        assert.equal((await request("7bad", payload)).status, 400);
        assert.equal((await request("8", payload)).status, 404);
        assert.equal(
          (
            await request("7", {
              ...payload,
              confirmedPatientName: "Wrong patient",
            })
          ).status,
          409,
        );
        assert.equal(
          (await request("7", { ...payload, reviewed: false })).status,
          400,
        );
        const response = await request("7", payload);
        assert.equal(response.status, 200);
        assert.deepEqual(await response.json(), receipts[0]);
        assert.deepEqual(await counts(), {
          docs: 1,
          files: 1,
          results: 2,
          receipts: 1,
        });
        const localRoot = await fs.mkdtemp(
          path.join(os.tmpdir(), "saivie-live-import-"),
        );
        const fixture = process.env.LOCAL_REPORT_LIVE_OCR_FIXTURE;
        const workingBytes = fixture ? await fs.readFile(fixture) : bytes;
        const job = await createLocalJob(localRoot, {
          apiUrl: base,
          patient: { id: 7, name: "Synthetic Patient" },
          fileName: fixture ? "synthetic-lab.png" : "synthetic.pdf",
          mimeType: fixture ? "image/png" : "application/pdf",
          bytes: workingBytes,
        });
        if (fixture) {
          await extractLocalReading(
            job.directory,
            "qwen3:4b",
            path.resolve("tools/local-reports/read-document.swift"),
          );
        } else {
          await fs.writeFile(
            path.join(job.directory, "reading.json"),
            JSON.stringify(reading),
          );
        }
        let loseResponse = true;
        const uncertainFetch: typeof fetch = async (url, init) => {
          const response = await fetch(url, init);
          if (init?.method === "POST" && loseResponse) {
            loseResponse = false;
            await response.arrayBuffer();
            throw new Error(
              "Synthetic connection loss after durable server commit",
            );
          }
          return response;
        };
        await assert.rejects(
          submitLocalJob(
            localRoot,
            job.id,
            "test-staff",
            uncertainFetch,
            async () => true,
          ),
          /retained/,
        );
        assert.deepEqual(await counts(), {
          docs: 2,
          files: 2,
          results: 4,
          receipts: 2,
        });
        assert.deepEqual(
          await fs.readFile(path.join(job.directory, "original.bin")),
          workingBytes,
        );
        await submitLocalJob(
          localRoot,
          job.id,
          "test-staff",
          uncertainFetch,
          async () => true,
        );
        assert.deepEqual(await counts(), {
          docs: 2,
          files: 2,
          results: 4,
          receipts: 2,
        });
        await assert.rejects(fs.stat(job.directory), { code: "ENOENT" });
        await fs.rmdir(localRoot);
      } finally {
        await new Promise<void>((resolve, reject) =>
          server.close((error) => (error ? reject(error) : resolve())),
        );
      }
    } finally {
      await pool.end();
      await admin.query(`DROP SCHEMA ${schema} CASCADE`);
      await admin.end();
    }
  },
);

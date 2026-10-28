import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { extractLocalReading } from "./local-reports-client";
import { localLabReadingSchema } from "./local-reports";

test("refuses cloud-backed Ollama before reading any document", async () => {
  const fetcher: typeof fetch = async (url) => {
    assert.equal(String(url), "http://127.0.0.1:11434/api/show");
    return Response.json({
      remote_host: "https://example.com",
      remote_model: "remote",
    });
  };
  await assert.rejects(
    extractLocalReading(
      "/nonexistent",
      "remote-model",
      "/nonexistent",
      fetcher,
    ),
    /Cloud-backed/,
  );
});

test(
  "real Apple OCR and local Ollama preserve synthetic lab values",
  {
    skip: !process.env.LOCAL_REPORT_LIVE_OCR_FIXTURE,
    timeout: 300_000,
  },
  async () => {
    const directory = await fs.mkdtemp(
      path.join(os.tmpdir(), "saivie-live-reading-"),
    );
    try {
      await fs.copyFile(
        process.env.LOCAL_REPORT_LIVE_OCR_FIXTURE!,
        path.join(directory, "original.bin"),
      );
      await extractLocalReading(
        directory,
        "qwen3:4b",
        path.resolve("tools/local-reports/read-document.swift"),
      );
      const extracted = localLabReadingSchema.parse(
        JSON.parse(
          await fs.readFile(path.join(directory, "reading.json"), "utf8"),
        ),
      );
      assert.equal(extracted.date, "2026-10-28");
      assert.equal(
        extracted.results.find((item) => item.testName === "TSH")?.value,
        "<0.01",
      );
      assert.equal(
        extracted.results.find((item) => item.testName === "Hb")?.value,
        "12.5",
      );
      assert.match(extracted.rawText, /Source page 1/);
      for (const result of extracted.results) {
        assert.equal(result.status, "");
        assert.equal(result.flag, "");
        assert.equal(result.referenceRange, "");
      }
    } finally {
      for (const file of [
        "original.bin",
        "source-pages.json",
        "reading.json",
      ]) {
        await fs
          .unlink(path.join(directory, file))
          .catch((error: NodeJS.ErrnoException) => {
            if (error.code !== "ENOENT") throw error;
          });
      }
      await fs.rmdir(directory);
    }
  },
);

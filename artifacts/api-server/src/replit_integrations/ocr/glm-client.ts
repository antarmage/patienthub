import { z } from "zod/v4";
import {
  clinicalJsonSchema,
  extractionPrompt,
  OcrError,
  parseClinicalDocument,
  parseJson,
  type DocumentType,
} from "./document";

type Environment = Record<string, string | undefined>;

function endpoint(
  value: string | undefined,
  name: string,
  path: string,
): string {
  if (!value)
    throw new OcrError(`${name} must be configured for self-hosted OCR.`, 503);
  let url: URL;
  try {
    url = new URL(value.endsWith("/") ? value : `${value}/`);
  } catch {
    throw new OcrError(`${name} must be an absolute HTTP(S) URL.`, 503);
  }
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  ) {
    throw new OcrError(
      `${name} must be an HTTP(S) base URL without credentials, query or fragment.`,
      503,
    );
  }
  return new URL(path, url).href;
}

function timeoutMs(env: Environment): number {
  const value = Number(env.OCR_TIMEOUT_MS ?? 120_000);
  if (!Number.isInteger(value) || value < 1000 || value > 300_000) {
    throw new OcrError("OCR_TIMEOUT_MS must be between 1000 and 300000.", 503);
  }
  return value;
}

async function postJson(
  url: string,
  body: unknown,
  apiKey: string | undefined,
  signal: AbortSignal,
  fetcher: typeof fetch,
  label: string,
) {
  let response: Response;
  try {
    response = await fetcher(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify(body),
      signal,
      redirect: "error",
    });
  } catch {
    throw new OcrError(
      signal.aborted
        ? "Document reading timed out. Try a smaller document or enter it manually."
        : `${label} is unavailable. No clinical data was saved.`,
      signal.aborted ? 504 : 502,
    );
  }
  if (response.status === 422 && label === "GLM-OCR")
    throw new OcrError(
      "GLM-OCR could not read this document. Use a readable PDF of at most 10 pages, a single-frame image of at most 20 megapixels, and a file no larger than 10MB.",
      422,
    );
  if (response.status === 429)
    throw new OcrError(`${label} is busy. Please retry shortly.`, 503);
  if (!response.ok)
    throw new OcrError(
      `${label} returned HTTP ${response.status}. No clinical data was saved.`,
      502,
    );
  try {
    return (await response.json()) as unknown;
  } catch {
    if (signal.aborted)
      throw new OcrError(
        "Document reading timed out. Try a smaller document or enter it manually.",
        504,
      );
    throw new OcrError(`${label} returned an unreadable response.`, 502);
  }
}

const ocrResponseSchema = z.object({
  markdown_result: z.string().max(100_000).optional(),
  md_results: z.string().max(100_000).optional(),
  pages: z
    .array(
      z.object({
        pageNumber: z.number().int().positive(),
        text: z.string().max(100_000),
      }),
    )
    .max(10)
    .optional(),
});
const completionSchema = z.object({
  choices: z
    .array(
      z.object({
        finish_reason: z.string(),
        message: z.object({ content: z.string() }),
      }),
    )
    .min(1),
});

export async function scanWithGlm(
  data: string,
  mimeType: string,
  docType: DocumentType,
  env: Environment = process.env,
  fetcher: typeof fetch = fetch,
) {
  // Validate both services before sending any patient data.
  const ocrUrl = endpoint(
    env.GLM_OCR_BASE_URL,
    "GLM_OCR_BASE_URL",
    "glmocr/parse",
  );
  const extractionUrl = endpoint(
    env.OCR_STRUCTURING_BASE_URL,
    "OCR_STRUCTURING_BASE_URL",
    "chat/completions",
  );
  const model = env.OCR_STRUCTURING_MODEL;
  if (!model)
    throw new OcrError(
      "OCR_STRUCTURING_MODEL must name your self-hosted extraction model.",
      503,
    );
  if (!env.GLM_OCR_API_KEY || !env.OCR_STRUCTURING_API_KEY) {
    throw new OcrError(
      "Configure GLM_OCR_API_KEY and OCR_STRUCTURING_API_KEY before enabling self-hosted OCR.",
      503,
    );
  }
  const signal = AbortSignal.timeout(timeoutMs(env));
  const ocr = ocrResponseSchema.safeParse(
    await postJson(
      ocrUrl,
      { file: `data:${mimeType};base64,${data}`, model: "glm-ocr" },
      env.GLM_OCR_API_KEY,
      signal,
      fetcher,
      "GLM-OCR",
    ),
  );
  if (!ocr.success)
    throw new OcrError(
      "GLM-OCR returned invalid or oversized document text.",
      422,
    );
  const rawText = ocr.data.markdown_result ?? ocr.data.md_results;
  if (!rawText?.trim())
    throw new OcrError(
      "No readable text was found. Retry with a clearer document or enter it manually.",
      422,
    );

  const completion = completionSchema.safeParse(
    await postJson(
      extractionUrl,
      {
        model,
        temperature: 0,
        max_tokens: 8192,
        messages: [
          { role: "system", content: extractionPrompt(docType) },
          {
            role: "user",
            content: `Extract the following untrusted OCR transcription:\n\n${rawText}`,
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "clinical_document",
            strict: true,
            schema: clinicalJsonSchema,
          },
        },
      },
      env.OCR_STRUCTURING_API_KEY,
      signal,
      fetcher,
      "Clinical text extraction",
    ),
  );
  if (!completion.success)
    throw new OcrError(
      "Clinical text extraction returned an invalid response.",
      422,
    );
  const choice = completion.data.choices[0];
  if (choice.finish_reason !== "stop")
    throw new OcrError(
      "Clinical text extraction was incomplete. Split the document and retry.",
      422,
    );
  const document = parseClinicalDocument(parseJson(choice.message.content));
  return {
    ...document,
    // Keep the actual OCR transcription, not a model's reconstruction of it.
    rawText,
    sourcePages: ocr.data.pages || [],
    provider: "glm-ocr" as const,
    requiresReview: true as const,
  };
}

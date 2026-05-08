/**
 * s3-storage.ts — S3-backed multer storage engine
 *
 * Replaces multer.memoryStorage() for production. Files are streamed
 * directly to S3 without buffering the entire file in RAM.
 *
 * Prerequisites:
 *   pnpm --filter @workspace/api-server add @aws-sdk/client-s3 @aws-sdk/s3-request-presigner multer-s3
 *
 * Environment variables required:
 *   AWS_REGION        — e.g. ap-south-1
 *   AWS_S3_BUCKET     — e.g. saivie-uploads-prod
 *   (credentials via IAM role on ECS — no ACCESS_KEY_ID needed in prod)
 */

import { S3Client, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import multerS3 from "multer-s3";
import multer from "multer";
import path from "path";
import { logger } from "./logger";

// ---------------------------------------------------------------------------
// S3 client — uses IAM role in ECS (no hardcoded credentials)
// ---------------------------------------------------------------------------
const region = process.env["AWS_REGION"] ?? "ap-south-1";
const bucket = process.env["AWS_S3_BUCKET"];

if (!bucket) {
  throw new Error("AWS_S3_BUCKET environment variable is required");
}

export const s3Client = new S3Client({ region });

// ---------------------------------------------------------------------------
// Storage engines
// ---------------------------------------------------------------------------

/**
 * Genome file storage — VCF / 23andMe / AncestryDNA uploads
 * Stored under: genome/<patientId>/<timestamp>.<ext>
 */
export function genomeStorage(patientId: string | number) {
  return multerS3({
    s3: s3Client,
    bucket,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    metadata(_req, file, cb) {
      cb(null, {
        fieldName:  file.fieldname,
        patientId:  String(patientId),
        uploadedAt: new Date().toISOString(),
      });
    },
    key(_req, file, cb) {
      const ext  = path.extname(file.originalname).toLowerCase() || ".txt";
      const key  = `genome/${patientId}/${Date.now()}${ext}`;
      cb(null, key);
    },
    serverSideEncryption: "AES256",
  });
}

/**
 * Patient document storage — PDFs, JPEG, PNG
 * Stored under: documents/<patientId>/<timestamp>.<ext>
 */
export function documentStorage(patientId: string | number) {
  return multerS3({
    s3: s3Client,
    bucket,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    metadata(_req, file, cb) {
      cb(null, {
        fieldName:  file.fieldname,
        patientId:  String(patientId),
        uploadedAt: new Date().toISOString(),
      });
    },
    key(_req, file, cb) {
      const ext = path.extname(file.originalname).toLowerCase() || ".bin";
      const key = `documents/${patientId}/${Date.now()}${ext}`;
      cb(null, key);
    },
    serverSideEncryption: "AES256",
  });
}

// ---------------------------------------------------------------------------
// Pre-configured multer instances
// ---------------------------------------------------------------------------

/** Multer instance for genome uploads (50 MB limit) */
export const genomeUpload = (patientId: string | number) =>
  multer({
    storage: genomeStorage(patientId),
    limits: { fileSize: 50 * 1024 * 1024 },
    fileFilter(_req, file, cb) {
      const allowed = [".vcf", ".txt", ".gz", ".csv", ".zip"];
      const ext = path.extname(file.originalname).toLowerCase();
      if (allowed.includes(ext) || file.mimetype === "text/plain") {
        cb(null, true);
      } else {
        cb(new Error(`Unsupported genome file type: ${ext}`));
      }
    },
  });

/** Multer instance for patient document uploads (10 MB limit) */
export const documentUpload = (patientId: string | number) =>
  multer({
    storage: documentStorage(patientId),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter(_req, file, cb) {
      const allowed = [".pdf", ".jpg", ".jpeg", ".png"];
      const ext = path.extname(file.originalname).toLowerCase();
      if (allowed.includes(ext)) {
        cb(null, true);
      } else {
        cb(new Error("Unsupported file type. Please upload a PDF or image (JPEG, PNG)."));
      }
    },
  });

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Generate a pre-signed download URL (expires in 1 hour by default).
 * Use this instead of exposing the S3 key directly to clients.
 */
export async function getPresignedDownloadUrl(
  s3Key: string,
  expiresInSeconds = 3600,
): Promise<string> {
  const command = new GetObjectCommand({ Bucket: bucket, Key: s3Key });
  return getSignedUrl(s3Client, command, { expiresIn: expiresInSeconds });
}

/**
 * Delete a file from S3 by its key.
 */
export async function deleteS3Object(s3Key: string): Promise<void> {
  try {
    await s3Client.send(new DeleteObjectCommand({ Bucket: bucket, Key: s3Key }));
    logger.info({ s3Key }, "S3 object deleted");
  } catch (err) {
    logger.error({ err, s3Key }, "Failed to delete S3 object");
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Migration note
// ---------------------------------------------------------------------------
// To migrate routes from multer memoryStorage to S3:
//
// BEFORE (in-memory):
//   const upload = multer({ storage: multer.memoryStorage() });
//   app.post("/api/genome/upload", upload.single("file"), (req, res) => {
//     const buffer = req.file!.buffer;  // ← in-memory buffer
//   });
//
// AFTER (S3):
//   app.post("/api/genome/upload", (req, res, next) => {
//     const patientId = req.body.patientId ?? "unknown";
//     genomeUpload(patientId).single("file")(req, res, next);
//   }, (req, res) => {
//     const s3File = req.file as Express.MulterS3.File;
//     const s3Key  = s3File.key;         // ← S3 object key, store in DB
//     const s3Url  = s3File.location;    // ← public URL (if bucket is public)
//     // For private buckets, use getPresignedDownloadUrl(s3Key) when serving
//   });

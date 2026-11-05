export const MAX_PRESCRIPTION_FILES = 10;
export const MAX_PRESCRIPTION_TOTAL_BYTES = 8 * 1024 * 1024;
export const PRESCRIPTION_FILE_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

export type PrescriptionAttachment = { name: string; mimeType: string; fileData: string };

export function prescriptionAttachmentBytes(file: Pick<PrescriptionAttachment, "fileData">): number {
  return Math.floor(file.fileData.length * 3 / 4) - (file.fileData.endsWith("==") ? 2 : file.fileData.endsWith("=") ? 1 : 0);
}

export function validatePrescriptionAttachmentLimits(files: { size: number; type: string }[]): string | null {
  if (!files.length || files.length > MAX_PRESCRIPTION_FILES)
    return `Attach between 1 and ${MAX_PRESCRIPTION_FILES} prescription files.`;
  if (files.some((file) => !PRESCRIPTION_FILE_TYPES.includes(file.type)))
    return "Use JPEG, PNG, WebP photos or PDF scans.";
  if (files.some((file) => file.size <= 0 || !Number.isFinite(file.size)))
    return "Prescription files must not be empty.";
  if (files.reduce((sum, file) => sum + file.size, 0) > MAX_PRESCRIPTION_TOTAL_BYTES)
    return "Prescription attachments must total 8 MB or less.";
  return null;
}

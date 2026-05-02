// Google Drive integration
import { google } from 'googleapis';

export async function getUncachableGoogleDriveClient() {
  const credentials = {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  };

  if (!credentials.client_email || !credentials.private_key) {
    throw new Error('Google Service Account credentials missing in environment variables (GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY)');
  }

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/drive'],
  });

  return google.drive({ version: 'v3', auth });
}

const LAB_REPORTS_FOLDER_ID = '1eCMJNf-kzwMfovvuVedCwAWECsKr7XVA';

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size: string;
  createdTime: string;
  webViewLink?: string;
}

function extractPatientNameFromFilename(filename: string): string | null {
  if (!filename.startsWith('TestReport_')) return null;
  const parts = filename.replace('.pdf', '').split('_');
  if (parts.length < 3) return null;
  return parts[1];
}

function normalizeNameForMatch(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^(dr|mrs|mr|ms|miss)\s+/i, '');
}

const VARIANT_GROUPS = [
  ['mondal', 'mandal'],
  ['naskar', 'nasker'],
  ['sarma', 'sharma'],
  ['bibi', 'biwi'],
  ['khatun', 'khatoon'],
  ['parveen', 'parvin', 'parween'],
  ['nurjahan', 'noorjahan'],
  ['kumari', 'kumary'],
  ['dey', 'de'],
  ['yasmin', 'yasmeen', 'yesmin'],
  ['mukherjee', 'mukharjee', 'mukhopadhyay'],
];

function areVariants(a: string, b: string): boolean {
  if (a === b) return true;
  for (const group of VARIANT_GROUPS) {
    if (group.includes(a) && group.includes(b)) return true;
  }
  return false;
}

const HONORIFICS = ['bibi', 'biwi', 'khatun', 'khatoon', 'begum', 'devi'];

function nameMatchScore(driveName: string, dbName: string): number {
  const a = normalizeNameForMatch(driveName);
  const b = normalizeNameForMatch(dbName);

  if (a === b) return 100;

  const aParts = a.split(' ');
  const bParts = b.split(' ');

  if (aParts.length < 2 || bParts.length < 2) return 0;

  const firstMatch = aParts[0] === bParts[0];
  const firstVariant = areVariants(aParts[0], bParts[0]);
  const lastMatch = aParts[aParts.length - 1] === bParts[bParts.length - 1];
  const lastVariant = areVariants(aParts[aParts.length - 1], bParts[bParts.length - 1]);

  if (firstMatch && lastMatch) return 90;
  if (firstMatch && lastVariant) return 80;
  if (firstVariant && lastMatch) return 80;
  if (firstVariant && lastVariant) return 75;

  const aLastIsHonorific = HONORIFICS.includes(aParts[aParts.length - 1]);
  const bLastIsHonorific = HONORIFICS.includes(bParts[bParts.length - 1]);
  if ((firstMatch || firstVariant) && aLastIsHonorific && bLastIsHonorific) return 75;

  if (firstMatch && aParts.length >= 2 && bParts.length >= 2) {
    const overlapCount = aParts.filter(p => bParts.some(bp => areVariants(p, bp))).length;
    if (overlapCount >= 2) return 70;
  }

  return 0;
}

function findBestPatientMatch(
  driveName: string,
  patients: Array<{ id: number; name: string }>
): { id: number; name: string } | null {
  let bestScore = 0;
  let bestMatch: { id: number; name: string } | null = null;

  for (const patient of patients) {
    const score = nameMatchScore(driveName, patient.name);
    if (score > bestScore) {
      bestScore = score;
      bestMatch = patient;
    }
  }

  return bestScore >= 70 ? bestMatch : null;
}

export interface ImportResult {
  totalFiles: number;
  imported: number;
  skipped: number;
  unmatched: string[];
  errors: string[];
  details: Array<{
    filename: string;
    patientName: string | null;
    matchedPatient: string | null;
    matchedPatientId: number | null;
    status: 'imported' | 'skipped_duplicate' | 'unmatched' | 'error' | 'skipped_invoice';
  }>;
}

export async function downloadFileAsBuffer(fileId: string): Promise<Buffer> {
  const drive = await getUncachableGoogleDriveClient();
  const res = await drive.files.get(
    { fileId, alt: 'media' },
    { responseType: 'arraybuffer' }
  );
  return Buffer.from(res.data as ArrayBuffer);
}

export async function listLabReportFiles(): Promise<DriveFile[]> {
  const drive = await getUncachableGoogleDriveClient();
  const allFiles: DriveFile[] = [];
  let pageToken: string | undefined;

  do {
    const res = await drive.files.list({
      q: `'${LAB_REPORTS_FOLDER_ID}' in parents and trashed = false`,
      fields: 'nextPageToken, files(id, name, mimeType, size, createdTime, webViewLink)',
      pageSize: 100,
      pageToken,
    });

    if (res.data.files) {
      allFiles.push(...(res.data.files as DriveFile[]));
    }
    pageToken = res.data.nextPageToken || undefined;
  } while (pageToken);

  return allFiles;
}

export async function importLabReports(
  patients: Array<{ id: number; name: string }>,
  existingDocuments: Array<{ patientId: number | null; metadata: any }>,
  createDocument: (doc: any) => Promise<any>
): Promise<ImportResult> {
  const files = await listLabReportFiles();

  const existingDriveIds = new Set<string>();
  for (const doc of existingDocuments) {
    if (doc.metadata && typeof doc.metadata === 'object' && (doc.metadata as any).driveFileId) {
      existingDriveIds.add((doc.metadata as any).driveFileId);
    }
  }

  const result: ImportResult = {
    totalFiles: files.length,
    imported: 0,
    skipped: 0,
    unmatched: [],
    errors: [],
    details: [],
  };

  for (const file of files) {
    if (!file.name.startsWith('TestReport_')) {
      result.skipped++;
      result.details.push({
        filename: file.name,
        patientName: null,
        matchedPatient: null,
        matchedPatientId: null,
        status: 'skipped_invoice',
      });
      continue;
    }

    if (existingDriveIds.has(file.id)) {
      result.skipped++;
      result.details.push({
        filename: file.name,
        patientName: extractPatientNameFromFilename(file.name),
        matchedPatient: null,
        matchedPatientId: null,
        status: 'skipped_duplicate',
      });
      continue;
    }

    const extractedName = extractPatientNameFromFilename(file.name);
    if (!extractedName) {
      result.errors.push(`Could not extract name from: ${file.name}`);
      result.details.push({
        filename: file.name,
        patientName: null,
        matchedPatient: null,
        matchedPatientId: null,
        status: 'error',
      });
      continue;
    }

    const matchedPatient = findBestPatientMatch(extractedName, patients);

    if (!matchedPatient) {
      result.unmatched.push(extractedName);
      result.details.push({
        filename: file.name,
        patientName: extractedName,
        matchedPatient: null,
        matchedPatientId: null,
        status: 'unmatched',
      });
      continue;
    }

    try {
      const driveViewUrl = `https://drive.google.com/file/d/${file.id}/view`;

      await createDocument({
        patientId: matchedPatient.id,
        name: file.name,
        type: 'lab_report',
        category: 'Lab Report',
        date: file.createdTime ? file.createdTime.split('T')[0] : new Date().toISOString().split('T')[0],
        description: `Lab report for ${extractedName} imported from Google Drive`,
        metadata: {
          driveFileId: file.id,
          driveViewUrl,
          originalFilename: file.name,
          fileSize: file.size,
          importedAt: new Date().toISOString(),
          extractedPatientName: extractedName,
        },
      });

      result.imported++;
      result.details.push({
        filename: file.name,
        patientName: extractedName,
        matchedPatient: matchedPatient.name,
        matchedPatientId: matchedPatient.id,
        status: 'imported',
      });
    } catch (err: any) {
      result.errors.push(`Error importing ${file.name}: ${err.message}`);
      result.details.push({
        filename: file.name,
        patientName: extractedName,
        matchedPatient: matchedPatient.name,
        matchedPatientId: matchedPatient.id,
        status: 'error',
      });
    }
  }

  return result;
}

// Google Sheets integration
import { google } from 'googleapis';

function normalizeGooglePrivateKey(value?: string): string | undefined {
  if (!value) return undefined;

  const trimmed = value.trim().replace(/^"|"$/g, '');
  if (!trimmed || ['lorem', 'REPLACE_ME', 'placeholder'].includes(trimmed.toLowerCase())) {
    return undefined;
  }

  const normalized = trimmed.replace(/\\n/g, '\n');
  const hasPemHeader = normalized.includes('-----BEGIN PRIVATE KEY-----') || normalized.includes('-----BEGIN RSA PRIVATE KEY-----');

  if (!hasPemHeader) {
    throw new Error('Google Service Account private key is invalid or still set to a placeholder value. Update GOOGLE_PRIVATE_KEY in AWS Secrets Manager with the real service account PEM key.');
  }

  return normalized;
}

export async function getUncachableGoogleSheetClient() {
  const credentials = {
    client_email: process.env.GOOGLE_CLIENT_EMAIL?.trim(),
    private_key: normalizeGooglePrivateKey(process.env.GOOGLE_PRIVATE_KEY),
  };

  if (!credentials.client_email || !credentials.private_key) {
    throw new Error('Google Service Account credentials missing in environment variables (GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY)');
  }

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  return google.sheets({ version: 'v4', auth });
}

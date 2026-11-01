import crypto from "node:crypto";
import { google } from "googleapis";

export class OnlineConsultationError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export function onlineConfig() {
  const origin = process.env.PUBLIC_APP_URL;
  const clientId = process.env.GOOGLE_MEET_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_MEET_CLIENT_SECRET;
  const key = process.env.GOOGLE_MEET_TOKEN_KEY;
  if (!origin || !clientId || !clientSecret || !key || !/^[a-f0-9]{64}$/i.test(key)) {
    throw new OnlineConsultationError(503, "Online consultations require Google Meet OAuth and encrypted-token configuration. Contact your administrator.");
  }
  let url: URL;
  try { url = new URL(origin); } catch (error) {
    if (!(error instanceof TypeError)) throw error;
    throw new OnlineConsultationError(503, "PUBLIC_APP_URL must be the HTTPS origin of the patient portal.");
  }
  if (url.protocol !== "https:" || url.pathname !== "/" || url.search || url.hash || url.username || url.password) {
    throw new OnlineConsultationError(503, "PUBLIC_APP_URL must be the HTTPS origin of the patient portal.");
  }
  return { origin: url.origin, clientId, clientSecret, key: Buffer.from(key, "hex") };
}

export function sealOnlineSecret(value: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", onlineConfig().key, iv);
  const bytes = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), bytes]).toString("base64url");
}

export function openOnlineSecret(value: string): string {
  const bytes = Buffer.from(value, "base64url");
  const decipher = crypto.createDecipheriv("aes-256-gcm", onlineConfig().key, bytes.subarray(0, 12));
  decipher.setAuthTag(bytes.subarray(12, 28));
  return Buffer.concat([decipher.update(bytes.subarray(28)), decipher.final()]).toString("utf8");
}

export function onlineTokenHash(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

const scope = "https://www.googleapis.com/auth/meetings.space.created";

function oauthClient() {
  const config = onlineConfig();
  return new google.auth.OAuth2(config.clientId, config.clientSecret, `${config.origin}/api/online/google/callback`);
}

export function googleAuthorizationUrl(state: string) {
  return oauthClient().generateAuthUrl({ access_type: "offline", prompt: "consent", scope: [scope], state });
}

export async function exchangeGoogleCode(code: string): Promise<string> {
  const { tokens } = await oauthClient().getToken(code);
  if (!tokens.refresh_token || !tokens.scope?.split(" ").includes(scope)) {
    throw new OnlineConsultationError(400, "Google did not grant persistent meeting creation access. Reconnect and approve the requested permission.");
  }
  return sealOnlineSecret(tokens.refresh_token);
}

export async function createGoogleMeeting(encryptedRefreshToken: string): Promise<string> {
  const auth = oauthClient();
  auth.setCredentials({ refresh_token: openOnlineSecret(encryptedRefreshToken) });
  // Only meeting configuration is sent to Google, never patient names or clinical data.
  const result = await auth.request<{ meetingUri?: string }>({
    url: "https://meet.googleapis.com/v2/spaces",
    method: "POST",
    data: { config: { accessType: "RESTRICTED", entryPointAccess: "ALL" } },
    timeout: 20_000,
  });
  const uri = result.data.meetingUri;
  if (!uri || !/^https:\/\/meet\.google\.com\/[a-z]{3}-[a-z]{4}-[a-z]{3}$/.test(uri)) {
    throw new OnlineConsultationError(502, "Google did not return a valid meeting link.");
  }
  return uri;
}

import { eq, sql } from "drizzle-orm";
import { appointments, providers, users } from "@workspace/db";
import { db, pool } from "./db";
import { storage } from "./storage";
import type { OnlineSession, OnlineStore } from "./online-consultations";
import { OnlineConsultationError } from "./google-meet";
import { consultationExpiry } from "./online-consultations";
import { readS3ObjectAsBuffer } from "./lib/s3-storage";

type SessionRow = {
  appointment_id: number; token_hash: string; encrypted_token: string; revoked: boolean;
  shared_visit_ids: number[]; shared_document_ids: number[];
};
function session(row?: SessionRow): OnlineSession | undefined {
  return row ? { appointmentId: row.appointment_id, tokenHash: row.token_hash, encryptedToken: row.encrypted_token, revoked: row.revoked, sharedVisitIds: row.shared_visit_ids, sharedDocumentIds: row.shared_document_ids } : undefined;
}

export const onlineStore: OnlineStore = {
  async providerForUser(userId) {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user?.providerId) return undefined;
    return this.provider(user.providerId);
  },
  async provider(id) { return (await db.select().from(providers).where(eq(providers.id, id)))[0]; },
  async appointment(id) { return (await db.select().from(appointments).where(eq(appointments.id, id)))[0]; },
  patient: (id) => storage.getPatient(id),
  async connection(providerId) {
    const result = await pool.query<{ encrypted_refresh_token: string }>("SELECT c.encrypted_refresh_token FROM google_meet_connections c JOIN users u ON u.id = c.user_id AND u.provider_id = c.provider_id WHERE c.provider_id = $1 AND u.role IN ('clinician','owner')", [providerId]);
    return result.rows[0]?.encrypted_refresh_token;
  },
  async saveConnection(providerId, userId, token) {
    const result = await pool.query(`INSERT INTO google_meet_connections (provider_id, user_id, encrypted_refresh_token)
      SELECT $1, $2, $3 WHERE EXISTS (SELECT 1 FROM users WHERE id = $2 AND provider_id = $1 AND role IN ('clinician','owner'))
      ON CONFLICT (provider_id) DO UPDATE SET user_id = EXCLUDED.user_id, encrypted_refresh_token = EXCLUDED.encrypted_refresh_token, updated_at = now()`, [providerId, userId, token]);
    if (!result.rowCount) throw new OnlineConsultationError(403, "The doctor account mapping changed. Start the connection again.");
  },
  async disconnect(providerId, userId) { await pool.query("DELETE FROM google_meet_connections WHERE provider_id = $1 AND user_id = $2", [providerId, userId]); },
  async saveState(hash, providerId, userId) {
    await pool.query("DELETE FROM google_meet_oauth_states WHERE expires_at <= now()");
    await pool.query("INSERT INTO google_meet_oauth_states (state_hash,provider_id,user_id) VALUES ($1,$2,$3)", [hash, providerId, userId]);
  },
  async consumeState(hash) {
    const result = await pool.query<{ provider_id: number; user_id: string }>("DELETE FROM google_meet_oauth_states WHERE state_hash = $1 AND expires_at > now() RETURNING provider_id,user_id", [hash]);
    return result.rows[0] ? { providerId: result.rows[0].provider_id, userId: result.rows[0].user_id } : undefined;
  },
  async session(id) { return session((await pool.query<SessionRow>("SELECT * FROM online_consultations WHERE appointment_id = $1", [id])).rows[0]); },
  async sessionByHash(hash) { return session((await pool.query<SessionRow>("SELECT * FROM online_consultations WHERE token_hash = $1", [hash])).rows[0]); },
  async createBooking(body, share) {
    return db.transaction(async (tx) => {
      const [appointment] = await tx.insert(appointments).values(body).returning();
      await tx.execute(sql`INSERT INTO online_consultations (appointment_id,token_hash,encrypted_token) VALUES (${appointment.id},${share.tokenHash},${share.encryptedToken})`);
      return appointment;
    });
  },
  async ensureSession(id, meetingUrl, share, expected) {
    return db.transaction(async (tx) => {
      const [appointment] = await tx.select().from(appointments).where(eq(appointments.id, id)).for("update");
      if (!appointment || ["cancelled", "canceled", "no-show"].includes(String(appointment.status).toLowerCase()) || consultationExpiry(appointment.date) <= Date.now()) throw new OnlineConsultationError(410, "Appointment is unavailable.");
      if (appointment.providerId !== expected.providerId || appointment.patientId !== expected.patientId) throw new OnlineConsultationError(409, "The appointment's doctor or patient changed. Retry using the updated appointment.");
      const existing = await tx.execute<SessionRow>(sql`SELECT * FROM online_consultations WHERE appointment_id = ${id}`);
      if (existing.rows[0]) {
        const saved = session(existing.rows[0])!;
        if (saved.revoked || appointment.visitMode !== "telemedicine") throw new OnlineConsultationError(410, "Consultation link is unavailable.");
        return saved;
      }
      await tx.update(appointments).set({ visitMode: "telemedicine", telemedicineLink: meetingUrl }).where(eq(appointments.id, id));
      await tx.execute(sql`INSERT INTO online_consultations (appointment_id,token_hash,encrypted_token) VALUES (${id},${share.tokenHash},${share.encryptedToken})`);
      return { ...share, appointmentId: id };
    });
  },
  async share(id, visitIds, documentIds, userId) {
    await pool.query("UPDATE online_consultations SET shared_visit_ids = $2, shared_document_ids = $3, updated_by = $4, updated_at = now() WHERE appointment_id = $1", [id, visitIds, documentIds, userId]);
  },
  async revoke(id, userId) {
    const result = await pool.query("UPDATE online_consultations SET revoked = true, updated_by = $2, updated_at = now() WHERE appointment_id = $1", [id, userId]);
    if (!result.rowCount) throw new OnlineConsultationError(404, "Consultation page not found.");
  },
  visits: (id) => storage.getVisitHistory(id),
  documents: (id) => storage.getDocuments(id),
  patientDocument: (id) => storage.getPatientDocument(id),
  async readFile(doc) {
    return doc.s3Key ? readS3ObjectAsBuffer(doc.s3Key) : doc.fileData ? Buffer.from(doc.fileData.replace(/^data:[^;]+;base64,/, ""), "base64") : null;
  },
};

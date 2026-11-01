import { pool } from "./db";
import { storage } from "./storage";
import type { OnboardingLinkStore } from "./onboarding-links";

export const onboardingLinkStore: OnboardingLinkStore = {
  appointment: async (id) => (await storage.getAppointments()).find((appointment) => appointment.id === id),
  async save(id, patientId, hash, expiresAt) {
    const result = await pool.query(`INSERT INTO onboarding_links (appointment_id, patient_id, token_hash, expires_at)
      SELECT id, patient_id, $3, $4 FROM appointments WHERE id = $1 AND patient_id = $2 AND lower(coalesce(status,'')) NOT IN ('cancelled','canceled','no-show')
      ON CONFLICT (appointment_id) DO UPDATE SET patient_id = EXCLUDED.patient_id, token_hash = EXCLUDED.token_hash, expires_at = EXCLUDED.expires_at`, [id, patientId, hash, expiresAt]);
    return !!result.rowCount;
  },
  async valid(id, hash) {
    const result = await pool.query("SELECT 1 FROM onboarding_links l JOIN appointments a ON a.id = l.appointment_id AND a.patient_id = l.patient_id WHERE l.appointment_id = $1 AND l.token_hash = $2 AND l.expires_at > now()", [id, hash]);
    return !!result.rowCount;
  },
};

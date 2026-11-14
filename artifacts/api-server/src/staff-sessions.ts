import crypto from "node:crypto";
import type { Pool, PoolClient } from "pg";
import type { Express, Request, Response } from "express";
import { clinicWorkingHours, staffSessionExpiry } from "../../../lib/db/src/staff-session-policy";

export async function ensureStaffSessionSchema(client: Pick<PoolClient, "query">) {
  await client.query(`CREATE TABLE IF NOT EXISTS staff_auth_sessions (
    token_hash text PRIMARY KEY,
    user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at timestamptz NOT NULL
  );
  CREATE INDEX IF NOT EXISTS staff_auth_sessions_expiry_idx ON staff_auth_sessions(expires_at);`);
}

const hashToken = (token: string) => crypto.createHash("sha256").update(token).digest("hex");

export function createStaffSessions(pool: Pick<Pool, "query">, now = Date.now) {
  async function read(token: string) {
    if (!/^[a-f0-9]{64}$/.test(token)) return null;
    const result = await pool.query<{ user_id: string; expires_at: Date }>(
      "SELECT user_id, expires_at FROM staff_auth_sessions WHERE token_hash = $1 AND expires_at > $2",
      [hashToken(token), new Date(now())],
    );
    return result.rows[0] ?? null;
  }
  return {
    async issue(userId: string): Promise<string> {
      const token = crypto.randomBytes(32).toString("hex");
      await pool.query("DELETE FROM staff_auth_sessions WHERE expires_at <= $1", [new Date(now())]);
      await pool.query("INSERT INTO staff_auth_sessions (token_hash, user_id, expires_at) VALUES ($1, $2, $3)",
        [hashToken(token), userId, new Date(staffSessionExpiry(now()))]);
      return token;
    },
    read,
    async authenticate(req: Request, res: Response): Promise<string | null> {
      const auth = req.headers.authorization;
      if (!auth?.startsWith("Bearer ")) {
        res.status(401).json({ error: "Staff token required" });
        return null;
      }
      const session = await read(auth.slice(7));
      if (!session) {
        res.status(401).json({ error: "Staff session expired or invalid, please log in again" });
        return null;
      }
      return session.user_id;
    },
    async renew(token: string, visible: boolean): Promise<Date | null> {
      const time = now();
      if (!clinicWorkingHours(time) && !visible) return (await read(token))?.expires_at ?? null;
      if (!/^[a-f0-9]{64}$/.test(token)) return null;
      const result = await pool.query<{ expires_at: Date }>(
        `UPDATE staff_auth_sessions SET expires_at = GREATEST(expires_at, $2)
         WHERE token_hash = $1 AND expires_at > $3 RETURNING expires_at`,
        [hashToken(token), new Date(staffSessionExpiry(time)), new Date(time)],
      );
      return result.rows[0]?.expires_at ?? null;
    },
  };
}

export function registerStaffSessionRenewal(app: Express, sessions: ReturnType<typeof createStaffSessions>) {
  app.post("/api/staff/session/renew", async (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    if (typeof req.body?.visible !== "boolean") {
      res.status(400).json({ error: "Provide the window visibility state." });
      return;
    }
    if (!await sessions.authenticate(req, res)) return;
    const expiresAt = await sessions.renew(req.headers.authorization?.slice(7) ?? "", req.body.visible);
    if (!expiresAt) {
      res.status(401).json({ error: "Staff session expired, please log in again" });
      return;
    }
    res.json({ expiresAt: expiresAt.toISOString() });
  });
}

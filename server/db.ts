import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set.");
}

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

export const db = drizzle(pool, { schema });

/**
 * Idempotent schema migration — runs at every startup.
 * Uses IF NOT EXISTS / IF NOT EXISTS guards so it is safe to run repeatedly.
 */
export async function ensureSchema(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(`
      -- Triage score columns on appointments (Task #8)
      ALTER TABLE appointments ADD COLUMN IF NOT EXISTS triage_score integer;
      ALTER TABLE appointments ADD COLUMN IF NOT EXISTS triage_reason text;
      ALTER TABLE appointments ADD COLUMN IF NOT EXISTS triage_scored_at text;

      -- Schedule optimisation history table (Task #8)
      CREATE TABLE IF NOT EXISTS schedule_optimisations (
        id serial PRIMARY KEY,
        date date NOT NULL,
        suggestions jsonb,
        summary text,
        estimated_time_saved text,
        total_appointments integer,
        suggestions_count integer,
        created_at text NOT NULL
      );
    `);
  } finally {
    client.release();
  }
}

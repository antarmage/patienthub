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

      -- appointment_id association on clinical_notes (Task #7)
      ALTER TABLE clinical_notes ADD COLUMN IF NOT EXISTS appointment_id integer REFERENCES appointments(id);

      -- Service packages (bundled services)
      CREATE TABLE IF NOT EXISTS service_packages (
        id serial PRIMARY KEY,
        name text NOT NULL,
        description text,
        category text NOT NULL,
        package_price real NOT NULL,
        validity_days integer DEFAULT 365,
        is_active boolean DEFAULT true,
        created_at text NOT NULL
      );

      CREATE TABLE IF NOT EXISTS package_items (
        id serial PRIMARY KEY,
        package_id integer NOT NULL REFERENCES service_packages(id) ON DELETE CASCADE,
        catalog_item_id integer NOT NULL REFERENCES billing_catalog(id),
        quantity integer NOT NULL DEFAULT 1,
        notes text
      );

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

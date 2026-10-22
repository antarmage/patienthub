import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@workspace/db";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set.");
}

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,ssl: {
    rejectUnauthorized: false
  }
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
      ALTER TABLE users ADD COLUMN IF NOT EXISTS email text;

      ALTER TABLE follow_up_calls ADD COLUMN IF NOT EXISTS source_key text;
      ALTER TABLE follow_up_calls ADD COLUMN IF NOT EXISTS trigger_type text;
      ALTER TABLE follow_up_calls ADD COLUMN IF NOT EXISTS trigger_reason text;
      ALTER TABLE follow_up_calls ADD COLUMN IF NOT EXISTS due_date text;
      CREATE UNIQUE INDEX IF NOT EXISTS follow_up_calls_source_key_idx ON follow_up_calls(source_key);
      ALTER TABLE lab_tasks ADD COLUMN IF NOT EXISTS ordered_at text;
      ALTER TABLE lab_tasks ALTER COLUMN ordered_at SET DEFAULT CURRENT_TIMESTAMP::text;

      CREATE TABLE IF NOT EXISTS invoice_template_settings (
        id integer PRIMARY KEY DEFAULT 1,
        clinic_name text NOT NULL DEFAULT '',
        clinic_address text,
        clinic_phone text,
        clinic_email text,
        tax_registration text,
        logo_url text,
        footer_text text,
        sections jsonb NOT NULL DEFAULT '{}'::jsonb,
        updated_at text NOT NULL DEFAULT CURRENT_TIMESTAMP::text
      );

      ALTER TABLE invoices ADD COLUMN IF NOT EXISTS template_snapshot jsonb;
      ALTER TABLE invoices ADD COLUMN IF NOT EXISTS discount_total real NOT NULL DEFAULT 0;
      ALTER TABLE invoices ADD COLUMN IF NOT EXISTS discount_details jsonb;

      CREATE TABLE IF NOT EXISTS prime_pricing_rules (
        id integer PRIMARY KEY DEFAULT 1,
        consultation_fee real NOT NULL DEFAULT 600,
        consultation_item_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
        lab_discount_percent real NOT NULL DEFAULT 20,
        updated_at text NOT NULL DEFAULT CURRENT_TIMESTAMP::text
      );

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

      -- Inventory (supplements, vaccines, consumables)
      CREATE TABLE IF NOT EXISTS inventory_items (
        id serial PRIMARY KEY,
        name text NOT NULL,
        category text NOT NULL DEFAULT 'Supplement',
        catalog_item_id integer,
        unit text NOT NULL DEFAULT 'units',
        quantity real NOT NULL DEFAULT 0,
        low_stock_threshold real NOT NULL DEFAULT 5,
        batch_number text,
        expiry_date date,
        supplier text,
        notes text,
        is_active boolean NOT NULL DEFAULT true,
        updated_at text
      );

      CREATE TABLE IF NOT EXISTS vaccination_schedules (
        id serial PRIMARY KEY,
        vaccine_name text NOT NULL,
        eligibility text NOT NULL,
        min_age real,
        max_age real,
        dose_offsets_months jsonb NOT NULL DEFAULT '[]'::jsonb,
        dose_gestational_weeks jsonb NOT NULL DEFAULT '[]'::jsonb,
        reminder_lead_days integer NOT NULL DEFAULT 7,
        is_active boolean NOT NULL DEFAULT true
      );

      CREATE TABLE IF NOT EXISTS vaccination_records (
        id serial PRIMARY KEY,
        patient_id integer NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
        schedule_id integer NOT NULL REFERENCES vaccination_schedules(id) ON DELETE CASCADE,
        dose_number integer NOT NULL,
        administered_date date NOT NULL,
        created_at text NOT NULL,
        CONSTRAINT vaccination_records_patient_schedule_dose_idx UNIQUE (patient_id, schedule_id, dose_number)
      );

      INSERT INTO vaccination_schedules
        (vaccine_name, eligibility, min_age, max_age, dose_offsets_months, dose_gestational_weeks, reminder_lead_days, is_active)
      SELECT seed.vaccine_name, seed.eligibility, seed.min_age, seed.max_age,
             seed.dose_offsets_months::jsonb, seed.dose_gestational_weeks::jsonb, 7, true
      FROM (VALUES
        ('HPV9', 'age', 0::real, 11::real, '[0,6]', '[]'),
        ('HPV9', 'age', 12::real, NULL::real, '[0,2,6]', '[]'),
        ('Td/Tdap (pregnancy)', 'pregnancy', NULL::real, NULL::real, '[]', '[12,16,27]')
      ) AS seed(vaccine_name, eligibility, min_age, max_age, dose_offsets_months, dose_gestational_weeks)
      WHERE NOT EXISTS (
        SELECT 1 FROM vaccination_schedules existing
        WHERE existing.vaccine_name = seed.vaccine_name
          AND existing.eligibility = seed.eligibility
          AND existing.min_age IS NOT DISTINCT FROM seed.min_age
          AND existing.max_age IS NOT DISTINCT FROM seed.max_age
      );

      CREATE TABLE IF NOT EXISTS referral_partners (
        id serial PRIMARY KEY,
        name text NOT NULL,
        commission_percent real NOT NULL DEFAULT 0,
        is_active boolean NOT NULL DEFAULT true
      );

      CREATE TABLE IF NOT EXISTS diagnostic_referrals (
        id serial PRIMARY KEY,
        patient_id integer NOT NULL,
        appointment_id integer,
        partner_id integer NOT NULL,
        service_name text NOT NULL,
        catalog_item_id integer,
        base_price real NOT NULL DEFAULT 0,
        status text NOT NULL DEFAULT 'referred',
        referred_at text NOT NULL,
        report_received_at text,
        commission_percent real,
        commission_amount real,
        notes text
      );

      ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS catalog_item_id integer;
      ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS tax_rate real NOT NULL DEFAULT 0;
      ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS selling_price real;
      ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS cost_price real;
      ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS prime_discount_percent real NOT NULL DEFAULT 0;
      ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS non_prime_discount_percent real NOT NULL DEFAULT 0;
      ALTER TABLE billing_catalog ADD COLUMN IF NOT EXISTS cost_price real;

      CREATE TABLE IF NOT EXISTS inventory_movements (
        id serial PRIMARY KEY,
        item_id integer NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
        change real NOT NULL,
        reason text,
        created_at text NOT NULL
      );

      CREATE TABLE IF NOT EXISTS package_items (
        id serial PRIMARY KEY,
        package_id integer NOT NULL REFERENCES service_packages(id) ON DELETE CASCADE,
        catalog_item_id integer NOT NULL REFERENCES billing_catalog(id),
        quantity integer NOT NULL DEFAULT 1,
        notes text
      );

      -- enteredBy column for pregnancy_metrics (Task #10)
      ALTER TABLE pregnancy_metrics ADD COLUMN IF NOT EXISTS entered_by text;

      -- Pregnancy Hub self-tracking tables (Task #10)
      CREATE TABLE IF NOT EXISTS water_logs (
        id serial PRIMARY KEY,
        patient_id integer NOT NULL REFERENCES patients(id),
        date date NOT NULL,
        amount_ml integer NOT NULL,
        logged_at text
      );

      CREATE TABLE IF NOT EXISTS medication_logs (
        id serial PRIMARY KEY,
        patient_id integer NOT NULL REFERENCES patients(id),
        medication_id integer NOT NULL REFERENCES medications(id),
        taken_date date NOT NULL,
        taken_at text
      );

      CREATE TABLE IF NOT EXISTS patient_documents (
        id serial PRIMARY KEY,
        patient_id integer NOT NULL REFERENCES patients(id),
        file_name text NOT NULL,
        file_data text,
        mime_type text,
        doc_type text,
        trimester integer,
        label text,
        uploaded_at text NOT NULL
      );

      ALTER TABLE patient_documents ADD COLUMN IF NOT EXISTS s3_key text;

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

      -- SaivieGene genome analyses table (Task #28)
      CREATE TABLE IF NOT EXISTS genome_analyses (
        id serial PRIMARY KEY,
        patient_id integer REFERENCES patients(id),
        job_id text NOT NULL UNIQUE,
        status text NOT NULL DEFAULT 'processing',
        file_name text,
        snp_count integer,
        health_risks jsonb,
        predispositions jsonb,
        pharmacogenomics jsonb,
        traits jsonb,
        raw_markers jsonb,
        analysed_at text,
        created_at text NOT NULL
      );

      ALTER TABLE genome_analyses ADD COLUMN IF NOT EXISTS s3_key text;
    `);
  } finally {
    client.release();
  }
}

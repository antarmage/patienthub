import type { Pool } from "pg";
import { cycleBodyCatalogueSchema, type CycleBodyCatalogue } from "../../../lib/db/src/cycle-body-content";
import { cycleBodyContext, cycleBodyVersion, cycleEditionDate, generateCatalogue, loadCyclePatients, type CyclePatient } from "./cycle-body-content";
import { logger } from "./lib/logger";

type Context = NonNullable<ReturnType<typeof cycleBodyContext>>;
type Job = { patientId: number; date: string; context: Context };
type Edition = { cycleDay: number; cycleLength: number; phase: string; content: unknown; attempts: number };
type WorkerStore = {
  patients(): Promise<CyclePatient[]>;
  edition(job: Job): Promise<Edition | undefined>;
  claim(job: Job): Promise<void>;
  save(job: Job, catalogue: CycleBodyCatalogue): Promise<void>;
  fail(job: Job): Promise<void>;
};

export async function generateDailyCycleEditions(store: WorkerStore, generate = generateCatalogue,
  now = new Date(), shouldStop = () => false) {
  const date = cycleEditionDate(now);
  const day = new Date(`${date}T12:00:00`);
  const result = { generated: 0, failed: 0, skipped: 0 };
  for (const patient of await store.patients()) {
    if (shouldStop()) break;
    const context = cycleBodyContext(patient, day);
    if (!context) { result.skipped++; continue; }
    const job = { patientId: patient.id, date, context };
    const edition = await store.edition(job);
    const matches = edition?.cycleDay === context.cycleDay &&
      edition.cycleLength === context.cycleLength && edition.phase === context.phase;
    if (matches && (edition.content || edition.attempts >= 3)) {
      if (!edition.content) await store.fail(job);
      result.skipped++; continue;
    }
    await store.claim(job);
    try {
      // Generate generic education only; patient identity and cycle records stay on this server.
      const catalogue = cycleBodyCatalogueSchema.parse(await generate());
      await store.save(job, catalogue);
      result.generated++;
    } catch (error) {
      await store.fail(job);
      logger.error({ err: error, patientId: patient.id, editionDate: date }, "Daily cycle content generation failed");
      result.failed++;
    }
  }
  return result;
}

function createWorkerStore(pool: Pick<Pool, "query">): WorkerStore {
  const params = (job: Job) => [job.patientId, job.date, cycleBodyVersion, job.context.cycleDay, job.context.cycleLength, job.context.phase];
  return {
    patients: () => loadCyclePatients(pool),
    async edition(job) {
      return (await pool.query<Edition>(`SELECT cycle_day AS "cycleDay",cycle_length AS "cycleLength",phase,content,attempts
        FROM cycle_body_daily_editions WHERE patient_id=$1 AND edition_date=$2 AND asset_version=$3`, params(job).slice(0, 3))).rows[0];
    },
    async claim(job) {
      await pool.query(`INSERT INTO cycle_body_daily_editions AS e
        (patient_id,edition_date,asset_version,cycle_day,cycle_length,phase,attempts,last_attempt_at,state)
        VALUES($1,$2,$3,$4,$5,$6,1,now(),'generating')
        ON CONFLICT(patient_id,edition_date,asset_version) DO UPDATE SET
          attempts=CASE WHEN e.cycle_day=$4 AND e.cycle_length=$5 AND e.phase=$6 THEN e.attempts+1 ELSE 1 END,
          cycle_day=$4,cycle_length=$5,phase=$6,content=NULL,generated_at=NULL,last_attempt_at=now(),state='generating'`, params(job));
    },
    async save(job, catalogue) {
      await pool.query(`UPDATE cycle_body_daily_editions SET content=$4::jsonb,generated_at=now(),state='ready'
        WHERE patient_id=$1 AND edition_date=$2 AND asset_version=$3`,
      [job.patientId, job.date, cycleBodyVersion, JSON.stringify(catalogue)]);
    },
    async fail(job) {
      await pool.query(`UPDATE cycle_body_daily_editions SET state='failed'
        WHERE patient_id=$1 AND edition_date=$2 AND asset_version=$3`, params(job).slice(0, 3));
    },
  };
}

export function startDailyCycleContentWorker(pool: Pool) {
  let running = false;
  let stopped = false;
  async function tick() {
    if (running || stopped) return;
    running = true;
    const client = await pool.connect().catch(error => {
      running = false;
      logger.error({ err: error }, "Daily cycle content worker could not connect");
      return null;
    });
    if (!client) return;
    let locked = false;
    let discardClient = false;
    const onClientError = (error: Error) => {
      discardClient = true;
      logger.error({ err: error }, "Daily cycle worker database connection lost");
    };
    client.on("error", onClientError);
    try {
      locked = (await client.query<{ locked: boolean }>("SELECT pg_try_advisory_lock(hashtext($1)) AS locked", ["cycle-content-daily-worker"])).rows[0].locked;
      if (!locked) return;
      const startDate = cycleEditionDate();
      const result = await generateDailyCycleEditions(createWorkerStore(client), generateCatalogue, new Date(),
        () => stopped || discardClient || cycleEditionDate() !== startDate);
      if (result.generated || result.failed) logger.info({ ...result, editionDate: startDate }, "Daily cycle content worker finished");
    } catch (error) {
      discardClient = true;
      logger.error({ err: error }, "Daily cycle content worker failed");
    } finally {
      try {
        if (locked && !discardClient) await client.query("SELECT pg_advisory_unlock(hashtext($1))", ["cycle-content-daily-worker"]);
      } catch (error) {
        discardClient = true;
        logger.error({ err: error }, "Daily cycle worker could not release its lock");
      } finally {
        client.release(discardClient);
        client.removeListener("error", onClientError);
        running = false;
      }
    }
  }
  const run = () => { void tick().catch(error => logger.error({ err: error }, "Daily cycle worker cleanup failed")); };
  // The IST date rolls over at midnight. Minute-level catch-up also handles restarts and changed records.
  const timer = setInterval(run, 60000);
  timer.unref();
  run();
  return () => { stopped = true; clearInterval(timer); };
}

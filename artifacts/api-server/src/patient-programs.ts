import type { Express, Request, Response } from "express";
import type { Pool, PoolClient } from "pg";
import type { AccessActor } from "./clinical-access";
import { programInputSchema, programUpdateSchema, programVersionSchema, programPublishSchema, type Program, type ProgramInput } from "../../../lib/db/src/patient-programs";

export async function ensurePatientProgramsSchema(client: Pick<PoolClient, "query">) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS patient_program_catalog (
      id serial PRIMARY KEY, title text NOT NULL, description text NOT NULL,
      category text NOT NULL CHECK (category IN ('nutrition', 'exercise')),
      tier text NOT NULL CHECK (tier IN ('free', 'plus')),
      sessions jsonb NOT NULL DEFAULT '[]',
      status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
      version integer NOT NULL DEFAULT 1,
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS patient_program_audit (
      id serial PRIMARY KEY, program_id integer NOT NULL REFERENCES patient_program_catalog(id),
      actor_id text NOT NULL, action text NOT NULL, version integer NOT NULL,
      content jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
    );
  `);
}

const columns = "id,title,description,category,tier,sessions,status,version";
function fail(status: number, message: string): never {
  throw Object.assign(new Error(message), { status });
}

export function createPatientProgramsStore(pool: Pool) {
  async function change(id: number, version: number, actorId: string, action: "edit" | "publish" | "unpublish", input?: ProgramInput) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const current = (await client.query<Program>(`SELECT ${columns} FROM patient_program_catalog WHERE id=$1 FOR UPDATE`, [id])).rows[0];
      if (!current) fail(404, "Program not found.");
      if (current.version !== version) fail(409, "This program changed. Reload it before saving.");
      if (action === "edit" && current.status !== "draft") fail(409, "Unpublish the program before editing it.");
      if (action === "publish" && current.status !== "draft") fail(409, "This program is already published.");
      if (action === "unpublish" && current.status !== "published") fail(409, "This program is not published.");
      if (action === "publish" && current.sessions.length === 0) fail(400, "Add at least one session before publishing.");
      const result = action === "edit" && input
        ? await client.query<Program>(`UPDATE patient_program_catalog SET title=$2,description=$3,category=$4,tier=$5,sessions=$6::jsonb,version=version+1,updated_at=now() WHERE id=$1 RETURNING ${columns}`,
            [id, input.title, input.description, input.category, input.tier, JSON.stringify(input.sessions)])
        : await client.query<Program>(`UPDATE patient_program_catalog SET status=$2,version=version+1,updated_at=now() WHERE id=$1 RETURNING ${columns}`,
            [id, action === "publish" ? "published" : "draft"]);
      const saved = result.rows[0];
      await client.query("INSERT INTO patient_program_audit(program_id,actor_id,action,version,content) VALUES($1,$2,$3,$4,$5::jsonb)", [id, actorId, action, saved.version, JSON.stringify(saved)]);
      await client.query("COMMIT");
      return saved;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally { client.release(); }
  }
  return {
    async listStaff(): Promise<Program[]> {
      return (await pool.query<Program>(`SELECT ${columns} FROM patient_program_catalog ORDER BY updated_at DESC,id DESC`)).rows;
    },
    async listPatient(): Promise<Program[]> {
      return (await pool.query<Program>(`SELECT ${columns} FROM patient_program_catalog WHERE status='published' AND tier='free' ORDER BY title,id`)).rows;
    },
    async create(input: ProgramInput, actorId: string): Promise<Program> {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const saved = (await client.query<Program>(`INSERT INTO patient_program_catalog(title,description,category,tier,sessions) VALUES($1,$2,$3,$4,$5::jsonb) RETURNING ${columns}`,
          [input.title, input.description, input.category, input.tier, JSON.stringify(input.sessions)])).rows[0];
        await client.query("INSERT INTO patient_program_audit(program_id,actor_id,action,version,content) VALUES($1,$2,'create',$3,$4::jsonb)", [saved.id, actorId, saved.version, JSON.stringify(saved)]);
        await client.query("COMMIT");
        return saved;
      } catch (error) { await client.query("ROLLBACK"); throw error; }
      finally { client.release(); }
    },
    change,
  };
}

export function registerPatientPrograms(app: Express, store: ReturnType<typeof createPatientProgramsStore>, authenticate: (req: Request, res: Response) => Promise<AccessActor | null>) {
  const handler = (audience: "staff" | "patient", action: "list" | "create" | "edit" | "publish" | "unpublish") =>
    async (req: Request, res: Response, next: (error?: unknown) => void) => {
      res.setHeader("Cache-Control", "private, no-store");
      try {
        const actor = await authenticate(req, res);
        if (!actor) { if (!res.headersSent) res.status(401).json({ error: "Authentication required." }); return; }
        if (audience === "patient") {
          if (!("patientId" in actor)) { res.status(403).json({ error: "Patient account required." }); return; }
          res.json(await store.listPatient()); return;
        }
        if (!("role" in actor) || !["staff", "nutritionist", "trainer", "receptionist", "admin", "clinician", "owner"].includes(actor.role)) {
          res.status(403).json({ error: "Program staff access required." }); return;
        }
        if ((action === "publish" || action === "unpublish") && !["clinician", "owner"].includes(actor.role)) {
          res.status(403).json({ error: "A clinician or owner must review and publish programs." }); return;
        }
        if (action === "list") { res.json({ programs: await store.listStaff(), canPublish: ["clinician", "owner"].includes(actor.role) }); return; }
        if (action === "create") {
          const parsed = programInputSchema.safeParse(req.body);
          if (!parsed.success) { res.status(400).json({ error: parsed.error.issues.map((issue) => issue.message).join("; ") }); return; }
          res.status(201).json(await store.create(parsed.data, actor.userId)); return;
        }
        const id = Number(req.params.id);
        if (!/^[1-9]\d*$/.test(String(req.params.id)) || !Number.isSafeInteger(id) || id > 2147483647) { res.status(400).json({ error: "Invalid program ID." }); return; }
        const parsed = action === "edit" ? programUpdateSchema.safeParse(req.body) : action === "publish" ? programPublishSchema.safeParse(req.body) : programVersionSchema.safeParse(req.body);
        if (!parsed.success) { res.status(400).json({ error: parsed.error.issues.map((issue) => issue.message).join("; ") }); return; }
        if (action === "edit") {
          const { expectedVersion, ...input } = programUpdateSchema.parse(parsed.data);
          res.json(await store.change(id, expectedVersion, actor.userId, action, input));
        } else {
          res.json(await store.change(id, parsed.data.expectedVersion, actor.userId, action));
        }
      } catch (error) {
        if (error instanceof Error && "status" in error && [400, 404, 409].includes(Number(error.status))) res.status(Number(error.status)).json({ error: error.message });
        else next(error);
      }
    };
  app.get("/api/patient-programs", handler("patient", "list"));
  app.get("/api/program-management", handler("staff", "list"));
  app.post("/api/program-management", handler("staff", "create"));
  app.put("/api/program-management/:id", handler("staff", "edit"));
  app.post("/api/program-management/:id/publish", handler("staff", "publish"));
  app.post("/api/program-management/:id/unpublish", handler("staff", "unpublish"));
}

import type { Express, Request, Response } from "express";
import type { Pool } from "pg";
import type { AccessActor } from "./clinical-access";

export const nutritionService = (value: string | null | undefined) =>
  /^(nutrition|nutritionist|nutrition services|nutrition consultation|dietitian|dietician)$/i.test(value?.trim() || "");

export function isNutritionAccount(actor: AccessActor): boolean {
  return "role" in actor && (actor.role === "nutritionist" ||
    actor.role === "staff" && "username" in actor && typeof actor.username === "string" && /nutritionist/i.test(actor.username));
}

export function createNutritionAccessStore(pool: Pool) {
  const serviceSql = `(lower(trim(coalesce(r.referred_to_external,''))) IN
    ('nutrition','nutritionist','nutrition services','nutrition consultation','dietitian','dietician')
    OR lower(trim(coalesce(p.role,''))) IN ('nutritionist','dietitian','dietician')
    OR lower(trim(coalesce(p.specialty,''))) IN ('nutrition','nutritionist','dietitian','dietician'))`;
  return {
    async patients() {
      const result = await pool.query<{ patientId: number }>(`SELECT DISTINCT r.patient_id AS "patientId"
        FROM referrals r LEFT JOIN providers p ON p.id=r.referred_to_provider_id
        WHERE r.patient_id IS NOT NULL AND ${serviceSql}
        AND lower(trim(coalesce(r.status,'pending'))) IN ('pending','referred','scheduled','active','accepted','in_progress','in progress')`);
      return new Set(result.rows.map((row) => row.patientId));
    },
    async recordPatient(collection: string, id: number) {
      const tables: Record<string, string> = {
        appointments: "appointments", documents: "documents", "clinical-notes": "clinical_notes",
        "visit-history": "visit_history", medications: "medications", "lab-tasks": "lab_tasks",
        "patient-protocols": "patient_protocols",
      };
      const table = tables[collection];
      if (!table) throw new Error("Unsupported nutrition record collection");
      return (await pool.query<{ patientId: number }>(`SELECT patient_id AS "patientId" FROM ${table} WHERE id=$1`, [id])).rows[0]?.patientId ?? null;
    },
    async nutritionReferral(id: number) {
      return !!(await pool.query(`SELECT r.id FROM referrals r LEFT JOIN providers p ON p.id=r.referred_to_provider_id
        WHERE r.id=$1 AND ${serviceSql}`, [id])).rowCount;
    },
  };
}

export function registerNutritionAccess(app: Express, authenticate: (req: Request, res: Response) => Promise<AccessActor | null>,
  store: ReturnType<typeof createNutritionAccessStore>) {
  app.use(async (req, res, next) => {
    if (!req.path.startsWith("/api/") || !req.headers.authorization && !req.headers["x-staff-token"]
      || /^\/api\/(?:auth\/|staff\/(?:session\/renew|otp\/)|desk\/auth)/.test(req.path)) return next();
    try {
      const actor = await authenticate(req, res);
      if (!actor) { if (!res.headersSent) res.status(401).json({ error: "Authentication required" }); return; }
      const read = req.method === "GET" || req.method === "HEAD";
      if (!isNutritionAccount(actor)) {
        if ("role" in actor && ["staff", "receptionist"].includes(actor.role) && !read) {
          const create = /^\/api\/patients\/\d+\/referrals\/?$/.test(req.path) && req.method === "POST";
          const edit = req.path.match(/^\/api\/referrals\/(\d+)\/?$/);
          const permittedCreate = create && nutritionService(req.body?.referredToExternal) &&
            req.body?.referredToProviderId == null &&
            Object.keys(req.body).every((key) => ["patientId", "date", "referredToExternal", "reason", "urgency", "status", "notes"].includes(key));
          const permittedEdit = edit && ["PATCH", "DELETE"].includes(req.method) &&
            (req.method === "DELETE" || req.body && Object.keys(req.body).every((key) => ["status", "notes"].includes(key))) &&
            await store.nutritionReferral(Number(edit[1]));
          if (permittedCreate || permittedEdit) res.locals.nutritionReferralWrite = true;
        }
        return next();
      }
      res.setHeader("Cache-Control", "private, no-store");
      const deny = () => res.status(403).json({ error: "Only patients with an active nutrition referral are accessible." });
      if (req.path === "/api/nutrition/food-lookup" && req.method === "POST") return next();
      if (read && /^\/api\/(?:providers|nutrition-plans|workouts|invoice-template|staff\/profile)\/?$/.test(req.path)) return next();
      const assigned = await store.patients();
      const direct = req.path.match(/^\/api\/patients\/(\d+)(?:\/|$)/);
      const collection = req.path.match(/^\/api\/(appointments|documents|clinical-notes|visit-history|medications|lab-tasks|patient-protocols)(?:\/(\d+))?\/?$/);
      const patients = /^\/api\/patients\/?$/.test(req.path);
      let patientId = direct ? Number(direct[1]) : null;
      const protocolSave = req.path === "/api/patient-protocols" && req.method === "POST";
      if (protocolSave) {
        if (!Number.isSafeInteger(req.body?.patientId) || req.body.patientId <= 0) { res.status(400).json({ error: "Invalid patient ID" }); return; }
        patientId = req.body.patientId;
      }
      if (collection?.[2]) patientId = await store.recordPatient(collection[1], Number(collection[2]));
      if (read && collection && !collection[2]) {
        const supplied = req.headers["x-patient-id"] ?? req.query.patientId;
        if (supplied !== undefined) {
          if (typeof supplied !== "string" || !/^\d+$/.test(supplied)) { res.status(400).json({ error: "Invalid patient ID" }); return; }
          patientId = Number(supplied);
        }
      }
      if (patientId !== null && !assigned.has(patientId)) { deny(); return; }
      if (protocolSave && patientId !== null && assigned.has(patientId)) return next();
      if (!read || !direct && !collection && !patients) { deny(); return; }
      res.locals.nutritionRead = true;
      const json = res.json.bind(res);
      res.json = ((body: unknown) => {
        if (res.statusCode >= 400) return json(body);
        const filter = (rows: unknown[]) => rows.filter((row) => {
          if (!row || typeof row !== "object") return false;
          const id = patients && "id" in row ? row.id : "patientId" in row ? row.patientId : null;
          return typeof id === "number" && assigned.has(id) && (patientId === null || id === patientId);
        });
        if (Array.isArray(body)) return json(direct ? body : filter(body));
        return json(body);
      }) as Response["json"];
      next();
    } catch (error) { next(error); }
  });
}

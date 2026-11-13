import type { Express, Request, Response } from "express";
import multer from "multer";
import { expenseDateSchema, expenseDraftSchema, type ExpenseDraft, type ExpenseRecord } from "../../../lib/db/src/expenses";

export interface ExpenseReceipt { name: string; mimeType: string; data: Buffer }
export interface ExpenseStore {
  list(start: string, end: string): Promise<ExpenseRecord[]>;
  save(draft: ExpenseDraft, userId: string, receipt?: ExpenseReceipt, id?: number): Promise<ExpenseRecord | undefined>;
  markReimbursementPaid(id: number, userId: string): Promise<ExpenseRecord | undefined>;
  remove(id: number): Promise<boolean>;
  receipt(id: number): Promise<ExpenseReceipt | undefined>;
}
type Actor = { userId: string; role: string };
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 11 } }).single("receipt");

export function registerExpenseRoutes(app: Express, authenticate: (req: Request, res: Response) => Promise<Actor | null>, store: ExpenseStore) {
  for (const base of ["/api/expenses", "/api/owner/expenses"]) {
    app.use(base, async (req, res, next) => {
      const actor = await authenticate(req, res);
      if (!actor) return;
      if (!["staff", "receptionist", "owner"].includes(actor.role) || (base.includes("/owner/") && actor.role !== "owner")) {
        res.status(403).json({ error: "Receptionist or owner access required." }); return;
      }
      if (["PATCH", "DELETE"].includes(req.method) && actor.role !== "owner") {
        res.status(403).json({ error: "Only owners can edit or delete expenses." }); return;
      }
      res.locals.expenseActor = actor;
      next();
    });
    app.get(base, async (req, res) => {
      const start = expenseDateSchema.safeParse(req.query.startDate);
      const end = expenseDateSchema.safeParse(req.query.endDate);
      if (!start.success || !end.success || start.data > end.data) {
        res.status(400).json({ error: "Choose a valid start and end date; start must not be after end." }); return;
      }
      res.set("Cache-Control", "no-store").json(await store.list(start.data, end.data));
    });
    const save = async (req: Request, res: Response) => {
      const id = req.params.id === undefined ? undefined : Number(req.params.id);
      if (id !== undefined && (!Number.isSafeInteger(id) || id <= 0)) { res.status(400).json({ error: "Invalid expense ID." }); return; }
      const parsed = expenseDraftSchema.safeParse(req.body);
      if (!parsed.success) { res.status(400).json({ error: parsed.error.issues.map((issue) => issue.message).join("; ") }); return; }
      let receipt: ExpenseReceipt | undefined;
      if (req.file) {
        const bytes = req.file.buffer;
        const mimeType = bytes.subarray(0, 5).toString() === "%PDF-" ? "application/pdf"
          : bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) ? "image/png"
          : bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255 ? "image/jpeg" : null;
        if (!mimeType || req.file.mimetype !== mimeType) { res.status(400).json({ error: "Receipt must be a PDF, JPG or PNG file (up to 5 MB)." }); return; }
        receipt = { name: req.file.originalname.replace(/[\r\n\\/]/g, "_").slice(0, 200), mimeType, data: bytes };
      }
      const actor: Actor = res.locals.expenseActor;
      const record = await store.save(parsed.data, actor.userId, receipt, id);
      if (!record) { res.status(404).json({ error: "Expense not found." }); return; }
      res.status(id === undefined ? 201 : 200).json(record);
    };
    const parseUpload = (req: Request, res: Response, next: () => void) => {
      if (!req.is("multipart/form-data")) { next(); return; }
      upload(req, res, (error: unknown) => {
        if (error) { res.status(400).json({ error: error instanceof Error ? error.message : "Receipt upload failed." }); return; }
        next();
      });
    };
    app.post(base, parseUpload, save);
    app.patch(`${base}/:id`, parseUpload, save);
    app.patch(`${base}/:id/reimbursement`, async (req, res) => {
      const actor: Actor = res.locals.expenseActor;
      if (actor.role !== "owner") { res.status(403).json({ error: "Only owners can mark reimbursements paid." }); return; }
      const id = Number(req.params.id);
      if (!Number.isSafeInteger(id) || id <= 0) { res.status(400).json({ error: "Invalid expense ID." }); return; }
      const record = await store.markReimbursementPaid(id, actor.userId);
      if (!record) { res.status(404).json({ error: "Expense not found or reimbursement was not requested." }); return; }
      res.json(record);
    });
    app.delete(`${base}/:id`, async (req, res) => {
      const id = Number(req.params.id);
      if (!Number.isSafeInteger(id) || id <= 0) { res.status(400).json({ error: "Invalid expense ID." }); return; }
      if (!await store.remove(id)) { res.status(404).json({ error: "Expense not found." }); return; }
      res.status(204).send();
    });
    app.get(`${base}/:id/receipt`, async (req, res) => {
      const id = Number(req.params.id);
      if (!Number.isSafeInteger(id) || id <= 0) { res.status(400).json({ error: "Invalid expense ID." }); return; }
      const receipt = await store.receipt(id);
      if (!receipt) { res.status(404).json({ error: "Receipt not found." }); return; }
      res.set({ "Content-Type": receipt.mimeType, "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(receipt.name)}`, "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" }).send(receipt.data);
    });
  }
}

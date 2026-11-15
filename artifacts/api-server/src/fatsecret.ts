import type { Express, Request, Response } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod/v4";
import { isNutritionAccount } from "./nutrition-access";
import type { AccessActor } from "./clinical-access";

const foodSchema = z.object({
  food_id: z.string().regex(/^\d+$/),
  food_name: z.string().min(1),
  brand_name: z.string().optional(),
  food_description: z.string().optional(),
});
const servingSchema = z.object({
  serving_id: z.string().regex(/^\d+$/),
  serving_description: z.string().min(1),
  calories: z.string().regex(/^\d+(?:\.\d+)?$/),
});
const arrayOf = <T>(value: T | T[] | undefined): T[] =>
  value === undefined ? [] : Array.isArray(value) ? value : [value];

export class FoodLookupError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

export function createFatSecretClient(options: {
  clientId?: string;
  clientSecret?: string;
  fetcher?: typeof fetch;
}) {
  const fetcher = options.fetcher ?? fetch;
  let token: { value: string; expiresAt: number } | null = null;
  let pendingToken: Promise<string> | null = null;

  async function getToken(): Promise<string> {
    if (token && token.expiresAt > Date.now() + 60_000) return token.value;
    if (pendingToken) return pendingToken;
    if (!options.clientId?.trim() || !options.clientSecret?.trim())
      throw new FoodLookupError("FatSecret is not configured. Contact an administrator.", 503);
    pendingToken = (async () => {
      const response = await fetcher("https://oauth.fatsecret.com/connect/token", {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${options.clientId}:${options.clientSecret}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ grant_type: "client_credentials", scope: "basic" }),
        signal: AbortSignal.timeout(15_000),
      });
      if (!response.ok) throw new FoodLookupError("FatSecret authentication failed. Check its server configuration.", 502);
      const parsed = z.object({ access_token: z.string().min(1), expires_in: z.number().positive() }).safeParse(await response.json());
      if (!parsed.success) throw new FoodLookupError("FatSecret returned an invalid authentication response.", 502);
      token = { value: parsed.data.access_token, expiresAt: Date.now() + parsed.data.expires_in * 1000 };
      return token.value;
    })();
    try { return await pendingToken; } finally { pendingToken = null; }
  }

  async function request(method: string, params: Record<string, string>): Promise<unknown> {
    let response: globalThis.Response;
    try {
      const accessToken = await getToken();
      response = await fetcher("https://platform.fatsecret.com/rest/server.api", {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ method, format: "json", ...params }),
        signal: AbortSignal.timeout(15_000),
      });
    } catch (error) {
      if (error instanceof FoodLookupError) throw error;
      throw new FoodLookupError("FatSecret is unavailable. Please try again.", 502);
    }
    if (!response.ok) {
      if (response.status === 401) token = null;
      throw new FoodLookupError("FatSecret could not complete the request. Please try again.", 502);
    }
    let body: unknown;
    try { body = await response.json(); } catch { throw new FoodLookupError("FatSecret returned invalid data.", 502); }
    if (body && typeof body === "object" && "error" in body)
      throw new FoodLookupError("FatSecret could not complete the request. Check API access and try again.", 502);
    return body;
  }

  return {
    async search(query: string) {
      const body = await request("foods.search", { search_expression: query, max_results: "20" });
      const parsed = z.object({ foods: z.object({ food: z.union([foodSchema, z.array(foodSchema)]).optional() }) }).safeParse(body);
      if (!parsed.success) throw new FoodLookupError("FatSecret returned an invalid food search response.", 502);
      return arrayOf(parsed.data.foods.food).map((food) => ({
        id: food.food_id, name: food.food_name, brand: food.brand_name ?? "", description: food.food_description ?? "",
      }));
    },
    async food(id: string) {
      const body = await request("food.get", { food_id: id });
      const parsed = z.object({ food: foodSchema.extend({
        servings: z.object({ serving: z.union([servingSchema, z.array(servingSchema)]) }),
      }) }).safeParse(body);
      if (!parsed.success) throw new FoodLookupError("FatSecret returned invalid serving information.", 502);
      return {
        id: parsed.data.food.food_id, name: parsed.data.food.food_name, brand: parsed.data.food.brand_name ?? "",
        servings: arrayOf(parsed.data.food.servings.serving).map((serving) => ({
          id: serving.serving_id, description: serving.serving_description, calories: Number(serving.calories),
        })),
      };
    },
  };
}

export function registerFatSecretRoutes(app: Express, authenticate: (req: Request, res: Response) => Promise<AccessActor | null>,
  client = createFatSecretClient({ clientId: process.env.FATSECRET_CLIENT_ID, clientSecret: process.env.FATSECRET_CLIENT_SECRET })) {
  const limiter = rateLimit({
    windowMs: 60_000, limit: 60, standardHeaders: true, legacyHeaders: false,
    message: { error: "Too many food lookups. Please wait a minute and try again." },
  });
  app.post("/api/nutrition/food-lookup", limiter, async (req, res) => {
    try {
      const actor = await authenticate(req, res);
      if (!actor) { if (!res.headersSent) res.status(401).json({ error: "Authentication required." }); return; }
      if (!isNutritionAccount(actor) && !("role" in actor && ["clinician", "owner"].includes(actor.role))) {
        res.status(403).json({ error: "Nutrition or clinician access required." }); return;
      }
      const input = z.discriminatedUnion("action", [
        z.object({ action: z.literal("search"), query: z.string().trim().min(2).max(100) }).strict(),
        z.object({ action: z.literal("food"), id: z.string().regex(/^\d{1,20}$/) }).strict(),
      ]).safeParse(req.body);
      if (!input.success) { res.status(400).json({ error: "Enter a valid food search or food ID." }); return; }
      res.setHeader("Cache-Control", "private, no-store");
      res.json(input.data.action === "search" ? await client.search(input.data.query) : await client.food(input.data.id));
    } catch (error) {
      if (error instanceof FoodLookupError) res.status(error.status).json({ error: error.message });
      else { console.error("Food lookup failed"); res.status(500).json({ error: "Food lookup failed. Please try again." }); }
    }
  });
}

import assert from "node:assert/strict";
import test from "node:test";
import express from "express";
import { createServer } from "node:http";
import { createFatSecretClient, FoodLookupError, registerFatSecretRoutes } from "./fatsecret";
import { registerNutritionAccess } from "./nutrition-access";
import type { AccessActor } from "./clinical-access";

test("Basic OAuth, search and serving lookup use server credentials and normalize single and multiple results", async () => {
  const calls: { url: string; init?: RequestInit }[] = [];
  const fetcher: typeof fetch = async (input, init) => {
    calls.push({ url: String(input), init });
    if (String(input).includes("connect/token"))
      return Response.json({ access_token: "test-token", expires_in: 3600 });
    const body = new URLSearchParams(String(init?.body));
    if (body.get("method") === "foods.search")
      return Response.json({ foods: { food: { food_id: "10", food_name: "Rice", food_description: "Per 100 g" } } });
    return Response.json({ food: { food_id: "10", food_name: "Rice", servings: { serving: [
      { serving_id: "1", serving_description: "100 g", calories: "130" },
      { serving_id: "2", serving_description: "1 cup", calories: "205" },
    ] } } });
  };
  const client = createFatSecretClient({ clientId: "test-id", clientSecret: "test-secret", fetcher });
  assert.deepEqual(await client.search("rice"), [{ id: "10", name: "Rice", brand: "", description: "Per 100 g" }]);
  assert.deepEqual(await client.food("10"), { id: "10", name: "Rice", brand: "", servings: [
    { id: "1", description: "100 g", calories: 130 }, { id: "2", description: "1 cup", calories: 205 },
  ] });
  assert.equal(calls.length, 3);
  assert.equal(new URLSearchParams(String(calls[0].init?.body)).get("scope"), "basic");
  assert.equal(new URLSearchParams(String(calls[1].init?.body)).get("search_expression"), "rice");
  assert.equal(new URLSearchParams(String(calls[2].init?.body)).get("food_id"), "10");
  assert.equal(new Headers(calls[1].init?.headers).get("Authorization"), "Bearer test-token");
});

test("missing credentials, malformed responses, upstream errors and empty results are explicit", async () => {
  await assert.rejects(createFatSecretClient({}).search("rice"), (err: unknown) => err instanceof FoodLookupError && err.status === 503);
  const client = (body: unknown) => createFatSecretClient({ clientId: "id", clientSecret: "secret", fetcher: async (input) =>
    String(input).includes("connect/token") ? Response.json({ access_token: "token", expires_in: 3600 }) : Response.json(body) });
  assert.deepEqual(await client({ foods: {} }).search("rice"), []);
  await assert.rejects(client({ error: { code: 4 } }).search("rice"), FoodLookupError);
  await assert.rejects(client({ food: { food_id: "1", food_name: "Rice", servings: { serving: {
    serving_id: "1", serving_description: "cup", calories: "unknown",
  } } } }).food("1"), FoodLookupError);
});

test("food lookup is authenticated, scoped to nutrition or clinicians and validates the request", async () => {
  const actors: Record<string, AccessActor> = {
    nutrition: { userId: "n", role: "nutritionist" }, doctor: { userId: "d", role: "clinician" },
    patient: { patientId: 7 }, reception: { userId: "r", role: "staff", username: "reception" },
  };
  const authenticate = async (req: express.Request) => actors[String(req.headers.authorization)] ?? null;
  const app = express(); app.use(express.json());
  registerNutritionAccess(app, authenticate, {
    patients: async () => new Set(), recordPatient: async () => 7, nutritionReferral: async () => false,
  });
  let lookups = 0;
  registerFatSecretRoutes(app, authenticate, {
    search: async (query) => { lookups++; return [{ id: "1", name: query, brand: "", description: "" }]; },
    food: async (id) => ({ id, name: "Rice", brand: "", servings: [{ id: "2", description: "cup", calories: 200 }] }),
  });
  const server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address(); assert.ok(address && typeof address !== "string");
  const request = (actor: string, body: unknown) => fetch(`http://127.0.0.1:${address.port}/api/nutrition/food-lookup`, {
    method: "POST", headers: { Authorization: actor, "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  try {
    assert.equal((await request("nutrition", { action: "search", query: "rice" })).status, 200);
    assert.equal((await request("doctor", { action: "food", id: "1" })).status, 200);
    assert.equal((await request("patient", { action: "search", query: "rice" })).status, 403);
    assert.equal((await request("reception", { action: "search", query: "rice" })).status, 403);
    assert.equal((await request("invalid", { action: "search", query: "rice" })).status, 401);
    assert.equal((await request("nutrition", { action: "search", query: "r", patientId: 7 })).status, 400);
    assert.equal((await request("nutrition", { action: "food", id: "abc" })).status, 400);
    assert.equal(lookups, 1);
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});

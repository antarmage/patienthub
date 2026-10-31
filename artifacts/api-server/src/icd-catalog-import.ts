import { z } from "zod/v4";
import { icdCodeSchema } from "../../../lib/db/src/icd";
import { db, pool, ensureSchema } from "./db";
import { icdCatalog } from "@workspace/db";

const release = "2019";
const root = `https://id.who.int/icd/release/10/${release}`;
const languageText = z.object({ "@value": z.string() });
const entitySchema = z.object({
  code: z.string().nullable().optional(),
  title: languageText,
  child: z.array(z.string()).nullable().optional(),
  classKind: z.string().nullable().optional(),
  inclusion: z.array(z.object({ label: languageText.optional() }).passthrough()).nullable().optional(),
  indexTerm: z.array(z.object({ label: languageText.optional() }).passthrough()).nullable().optional(),
});

export function whoCatalogUrl(uri: string) {
  const url = new URL(uri);
  if (!["http:", "https:"].includes(url.protocol) || url.hostname !== "id.who.int" || url.username || url.password
    || !(url.pathname === `/icd/release/10/${release}` || url.pathname.startsWith(`/icd/release/10/${release}/`))
    || url.search || url.hash) throw new Error("WHO catalog returned an unexpected entity URL");
  url.protocol = "https:";
  return url.href;
}

export function catalogRow(raw: unknown) {
  const entity = entitySchema.parse(raw);
  const children = (entity.child || []).map(whoCatalogUrl);
  const code = icdCodeSchema.safeParse(entity.code);
  return {
    children,
    row: entity.classKind === "category" && code.success ? {
      code: code.data, title: entity.title["@value"], release, leaf: children.length === 0,
      terms: [...(entity.inclusion || []), ...(entity.indexTerm || [])].flatMap((term) => term.label ? [term.label["@value"]] : []).join(" "),
    } : null,
  };
}

export async function downloadWhoCatalog() {
  const clientId = process.env.WHO_ICD_CLIENT_ID;
  const clientSecret = process.env.WHO_ICD_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("WHO_ICD_CLIENT_ID and WHO_ICD_CLIENT_SECRET must be configured on the server");
  let token = "";
  let expiresAt = 0;
  const refreshToken = async () => {
    const response = await fetch("https://icdaccessmanagement.who.int/connect/token", {
      method: "POST", redirect: "error", signal: AbortSignal.timeout(30_000),
      headers: { Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ grant_type: "client_credentials", scope: "icdapi_access" }),
    });
    if (!response.ok) throw new Error(`WHO authentication failed (${response.status}); check server credentials`);
    const data = z.object({ access_token: z.string().min(1), expires_in: z.number().positive() }).parse(await response.json());
    token = data.access_token;
    expiresAt = Date.now() + data.expires_in * 1000 - 60_000;
  };
  await refreshToken();
  const pending = [root];
  const visited = new Set<string>();
  const rows = new Map<string, NonNullable<ReturnType<typeof catalogRow>["row"]>>();
  while (pending.length) {
    if (Date.now() >= expiresAt) await refreshToken();
    const batch = pending.splice(0, 4).filter((uri) => !visited.has(uri));
    batch.forEach((uri) => visited.add(uri));
    const entities = await Promise.all(batch.map(async (uri) => {
      const response = await fetch(whoCatalogUrl(uri), {
        redirect: "error", signal: AbortSignal.timeout(30_000),
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json", "Accept-Language": "en", "API-Version": "v2" },
      });
      if (!response.ok) throw new Error(`WHO catalog request failed (${response.status}); import aborted, existing catalog preserved`);
      return catalogRow(await response.json());
    }));
    for (const entity of entities) {
      if (entity.row) {
        const existing = rows.get(entity.row.code);
        if (existing && existing.title !== entity.row.title) throw new Error("WHO catalog contains conflicting code titles");
        rows.set(entity.row.code, entity.row);
      }
      pending.push(...entity.children.filter((uri) => !visited.has(uri)));
    }
    if (visited.size > 100_000) throw new Error("WHO catalog traversal exceeded safety limit; import aborted");
    if (visited.size % 200 === 0) console.log(`Fetched ${visited.size} catalog entities`);
  }
  if (!rows.size) throw new Error("WHO returned an empty catalog");
  return [...rows.values()];
}

async function main() {
  if (!process.argv.includes("--import")) return;
  try {
    console.log("Importing WHO ICD-10 2019 English catalog; no patient data is sent to WHO.");
    const rows = await downloadWhoCatalog();
    await ensureSchema();
    await db.transaction(async (tx) => {
      await tx.execute("SELECT pg_advisory_xact_lock(104102019)");
      await tx.delete(icdCatalog);
      for (let index = 0; index < rows.length; index += 500) await tx.insert(icdCatalog).values(rows.slice(index, index + 500));
    });
    console.log(`Imported ${rows.length} WHO ICD-10 categories atomically. Local search is ready.`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : "ICD catalog import failed");
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

await main();

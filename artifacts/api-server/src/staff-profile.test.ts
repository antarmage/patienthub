import assert from "node:assert/strict";
import test from "node:test";
import { createServer } from "node:http";
import express from "express";
import { registerStaffProfileRoutes, type StaffProfileStore } from "./staff-profile";

const photo = `data:image/jpeg;base64,${Buffer.from([255, 216, 255, 224, 0, 16, 255, 217]).toString("base64")}`;

test("staff photos are private, scoped to self/owner, consent validated and independent of face enrollment", async () => {
  const photos = new Map<string, string>();
  const writes: unknown[][] = [];
  const store: StaffProfileStore = {
    async get(id) { return id === "missing" ? null : { name: `Account ${id}`, photo: photos.get(id) || null }; },
    async save(id, image, owner) {
      writes.push([id, image, owner]);
      if (id === "missing") return false;
      photos.set(id, image); return true;
    },
    async remove(id) { if (id === "missing") return false; photos.delete(id); return true; },
  };
  const app = express();
  app.use(express.json({ limit: "2mb" }));
  registerStaffProfileRoutes(app, async (req) => {
    const role = req.headers["x-role"];
    if (typeof role !== "string") return null;
    return role === "patient" ? { patientId: 1 } : { userId: `${role}-1`, role };
  }, store);
  const server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const request = (path: string, role?: string, method = "GET", body?: unknown) => fetch(`http://127.0.0.1:${address.port}/api/${path}`, {
    method, headers: { ...(role ? { "x-role": role } : {}), "Content-Type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  try {
    assert.equal((await request("staff/profile")).status, 401);
    assert.equal((await request("staff/profile", "patient")).status, 403);
    assert.equal((await request("staff/profile", "unknown")).status, 403);
    for (const role of ["staff", "receptionist", "nurse", "clinician", "owner", "admin"]) {
      const response = await request("staff/profile?employeeId=other", role);
      assert.equal(response.status, 200);
      assert.equal(response.headers.get("cache-control"), "private, no-store");
      assert.deepEqual(await response.json(), { name: `Account ${role}-1`, photo: null });
    }
    const url = "owner/staff-accounts/staff-1/photo";
    for (const role of [undefined, "staff", "receptionist", "patient", "admin", "clinician", "nurse"]) {
      for (const method of ["GET", "PUT", "DELETE"]) {
        assert.equal((await request(url, role, method, method === "PUT" ? { photo, consentConfirmed: true } : undefined)).status, role ? 403 : 401);
      }
    }
    assert.equal(writes.length, 0);
    const invalidPhotos = [
      { photo }, { photo, consentConfirmed: false }, { photo, consentConfirmed: true, employeeId: "other" },
      { photo: "https://example.com/photo.jpg", consentConfirmed: true },
      { photo: "data:image/svg+xml;base64,PHN2Zz4=", consentConfirmed: true },
      { photo: "data:image/jpeg;base64,aGVsbG8=", consentConfirmed: true },
      { photo: "data:image/jpeg;base64,%%%%", consentConfirmed: true },
      { photo: photo.slice(0, -4), consentConfirmed: true },
      { photo: `data:image/jpeg;base64,${Buffer.alloc(512 * 1024 + 1, 1).toString("base64")}`, consentConfirmed: true },
    ];
    for (const body of invalidPhotos) assert.equal((await request(url, "owner", "PUT", body)).status, 400);
    assert.equal(writes.length, 0);
    assert.equal((await request(url, "owner", "PUT", { photo, consentConfirmed: true })).status, 200);
    assert.deepEqual(writes, [["staff-1", photo, "owner-1"]]);
    assert.deepEqual(await (await request(url, "owner")).json(), { name: "Account staff-1", photo });
    assert.deepEqual(await (await request("staff/profile", "staff")).json(), { name: "Account staff-1", photo });
    assert.deepEqual(await (await request("staff/profile", "receptionist")).json(), { name: "Account receptionist-1", photo: null });
    assert.equal((await request(url, "owner", "DELETE")).status, 200);
    assert.deepEqual(await (await request("staff/profile", "staff")).json(), { name: "Account staff-1", photo: null });
    for (const method of ["GET", "PUT", "DELETE"]) {
      assert.equal((await request("owner/staff-accounts/missing/photo", "owner", method, method === "PUT" ? { photo, consentConfirmed: true } : undefined)).status, 404);
    }
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});

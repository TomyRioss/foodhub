import assert from "node:assert/strict";
import { after, test } from "node:test";
import { randomUUID } from "node:crypto";
import { encode } from "next-auth/jwt";
import { backend, upsertOrder, getOrders, updateOrderStatus, acquireScanLock } from "../lib/pocketbase.ts";

// Only this test's temporary orders are deleted; real orders are preserved.
const ids = new Set();
const prefix = `qa-${randomUUID()}`;
const order = {
  platform: "doordash", orderId: prefix, gmailMessageId: prefix,
  customer: "QA temporal", restaurant: "Verificación temporal",
  receivedAt: new Date().toISOString(), status: "pending", items: [],
  currency: "USD", subject: "QA temporal", warning: "PDF pendiente",
};
after(async () => {
  const pb = await backend();
  for (const id of ids) {
    const record = await pb.collection("orders").getOne(id);
    assert.ok(record.orderId.startsWith(prefix));
    await pb.collection("orders").delete(id);
  }
});

test("real PocketBase dedup preserves Kanban status and recovers a partial PDF", async () => {
  const initial = await upsertOrder(order); ids.add(initial.order.id);
  assert.equal(initial.created, true);
  assert.equal(initial.order.total, undefined);
  await updateOrderStatus(initial.order.id, "preparing");
  const recovered = await upsertOrder({ ...order, items: [{ name: "QA temporal", quantity: 1, options: [] }], total: 24.02, pdfText: "QA test PDF extraction", warning: "" });
  assert.equal(recovered.created, false);
  assert.equal(recovered.order.id, initial.order.id);
  assert.equal(recovered.order.status, "preparing");
  assert.equal(recovered.order.total, 24.02);
  assert.equal(recovered.order.items.length, 1);
  const duplicates = await Promise.all([upsertOrder(order), upsertOrder(order)]);
  assert.ok(duplicates.every(item => !item.created && item.order.status === "preparing"));
  const records = (await getOrders()).filter(item => item.orderId === prefix);
  assert.equal(records.length, 1);
});

test("scan lock rejects overlapping imports and releases its own lease", async () => {
  const lock = await acquireScanLock();
  assert.ok(lock, "Run integration checks when no real Gmail scan is active");
  try { assert.equal(await acquireScanLock(), null); await lock.renew(); }
  finally { await lock.release(); }
});

test("orders API requires a session, validates origin and persists statuses", async () => {
  const origin = process.env.AUTH_TEST_URL ?? "http://localhost:3000";
  const token = await encode({ token: { email: "atuantojofl@gmail.com", sub: "local-qa" }, secret: process.env.AUTH_SECRET, salt: "authjs.session-token", maxAge: 3600 });
  const cookie = `authjs.session-token=${token}`;
  assert.equal((await fetch(`${origin}/api/orders`)).status, 401);
  const pb = await backend();
  const anonymous = await fetch(`${process.env.POCKETBASE_URL}/api/collections/orders/records`);
  assert.ok(anonymous.status === 403 || anonymous.status === 404);
  const id = [...ids][0];
  const patch = (status, requestOrigin = origin) => fetch(`${origin}/api/orders/${id}`, { method: "PATCH", headers: { cookie, Origin: requestOrigin, "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
  assert.equal((await patch("completed", "https://attacker.example")).status, 403);
  assert.equal((await patch("invalid")).status, 400);
  for (const status of ["pending", "preparing", "sent", "completed"]) {
    const result = await patch(status); assert.equal(result.status, 200);
    assert.equal((await result.json()).order.status, status);
    assert.equal((await pb.collection("orders").getOne(id)).status, status);
  }
  const response = await fetch(`${origin}/api/orders`, { headers: { cookie } });
  const data = await response.json();
  assert.equal(response.status, 200);
  assert.ok(!JSON.stringify(data).includes("refreshToken"));
  const sync = await fetch(`${origin}/api/sync`, { method: "POST", headers: { cookie, Origin: origin, "Content-Type": "application/json" }, body: JSON.stringify({ days: 2 }) });
  assert.equal(sync.status, 400);
});

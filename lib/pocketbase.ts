import "server-only";
import PocketBase, { ClientResponseError } from "pocketbase";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import type { GmailIntegration, Order } from "@/lib/order-types";

export async function backend() {
  const url = process.env.POCKETBASE_URL;
  const email = process.env.POCKETBASE_ADMIN_EMAIL;
  const password = process.env.POCKETBASE_ADMIN_PASSWORD;
  if (!url || !email || !password) throw new Error("Falta configurar la conexión con PocketBase.");
  const pb = new PocketBase(url);
  pb.autoCancellation(false);
  await pb.collection("_superusers").authWithPassword(email, password);
  return pb;
}

function encryptionKey() {
  if (!process.env.AUTH_SECRET) throw new Error("Falta el secreto de sesión.");
  return createHash("sha256").update(`foodhub:gmail:${process.env.AUTH_SECRET}`).digest();
}

function encrypt(value: GmailIntegration) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const data = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), data]).toString("base64");
}

function decrypt(value: string): GmailIntegration {
  const data = Buffer.from(value, "base64");
  const cipher = createDecipheriv("aes-256-gcm", encryptionKey(), data.subarray(0, 12));
  cipher.setAuthTag(data.subarray(12, 28));
  return JSON.parse(Buffer.concat([cipher.update(data.subarray(28)), cipher.final()]).toString("utf8"));
}

function missing(error: unknown) {
  return error instanceof ClientResponseError && error.status === 404;
}

export async function getIntegration(): Promise<GmailIntegration | null> {
  const pb = await backend();
  try {
    const record = await pb.collection("integrations").getFirstListItem('key="gmail"');
    return decrypt(record.encryptedTokens);
  } catch (error) {
    if (missing(error)) return null;
    throw error;
  }
}

export async function saveIntegration(value: GmailIntegration): Promise<void> {
  const pb = await backend();
  const data = { key: "gmail", encryptedTokens: encrypt(value) };
  try {
    const record = await pb.collection("integrations").getFirstListItem('key="gmail"');
    await pb.collection("integrations").update(record.id, data);
  } catch (error) {
    if (!missing(error)) throw error;
    try {
      await pb.collection("integrations").create(data);
    } catch (createError) {
      // Concurrent reconnects still target the singleton integration.
      const record = await pb.collection("integrations").getFirstListItem('key="gmail"').catch(() => null);
      if (!record) throw createError;
      await pb.collection("integrations").update(record.id, data);
    }
  }
}

export async function getOrders(): Promise<Order[]> {
  const pb = await backend();
  const records = await pb.collection("orders").getFullList<Order & { hasTotal: boolean }>({ sort: "-receivedAt" });
  return records.map(normalizeOrder);
}

export async function deleteAllOrders(): Promise<{ deleted: number; failed: number }> {
  const pb = await backend();
  const records = await pb.collection("orders").getFullList<{ id: string }>({ fields: "id" });
  let deleted = 0;
  let failed = 0;
  for (const record of records) {
    try {
      await pb.collection("orders").delete(record.id);
      deleted++;
    } catch {
      failed++;
    }
  }
  return { deleted, failed };
}

function normalizeOrder(record: Order & { hasTotal?: boolean }): Order {
  return { ...record, items: record.items ?? [], total: record.hasTotal ? record.total : undefined };
}

export async function upsertOrder(input: Order): Promise<{ order: Order; created: boolean }> {
  const pb = await backend();
  const filter = pb.filter("platform={:platform} && orderId={:orderId}", input);
  async function existing() {
    return normalizeOrder(await pb.collection("orders").getFirstListItem<Order & { hasTotal: boolean }>(filter));
  }
  try {
    const record = await existing();
    // A repeated scan can recover a failed PDF without moving the Kanban card.
    if ((!record.items?.length || record.warning) && input.items?.length && !input.warning) {
      const order = await pb.collection("orders").update<Order>(record.id!, { ...input, hasTotal: typeof input.total === "number", status: record.status, id: undefined });
      return { order: normalizeOrder(order), created: false };
    }
    return { order: record, created: false };
  } catch (error) {
    if (!missing(error)) throw error;
  }
  try {
    const order = await pb.collection("orders").create<Order>({ ...input, hasTotal: typeof input.total === "number", id: undefined });
    return { order: normalizeOrder(order), created: true };
  } catch (error) {
    const order = await existing().catch(() => null);
    if (order) return { order, created: false };
    throw error;
  }
}

export async function updateOrderStatus(id: string, status: Order["status"]): Promise<Order> {
  const pb = await backend();
  return normalizeOrder(await pb.collection("orders").update<Order>(id, { status }));
}

export async function acquireScanLock() {
  const pb = await backend();
  const locks = pb.collection("sync_locks");
  const existing = await locks.getFirstListItem('key="gmail"').catch((error) => {
    if (missing(error)) return null;
    throw error;
  });
  if (existing && new Date(existing.leaseExpiresAt).getTime() > Date.now()) return null;
  if (existing) await locks.delete(existing.id).catch((error) => { if (!missing(error)) throw error; });
  try {
    const lease = await locks.create({ key: "gmail", leaseExpiresAt: new Date(Date.now() + 600_000).toISOString() });
    return {
      async renew() { await locks.update(lease.id, { leaseExpiresAt: new Date(Date.now() + 600_000).toISOString() }); },
      async release() { await locks.delete(lease.id).catch((error) => { if (!missing(error)) throw error; }); },
    };
  } catch (error) {
    const locked = await locks.getFirstListItem('key="gmail"').catch(() => null);
    if (locked) return null;
    throw error;
  }
}

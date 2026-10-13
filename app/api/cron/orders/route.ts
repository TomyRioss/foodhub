import { timingSafeEqual } from "node:crypto";
import { acquireScanLock, getIntegration } from "@/lib/pocketbase";
import { scanOrders } from "@/lib/import-orders";
import type { ImportEvent } from "@/lib/order-types";

function matchesCronSecret(request: Request, expected: string) {
  const token = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return false;
  const actualBytes = Buffer.from(token);
  const expectedBytes = Buffer.from(expected);
  return actualBytes.length === expectedBytes.length && timingSafeEqual(actualBytes, expectedBytes);
}

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return Response.json({ error: "Tarea automática no configurada." }, { status: 503 });
  if (!matchesCronSecret(request, secret)) return Response.json({ error: "No autorizado." }, { status: 401 });

  let lock: Awaited<ReturnType<typeof acquireScanLock>> = null;
  let renewal: ReturnType<typeof setInterval> | undefined;
  const abort = new AbortController();
  const abortRequest = () => abort.abort();
  request.signal.addEventListener("abort", abortRequest, { once: true });
  try {
    const integration = await getIntegration();
    if (!integration?.refreshToken || !integration.scope.includes("gmail.readonly")) {
      return Response.json({ error: "Conectá Gmail y autorizá la lectura de correos." }, { status: 409 });
    }

    lock = await acquireScanLock();
    if (!lock) return Response.json({ status: "skipped", reason: "scan_in_progress" });

    const lastSync = integration.lastSyncedAt ? new Date(integration.lastSyncedAt).getTime() : NaN;
    const since = Number.isFinite(lastSync)
      ? Math.max(lastSync - 60_000, Date.now() - 30 * 86400_000)
      : Date.now() - 86400_000;
    let leaseLost = false;
    renewal = setInterval(() => {
      void lock!.renew().catch(() => {
        leaseLost = true;
        abort.abort();
      });
    }, 60_000);

    let completed: ImportEvent | undefined;
    for await (const event of scanOrders({ since, signal: abort.signal })) {
      if (event.type === "done") completed = event;
    }
    if (leaseLost || !completed || completed.type !== "done") throw new Error("Scan did not complete.");
    if (completed.errors) {
      return Response.json({ status: "partial", scanned: completed.scanned, created: completed.created, errors: completed.errors }, { status: 503 });
    }
    return Response.json({ status: "ok", scanned: completed.scanned, created: completed.created });
  } catch {
    return Response.json({ error: "No se pudo completar la sincronización automática." }, { status: 503 });
  } finally {
    if (renewal) clearInterval(renewal);
    request.signal.removeEventListener("abort", abortRequest);
    await lock?.release().catch(() => undefined);
  }
}

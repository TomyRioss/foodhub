import { apiSession, validMutationOrigin } from "@/lib/api-session";
import { acquireScanLock, getIntegration } from "@/lib/pocketbase";
import { scanOrders } from "@/lib/import-orders";
import type { ImportEvent } from "@/lib/order-types";

export async function POST(request: Request) {
  if (!(await apiSession())) return Response.json({ error: "Iniciá sesión para analizar Gmail." }, { status: 401 });
  if (!validMutationOrigin(request)) return Response.json({ error: "Origen no autorizado." }, { status: 403 });
  let body: { days?: number; mode?: string };
  try { body = await request.json(); } catch { return Response.json({ error: "Solicitud inválida." }, { status: 400 }); }
  if (!body || !(body.days === 30 || body.days === 1 || body.mode === "recent")) {
    return Response.json({ error: "Elegí análisis de 30 días o actualización reciente." }, { status: 400 });
  }
  try {
    const integration = await getIntegration();
    if (!integration?.refreshToken || !integration.scope.includes("gmail.readonly")) {
      return Response.json({ error: "Conectá Gmail y autorizá la lectura de correos antes de analizar." }, { status: 409 });
    }
    const lock = await acquireScanLock();
    if (!lock) return Response.json({ error: "Ya hay un análisis en curso. Esperá a que termine." }, { status: 409 });
    const lastSync = integration.lastSyncedAt ? new Date(integration.lastSyncedAt).getTime() : NaN;
    const since = body.days === 30 ? Date.now() - 30 * 86400_000
      : Number.isFinite(lastSync) ? Math.max(lastSync - 60_000, Date.now() - 30 * 86400_000) : Date.now() - 86400_000;
    const abort = new AbortController();
    const encoder = new TextEncoder();
    let alive = true;
    let counts = { scanned: 0, matched: 0, created: 0, duplicates: 0, errors: 0 };
    const onAbort = () => abort.abort();
    request.signal.addEventListener("abort", onAbort, { once: true });
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        function send(event: ImportEvent) {
          if (alive) controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        }
        const heartbeat = setInterval(() => {
          if (alive) controller.enqueue(encoder.encode(": heartbeat\n\n"));
        }, 15_000);
        const renewal = setInterval(() => { void lock.renew().catch(() => abort.abort()); }, 60_000);
        try {
          for await (const event of scanOrders({ since, signal: abort.signal })) {
            counts = { scanned: event.scanned, matched: event.matched, created: event.created, duplicates: event.duplicates, errors: event.errors };
            if (abort.signal.aborted) break;
            send(event);
          }
        } catch (error) {
          if (!abort.signal.aborted) {
            const text = error instanceof Error ? error.message : "";
            const message = /Gmail|autorización|Reconect|Habilit|límite|Conect/.test(text)
              ? text : "No se pudo terminar el análisis. Reintentá: los pedidos importados no se duplicarán.";
            send({ type: "error", ...counts, errors: counts.errors + 1, message });
          }
        } finally {
          clearInterval(heartbeat); clearInterval(renewal);
          request.signal.removeEventListener("abort", onAbort);
          await lock.release().catch(() => undefined);
          if (alive) { alive = false; controller.close(); }
        }
      },
      cancel() { alive = false; abort.abort(); },
    });
    return new Response(stream, { headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    } });
  } catch {
    return Response.json({ error: "No se pudo iniciar el análisis. Revisá la conexión con PocketBase y reintentá." }, { status: 503 });
  }
}

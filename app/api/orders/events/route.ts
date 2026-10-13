import { apiSession } from "@/lib/api-session";
import { subscribeToOrderCreates } from "@/lib/pocketbase-realtime";

export async function GET(request: Request) {
  if (!(await apiSession())) return Response.json({ error: "Iniciá sesión para recibir pedidos." }, { status: 401 });

  const encoder = new TextEncoder();
  let controller: ReadableStreamDefaultController<Uint8Array> | undefined;
  let unsubscribe: (() => Promise<void>) | undefined;
  let heartbeat: ReturnType<typeof setInterval> | undefined;
  let maxLifetime: ReturnType<typeof setTimeout> | undefined;
  let closed = false;

  const cleanup = async (closeStream = false) => {
    if (closed) return;
    closed = true;
    if (heartbeat) clearInterval(heartbeat);
    if (maxLifetime) clearTimeout(maxLifetime);
    request.signal.removeEventListener("abort", onAbort);
    await unsubscribe?.().catch(() => undefined);
    unsubscribe = undefined;
    if (closeStream) {
      try { controller?.close(); } catch { /* Stream already closed. */ }
    }
  };
  const onAbort = () => { void cleanup(); };
  const send = (event: string, data = "{}") => {
    if (closed || !controller) return;
    try { controller.enqueue(encoder.encode(`event: ${event}\ndata: ${data}\n\n`)); }
    catch { void cleanup(); }
  };

  const stream = new ReadableStream<Uint8Array>({
    async start(streamController) {
      controller = streamController;
      request.signal.addEventListener("abort", onAbort, { once: true });
      if (request.signal.aborted) return void cleanup();
      controller.enqueue(encoder.encode("retry: 10000\n\n: connecting\n\n"));
      heartbeat = setInterval(() => {
        if (!closed) {
          try { controller?.enqueue(encoder.encode(": heartbeat\n\n")); }
          catch { void cleanup(); }
        }
      }, 15_000);
      try {
        unsubscribe = await subscribeToOrderCreates(() => send("order"));
        if (closed) return void await unsubscribe();
        maxLifetime = setTimeout(() => { void cleanup(true); }, 5 * 60_000);
        send("ready");
      } catch {
        send("unavailable");
        await cleanup(true);
      }
    },
    async cancel() { await cleanup(); },
  });

  return new Response(stream, { headers: {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    "X-Accel-Buffering": "no",
  } });
}

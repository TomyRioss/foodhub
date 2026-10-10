import { apiSession, validMutationOrigin } from "@/lib/api-session";
import { acquireScanLock, deleteAllOrders, getIntegration, getOrders } from "@/lib/pocketbase";

export async function GET() {
  if (!(await apiSession())) return Response.json({ error: "Iniciá sesión para ver pedidos." }, { status: 401 });
  try {
    const [orders, integration] = await Promise.all([getOrders(), getIntegration()]);
    return Response.json({ orders, gmailConnected: Boolean(integration?.refreshToken && integration.scope.includes("gmail.readonly")) }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return Response.json({ error: "No se pudo conectar con PocketBase. Reintentá en unos segundos." }, { status: 503 });
  }
}

export async function DELETE(request: Request) {
  if (!(await apiSession())) return Response.json({ error: "Iniciá sesión para eliminar pedidos." }, { status: 401 });
  if (!validMutationOrigin(request)) return Response.json({ error: "Origen no autorizado." }, { status: 403 });
  let body: { confirm?: boolean };
  try { body = await request.json(); } catch { return Response.json({ error: "Solicitud inválida." }, { status: 400 }); }
  if (!body || body.confirm !== true) return Response.json({ error: "Confirmá la eliminación de todos los pedidos." }, { status: 400 });

  let lock: Awaited<ReturnType<typeof acquireScanLock>> = null;
  try {
    lock = await acquireScanLock();
    if (!lock) return Response.json({ error: "Hay un análisis de Gmail en curso. Esperá a que termine y reintentá." }, { status: 409 });
    return Response.json(await deleteAllOrders());
  } catch {
    return Response.json({ error: "No se pudieron eliminar los pedidos. Reintentá." }, { status: 503 });
  } finally {
    await lock?.release().catch(() => undefined);
  }
}

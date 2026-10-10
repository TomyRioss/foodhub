import { apiSession, validMutationOrigin } from "@/lib/api-session";
import { updateOrderStatus } from "@/lib/pocketbase";
import { ClientResponseError } from "pocketbase";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await apiSession())) return Response.json({ error: "Iniciá sesión para actualizar pedidos." }, { status: 401 });
  if (!validMutationOrigin(request)) return Response.json({ error: "Origen no autorizado." }, { status: 403 });
  let body: { status?: string };
  try { body = await request.json(); } catch { return Response.json({ error: "Solicitud inválida." }, { status: 400 }); }
  if (!body || !["pending", "preparing", "sent", "completed"].includes(body.status ?? "")) {
    return Response.json({ error: "Estado de pedido inválido." }, { status: 400 });
  }
  const { id } = await params;
  if (!/^[a-z0-9]{15}$/.test(id)) return Response.json({ error: "Pedido inválido." }, { status: 400 });
  try {
    const order = await updateOrderStatus(id, body.status as "pending" | "preparing" | "sent" | "completed");
    return Response.json({ order });
  } catch (error) {
    return Response.json({ error: "No se pudo actualizar el pedido. Reintentá." }, {
      status: error instanceof ClientResponseError && error.status === 404 ? 404 : 503,
    });
  }
}

import { Suspense } from "react";
import { OrderDetail } from "@/components/order-detail";
import { requireSession } from "@/lib/require-session";

export default function OrderPage({ params }: PageProps<"/pedido/[id]">) {
  return <Suspense fallback={<main className="app-loading" role="status">Cargando pedido…</main>}><ProtectedOrderPage params={params} /></Suspense>;
}

async function ProtectedOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const [session, { id }] = await Promise.all([requireSession(), params]);
  return <OrderDetail id={id} email={session.user?.email ?? "atuantojofl@gmail.com"} />;
}

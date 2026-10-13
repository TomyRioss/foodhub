"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ORDER_STATUSES, type Order, type OrderStatus } from "@/lib/order-types";

const labels: Record<OrderStatus, string> = { pending: "Pendiente", preparing: "Preparación", sent: "Enviado", completed: "Completado" };
const money = (order: Order) => order.total === undefined ? "Total sin detalle" : new Intl.NumberFormat("en-US", { style: "currency", currency: order.currency }).format(order.total);
const timestamp = (value: string) => new Intl.DateTimeFormat("es", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));

export function OrderDetail({ id, email }: { id: string; email: string }) {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const aborter = new AbortController();
    void fetch("/api/orders", { cache: "no-store", signal: aborter.signal }).then(async response => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No se pudo cargar el pedido.");
      const found = (data.orders as Order[]).find(item => item.id === id);
      if (!found) throw new Error("No encontramos ese pedido. Puede que se haya eliminado.");
      setOrder(found);
    }).catch(cause => {
      if (!aborter.signal.aborted) setError(cause instanceof Error ? cause.message : "No se pudo cargar el pedido.");
    }).finally(() => { if (!aborter.signal.aborted) setLoading(false); });
    return () => aborter.abort();
  }, [id]);

  async function changeStatus(status: OrderStatus) {
    if (!order?.id || saving || status === order.status) return;
    setSaving(true); setError("");
    try {
      const response = await fetch(`/api/orders/${encodeURIComponent(order.id)}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No se pudo guardar el estado.");
      setOrder(current => current ? { ...current, status } : current);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo guardar el estado."); }
    finally { setSaving(false); }
  }

  if (loading) return <div className="order-page"><p role="status">Cargando pedido…</p></div>;
  if (error && !order) return <div className="order-page"><p className="message error-message" role="alert">{error}</p><Link className="back-link" href="/">Volver a Inicio</Link></div>;
  if (!order) return null;

  return <main className="order-page">
    <Link className="back-link" href="/">← Volver a Inicio</Link>
    <article className="order-detail-card">
      <header className="order-detail-heading">
        <div><span className="brand-caption">Marca · {order.restaurant || "Sin marca"}</span><h1>Pedido #{order.orderId}</h1><p>Recibido {timestamp(order.receivedAt)}</p></div>
        <div className="portal-logo portal-doordash" aria-label="Pedido de DoorDash"><span aria-hidden="true">D</span> DoorDash</div>
      </header>
      {error && <p className="message error-message" role="alert">{error}</p>}
      <section className="detail-customer"><h2>{order.customer}</h2><p>{order.restaurant}</p>{order.pickupTime && <strong>Retiro: {order.pickupTime}</strong>}</section>
      <section className="detail-products"><h2>Productos</h2>{order.items.length ? order.items.map((item, index) => <div className="detail-item" key={`${item.name}-${index}`}>
        <span className="item-quantity">{item.quantity}×</span><div><strong>{item.name}</strong>{item.options.map((option, optionIndex) => <p key={optionIndex}>{option}</p>)}</div>{item.price !== undefined && <span>{new Intl.NumberFormat("en-US", { style: "currency", currency: order.currency }).format(item.price)}</span>}
      </div>) : <p>No se pudo extraer el detalle de productos. Revisá el correo original.</p>}</section>
      {order.warning && <p className="detail-warning">{order.warning}</p>}
      <div className="detail-total"><span>Total</span><strong>{money(order)}</strong></div>
      <label className="detail-status">Estado del pedido<select className={`status-select status-${order.status}`} value={order.status} disabled={saving} onChange={event => void changeStatus(event.target.value as OrderStatus)}>
        {ORDER_STATUSES.map(status => <option key={status} value={status}>{labels[status]}</option>)}
      </select></label>
      <a className="mail-link" href={`https://mail.google.com/mail/u/${encodeURIComponent(email)}/#all/${order.gmailMessageId}`} target="_blank" rel="noreferrer">Abrir correo original en Gmail</a>
      {order.pdfText && <details className="raw-detail"><summary>Texto extraído del PDF</summary><pre>{order.pdfText}</pre></details>}
      <div className="detail-footer"><Button variant="outline" asChild><Link href="/">Volver a los pedidos</Link></Button></div>
    </article>
  </main>;
}

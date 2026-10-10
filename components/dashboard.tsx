"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { connectGmail, logout } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import AnimatedContent from "@/components/react-bits/animated-content";
import { ORDER_STATUSES, type Order, type OrderStatus, type ImportEvent, type MailReview } from "@/lib/order-types";

const labels: Record<OrderStatus, string> = { pending: "Pendientes", preparing: "Preparación", sent: "Enviados", completed: "Completados" };
const descriptions: Record<OrderStatus, string> = { pending: "Por comenzar", preparing: "En la cocina", sent: "En camino", completed: "Pedidos cerrados" };
const money = (value?: number) => value === undefined ? "Total sin detalle" : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
const timestamp = (value: string) => new Intl.DateTimeFormat("es", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
const mailTimestamp = (value?: string) => value ? new Intl.DateTimeFormat("es", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value)) : "Fecha no disponible";
const reviewLabels: Record<MailReview["outcome"], string> = { imported: "Pedido", duplicate: "Duplicado", ignored: "Omitido", error: "Error" };
const quantity = (count: number, singular: string, plural = `${singular}s`) => `${count} ${count === 1 ? singular : plural}`;

export function Dashboard({ email = "atuantojofl@gmail.com", view = "home" }: { email?: string | null; view?: "home" | "board" }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [backgroundSync, setBackgroundSync] = useState(false);
  const [progress, setProgress] = useState<ImportEvent | null>(null);
  const [mailReviews, setMailReviews] = useState<MailReview[]>([]);
  const [selected, setSelected] = useState<Order | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [deletingAll, setDeletingAll] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | "unsupported">("default");
  const dialog = useRef<HTMLDialogElement>(null);
  const controller = useRef<AbortController | null>(null);
  const seen = useRef<Set<string> | null>(null);
  const automatic = useRef<(() => Promise<void>) | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/orders", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No se pudieron cargar los pedidos. Reintentá.");
      const incoming = data.orders as Order[];
      if (seen.current) {
        const fresh = incoming.filter(order => !seen.current!.has(order.orderId));
        if (fresh.length && !controller.current) {
          setNotice(`${fresh.length} ${fresh.length === 1 ? "pedido nuevo" : "pedidos nuevos"}.`);
          if ("Notification" in window && Notification.permission === "granted") new Notification("Foodhub · Nuevo pedido", { body: fresh.map(order => `${order.customer} · #${order.orderId}`).join("\n") });
        }
      }
      seen.current = new Set(incoming.map(order => order.orderId));
      setOrders(incoming); setConnected(data.gmailConnected); setError(data.integrationError || "");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudieron cargar los pedidos."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    const initial = window.setTimeout(() => { void load(); if ("Notification" in window) setNotificationPermission(Notification.permission); else setNotificationPermission("unsupported"); }, 0);
    const timer = window.setInterval(() => { void load(); }, 60000);
    return () => { clearTimeout(initial); clearInterval(timer); controller.current?.abort(); };
  }, [load]);

  useEffect(() => { if (selected && dialog.current && !dialog.current.open) dialog.current.showModal(); }, [selected]);

  useEffect(() => { const timer = window.setInterval(() => { if (connected && !controller.current) void automatic.current?.(); }, 60000); return () => clearInterval(timer); }, [connected]);

  const sync = useCallback(async (days: number, background = false) => {
    if (controller.current) return;
    if (background) setBackgroundSync(true);
    else { setSyncing(true); setError(""); setNotice(""); setProgress(null); setMailReviews([]); }
    const aborter = new AbortController(); controller.current = aborter;
    try {
      const response = await fetch("/api/sync", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(background ? { mode: "recent" } : { days }), signal: aborter.signal });
      if (background && response.status === 409) return;
      if (!response.ok) { const data = await response.json(); throw new Error(data.error || "No se pudo analizar Gmail. Reintentá."); }
      if (!response.body) throw new Error("Gmail no devolvió resultados. Reintentá.");
      const reader = response.body.getReader(); const decoder = new TextDecoder(); let buffer = ""; let completed = false; let lastCreated = 0; let lastFailure = "";
      while (true) {
        const { value, done } = await reader.read(); if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split(/\r?\n\r?\n/); buffer = chunks.pop() || "";
        for (const chunk of chunks) {
          const raw = chunk.split(/\r?\n/).filter(line => line.startsWith("data:")).map(line => line.slice(5).trim()).join("\n");
          if (!raw) continue;
          const event = JSON.parse(raw) as ImportEvent; if (!background) setProgress(event);
          if (!background && event.type === "review" && event.review) setMailReviews(current => [...current, event.review!]);
          if (event.type === "order" && event.order && event.created > lastCreated && "Notification" in window && Notification.permission === "granted") new Notification("Foodhub · Nuevo pedido", { body: `${event.order.customer} · #${event.order.orderId}` });
          lastCreated = event.created;
          if (event.type === "error") { lastFailure = event.message || "Algunos correos no pudieron procesarse."; setError(lastFailure); }
          if (event.type === "done") { completed = true; if (!background || event.created || event.errors) setNotice(background ? `${quantity(event.created, "pedido nuevo", "pedidos nuevos")}. ${event.errors ? `${quantity(event.errors, "correo con error", "correos con errores")}.` : ""}` : `Análisis terminado: ${quantity(event.scanned, "correo revisado", "correos revisados")}, ${quantity(event.created, "pedido importado", "pedidos importados")} y ${quantity(event.duplicates, "pedido duplicado", "pedidos duplicados")}.${event.errors ? ` ${quantity(event.errors, "error", "errores")}.` : ""}`); }
        }
      }
      if (!completed) throw new Error(lastFailure || "El análisis se interrumpió. Reintentá: los pedidos importados no se duplicarán.");
      await load();
      if (lastFailure) setError(lastFailure);
    } catch (cause) { if (!(cause instanceof DOMException && cause.name === "AbortError")) setError(cause instanceof Error ? cause.message : "El análisis falló. Reintentá."); }
    finally { controller.current = null; setSyncing(false); setBackgroundSync(false); }
  }, [load]);

  useEffect(() => { automatic.current = () => sync(1, true); }, [sync]);

  async function changeStatus(order: Order, status: OrderStatus) {
    if (!order.id || saving || order.status === status) return;
    setSaving(order.id); setError("");
    try {
      const response = await fetch(`/api/orders/${encodeURIComponent(order.id)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || "No se pudo cambiar el estado. Reintentá.");
      setOrders(current => current.map(item => item.id === order.id ? { ...item, status } : item));
      setSelected(current => current && current.id === order.id ? { ...current, status } : current);
      setNotice(`Pedido #${order.orderId}: ${labels[status]}.`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo guardar el estado."); }
    finally { setSaving(null); }
  }

  async function removeAllOrders() {
    if (!orders.length || deletingAll || syncing || backgroundSync || saving) return;
    if (!window.confirm(`¿Eliminar definitivamente los ${orders.length} pedidos del tablero? No se borrarán de Gmail y podrían importarse otra vez al analizar.`)) return;
    setDeletingAll(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/orders", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ confirm: true }) });
      const data = await response.json() as { deleted?: number; failed?: number; error?: string };
      if (!response.ok) throw new Error(data.error || "No se pudieron eliminar los pedidos. Reintentá.");
      const deleted = Number.isInteger(data.deleted) ? data.deleted! : 0;
      const failed = Number.isInteger(data.failed) ? data.failed! : 0;
      dialog.current?.close(); setSelected(null);
      await load();
      if (failed) setError(`${deleted} ${deleted === 1 ? "pedido eliminado" : "pedidos eliminados"}; ${failed} ${failed === 1 ? "no se pudo eliminar" : "no se pudieron eliminar"}. Revisá el tablero y reintentá.`);
      else setNotice(`${deleted} ${deleted === 1 ? "pedido eliminado" : "pedidos eliminados"}. Gmail no se modificó.`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudieron eliminar los pedidos."); }
    finally { setDeletingAll(false); }
  }

  const filtered = orders.filter(order => `${order.customer} ${order.restaurant} ${order.orderId} ${order.items.map(item => item.name).join(" ")}`.toLowerCase().includes(query.toLowerCase()));
  const chronological = [...filtered].sort((a, b) => Date.parse(b.receivedAt) - Date.parse(a.receivedAt));
  const activeCount = orders.filter(order => order.status !== "completed").length;
  const reviewCounts = { imported: 0, duplicate: 0, ignored: 0, error: 0 };
  for (const mail of mailReviews) reviewCounts[mail.outcome]++;

  const renderTicket = (order: Order, draggable = false) => <Card className="order-ticket" key={order.id || order.gmailMessageId} draggable={draggable && Boolean(order.id) && !saving} onDragStart={event => { if (draggable) event.dataTransfer.setData("text/plain", order.id || ""); }}><div className="ticket-top"><Badge variant="secondary">DoorDash</Badge><span className="order-id">#{order.orderId}</span>{draggable && <span className="drag-handle" title="Arrastrar pedido" aria-label="Arrastrar pedido" draggable={Boolean(order.id) && !saving} onDragStart={event => { event.stopPropagation(); event.dataTransfer.setData("text/plain", order.id || ""); }}>Mover</span>}</div><button className="ticket-details" onClick={() => setSelected(order)} aria-label={`Ver pedido ${order.orderId} de ${order.customer}`}><h4>{order.customer}</h4><p>{order.restaurant}</p><div className="ticket-items">{order.items.length ? order.items.slice(0, 2).map((item, i) => <span key={i}>{item.quantity} × {item.name}</span>) : <span>Detalle pendiente de lectura</span>}{order.items.length > 2 && <span className="more-items">+ {order.items.length - 2} productos</span>}</div></button>{order.warning && <p className="ticket-warning">Detalle incompleto · Abrir pedido</p>}<div className="ticket-meta"><strong>{money(order.total)}</strong><span>{order.pickupTime ? `Retiro ${order.pickupTime}` : timestamp(order.receivedAt)}</span></div><label className="status-label"><span className="sr-only">Estado de pedido {order.orderId}</span><select aria-label={`Estado de pedido ${order.orderId}`} value={order.status} disabled={saving === order.id || !order.id} onChange={event => void changeStatus(order, event.target.value as OrderStatus)}>{ORDER_STATUSES.map(value => <option key={value} value={value}>{labels[value]}</option>)}</select></label></Card>;

  return <div className="foodhub-shell">
    <header className="app-header"><div className="header-account"><span>{email}</span><form action={logout}><Button variant="ghost" size="sm">Salir</Button></form></div></header>
    <div className="app-frame">
      <aside className="app-sidebar"><Link className="wordmark sidebar-brand" href="/" aria-label="Foodhub inicio"><span className="brand-word">food<span className="brand-accent">hub</span></span><span className="brand-square" aria-hidden="true" /><span className="sidebar-brand-compact" aria-hidden="true">fh</span></Link><nav aria-label="Secciones"><Link className="sidebar-link" href="/" aria-label="Inicio" aria-current={view === "home" ? "page" : undefined}><span className="sidebar-icon sidebar-icon-home" aria-hidden="true" /><span className="sidebar-link-label">Inicio</span></Link><Link className="sidebar-link" href="/tablero" aria-label="Tablero" aria-current={view === "board" ? "page" : undefined}><span className="sidebar-icon sidebar-icon-board" aria-hidden="true"><span /><span /><span /></span><span className="sidebar-link-label">Tablero</span></Link></nav></aside>
      <main className="workspace">
        <AnimatedContent distance={12} duration={0.45} animateOpacity={false} className="workspace-intro"><div><h1>Pedidos, en orden.</h1><p>{view === "home" ? "Pedidos que van llegando desde DoorDash, reunidos en un solo lugar." : "Mové cada pedido por su estado hasta completarlo."}</p></div><div className="live-caption"><span className={connected ? "connection-dot connected" : "connection-dot"} />{backgroundSync ? "Actualizando Gmail…" : connected ? "Gmail conectado" : "Gmail pendiente"}<span className="caption-divider" />{activeCount} activos</div></AnimatedContent>
        {view === "home" && <section className="integration-bar" aria-label="Conexión y análisis de correo"><div className="integration-copy"><strong>DoorDash</strong><span>{connected ? "Revisá tu correo e incorporá los pedidos al tablero." : "Autorizá la lectura de Gmail para importar tus pedidos."}</span></div><div className="integration-actions"><form action={connectGmail}><Button disabled={syncing || backgroundSync}>{connected ? "Reconectar Gmail" : "Conectar Gmail"}</Button></form><Button className="sync-secondary" variant="outline" onClick={() => void sync(1)} disabled={!connected || syncing || backgroundSync}>{syncing ? "Analizando…" : "Buscar pedidos nuevos"}</Button><Button onClick={() => void sync(30)} disabled={!connected || syncing || backgroundSync}>Analizar últimos 30 días</Button></div></section>}
        {view === "home" && syncing && <section className="sync-progress" role="status" aria-live="polite"><div className="progress-indicator" aria-hidden="true" /><div><strong>Revisando todos los correos del período</strong><p>{progress ? `${progress.scanned} revisados · ${progress.created} pedidos importados · ${progress.duplicates} duplicados · ${progress.errors} errores` : "Preparando análisis de Gmail…"}</p></div></section>}
        {view === "home" && mailReviews.length > 0 && <details className="scan-log"><summary><strong>Ver correos analizados</strong><span>{quantity(mailReviews.length, "correo")} · {quantity(reviewCounts.imported, "pedido")} · {quantity(reviewCounts.duplicate, "duplicado")} · {quantity(reviewCounts.ignored, "omitido")} · {quantity(reviewCounts.error, "error", "errores")}</span></summary><div className="scan-log-list">{mailReviews.map((mail, index) => <article className={`scan-log-entry scan-log-${mail.outcome}`} key={`${mail.receivedAt ?? "unknown"}-${index}`}><div className="scan-log-message"><strong title={mail.subject || undefined}>{mail.subject || "No se pudo leer el asunto"}</strong><p>{mail.sender || "Remitente no disponible"} · {mailTimestamp(mail.receivedAt)}</p></div><div className="scan-log-result"><span className="scan-log-outcome">{reviewLabels[mail.outcome]}</span><span>{mail.reason}</span></div></article>)}</div></details>}
        {error && <div className="message error-message" role="alert"><span>{error}</span><Button variant="outline" size="sm" onClick={() => void load()}>Reintentar</Button></div>}
        {notice && <div className="message notice-message" role="status"><span>{notice}</span><Button variant="ghost" size="sm" aria-label="Cerrar aviso" onClick={() => setNotice("")}>Cerrar</Button></div>}
        <div className="board-toolbar"><div><h2>{view === "home" ? "Pedidos entrantes" : "Pedidos por estado"}</h2><p>{view === "home" ? `${filtered.length} pedidos · más recientes primero` : "Arrastrá un pedido o cambiá su estado desde la tarjeta."}</p></div><div className="board-controls"><label className="search-label"><span className="sr-only">Buscar pedidos</span><Input placeholder="Buscar cliente, pedido o producto" value={query} onChange={event => setQuery(event.target.value)} /></label>{notificationPermission === "default" && <Button variant="ghost" size="sm" onClick={async () => setNotificationPermission(await Notification.requestPermission())}>Activar avisos</Button>}<Button aria-label="Eliminar todos los pedidos" title="Los pedidos se pueden volver a importar desde Gmail" variant="destructive" size="sm" onClick={() => void removeAllOrders()} disabled={!orders.length || deletingAll || syncing || backgroundSync || Boolean(saving)}>{deletingAll ? "Eliminando…" : "Eliminar todos"}</Button></div></div>
        {loading ? <div className="board-loading" role="status">Cargando pedidos…</div> : view === "home" ? chronological.length ? <section className="incoming-orders" aria-label="Pedidos entrantes">{chronological.map(order => renderTicket(order))}</section> : <div className="home-empty"><strong>{query ? "No hay pedidos que coincidan." : "Todavía no hay pedidos."}</strong><span>{query ? "Probá con otro cliente, número o producto." : "Buscá pedidos nuevos o analizá los últimos 30 días para empezar."}</span></div> : <div className="kanban">{ORDER_STATUSES.map((status, index) => {
          const columnOrders = filtered.filter(order => order.status === status).sort((a, b) => Date.parse(a.receivedAt) - Date.parse(b.receivedAt));
          return <section className={`kanban-column column-${status}`} key={status} aria-label={labels[status]} onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); const order = orders.find(item => item.id === event.dataTransfer.getData("text/plain")); if (order) void changeStatus(order, status); }}><div className="column-heading"><div><h3><span className="stage-number">{index + 1}</span>{labels[status]}<span className="column-count">{columnOrders.length}</span></h3><p>{descriptions[status]}</p></div></div><div className="column-body">{columnOrders.length ? columnOrders.map(order => renderTicket(order, true)) : <div className="column-empty"><span className="empty-rule" /><p>{query ? "Sin coincidencias" : "Sin pedidos"}</p><span>{status === "pending" && !query ? "Los pedidos importados aparecerán aquí." : "Mové aquí un pedido para continuar."}</span></div>}</div></section>;
        })}</div>}
        <footer className="workspace-footer"><span>DoorDash · Una cuenta, un tablero</span><span>{view === "home" ? "Pedidos ordenados por llegada" : "Tablero actualizado cada minuto"}</span></footer>
      </main>
    </div>
    <dialog ref={dialog} className="order-dialog" aria-labelledby="order-detail-title" onClose={() => setSelected(null)} onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }}>{selected && <><div className="detail-header"><div><Badge variant="secondary">DoorDash</Badge><h2 id="order-detail-title">Pedido #{selected.orderId}</h2></div><Button variant="ghost" onClick={() => dialog.current?.close()}>Cerrar</Button></div><div className="detail-customer"><h3>{selected.customer}</h3><p>{selected.restaurant}</p><p>Recibido {timestamp(selected.receivedAt)}</p>{selected.pickupTime && <strong>Retiro: {selected.pickupTime}</strong>}</div><div className="detail-products"><h3>Productos</h3>{selected.items.length ? selected.items.map((item, index) => <div className="detail-item" key={index}><span className="item-quantity">{item.quantity}×</span><div><strong>{item.name}</strong>{item.options.map((option, i) => <p key={i}>{option}</p>)}</div>{item.price !== undefined && <span>{money(item.price)}</span>}</div>) : <p>No se pudo extraer el detalle de productos. Revisá el correo original.</p>}</div>{selected.warning && <p className="detail-warning">{selected.warning}</p>}<div className="detail-total"><span>Total</span><strong>{money(selected.total)}</strong></div><label className="detail-status">Estado del pedido<select value={selected.status} disabled={saving === selected.id || !selected.id} onChange={event => void changeStatus(selected, event.target.value as OrderStatus)}>{ORDER_STATUSES.map(status => <option key={status} value={status}>{labels[status]}</option>)}</select></label><a className="mail-link" href={`https://mail.google.com/mail/u/${encodeURIComponent(email || "atuantojofl@gmail.com")}/#all/${selected.gmailMessageId}`} target="_blank" rel="noreferrer">Abrir correo original en Gmail</a>{selected.pdfText && <details className="raw-detail"><summary>Texto extraído del PDF</summary><pre>{selected.pdfText}</pre></details>}</>}</dialog>
  </div>;
}

export default Dashboard;





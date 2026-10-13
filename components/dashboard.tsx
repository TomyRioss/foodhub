"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp, House, LayoutDashboard, PanelLeftClose, PanelLeftOpen, Volume2, VolumeX } from "lucide-react";
import { closestCenter, DndContext, defaultKeyboardCoordinateGetter, KeyboardSensor, pointerWithin, PointerSensor, useDroppable, useSensor, useSensors, type CollisionDetection, type DragEndEvent, type UniqueIdentifier } from "@dnd-kit/core";
import { connectGmail, logout } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { OrderTicket } from "@/components/order-ticket";
import { SalesReport } from "@/components/sales-report";
import { ORDER_STATUSES, type Order, type OrderStatus, type ImportEvent, type MailReview } from "@/lib/order-types";

const labels: Record<OrderStatus, string> = { pending: "Pendientes", preparing: "Preparación", sent: "Enviados", completed: "Completados" };
const descriptions: Record<OrderStatus, string> = { pending: "Por comenzar", preparing: "En la cocina", sent: "En camino", completed: "Pedidos cerrados" };
const mailTimestamp = (value?: string) => value ? new Intl.DateTimeFormat("es", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value)) : "Fecha no disponible";
const reviewLabels: Record<MailReview["outcome"], string> = { imported: "Pedido", duplicate: "Duplicado", ignored: "Omitido", error: "Error" };
const quantity = (count: number, singular: string, plural = `${singular}s`) => `${count} ${count === 1 ? singular : plural}`;
const orderKey = (order: Order) => `${order.platform}:${order.orderId}`;
const boardCollisionDetection: CollisionDetection = args => {
  const pointerCollisions = pointerWithin(args);
  if (pointerCollisions.length || args.pointerCoordinates) return pointerCollisions;
  return closestCenter(args);
};

function playAlarmSound(context: AudioContext) {
  const startedAt = context.currentTime;
  [880, 660, 880, 1046].forEach((frequency, index) => {
    const offset = index * 0.22;
    const tone = context.createOscillator();
    const volume = context.createGain();
    tone.type = "triangle"; tone.frequency.value = frequency;
    volume.gain.setValueAtTime(0.001, startedAt + offset);
    volume.gain.exponentialRampToValueAtTime(0.28, startedAt + offset + 0.015);
    volume.gain.exponentialRampToValueAtTime(0.001, startedAt + offset + 0.18);
    tone.connect(volume); volume.connect(context.destination);
    tone.start(startedAt + offset); tone.stop(startedAt + offset + 0.19);
  });
}

function OrderColumn({ status, index, count, bodyId, collapsed, query, onToggle, children }: {
  status: OrderStatus;
  index: number;
  count: number;
  bodyId: string;
  collapsed: boolean;
  query: string;
  onToggle: () => void;
  children: ReactNode;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: status });

  return <section ref={setNodeRef} className={`kanban-column column-${status}${isOver ? " is-drop-target" : ""}`} aria-label={labels[status]} data-collapsed={collapsed}>
    <div className="column-heading"><div className="column-heading-main"><h3><span className="stage-number">{index + 1}</span>{labels[status]}<span className="column-count">{count}</span></h3><p>{descriptions[status]}</p></div><Button className="column-collapse-toggle" variant="ghost" size="icon" type="button" aria-label={`${collapsed ? "Mostrar" : "Ocultar"} pedidos ${labels[status].toLowerCase()}`} title={`${collapsed ? "Mostrar" : "Ocultar"} pedidos ${labels[status].toLowerCase()}`} aria-expanded={!collapsed} aria-controls={bodyId} onClick={onToggle}>{collapsed ? <ChevronDown size={18} aria-hidden="true" /> : <ChevronUp size={18} aria-hidden="true" />}</Button></div>
    <div className="column-body" id={bodyId}>{children || <div className="column-empty"><span className="empty-rule" /><p>{query ? "Sin coincidencias" : "Sin pedidos"}</p><span>{status === "pending" && !query ? "Los pedidos importados aparecerán aquí." : "Mové aquí un pedido para continuar."}</span></div>}</div>
  </section>;
}

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
  const [saving, setSaving] = useState<string | null>(null);
  const [deletingAll, setDeletingAll] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | "unsupported">("default");
  const [pendingAlerts, setPendingAlerts] = useState<Order[]>([]);
  const [soundArmed, setSoundArmed] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [collapsedColumns, setCollapsedColumns] = useState<Set<OrderStatus>>(() => new Set());
  const audioContext = useRef<AudioContext | null>(null);
  const controller = useRef<AbortController | null>(null);
  const seen = useRef<Set<string> | null>(null);
  const alerted = useRef<Set<string>>(new Set());
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: defaultKeyboardCoordinateGetter }),
  );

  const alertOrder = useCallback((order: Order) => {
    if (!soundArmed) return;
    const key = orderKey(order);
    if (alerted.current.has(key)) return;
    alerted.current.add(key);
    setPendingAlerts(current => current.some(item => orderKey(item) === key) ? current : [order, ...current]);
    if ("Notification" in window && Notification.permission === "granted") {
      try { new Notification("Foodhub · Nuevo pedido", { body: `${order.restaurant} · ${order.customer} · #${order.orderId}` }); } catch { /* Browser notifications may be unavailable in this context. */ }
    }
  }, [soundArmed]);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/orders", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No se pudieron cargar los pedidos. Reintentá.");
      const incoming = data.orders as Order[];
      if (seen.current) {
        for (const order of incoming) if (!seen.current.has(orderKey(order))) alertOrder(order);
      }
      seen.current = new Set(incoming.map(orderKey));
      setOrders(incoming); setConnected(data.gmailConnected); setError(data.integrationError || "");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudieron cargar los pedidos."); }
    finally { setLoading(false); }
  }, [alertOrder]);

  useEffect(() => {
    const initial = window.setTimeout(() => { void load(); if ("Notification" in window) setNotificationPermission(Notification.permission); else setNotificationPermission("unsupported"); }, 0);
    const timer = window.setInterval(() => { void load(); }, 60000);
    return () => { clearTimeout(initial); clearInterval(timer); controller.current?.abort(); };
  }, [load]);

  useEffect(() => {
    if (!soundArmed) return;
    const AudioContextConstructor = window.AudioContext;
    if (!AudioContextConstructor) {
      const unsupportedTimer = window.setTimeout(() => {
        setError("Este navegador no permite activar la alarma sonora.");
        setSoundArmed(false);
      }, 0);
      return () => clearTimeout(unsupportedTimer);
    }
    const existingContext = audioContext.current;
    const context = existingContext && existingContext.state !== "closed" ? existingContext : new AudioContextConstructor();
    audioContext.current = context;
    const unlockSound = () => {
      if (context.state !== "running") void context.resume().catch(() => {});
      window.removeEventListener("pointerdown", unlockSound);
      window.removeEventListener("keydown", unlockSound);
    };
    window.addEventListener("pointerdown", unlockSound, { once: true });
    window.addEventListener("keydown", unlockSound, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlockSound);
      window.removeEventListener("keydown", unlockSound);
    };
  }, [soundArmed]);

  useEffect(() => {
    const stream = new EventSource("/api/orders/events");
    let refreshTimer: number | undefined;
    const scheduleRefresh = () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      refreshTimer = window.setTimeout(() => { void load(); }, 150);
    };
    stream.addEventListener("order", scheduleRefresh);
    return () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      stream.close();
    };
  }, [load]);

  const sync = useCallback(async (days: number, background = false) => {
    if (controller.current) return;
    if (background) setBackgroundSync(true);
    else { setSyncing(true); setError(""); setNotice(""); setProgress(null); setMailReviews([]); }
    const aborter = new AbortController(); controller.current = aborter;
    try {
      const response = await fetch("/api/sync", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ days }), signal: aborter.signal });
      if (!response.ok) {
        const data = await response.json();
        if (background && response.status === 409) return;
        throw new Error(data.error || "No se pudo analizar Gmail. Reintentá.");
      }
      if (!response.body) throw new Error("Gmail no devolvió resultados. Reintentá.");
      const reader = response.body.getReader(); const decoder = new TextDecoder(); let buffer = ""; let completed = false; let lastCreated = 0; let lastFailure = "";
      while (true) {
        const { value, done } = await reader.read(); if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split(/\r?\n\r?\n/); buffer = chunks.pop() || "";
        for (const chunk of chunks) {
          const raw = chunk.split(/\r?\n/).filter(line => line.startsWith("data:")).map(line => line.slice(5).trim()).join("\n");
          if (!raw) continue;
          const event = JSON.parse(raw) as ImportEvent;
          if (!background) setProgress(event);
          if (!background && event.type === "review" && event.review) setMailReviews(current => [...current, event.review!]);
          if (event.type === "order" && event.order && event.created > lastCreated) alertOrder(event.order);
          lastCreated = event.created;
          if (event.type === "error") { lastFailure = event.message || "Algunos correos no pudieron procesarse."; setError(lastFailure); }
          if (event.type === "done") {
            completed = true;
            if (!background || event.created || event.errors) setNotice(background
              ? `${quantity(event.created, "pedido nuevo", "pedidos nuevos")}.${event.errors ? ` ${quantity(event.errors, "correo con error", "correos con errores")}.` : ""}`
              : `Análisis terminado: ${quantity(event.scanned, "correo revisado", "correos revisados")}, ${quantity(event.created, "pedido importado", "pedidos importados")} y ${quantity(event.duplicates, "pedido duplicado", "pedidos duplicados")}.${event.errors ? ` ${quantity(event.errors, "error", "errores")}.` : ""}`);
          }
        }
      }
      if (!completed) throw new Error(lastFailure || "El análisis se interrumpió. Reintentá: los pedidos importados no se duplicarán.");
      await load();
      if (lastFailure) setError(lastFailure);
    } catch (cause) { if (!(cause instanceof DOMException && cause.name === "AbortError")) setError(cause instanceof Error ? cause.message : "El análisis falló. Reintentá."); }
    finally { controller.current = null; if (background) setBackgroundSync(false); else setSyncing(false); }
  }, [alertOrder, load]);

  useEffect(() => {
    if (!connected) return;
    const checkEmail = () => {
      if (document.visibilityState !== "hidden" && !controller.current) void sync(1, true);
    };
    checkEmail();
    const timer = window.setInterval(checkEmail, 60_000);
    return () => clearInterval(timer);
  }, [connected, sync]);

  useEffect(() => {
    if (!soundArmed || !pendingAlerts.length || !audioContext.current) return;
    const context = audioContext.current;
    const ring = () => {
      if (context.state !== "running") { void context.resume(); return; }
      playAlarmSound(context);
    };
    ring();
    const timer = window.setInterval(ring, 7_000);
    return () => clearInterval(timer);
  }, [pendingAlerts.length, soundArmed]);

  useEffect(() => () => { void audioContext.current?.close(); }, []);

  function acknowledgeOrder(order: Order) {
    const key = orderKey(order);
    setPendingAlerts(current => current.filter(item => orderKey(item) !== key));
  }

  function toggleColumn(status: OrderStatus) {
    setCollapsedColumns(current => {
      const next = new Set(current);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      return next;
    });
  }

  async function activateAlerts() {
    try {
      const AudioContextConstructor = window.AudioContext;
      if (!AudioContextConstructor) throw new Error("Este navegador no permite activar la alarma sonora.");
      const existingContext = audioContext.current;
      const context = existingContext && existingContext.state !== "closed" ? existingContext : new AudioContextConstructor();
      audioContext.current = context;
      const resumed = context.resume();
      const permissionRequest: Promise<NotificationPermission | "unsupported"> = "Notification" in window
        ? Notification.permission === "default" ? Notification.requestPermission().catch(() => "denied") : Promise.resolve(Notification.permission)
        : Promise.resolve("unsupported");
      const [, permission] = await Promise.all([resumed, permissionRequest]);
      setNotificationPermission(permission);
      if (context.state !== "running") throw new Error("Permití el sonido de Foodhub en el navegador.");
      setSoundArmed(true); setError("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo activar la alarma sonora."); }
  }

  function toggleAlerts() {
    if (soundArmed) {
      setSoundArmed(false);
      setPendingAlerts([]);
      return;
    }
    void activateAlerts();
  }

  async function changeStatus(order: Order, status: OrderStatus) {
    if (!order.id || saving || order.status === status) return;
    setSaving(order.id); setError("");
    try {
      const response = await fetch(`/api/orders/${encodeURIComponent(order.id)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || "No se pudo cambiar el estado. Reintentá.");
      setOrders(current => current.map(item => item.id === order.id ? { ...item, status } : item));
      setNotice(`Pedido #${order.orderId}: ${labels[status]}.`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo guardar el estado."); }
    finally { setSaving(null); }
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    if (!over) return;
    const order = orders.find(item => item.id === String(active.id));
    const status = ORDER_STATUSES.find(value => value === over.id);
    if (order && status) void changeStatus(order, status);
  }

  function orderLabel(id: UniqueIdentifier) {
    const order = orders.find(item => item.id === String(id));
    return order ? `Pedido #${order.orderId}` : "Pedido";
  }

  const dragAnnouncements = {
    onDragStart: ({ active }: { active: { id: UniqueIdentifier } }) => `${orderLabel(active.id)} seleccionado. Usá las flechas para elegir una columna, Enter para confirmar o Escape para cancelar.`,
    onDragOver: ({ active, over }: { active: { id: UniqueIdentifier }; over: { id: UniqueIdentifier } | null }) => over ? `${orderLabel(active.id)} sobre ${labels[over.id as OrderStatus] || "otra columna"}.` : `${orderLabel(active.id)} fuera de una columna.`,
    onDragEnd: ({ active, over }: { active: { id: UniqueIdentifier }; over: { id: UniqueIdentifier } | null }) => over ? `${orderLabel(active.id)} soltado en ${labels[over.id as OrderStatus] || "otra columna"}. Guardando el cambio.` : `${orderLabel(active.id)} no se movió.`,
    onDragCancel: ({ active }: { active: { id: UniqueIdentifier } }) => `Se canceló el movimiento de ${orderLabel(active.id)}.`,
  };

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
      await load();
      if (failed) setError(`${deleted} ${deleted === 1 ? "pedido eliminado" : "pedidos eliminados"}; ${failed} ${failed === 1 ? "no se pudo eliminar" : "no se pudieron eliminar"}. Revisá el tablero y reintentá.`);
      else setNotice(`${deleted} ${deleted === 1 ? "pedido eliminado" : "pedidos eliminados"}. Gmail no se modificó.`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudieron eliminar los pedidos."); }
    finally { setDeletingAll(false); }
  }

  const filtered = orders.filter(order => `${order.customer} ${order.restaurant} ${order.orderId} ${order.items.map(item => item.name).join(" ")}`.toLowerCase().includes(query.toLowerCase()));
  const chronological = [...filtered].sort((a, b) => Date.parse(b.receivedAt) - Date.parse(a.receivedAt));
  const alertStateDescription = !soundArmed
    ? "Alarmas y avisos desactivados"
    : notificationPermission === "granted"
      ? "Alarma activada y avisos del navegador permitidos"
      : notificationPermission === "denied"
        ? "Alarma activada; notificaciones del navegador bloqueadas"
        : notificationPermission === "unsupported"
          ? "Alarma activada; notificaciones no disponibles en este navegador"
          : "Alarma activada; permiso para notificaciones pendiente";
  const reviewCounts = { imported: 0, duplicate: 0, ignored: 0, error: 0 };
  for (const mail of mailReviews) reviewCounts[mail.outcome]++;

  const renderTicket = (order: Order, draggable = false) => <OrderTicket key={order.id || order.gmailMessageId} order={order} draggable={draggable && !saving} saving={saving === order.id} onStatusChange={(item, status) => void changeStatus(item, status)} onOpen={acknowledgeOrder} />;

  return <div className="foodhub-shell" data-sidebar-collapsed={sidebarCollapsed}>
    <header className="app-header"><div className="header-account"><span>{email}</span><form action={logout}><Button variant="ghost" size="sm">Salir</Button></form></div></header>
    <div className="app-frame">
      <aside className="app-sidebar" data-collapsed={sidebarCollapsed}>
        <div className="sidebar-top-row">
          <Link className="wordmark sidebar-brand" href="/" aria-label="Foodhub inicio"><span className="brand-word">food<span className="brand-accent">hub</span></span><span className="brand-square" aria-hidden="true" /><span className="sidebar-brand-compact" aria-hidden="true">fh</span></Link>
          <Button className="sidebar-collapse-toggle" variant="ghost" size="icon" type="button" aria-label={sidebarCollapsed ? "Expandir menú lateral" : "Contraer menú lateral"} title={sidebarCollapsed ? "Expandir menú lateral" : "Contraer menú lateral"} aria-expanded={!sidebarCollapsed} aria-controls="foodhub-sections" onClick={() => setSidebarCollapsed(current => !current)}>{sidebarCollapsed ? <PanelLeftOpen size={19} aria-hidden="true" /> : <PanelLeftClose size={19} aria-hidden="true" />}</Button>
        </div>
        <nav id="foodhub-sections" aria-label="Secciones"><Link className="sidebar-link" href="/" aria-label="Inicio" aria-current={view === "home" ? "page" : undefined}><House className="sidebar-icon" size={22} strokeWidth={1.8} aria-hidden="true" /><span className="sidebar-link-label">Inicio</span></Link><Link className="sidebar-link" href="/tablero" aria-label="Tablero" aria-current={view === "board" ? "page" : undefined}><LayoutDashboard className="sidebar-icon" size={22} strokeWidth={1.8} aria-hidden="true" /><span className="sidebar-link-label">Tablero</span></Link></nav>
      </aside>
      <main className="workspace">
        {pendingAlerts.length > 0 && <section className="new-order-alert" role="alert" aria-live="assertive"><div><strong>{quantity(pendingAlerts.length, "pedido nuevo", "pedidos nuevos")}</strong><span>{pendingAlerts[0].restaurant} · {pendingAlerts[0].customer}</span></div><div className="alert-actions">{pendingAlerts[0].id && <Link className="alert-open-link" href={`/pedido/${encodeURIComponent(pendingAlerts[0].id)}`} onClick={() => acknowledgeOrder(pendingAlerts[0])}>Abrir pedido</Link>}<Button variant="outline" size="sm" onClick={() => setPendingAlerts([])}>Ya lo vi · silenciar</Button></div></section>}
        {view === "home" && <SalesReport orders={orders} />}
        {view === "home" && <section className="integration-bar" aria-label="Conexión y análisis de correo"><div className="integration-copy"><strong>DoorDash</strong><span>{backgroundSync ? "Revisando Gmail automáticamente…" : connected ? "Gmail conectado · revisión automática cada minuto." : "Conectá Gmail para revisar los pedidos automáticamente."}</span></div><div className="integration-actions"><form action={connectGmail}><Button disabled={syncing || backgroundSync}>{connected ? "Reconectar Gmail" : "Conectar Gmail"}</Button></form><Button className="sync-secondary" variant="outline" onClick={() => void sync(1)} disabled={!connected || syncing || backgroundSync}>{syncing ? "Analizando…" : "Buscar pedidos nuevos"}</Button><Button onClick={() => void sync(30)} disabled={!connected || syncing || backgroundSync}>Analizar últimos 30 días</Button></div></section>}
        {view === "home" && syncing && <section className="sync-progress" role="status" aria-live="polite"><div className="progress-indicator" aria-hidden="true" /><div><strong>Revisando todos los correos del período</strong><p>{progress ? `${progress.scanned} revisados · ${progress.created} pedidos importados · ${progress.duplicates} duplicados · ${progress.errors} errores` : "Preparando análisis de Gmail…"}</p></div></section>}
        {view === "home" && mailReviews.length > 0 && <details className="scan-log"><summary><strong>Ver correos analizados</strong><span>{quantity(mailReviews.length, "correo")} · {quantity(reviewCounts.imported, "pedido")} · {quantity(reviewCounts.duplicate, "duplicado")} · {quantity(reviewCounts.ignored, "omitido")} · {quantity(reviewCounts.error, "error", "errores")}</span></summary><div className="scan-log-list">{mailReviews.map((mail, index) => <article className={`scan-log-entry scan-log-${mail.outcome}`} key={`${mail.receivedAt ?? "unknown"}-${index}`}><div className="scan-log-message"><strong title={mail.subject || undefined}>{mail.subject || "No se pudo leer el asunto"}</strong><p>{mail.sender || "Remitente no disponible"} · {mailTimestamp(mail.receivedAt)}</p></div><div className="scan-log-result"><span className="scan-log-outcome">{reviewLabels[mail.outcome]}</span><span>{mail.reason}</span></div></article>)}</div></details>}
        {error && <div className="message error-message" role="alert"><span>{error}</span><Button variant="outline" size="sm" onClick={() => void load()}>Reintentar</Button></div>}
        {notice && <div className="message notice-message" role="status"><span>{notice}</span><Button variant="ghost" size="sm" aria-label="Cerrar aviso" onClick={() => setNotice("")}>Cerrar</Button></div>}
        <div className="board-toolbar"><div><h2>{view === "home" ? "Pedidos entrantes" : "Pedidos por estado"}</h2><p>{view === "home" ? `${filtered.length} pedidos · más recientes primero` : "Arrastrá un pedido o cambiá su estado desde la tarjeta."}</p></div><div className="board-controls"><label className="search-label"><span className="sr-only">Buscar pedidos</span><Input placeholder="Buscar cliente, pedido o producto" value={query} onChange={event => setQuery(event.target.value)} /></label><div className="alert-control"><span id="alert-control-label">Alarmas y avisos</span><button className="alert-switch" type="button" role="switch" aria-checked={soundArmed} aria-labelledby="alert-control-label" aria-describedby="alert-control-status" title={soundArmed ? "Desactivar alarmas y avisos" : "Activar alarmas y avisos"} onClick={toggleAlerts}><span className="alert-switch-thumb" aria-hidden="true" /></button><span className={`alert-state-icon${soundArmed ? "" : " alert-state-icon-off"}`} id="alert-control-status" role="img" aria-label={alertStateDescription} title={alertStateDescription}>{soundArmed ? <Volume2 size={19} strokeWidth={2} aria-hidden="true" /> : <VolumeX size={19} strokeWidth={2} aria-hidden="true" />}</span></div><Button aria-label="Eliminar todos los pedidos" title="Los pedidos se pueden volver a importar desde Gmail" variant="destructive" size="sm" onClick={() => void removeAllOrders()} disabled={!orders.length || deletingAll || syncing || backgroundSync || Boolean(saving)}>{deletingAll ? "Eliminando…" : "Eliminar todos"}</Button></div></div>
        {loading ? <div className="board-loading" role="status">Cargando pedidos…</div> : view === "home" ? chronological.length ? <section className="incoming-orders" aria-label="Pedidos entrantes">{chronological.map(order => renderTicket(order))}</section> : <div className="home-empty"><strong>{query ? "No hay pedidos que coincidan." : "Todavía no hay pedidos."}</strong><span>{query ? "Probá con otro cliente, número o producto." : "Buscá pedidos nuevos o analizá los últimos 30 días para empezar."}</span></div> : <DndContext id="orders-board" sensors={sensors} collisionDetection={boardCollisionDetection} onDragEnd={handleDragEnd} accessibility={{ announcements: dragAnnouncements, screenReaderInstructions: { draggable: "Para mover una tarjeta, presioná Espacio o Enter, elegí una columna con las flechas, confirmá con Enter o cancelá con Escape." } }}>
          <div className="kanban">{ORDER_STATUSES.map((status, index) => {
            const columnOrders = filtered.filter(order => order.status === status).sort((a, b) => Date.parse(a.receivedAt) - Date.parse(b.receivedAt));
            const isColumnCollapsed = collapsedColumns.has(status);
            const columnBodyId = `column-${status}-orders`;
            return <OrderColumn key={status} status={status} index={index} count={columnOrders.length} bodyId={columnBodyId} collapsed={isColumnCollapsed} query={query} onToggle={() => toggleColumn(status)}>{columnOrders.length ? columnOrders.map(order => renderTicket(order, true)) : null}</OrderColumn>;
          })}</div>
        </DndContext>}
        <footer className="workspace-footer"><span>DoorDash · Una cuenta, un tablero</span><span>{view === "home" ? "Pedidos ordenados por llegada" : "Tablero actualizado cada minuto"}</span></footer>
      </main>
    </div>
  </div>;
}

export default Dashboard;





import Link from "next/link";
import Image from "next/image";
import type { PointerEvent as ReactPointerEvent } from "react";
import { useDraggable } from "@dnd-kit/core";
import { Card } from "@/components/ui/card";
import { ORDER_STATUSES, type Order, type OrderStatus } from "@/lib/order-types";

const labels: Record<OrderStatus, string> = { pending: "Pendientes", preparing: "Preparación", sent: "Enviados", completed: "Completados" };
const money = (value?: number) => value === undefined ? "Total sin detalle" : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
const timestamp = (value: string) => new Intl.DateTimeFormat("es", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));

export function OrderTicket({ order, draggable = false, saving, onStatusChange, onOpen }: {
  order: Order;
  draggable?: boolean;
  saving: boolean;
  onStatusChange: (order: Order, status: OrderStatus) => void;
  onOpen: (order: Order) => void;
}) {
  const canDrag = draggable && Boolean(order.id) && !saving;
  const { attributes, listeners, setActivatorNodeRef, setNodeRef, transform, isDragging } = useDraggable({
    id: order.id || order.gmailMessageId,
    disabled: !canDrag,
  });
  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0) scaleX(${transform.scaleX}) scaleY(${transform.scaleY})` : undefined,
    opacity: isDragging ? 0.45 : undefined,
  };
  const handleCardPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (event.pointerType === "touch" || target.closest("button, select, input, textarea, [contenteditable='true']")) return;
    listeners?.onPointerDown?.(event);
  };

  return <Card ref={setNodeRef} style={style} className={`order-ticket status-${order.status}`} data-draggable={canDrag} onPointerDown={canDrag ? handleCardPointerDown : undefined}>
    <div className="ticket-top">
      <span className="order-id">#{order.orderId}</span>
      <span className="portal-logo"><Image src="/doordash-wordmark.png" alt="DoorDash" width={573} height={228} /></span>
      {draggable && <button ref={setActivatorNodeRef} type="button" className="drag-handle sr-only" title="Arrastrar pedido" aria-label={`Mover pedido #${order.orderId}`} disabled={!canDrag} {...attributes} {...listeners}>Mover</button>}
    </div>
    <Link className="ticket-details" href={order.id ? `/pedido/${encodeURIComponent(order.id)}` : "/"} onClick={() => onOpen(order)}>
      <h4>{order.customer}</h4>
      <p className="ticket-restaurant">{order.restaurant || "Sin marca"}</p>
      <div className="ticket-items">{order.items.length ? order.items.slice(0, 2).map((item, index) => <span key={`${item.name}-${index}`}>{item.quantity} × {item.name}</span>) : <span>Detalle pendiente de lectura</span>}{order.items.length > 2 && <span className="more-items">+ {order.items.length - 2} productos</span>}</div>
      {order.warning && <p className="ticket-warning">Detalle incompleto · Abrir pedido</p>}
      <div className="ticket-meta"><strong>{money(order.total)}</strong><span style={{ whiteSpace: "nowrap" }}>{order.pickupTime ? `Retiro ${order.pickupTime}` : timestamp(order.receivedAt)}</span></div>
    </Link>
    <label className="status-label"><span className="sr-only">Estado de pedido {order.orderId}</span><select className={`status-select status-${order.status}`} aria-label={`Estado de pedido ${order.orderId}`} value={order.status} disabled={saving || !order.id} onChange={event => onStatusChange(order, event.target.value as OrderStatus)}>{ORDER_STATUSES.map(value => <option key={value} value={value}>{labels[value]}</option>)}</select></label>
  </Card>;
}

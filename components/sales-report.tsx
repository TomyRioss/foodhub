"use client";

import { useMemo, useState } from "react";
import type { Order } from "@/lib/order-types";

type Totals = { name: string; orders: number; amount: number; withoutTotal: number };

const formatMoney = (amount: number, currency: string) => new Intl.NumberFormat("en-US", {
  style: "currency", currency,
}).format(amount);

const portalName = (platform: Order["platform"]) => platform === "doordash" ? "DoorDash" : platform;

function summarize(orders: Order[], getName: (order: Order) => string): Totals[] {
  const totals = new Map<string, Totals>();
  for (const order of orders) {
    const name = getName(order).trim() || "Sin marca";
    const row = totals.get(name) ?? { name, orders: 0, amount: 0, withoutTotal: 0 };
    row.orders++;
    if (typeof order.total === "number") row.amount += order.total;
    else row.withoutTotal++;
    totals.set(name, row);
  }
  return [...totals.values()].sort((a, b) => b.amount - a.amount || a.name.localeCompare(b.name, "es"));
}

function ReportTable({ title, rows, currency, emptyLabel }: { title: string; rows: Totals[]; currency: string; emptyLabel: string }) {
  return <section className="report-block" aria-label={title}>
    <h3>{title}</h3>
    {rows.length ? <div className="report-table-wrap"><table className="report-table">
      <thead><tr><th scope="col">{title === "Por día" ? "Día" : "Origen"}</th><th scope="col">Pedidos</th><th scope="col">Ventas</th></tr></thead>
      <tbody>{rows.map(row => <tr key={row.name}>
        <th scope="row">{row.name}</th>
        <td>{row.orders}{row.withoutTotal > 0 && <small>{row.withoutTotal} sin importe</small>}</td>
        <td>{row.orders === row.withoutTotal ? "Sin importe" : formatMoney(row.amount, currency)}</td>
      </tr>)}</tbody>
    </table></div> : <p className="report-empty">{emptyLabel}</p>}
  </section>;
}

export function SalesReport({ orders }: { orders: Order[] }) {
  const [days, setDays] = useState(7);
  const report = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - (days - 1));
    const recent = orders.filter(order => {
      const date = new Date(order.receivedAt);
      return Number.isFinite(date.getTime()) && date >= start;
    });
    const byDay = new Map<string, Totals>();
    for (const order of recent) {
      const date = new Date(order.receivedAt);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      const name = new Intl.DateTimeFormat("es", { day: "2-digit", month: "short" }).format(date);
      const row = byDay.get(key) ?? { name, orders: 0, amount: 0, withoutTotal: 0 };
      row.orders++;
      if (typeof order.total === "number") row.amount += order.total;
      else row.withoutTotal++;
      byDay.set(key, row);
    }
    const currency = recent.find(order => order.currency)?.currency ?? "USD";
    const amount = recent.reduce((sum, order) => sum + (order.total ?? 0), 0);
    return {
      recent,
      currency,
      amount,
      withoutTotal: recent.filter(order => order.total === undefined).length,
      brands: summarize(recent, order => order.restaurant),
      portals: summarize(recent, order => portalName(order.platform)),
      days: [...byDay.entries()].sort(([a], [b]) => b.localeCompare(a)).map(([, value]) => value),
    };
  }, [orders, days]);

  return <section className="sales-report" aria-labelledby="sales-report-title">
    <header className="report-heading">
      <div><span className="report-kicker">RESUMEN DE VENTAS</span><h2 id="sales-report-title">Ventas</h2><p>Importes de pedidos recibidos en el período.</p></div>
      <label className="report-period">Período<select value={days} onChange={event => setDays(Number(event.target.value))}>
        <option value={7}>Últimos 7 días</option><option value={30}>Últimos 30 días</option>
      </select></label>
    </header>
    <div className="report-total"><div><span>Ventas registradas</span><strong>{report.recent.some(order => order.total !== undefined) ? formatMoney(report.amount, report.currency) : "Sin importes"}</strong></div>
      <p>{report.recent.length} {report.recent.length === 1 ? "pedido" : "pedidos"}{report.withoutTotal ? ` · ${report.withoutTotal} sin importe` : ""}</p>
    </div>
    <div className="report-grid">
      <ReportTable title="Por marca" rows={report.brands} currency={report.currency} emptyLabel="Sin ventas para este período." />
      <ReportTable title="Por app" rows={report.portals} currency={report.currency} emptyLabel="Sin ventas para este período." />
      <ReportTable title="Por día" rows={report.days} currency={report.currency} emptyLabel="Sin ventas para este período." />
    </div>
  </section>;
}

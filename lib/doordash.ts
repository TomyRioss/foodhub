import { decodeGmail, flattenParts, messageHeader, type GmailMessage, type GmailClient } from "./gmail.ts";
import type { Order, OrderItem } from "./order-types.ts";

export function matchDoorDashSubject(sender: string, subject: string) {
  const address = (sender.match(/<([^>]+)>/)?.[1] ?? sender).trim();
  if (address.toLowerCase() !== "orders@doordash.com") return { details: null, reason: "Remitente distinto de orders@doordash.com" };
  const match = /^Delivery order from (.+?) for (.+?):\s*Order\s*#\s*([a-z0-9-]+)\s*$/i.exec(subject);
  if (!match) return { details: null, reason: "Asunto fuera del formato esperado de pedido DoorDash" };
  return { details: { customer: match[1].trim(), restaurant: match[2].trim(), orderId: match[3].toLowerCase() }, reason: "" };
}

export function doorDashSubject(sender: string, subject: string) {
  return matchDoorDashSubject(sender, subject).details;
}

const calendarMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function calendarDate(value: string): Date | null {
  const match = /\b([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})\b/.exec(value);
  if (!match) return null;
  const month = calendarMonths.findIndex((name) => name.toLowerCase() === match[1].slice(0, 3).toLowerCase());
  if (month < 0) return null;
  const date = new Date(Date.UTC(Number(match[3]), month, Number(match[2])));
  return date.getUTCMonth() === month && date.getUTCDate() === Number(match[2]) ? date : null;
}
function pickupCalendarTime(lines: string[]): string | undefined {
  const index = lines.findIndex((line) => /(?:Today|Tomorrow)\s+at\s+\d{1,2}:\d{2}\s*[AP]M/i.test(line));
  if (index < 0) return undefined;
  const pickup = /(Today|Tomorrow)\s+at\s+(\d{1,2}:\d{2}\s*[AP]M)/i.exec(lines[index])!;
  // The provided DoorDash layout places the explicit pickup date immediately below its time.
  let date = lines.slice(index + 1, index + 3).map(calendarDate).find((value) => value !== null) ?? null;
  if (!date) {
    const placed = lines.find((line) => /Placed on/i.test(line));
    date = placed ? calendarDate(placed) : null;
    if (date && pickup[1].toLowerCase() === "tomorrow") date.setUTCDate(date.getUTCDate() + 1);
  }
  const time = pickup[2].replace(/\s+/g, " ").toUpperCase();
  return date ? `${calendarMonths[date.getUTCMonth()]} ${date.getUTCDate()}, ${date.getUTCFullYear()} · ${time}` : time;
}

export function parseDoorDashPdf(text: string): Pick<Order, "items" | "total" | "pickupTime" | "pdfText"> {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const items: OrderItem[] = [];
  let active: OrderItem | undefined;
  for (const line of lines) {
    if (/End of Order|Total Items|^Subtotal:|^Total:/i.test(line)) { active = undefined; continue; }
    const item = /^(\d+)\s*x\s+(.+)$/i.exec(line);
    if (item) {
      const name = item[2].replace(/\s*\(in\s*\)[^$]*$/i, "").replace(/\s+\$[\d,.]+(?:\s+\$[\d,.]+)?$/, "").trim();
      active = { quantity: Number(item[1]), name, options: [] };
      const price = /\$([\d,]+\.\d{2})/.exec(item[2]);
      if (price) active.price = Number(price[1].replaceAll(",", ""));
      items.push(active);
    } else if (active) {
      const price = /^\$([\d,]+\.\d{2})(?:\s+\$[\d,.]+)?$/.exec(line);
      if (price) active.price = Number(price[1].replaceAll(",", ""));
      else if (!/^Qty\.|^Payment:|^Price|^Subtotal/i.test(line) && !/^[•�]+$/.test(line)) active.options.push(line.replace(/^[•�\s]+/, ""));
    }
  }
  const total = /(?:^|\n)\s*Total:\s*\$([\d,]+\.\d{2})/i.exec(text);
  return { items, total: total ? Number(total[1].replaceAll(",", "")) : undefined, pickupTime: pickupCalendarTime(lines), pdfText: text.slice(0, 100_000) };
}

export async function extractPdf(buffer: Buffer) {
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  try { return (await parser.getText()).text; } finally { await parser.destroy(); }
}

// Only direct DoorDash PDF URLs. Redirects and confirmation links are never followed.
export function safePdfUrl(value: string): URL | null {
  try {
    const url = new URL(value.replaceAll("&amp;", "&"));
    if (url.protocol !== "https:" || url.username || url.password || (url.port && url.port !== "443")) return null;
    if (!(url.hostname === "doordash.com" || url.hostname.endsWith(".doordash.com"))) return null;
    if (!/\.pdf$/i.test(url.pathname)) return null;
    return url;
  } catch { return null; }
}
async function linkedPdf(message: GmailMessage, signal?: AbortSignal): Promise<Buffer | null> {
  const body = flattenParts(message.payload).filter((p) => p.mimeType === "text/plain" || p.mimeType === "text/html").map((p) => p.body?.data ? decodeGmail(p.body.data).toString("utf8") : "").join("\n");
  for (const candidate of body.match(/https:\/\/[^\s<>"']+/g) ?? []) {
    const url = safePdfUrl(candidate);
    if (!url) continue;
    const response = await fetch(url, { redirect: "error", signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(20_000)]) : AbortSignal.timeout(20_000), cache: "no-store" });
    if (!response.ok) continue;
    const declared = Number(response.headers.get("content-length") ?? 0);
    if (declared > 10_000_000) throw new Error("PDF demasiado grande.");
    if (!response.body) continue;
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = []; let size = 0;
    for (;;) {
      const { value, done } = await reader.read(); if (done) break;
      size += value.length;
      if (size > 10_000_000) { await reader.cancel(); throw new Error("PDF demasiado grande."); }
      chunks.push(value);
    }
    const buffer = Buffer.concat(chunks);
    if (buffer.subarray(0, 5).toString() !== "%PDF-") continue;
    return buffer;
  }
  return null;
}

export async function orderFromMessage(message: GmailMessage, gmail: Pick<GmailClient, "attachment">, signal?: AbortSignal): Promise<Order | null> {
  const subject = messageHeader(message, "subject");
  const details = doorDashSubject(messageHeader(message, "from"), subject);
  if (!details) return null;
  const order: Order = { ...details, platform: "doordash", gmailMessageId: message.id, receivedAt: new Date(Number(message.internalDate)).toISOString(), status: "pending", items: [], currency: "USD", subject };
  try {
    const part = flattenParts(message.payload).find((p) => p.mimeType === "application/pdf" || /\.pdf$/i.test(p.filename ?? ""));
    let buffer: Buffer | null = null;
    if (part?.body?.size && part.body.size > 10_000_000) throw new Error("PDF demasiado grande.");
    if (part?.body?.data) buffer = decodeGmail(part.body.data);
    else if (part?.body?.attachmentId) buffer = await gmail.attachment(message.id, part.body.attachmentId);
    else buffer = await linkedPdf(message, signal);
    if (!buffer) { order.warning = "Pedido detectado. PDF no disponible; revisá el correo original para ver el detalle."; return order; }
    if (buffer.length > 10_000_000) throw new Error("PDF demasiado grande.");
    const parsed = parseDoorDashPdf(await extractPdf(buffer));
    const pdfId = /Order Number:\s*([a-z0-9-]+)/i.exec(parsed.pdfText ?? "")?.[1];
    if (pdfId && pdfId.toLowerCase() !== order.orderId) throw new Error("PDF corresponde a otro pedido.");
    Object.assign(order, parsed);
    if (!parsed.items.length) order.warning = "No se pudo reconocer el detalle de productos. Revisá el correo original.";
  } catch { order.warning = "Pedido detectado. No se pudo leer el PDF; revisá el correo original para completar el detalle."; }
  return order;
}

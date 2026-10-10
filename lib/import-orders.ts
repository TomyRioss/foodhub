import { GmailClient, messageHeader, type GmailMessage, type GmailReadFailure } from "./gmail.ts";
import { matchDoorDashSubject, orderFromMessage } from "./doordash.ts";
import type { ImportEvent, Order } from "./order-types.ts";

export interface ScanDependencies {
  startedAt: number;
  cutoff: number;
  signal?: AbortSignal;
  accountEmail?: string;
  messages: AsyncIterable<GmailMessage | GmailReadFailure>;
  parse: (message: GmailMessage) => Promise<Order | null>;
  upsert: (order: Order) => Promise<{ order: Order; created: boolean }>;
  completed: (startedAt: number) => Promise<void>;
}

export async function* scanOrderMessages({ startedAt, cutoff, signal, accountEmail, messages, parse, upsert, completed }: ScanDependencies): AsyncGenerator<ImportEvent> {
  const counts = { scanned: 0, matched: 0, created: 0, duplicates: 0, errors: 0 };
  yield { type: "progress", ...counts, message: "Analizando correos recibidos…" };
  for await (const message of messages) {
    if (signal?.aborted) throw new Error("Análisis cancelado.");
    counts.scanned++;
    if ("readError" in message) {
      counts.errors++;
      yield { type: "review", ...counts, review: { outcome: "error", reason: message.readError } };
      yield { type: "error", ...counts, message: message.readError };
      yield { type: "progress", ...counts };
      continue;
    }
    // Gmail's seconds-based search can include a boundary message; enforce exact milliseconds.
    const receivedAt = Number(message.internalDate);
    const sender = messageHeader(message, "from");
    const subject = messageHeader(message, "subject");
    const baseReview = {
      receivedAt: Number.isFinite(receivedAt) ? new Date(receivedAt).toISOString() : undefined,
      sender: sender.slice(0, 300),
      subject: subject.slice(0, 500),
    };
    const ignored = (reason: string) => ({ type: "review" as const, ...counts, review: { ...baseReview, outcome: "ignored" as const, reason } });
    if (!Number.isFinite(receivedAt)) {
      yield ignored("Fecha de recepción no válida");
      yield { type: "progress", ...counts };
      continue;
    }
    if (receivedAt < cutoff) {
      yield ignored("Fuera del período seleccionado");
      yield { type: "progress", ...counts };
      continue;
    }
    if (receivedAt > startedAt) {
      yield ignored("Recibido después del inicio del análisis");
      yield { type: "progress", ...counts };
      continue;
    }
    if (message.labelIds?.includes("DRAFT")) {
      yield ignored("Borrador excluido");
      yield { type: "progress", ...counts };
      continue;
    }
    const senderAddress = (sender.match(/<([^>]+)>/)?.[1] ?? sender).trim().toLowerCase();
    if (accountEmail && message.labelIds?.includes("SENT") && !message.labelIds.includes("INBOX") && senderAddress === accountEmail.toLowerCase()) {
      yield ignored("Copia enviada desde esta cuenta");
      yield { type: "progress", ...counts };
      continue;
    }
    const subjectCheck = matchDoorDashSubject(sender, subject);
    if (!subjectCheck.details) {
      yield ignored(subjectCheck.reason);
      yield { type: "progress", ...counts };
      continue;
    }
    try {
      const order = await parse(message);
      if (!order) {
        yield ignored("No se pudo extraer el pedido del mensaje");
      } else {
        counts.matched++;
        const result = await upsert(order);
        if (result.created) counts.created++; else counts.duplicates++;
        yield { type: "order", ...counts, order: result.order };
        const status = result.created ? "Pedido importado" : "Pedido duplicado; ya estaba guardado";
        yield { type: "review", ...counts, review: { ...baseReview, outcome: result.created ? "imported" : "duplicate", reason: `${status} · #${order.orderId}${order.warning ? ` · ${order.warning}` : ""}` } };
      }
    } catch {
      if (signal?.aborted) throw new Error("Análisis cancelado.");
      counts.errors++;
      yield { type: "review", ...counts, review: { ...baseReview, outcome: "error", reason: `No se pudo guardar el pedido #${subjectCheck.details.orderId}` } };
      yield { type: "error", ...counts, message: "No se pudo guardar un pedido. Podés repetir el análisis sin duplicarlo." };
    }
    yield { type: "progress", ...counts };
  }
  // Advance watermark only when every message was safely read and every matched order saved.
  if (!counts.errors) await completed(startedAt);
  yield { type: "done", ...counts, message: counts.errors ? "Análisis finalizado con errores. Repetí el análisis para recuperar los pedidos pendientes." : "Análisis completado." };
}

export async function* scanOrders({ since, signal }: { since?: number; signal?: AbortSignal } = {}): AsyncGenerator<ImportEvent> {
  const startedAt = Date.now();
  const cutoff = since ?? startedAt - 30 * 24 * 60 * 60 * 1000;
  const { getIntegration, saveIntegration, upsertOrder } = await import("./pocketbase");
  const tokens = await getIntegration();
  if (!tokens?.accessToken || !tokens.scope.includes("https://www.googleapis.com/auth/gmail.readonly")) throw new Error("Conectá Gmail con permiso de lectura para analizar los pedidos.");
  const gmail = new GmailClient(tokens, saveIntegration, signal);
  yield* scanOrderMessages({ startedAt, cutoff, signal, accountEmail: tokens.email ?? "atuantojofl@gmail.com", messages: gmail.messages(cutoff), parse: (message) => orderFromMessage(message, gmail, signal), upsert: upsertOrder, completed: async (time) => {
    const current = await getIntegration();
    if (current) await saveIntegration({ ...current, lastSyncedAt: new Date(time).toISOString() });
  } });
}

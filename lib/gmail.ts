import type { GmailIntegration } from "./order-types.ts";

export interface GmailPart {
  mimeType?: string;
  filename?: string;
  headers?: { name: string; value: string }[];
  body?: { data?: string; attachmentId?: string; size?: number };
  parts?: GmailPart[];
}
export interface GmailMessage { id: string; internalDate: string; labelIds?: string[]; payload: GmailPart }
export interface GmailReadFailure { id: string; readError: string }
export class GmailAccessError extends Error {}
export class GmailRateLimitError extends Error {}
const MAX_RETRIES = 2;
const RATE_LIMIT_REASONS = new Set(["rateLimitExceeded", "userRateLimitExceeded"]);
export const decodeGmail = (data: string) => Buffer.from(data, "base64url");
export function flattenParts(part: GmailPart): GmailPart[] {
  return [part, ...(part.parts ?? []).flatMap(flattenParts)];
}
export function messageHeader(message: GmailMessage, name: string) {
  return message.payload.headers?.find((header) => header.name.toLowerCase() === name.toLowerCase())?.value ?? "";
}
export function gmailQuery(since: number) {
  // Search is exclusive and second-granular; importer enforces the exact cutoff.
  return `in:anywhere from:orders@doordash.com after:${Math.max(0, Math.floor(since / 1000) - 1)} -in:drafts`;
}
export class GmailClient {
  private tokens: GmailIntegration;
  private persist: (tokens: GmailIntegration) => Promise<unknown>;
  private signal?: AbortSignal;
  constructor(tokens: GmailIntegration, persist: (tokens: GmailIntegration) => Promise<unknown>, signal?: AbortSignal) {
    this.tokens = tokens;
    this.persist = persist;
    this.signal = signal;
  }
  private requestSignal() {
    const timeout = AbortSignal.timeout(20_000);
    return this.signal ? AbortSignal.any([this.signal, timeout]) : timeout;
  }
  private async refresh() {
    if (!this.tokens.refreshToken) throw new GmailAccessError("Reconectá Gmail para autorizar la lectura de pedidos.");
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST", signal: this.requestSignal(), cache: "no-store",
      body: new URLSearchParams({ client_id: process.env.AUTH_GOOGLE_ID ?? "", client_secret: process.env.AUTH_GOOGLE_SECRET ?? "", refresh_token: this.tokens.refreshToken, grant_type: "refresh_token" }),
    });
    if (!response.ok) throw new GmailAccessError("La autorización de Gmail venció. Reconectá la cuenta.");
    const result = await response.json() as { access_token: string; expires_in: number; scope?: string };
    this.tokens = { ...this.tokens, accessToken: result.access_token, expiresAt: Date.now() + result.expires_in * 1000, scope: result.scope ?? this.tokens.scope };
    await this.persist(this.tokens);
  }
  private async pause(attempt: number) {
    const { setTimeout } = await import("node:timers/promises");
    const backoff = Math.min(1_000 * 2 ** attempt, 8_000) + Math.floor(Math.random() * 1_000);
    await setTimeout(backoff, undefined, { signal: this.signal });
  }
  private async request<T>(path: string, retry = true, attempt = 0): Promise<T> {
    if (this.tokens.expiresAt <= Date.now() + 60_000) await this.refresh();
    let response: Response;
    try {
      response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/${path}`, {
        headers: { Authorization: `Bearer ${this.tokens.accessToken}` }, signal: this.requestSignal(), cache: "no-store",
      });
    } catch {
      if (this.signal?.aborted) throw new Error("Análisis cancelado.");
      if (attempt < MAX_RETRIES) { await this.pause(attempt); return this.request(path, retry, attempt + 1); }
      throw new Error("No se pudo leer un correo por un error temporal de conexión.");
    }
    if (response.status === 401 && retry) { await this.refresh(); return this.request(path, false, attempt); }
    let reason: string | undefined;
    if (response.status === 403) {
      const result = await response.json().catch(() => ({})) as { error?: { errors?: { reason?: string }[] } };
      reason = result.error?.errors?.[0]?.reason;
    }
    const retryable = response.status === 429 || response.status >= 500 || (response.status === 403 && RATE_LIMIT_REASONS.has(reason ?? ""));
    if (retryable && attempt < MAX_RETRIES) {
      if (response.status !== 403) await response.body?.cancel().catch(() => undefined);
      await this.pause(attempt);
      return this.request(path, retry, attempt + 1);
    }
    if (!response.ok) {
      if (reason === "accessNotConfigured" || reason === "serviceDisabled") throw new GmailAccessError("Habilitá Gmail API en el proyecto de Google Cloud y volvé a intentar.");
      if (response.status === 401) throw new GmailAccessError("La autorización de Gmail venció. Reconectá la cuenta.");
      if (response.status === 403) {
        if (RATE_LIMIT_REASONS.has(reason ?? "")) throw new GmailRateLimitError(`Gmail alcanzó un límite temporal de solicitudes (${reason}). Esperá y reintentá.`);
        const safeReason = typeof reason === "string" && /^[A-Za-z0-9_.-]{1,64}$/.test(reason) ? reason : "unknown";
        throw new GmailAccessError(`Google rechazó la lectura de Gmail (403; reason: ${safeReason}). Verificá que Gmail API esté habilitada en el proyecto del cliente OAuth y que la cuenta permita este acceso.`);
      }
      if (response.status === 429) throw new Error("Gmail alcanzó su límite temporal. Intentá nuevamente en unos minutos.");
      throw new Error(`No se pudo consultar Gmail (${response.status}).`);
    }
    return response.json() as Promise<T>;
  }  async *messages(since: number): AsyncGenerator<GmailMessage | GmailReadFailure> {
    let pageToken: string | undefined;
    do {
      const params = new URLSearchParams({ q: gmailQuery(since), maxResults: "500", includeSpamTrash: "true" });
      if (pageToken) params.set("pageToken", pageToken);
      const page = await this.request<{ messages?: { id: string }[]; nextPageToken?: string }>(`messages?${params}`);
      for (const message of page.messages ?? []) {
        if (this.signal?.aborted) throw new Error("Análisis cancelado.");
        try {
          yield await this.request<GmailMessage>(`messages/${encodeURIComponent(message.id)}?format=full`);
        } catch (error) {
          if (this.signal?.aborted || error instanceof GmailAccessError || error instanceof GmailRateLimitError) throw error;
          yield { id: message.id, readError: "No se pudo leer un correo. Repetí el análisis para recuperarlo." };
        }
      }
      pageToken = page.nextPageToken;
    } while (pageToken);
  }
  async attachment(messageId: string, attachmentId: string) {
    const result = await this.request<{ data: string }>(`messages/${encodeURIComponent(messageId)}/attachments/${encodeURIComponent(attachmentId)}`);
    return decodeGmail(result.data);
  }
}

export const ORDER_STATUSES = ["pending", "preparing", "sent", "completed"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];
export interface OrderItem { quantity: number; name: string; options: string[]; price?: number }
export interface Order {
  id?: string;
  platform: "doordash";
  orderId: string;
  gmailMessageId: string;
  customer: string;
  restaurant: string;
  receivedAt: string;
  status: OrderStatus;
  items: OrderItem[];
  total?: number;
  currency: "USD";
  pickupTime?: string;
  pdfText?: string;
  warning?: string;
  subject: string;
}
export interface GmailIntegration {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  scope: string;
  email?: string;
  lastSyncedAt?: string;
}
export interface MailReview {
  receivedAt?: string;
  sender?: string;
  subject?: string;
  outcome: "imported" | "duplicate" | "ignored" | "error";
  reason: string;
}
export interface ImportEvent {
  type: "progress" | "order" | "review" | "error" | "done";
  scanned: number;
  matched: number;
  created: number;
  duplicates: number;
  errors: number;
  message?: string;
  order?: Order;
  review?: MailReview;
}

// Espejo de internal/domain/order.go (backend CoffeeProyect)

export type OrderStatus =
  | "confirmed"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled";

/** Estado de pago del pedido (espejo de internal/domain/order.go). */
export type PaymentStatus = "pending" | "paid" | "failed";

/** Estados de pago desde los que el cliente puede reintentar. */
export const RETRYABLE_PAYMENT_STATUSES: PaymentStatus[] = ["pending", "failed"];

export const ORDER_STATUSES: OrderStatus[] = [
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
];

/** Estados desde los que el backend permite cancelar (422 si no). */
export const CANCELLABLE_STATUSES: OrderStatus[] = ["confirmed", "processing"];

export interface OrderItem {
  id: string;
  coffee_id: string;
  coffee_name: string;
  quantity: number;
  unit_price_cents: number;
  subtotal_cents: number;
}

export interface Order {
  id: string;
  user_id: string;
  items: OrderItem[];
  shipping_street: string;
  shipping_city: string;
  shipping_department: string;
  shipping_country: string;
  total_cents: number;
  currency: string;
  status: OrderStatus;
  tracking_number?: string; // omitempty en el backend
  payment_status: PaymentStatus;
  paid_at?: string; // omitempty — solo cuando payment_status = "paid"
  created_at: string;
  updated_at: string;
}

/** Body de PATCH /admin/orders/{id}/status. */
export interface UpdateOrderStatusRequest {
  status: OrderStatus;
  tracking_number?: string;
}

/** Filtros de GET /admin/orders (query params; limit máx 100). */
export interface AdminOrderFilters {
  status?: OrderStatus;
  page?: number;
  limit?: number;
}

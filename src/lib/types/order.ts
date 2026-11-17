// Espejo de internal/domain/order.go (backend CoffeeProyect)

export type OrderStatus =
  | "confirmed"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled";

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
  created_at: string;
  updated_at: string;
}

/** Body de PATCH /admin/orders/{id}/status. */
export interface UpdateOrderStatusRequest {
  status: OrderStatus;
  tracking_number?: string;
}

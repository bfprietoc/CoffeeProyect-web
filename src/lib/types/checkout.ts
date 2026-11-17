// Espejo de internal/service/checkout_service.go (backend CoffeeProyect)

export interface ValidationItem {
  coffee_id: string;
  coffee_name: string;
  quantity: number; // RequestedQty en el backend
  stock_bags: number;
  available: boolean;
}

export interface ValidationResult {
  items: ValidationItem[];
  total_cents: number;
  currency: string;
  can_checkout: boolean;
}

/** Body de POST /orders. */
export interface PlaceOrderRequest {
  address_id: string;
}

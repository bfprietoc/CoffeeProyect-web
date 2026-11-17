// Espejo de internal/domain/cart.go (backend CoffeeProyect)

export interface CartItem {
  coffee_id: string;
  coffee_name: string;
  quantity: number;
  unit_price_cents: number;
  bag_size_grams: number;
  subtotal_cents: number;
}

export interface Cart {
  id: string;
  items: CartItem[];
  total_cents: number;
  currency: string;
}

/** Body de POST /cart/items. */
export interface AddCartItemRequest {
  coffee_id: string;
  quantity: number;
}

/** Body de PATCH /cart/items/{coffeeId}. */
export interface SetQuantityRequest {
  quantity: number;
}

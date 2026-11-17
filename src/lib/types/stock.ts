// Espejo de internal/domain/stock.go (backend CoffeeProyect)

export interface StockMovement {
  id: string;
  coffee_id: string;
  delta: number; // positivo = suma, negativo = resta
  result_stock: number;
  note: string;
  created_at: string;
}

/** Body de PATCH /admin/coffees/{id}/stock. */
export interface AdjustStockRequest {
  operation: "add" | "subtract";
  quantity: number;
  note: string;
}

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

/** Respuesta de GET /admin/coffees/{id}/stock. */
export interface StockInfo {
  coffee_id: string;
  stock_bags: number;
  movements: StockMovement[];
}

/** Respuesta de PATCH /admin/coffees/{id}/stock. */
export interface AdjustStockResult {
  coffee_id: string;
  old_stock: number;
  result_stock: number;
}

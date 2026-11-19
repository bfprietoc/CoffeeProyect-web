// Espejo de internal/domain/coffee.go (backend CoffeeProyect)

export interface Producer {
  id: string;
  name: string;
}

export interface Farm {
  id: string;
  name: string;
  country: string;
  region: string;
}

export interface Coffee {
  id: string;
  name: string;
  process: string;
  roast_level: string;
  tasting_notes: string[];
  description: string;
  producer: Producer;
  farm: Farm;
  bag_size_grams: number;
  price_cents: number;
  currency: string;
  available: boolean;
  stock_bags: number;
}

/** Filtros de GET /coffees (query params). */
export interface CoffeeFilters {
  roast_level?: string;
  country?: string;
  process?: string;
  available?: boolean;
}

/** Paginación de GET /coffees (limit máx 50). */
export interface CoffeePagination {
  page?: number;
  limit?: number;
}

/** Body de POST /admin/coffees. */
export interface CreateCoffeeRequest {
  name: string;
  process: string;
  roast_level: string;
  description: string;
  tasting_notes: string[];
  bag_size_grams: number;
  price_cents: number;
  currency: string;
  stock_bags: number;
  producer_name: string;
  farm_name: string;
  farm_country: string;
  farm_region: string;
}

/**
 * Body de PUT /admin/coffees/{id}. El backend SIEMPRE valida name, process,
 * roast_level y price_cents > 0 (400 si faltan), aunque el type sea Partial:
 * el form de edición siempre envía los cuatro. No acepta producer/farm ni
 * stock: el service conserva los valores existentes.
 */
export type UpdateCoffeeRequest = Partial<
  Pick<
    CreateCoffeeRequest,
    | "name"
    | "process"
    | "roast_level"
    | "description"
    | "tasting_notes"
    | "bag_size_grams"
    | "price_cents"
    | "currency"
  >
>;

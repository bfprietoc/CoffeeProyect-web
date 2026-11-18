import { cacheLife } from "next/cache";
import { getCoffee, listCoffees } from "@/lib/api/endpoints";
import type { Coffee, CoffeeFilters, CoffeePagination } from "@/lib/types";

/**
 * Capa de datos server para el catálogo público (Fase 1).
 *
 * Cada función es un "Cache Function" (`use cache`): el resultado se sirve
 * desde caché hasta que vence `cacheLife`, y los argumentos forman parte de
 * la clave (cada combinación de filtros tiene su propia entrada). El backend
 * invalida su cache de Redis tras cada mutación, así que un lifetime corto
 * (minutos) es suficiente para que el front siempre muestre datos frescos.
 */

export interface CatalogQuery extends CoffeeFilters, CoffeePagination {}

/** Página del catálogo con filtros y paginación (GET /coffees). */
export async function getCatalogPage(query: CatalogQuery): Promise<Coffee[]> {
  "use cache";
  cacheLife("minutes");
  return listCoffees(query);
}

/** Cafés destacados para la home: disponibles, primeros N del catálogo. */
export async function getFeaturedCoffees(limit = 6): Promise<Coffee[]> {
  "use cache";
  cacheLife("minutes");
  try {
    return await listCoffees({ available: true, limit });
  } catch {
    // La home se prerrenderiza en el build (CI no tiene backend corriendo):
    // sin API, la sección de destacados queda vacía en vez de tumbar el build.
    // El listado /coffees sí muestra su estado de error explícito.
    return [];
  }
}

/** Ficha de un café (GET /coffees/{id}). Lanza ApiError(404) si no existe. */
export async function getCoffeeById(id: string): Promise<Coffee> {
  "use cache";
  cacheLife("minutes");
  return getCoffee(id);
}

/** Valores distintos para poblar los filtros (país, proceso, tostado). */
export interface CatalogFacets {
  countries: string[];
  processes: string[];
  roastLevels: string[];
}

export async function getCatalogFacets(): Promise<CatalogFacets> {
  "use cache";
  cacheLife("minutes");
  // El catálogo completo cabe en una página de 50 (máx del backend).
  const coffees = await listCoffees({ limit: 50 });
  return {
    countries: [...new Set(coffees.map((c) => c.farm.country))].sort(),
    processes: [...new Set(coffees.map((c) => c.process))].sort(),
    roastLevels: [...new Set(coffees.map((c) => c.roast_level))].sort(),
  };
}

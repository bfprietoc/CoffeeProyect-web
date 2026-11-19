import { cacheLife } from "next/cache";
import type { ApiError } from "@/lib/api/client";
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

/**
 * Ficha de un café (GET /coffees/{id}). Devuelve `null` si no existe (404).
 *
 * El 404 NO se lanza como error: en PPR la capa de Server Components
 * sanitiza los errores entre pases de render (el error original se reemplaza
 * por un genérico "An error occurred in the Server Components render"), y
 * lanzar `notFound()` desde un catch no es fiable. Con `null` la decisión
 * vive en el flujo normal del render, como documenta notFound.md:
 * "The idiomatic place for the check is the data-access function itself".
 */
export async function getCoffeeByIdOrNull(id: string): Promise<Coffee | null> {
  "use cache";
  cacheLife("minutes");
  try {
    return await getCoffee(id);
  } catch (err) {
    // Duck typing: en RSC `instanceof ApiError` no es fiable (Turbopack
    // puede duplicar el módulo entre el grafo RSC y el de componentes
    // cliente). En /coffees/{id} un 404 siempre es "café inexistente".
    const e = err as Partial<ApiError> | null;
    if (e && e.name === "ApiError" && e.status === 404) return null;
    throw err; // otra falla (API caída, etc.) → error boundary de la ruta
  }
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

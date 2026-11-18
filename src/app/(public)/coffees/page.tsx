import Link from "next/link";
import { Suspense } from "react";
import { CoffeeCard } from "@/components/catalog/coffee-card";
import { CoffeeFilters } from "@/components/catalog/coffee-filters";
import { Pagination } from "@/components/catalog/pagination";
import { Button } from "@/components/ui/button";
import {
  getCatalogFacets,
  getCatalogPage,
  type CatalogQuery,
} from "@/lib/server/coffees";

/** Tamaños de página: el backend acepta hasta 50; 12 llena la grilla (3x4). */
const PAGE_SIZE = 12;

function firstParam(
  value: string | string[] | undefined,
): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** Valida la query string contra el contrato de GET /coffees. */
function parseQuery(
  searchParams: Record<string, string | string[] | undefined>,
): CatalogQuery & { page: number; limit: number } {
  const page = Number.parseInt(firstParam(searchParams.page) ?? "1", 10);
  const available = firstParam(searchParams.available);

  return {
    roast_level: firstParam(searchParams.roast_level) || undefined,
    process: firstParam(searchParams.process) || undefined,
    country: firstParam(searchParams.country) || undefined,
    available: available === "true" ? true : available === "false" ? false : undefined,
    page: Number.isFinite(page) && page >= 1 ? page : 1,
    limit: PAGE_SIZE,
  };
}

async function CatalogContent({
  searchParams,
}: Pick<PageProps<"/coffees">, "searchParams">) {
  const query = parseQuery(await searchParams);
  const [coffees, facets] = await Promise.all([
    getCatalogPage(query),
    getCatalogFacets(),
  ]);

  const hasPrev = query.page > 1;
  // El backend no devuelve total: si llegaron PAGE_SIZE, puede haber más.
  const hasNext = coffees.length === PAGE_SIZE;

  const filters: Record<string, string> = {};
  if (query.roast_level) filters.roast_level = query.roast_level;
  if (query.process) filters.process = query.process;
  if (query.country) filters.country = query.country;
  if (query.available !== undefined)
    filters.available = String(query.available);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-bold tracking-tight">Catálogo</h1>
      <p className="mt-1 text-muted-foreground">
        Cafés de especialidad por origen, proceso y tostado.
      </p>

      <div className="mt-6">
        <CoffeeFilters
          current={query}
          countries={facets.countries}
          processes={facets.processes}
          roastLevels={facets.roastLevels}
        />
      </div>

      {coffees.length === 0 ? (
        <div className="mt-10 rounded-lg border bg-card p-10 text-center">
          <p className="font-medium">No encontramos cafés con esos filtros.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Prueba quitando alguno o explora el catálogo completo.
          </p>
          <Button variant="outline" className="mt-4" render={<Link href="/coffees" />}>
            Ver todo el catálogo
          </Button>
        </div>
      ) : (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {coffees.map((coffee) => (
              <CoffeeCard key={coffee.id} coffee={coffee} />
            ))}
          </div>
          <div className="mt-8">
            <Pagination
              page={query.page}
              hasPrev={hasPrev}
              hasNext={hasNext}
              filters={filters}
            />
          </div>
        </>
      )}
    </div>
  );
}

export default function CoffeesPage(props: PageProps<"/coffees">) {
  return (
    <Suspense fallback={<CatalogSkeleton />}>
      <CatalogContent searchParams={props.searchParams} />
    </Suspense>
  );
}

function CatalogSkeleton() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10" aria-hidden>
      <div className="h-9 w-40 animate-pulse rounded-lg bg-muted" />
      <div className="mt-6 flex gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-8 w-32 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-48 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
    </div>
  );
}

"use client";

import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import type { CatalogQuery } from "@/lib/server/coffees";

interface CoffeeFiltersProps {
  /** Valores actuales (los lee la página server de searchParams). */
  current: CatalogQuery;
  countries: string[];
  processes: string[];
  roastLevels: string[];
}

const selectClasses =
  "h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50";

/**
 * Filtros del catálogo (GET /coffees). Cada cambio hace una transición de
 * cliente (`router.replace`) con la nueva query string: sin recarga completa
 * y URLs compartibles. Cambiar un filtro reinicia la paginación a la página 1.
 */
export function CoffeeFilters({
  current,
  countries,
  processes,
  roastLevels,
}: CoffeeFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();

  function update(patch: Partial<CatalogQuery>) {
    const next: CatalogQuery = { ...current, ...patch };
    delete next.page; // cambiar filtros → volver a la página 1
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(next)) {
      if (value === undefined || value === "") continue;
      search.set(key, String(value));
    }
    const qs = search.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  const hasActiveFilters =
    current.roast_level !== undefined ||
    current.process !== undefined ||
    current.country !== undefined ||
    current.available === true;

  return (
    <div className="flex flex-wrap items-end gap-3">
      <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
        Tostado
        <select
          className={selectClasses}
          value={current.roast_level ?? ""}
          onChange={(e) =>
            update({ roast_level: e.target.value || undefined })
          }
        >
          <option value="">Todos</option>
          {roastLevels.map((level) => (
            <option key={level} value={level}>
              {level.charAt(0).toUpperCase() + level.slice(1)}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
        Proceso
        <select
          className={selectClasses}
          value={current.process ?? ""}
          onChange={(e) => update({ process: e.target.value || undefined })}
        >
          <option value="">Todos</option>
          {processes.map((p) => (
            <option key={p} value={p}>
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
        País
        <select
          className={selectClasses}
          value={current.country ?? ""}
          onChange={(e) => update({ country: e.target.value || undefined })}
        >
          <option value="">Todos</option>
          {countries.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>

      <label className="flex h-8 cursor-pointer items-center gap-2 text-sm">
        <input
          type="checkbox"
          className="size-4 accent-[var(--primary)]"
          checked={current.available ?? false}
          onChange={(e) => update({ available: e.target.checked || undefined })}
        />
        Solo disponibles
      </label>

      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() =>
            update({
              roast_level: undefined,
              process: undefined,
              country: undefined,
              available: undefined,
            })
          }
        >
          Limpiar filtros
        </Button>
      )}
    </div>
  );
}

import Link from "next/link";
import { Button } from "@/components/ui/button";

interface PaginationProps {
  page: number;
  hasPrev: boolean;
  hasNext: boolean;
  /** Filtros activos que se conservan al cambiar de página. */
  filters: Record<string, string>;
}

/** Paginación del catálogo: el backend no devuelve total, así que `hasNext`
 * se infiere en la página (length === limit). */
export function Pagination({ page, hasPrev, hasNext, filters }: PaginationProps) {
  function hrefFor(target: number): string {
    const search = new URLSearchParams(filters);
    search.set("page", String(target));
    return `/coffees?${search.toString()}`;
  }

  return (
    <nav aria-label="Paginación" className="flex items-center justify-between gap-4">
      <Button
        variant="outline"
        size="sm"
        disabled={!hasPrev}
        render={hasPrev ? <Link href={hrefFor(page - 1)} /> : undefined}
      >
        ← Anterior
      </Button>
      <span className="text-sm text-muted-foreground">Página {page}</span>
      <Button
        variant="outline"
        size="sm"
        disabled={!hasNext}
        render={hasNext ? <Link href={hrefFor(page + 1)} /> : undefined}
      >
        Siguiente →
      </Button>
    </nav>
  );
}

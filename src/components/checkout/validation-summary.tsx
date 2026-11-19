"use client";

import { formatPrice } from "@/lib/format";
import type { ValidationResult } from "@/lib/types";

/**
 * Resumen de la validación de checkout (GET /checkout/validate): stock
 * disponible por ítem y total. Cuando `can_checkout` es false el backend
 * ya no deja crear la orden (422), así que se muestra el aviso y el total
 * solo cuenta los ítems disponibles.
 */
export function ValidationSummary({ result }: { result: ValidationResult }) {
  return (
    <section className="rounded-xl border p-4">
      <h2 className="text-lg font-semibold">Disponibilidad y total</h2>

      <ul className="mt-3 divide-y">
        {result.items.map((item) => (
          <li key={item.coffee_id} className="flex flex-wrap items-center gap-3 py-2.5">
            <div className="min-w-0 flex-1">
              <p className="font-medium">{item.coffee_name}</p>
              <p className="text-sm text-muted-foreground">
                Cantidad: {item.quantity} · Stock disponible: {item.stock_bags}
              </p>
            </div>
            {item.available ? (
              <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                Disponible ✓
              </span>
            ) : (
              <span className="text-sm font-medium text-destructive">Sin stock suficiente</span>
            )}
          </li>
        ))}
      </ul>

      {!result.can_checkout && (
        <div className="mt-3 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm">
          <p className="font-medium text-destructive">
            No puedes completar la compra ahora mismo.
          </p>
          <p className="mt-1 text-muted-foreground">
            Revisa los ítems marcados como sin stock y ajusta tu carrito.
          </p>
        </div>
      )}

      <div className="mt-4 flex items-center justify-between border-t pt-3">
        <p className="text-sm text-muted-foreground">
          {result.can_checkout ? "Total" : "Total de ítems disponibles"}
        </p>
        <p className="text-xl font-bold tabular-nums">
          {formatPrice(result.total_cents, result.currency)}
        </p>
      </div>
    </section>
  );
}

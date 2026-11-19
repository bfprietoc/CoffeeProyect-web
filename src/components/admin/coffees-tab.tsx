"use client";

import { useState } from "react";
import { ApiError } from "@/lib/api/client";
import type { Coffee } from "@/lib/types";
import { formatPrice, processLabel, roastLabel } from "@/lib/format";
import { useAdminCoffees, useAdminDeleteCoffee } from "@/lib/query/admin";
import { CoffeeForm } from "./coffee-form";
import { StockPanel } from "./stock-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

/**
 * Pestaña «Cafés» del panel: tabla con CRUD completo.
 * - Crear/editar: CoffeeForm inline (reemplaza la tabla, como el form de
 *   direcciones en /account).
 * - Stock: panel inline con movimientos (reemplaza la tabla).
 * - Eliminar: confirmación en dos pasos inline en la fila (mismo patrón que
 *   dirección y cancelación de pedidos).
 */
export function CoffeesTab() {
  const coffees = useAdminCoffees();

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Coffee | null>(null);
  const [stockFor, setStockFor] = useState<Coffee | null>(null);

  if (stockFor) {
    return (
      <StockPanel
        coffeeId={stockFor.id}
        coffeeName={stockFor.name}
        onBack={() => setStockFor(null)}
      />
    );
  }

  if (creating || editing) {
    return (
      <CoffeeForm
        mode={creating ? "create" : "edit"}
        coffee={editing ?? undefined}
        onDone={() => {
          setCreating(false);
          setEditing(null);
        }}
      />
    );
  }

  if (coffees.isPending) {
    return (
      <div className="space-y-3" aria-busy>
        <div className="h-10 w-32 animate-pulse rounded-lg bg-muted" />
        <div className="h-48 animate-pulse rounded-xl bg-muted" />
      </div>
    );
  }

  if (coffees.isError) {
    return (
      <div className="rounded-lg border p-6 text-center">
        <p className="text-muted-foreground">No se pudieron cargar los cafés.</p>
        <Button variant="outline" className="mt-3" onClick={() => coffees.refetch()}>
          Reintentar
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {coffees.data.length}{" "}
          {coffees.data.length === 1 ? "café" : "cafés"} (incluye agotados)
        </p>
        <Button onClick={() => setCreating(true)}>Nuevo café</Button>
      </div>

      {coffees.data.length === 0 ? (
        <div className="rounded-lg border p-10 text-center">
          <p className="font-medium">Aún no hay cafés en el catálogo.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Crea el primero con «Nuevo café».
          </p>
        </div>
      ) : (
        <ul className="divide-y overflow-x-auto rounded-xl border">
          {coffees.data.map((coffee) => (
            <CoffeeRow
              key={coffee.id}
              coffee={coffee}
              onEdit={() => setEditing(coffee)}
              onStock={() => setStockFor(coffee)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function CoffeeRow({
  coffee,
  onEdit,
  onStock,
}: {
  coffee: Coffee;
  onEdit: () => void;
  onStock: () => void;
}) {
  const deleteCoffee = useAdminDeleteCoffee();
  const [confirming, setConfirming] = useState(false);

  function handleConfirm() {
    deleteCoffee.mutate(coffee.id, { onSettled: () => setConfirming(false) });
  }

  if (deleteCoffee.isError) {
    // El backend puede rechazar el borrado con un motivo concreto (409 si el
    // café ya fue vendido): se muestra tal cual en vez de un genérico.
    const reason =
      deleteCoffee.error instanceof ApiError
        ? `${deleteCoffee.error.message} (HTTP ${deleteCoffee.error.status})`
        : "error desconocido";
    return (
      <li className="flex flex-wrap items-center gap-3 px-4 py-3">
        <p role="alert" className="flex-1 text-sm font-medium text-destructive">
          No se pudo eliminar «{coffee.name}»: {reason}.
        </p>
        <Button variant="ghost" size="sm" onClick={() => deleteCoffee.reset()}>
          Volver a intentar
        </Button>
      </li>
    );
  }

  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
      <div className="min-w-40 flex-1">
        <p className="font-medium">{coffee.name}</p>
        <p className="text-xs text-muted-foreground">
          {coffee.farm.name || "Finca s/n"}
          {coffee.farm.region ? ` · ${coffee.farm.region}` : ""}
        </p>
      </div>

      <span className="text-sm text-muted-foreground">
        {processLabel(coffee.process)} · {roastLabel(coffee.roast_level)}
      </span>

      <span className="text-sm font-medium tabular-nums">
        {formatPrice(coffee.price_cents, coffee.currency)}
      </span>

      <span className="flex w-24 items-center gap-2 text-sm tabular-nums">
        {coffee.stock_bags}
        {coffee.available ? (
          <span className="text-xs text-muted-foreground">bolsas</span>
        ) : (
          <Badge variant="destructive">Agotado</Badge>
        )}
      </span>

      {confirming ? (
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-medium">¿Eliminar este café?</p>
          <Button variant="destructive" size="sm" onClick={handleConfirm}>
            Sí, eliminar
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>
            Volver
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onEdit}>
            Editar
          </Button>
          <Button variant="outline" size="sm" onClick={onStock}>
            Stock
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-destructive hover:bg-destructive/10"
            onClick={() => setConfirming(true)}
          >
            Eliminar
          </Button>
        </div>
      )}
    </li>
  );
}

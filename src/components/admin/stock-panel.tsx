"use client";

import { useState } from "react";
import { ApiError } from "@/lib/api/client";
import { useAdminAdjustStock, useAdminStock } from "@/lib/query/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const dateFmt = new Intl.DateTimeFormat("es-CO", {
  dateStyle: "medium",
  timeStyle: "short",
});

const selectClasses =
  "h-9 w-full rounded-lg border border-input bg-background px-2.5 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50";

interface StockPanelProps {
  coffeeId: string;
  coffeeName: string;
  onBack: () => void;
}

/**
 * Stock de un café (GET/PATCH /admin/coffees/{id}/stock): stock actual,
 * formulario de ajuste (add/subtract + nota) y listado de movimientos
 * (el backend los devuelve en DESC). Tras un ajuste se invalida la query
 * de stock y la lista de cafés (cambia `stock_bags`).
 */
export function StockPanel({ coffeeId, coffeeName, onBack }: StockPanelProps) {
  const stock = useAdminStock(coffeeId);
  const adjustStock = useAdminAdjustStock();

  const [operation, setOperation] = useState<"add" | "subtract">("add");
  const [quantity, setQuantity] = useState("");
  const [note, setNote] = useState("");
  const [feedback, setFeedback] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const quantityNum = Number.parseInt(quantity, 10);
  const isValid = Number.isInteger(quantityNum) && quantityNum > 0;

  async function handleAdjust(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid || adjustStock.isPending) return;
    setFeedback("");
    setErrorMessage("");
    try {
      const result = await adjustStock.mutateAsync({
        coffeeId,
        body: { operation, quantity: quantityNum, note: note.trim() },
      });
      setFeedback(
        `Stock ajustado: ${result.old_stock} → ${result.result_stock} bolsas.`,
      );
      setQuantity("");
      setNote("");
    } catch (err) {
      setErrorMessage(
        err instanceof ApiError
          ? `${err.message} (HTTP ${err.status})`
          : "No se pudo ajustar el stock.",
      );
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Stock: {coffeeName}</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Ajustes registrados como movimientos auditables.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={onBack}>
          ← Volver a cafés
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        {/* Ajuste */}
        <form onSubmit={handleAdjust} className="flex flex-col gap-3 self-start rounded-xl border p-4">
          <h3 className="text-sm font-semibold">Ajustar stock</h3>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="stock-operation">Operación</Label>
            <select
              id="stock-operation"
              className={selectClasses}
              value={operation}
              onChange={(e) => setOperation(e.target.value as "add" | "subtract")}
            >
              <option value="add">Sumar (+)</option>
              <option value="subtract">Restar (−)</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="stock-quantity">Cantidad (bolsas)</Label>
            <Input
              id="stock-quantity"
              type="number"
              min="1"
              step="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="stock-note">Nota (opcional)</Label>
            <Input
              id="stock-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Recepción de lote, ajuste de inventario…"
            />
          </div>

          {feedback && (
            <p aria-live="polite" className="text-sm font-medium text-muted-foreground">
              {feedback}
            </p>
          )}
          {errorMessage && (
            <p role="alert" className="text-sm font-medium text-destructive">
              {errorMessage}
            </p>
          )}

          <Button type="submit" disabled={!isValid || adjustStock.isPending}>
            {adjustStock.isPending ? "Aplicando…" : "Aplicar ajuste"}
          </Button>
        </form>

        {/* Stock actual + movimientos */}
        <div className="flex flex-col gap-4">
          {stock.isPending ? (
            <div className="h-40 animate-pulse rounded-xl bg-muted" aria-busy />
          ) : stock.isError ? (
            <div className="rounded-lg border p-6 text-center">
              <p className="text-muted-foreground">No se pudo cargar el stock.</p>
              <Button variant="outline" className="mt-3" onClick={() => stock.refetch()}>
                Reintentar
              </Button>
            </div>
          ) : (
            <>
              <div className="rounded-xl border p-4">
                <p className="text-sm text-muted-foreground">Stock actual</p>
                <p className="text-3xl font-bold tracking-tight">
                  {stock.data.stock_bags}{" "}
                  <span className="text-base font-normal text-muted-foreground">
                    bolsas
                  </span>
                </p>
              </div>

              <div className="rounded-xl border">
                <h3 className="border-b px-4 py-3 text-sm font-semibold">
                  Movimientos ({stock.data.movements.length})
                </h3>
                {stock.data.movements.length === 0 ? (
                  <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                    Sin movimientos todavía. El stock inicial del café no genera
                    movimiento.
                  </p>
                ) : (
                  <ul className="divide-y">
                    {stock.data.movements.map((m) => (
                      <li key={m.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
                        <span
                          className={`w-14 text-sm font-semibold tabular-nums ${
                            m.delta > 0 ? "text-emerald-600" : "text-destructive"
                          }`}
                        >
                          {m.delta > 0 ? `+${m.delta}` : m.delta}
                        </span>
                        <span className="text-sm tabular-nums text-muted-foreground">
                          → {m.result_stock}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-sm">
                          {m.note || <em className="text-muted-foreground">sin nota</em>}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {dateFmt.format(new Date(m.created_at))}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

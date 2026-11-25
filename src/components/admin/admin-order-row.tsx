"use client";

import { useState } from "react";
import { ApiError } from "@/lib/api/client";
import type { Order, OrderStatus } from "@/lib/types";
import { ORDER_STATUSES } from "@/lib/types";
import { formatPrice } from "@/lib/format";
import { useAdminUpdateOrderStatus } from "@/lib/query/admin";
import { OrderStatusBadge } from "@/components/orders/order-status-badge";
import { PaymentBadge } from "@/components/orders/payment-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const STATUS_LABELS: Record<OrderStatus, string> = {
  confirmed: "Confirmado",
  processing: "En preparación",
  shipped: "Enviado",
  delivered: "Entregado",
  cancelled: "Cancelado",
};

const selectClasses =
  "h-9 w-full rounded-lg border border-input bg-background px-2.5 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50";

const dateFmt = new Intl.DateTimeFormat("es-CO", { dateStyle: "medium" });

interface AdminOrderRowProps {
  order: Order;
}

/**
 * Fila de orden en el panel (GET /admin/orders + PATCH .../status).
 * Expandible: ítems, dirección completa y control de cambio de estado con
 * tracking number opcional (recomendado para «Enviado»).
 *
 * Nota: el backend NO valida transiciones de estado (cualquier estado es
 * aceptable desde cualquier otro) — documentado en FRONTEND_PLAN.md Fase 5.
 */
export function AdminOrderRow({ order }: AdminOrderRowProps) {
  const [expanded, setExpanded] = useState(false);
  const updateStatus = useAdminUpdateOrderStatus();

  const [newStatus, setNewStatus] = useState<OrderStatus>(order.status);
  const [tracking, setTracking] = useState(order.tracking_number ?? "");
  const [feedback, setFeedback] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const statusChanged = newStatus !== order.status;
  const trackingChanged = tracking.trim() !== (order.tracking_number ?? "");

  async function handleApply(e: React.FormEvent) {
    e.preventDefault();
    if (!statusChanged || updateStatus.isPending) return;
    setFeedback("");
    setErrorMessage("");
    try {
      await updateStatus.mutateAsync({
        id: order.id,
        body: {
          status: newStatus,
          ...(trackingChanged ? { tracking_number: tracking.trim() } : {}),
        },
      });
      setFeedback(`Estado actualizado a «${STATUS_LABELS[newStatus]}».`);
    } catch (err) {
      if (err instanceof ApiError && err.code === "PAYMENT_REQUIRED") {
        setErrorMessage("El pedido debe pagarse antes de pasar a «En preparación».");
      } else {
        setErrorMessage(
          err instanceof ApiError ? err.message : "No se pudo actualizar el pedido.",
        );
      }
    }
  }

  const itemCount = order.items.reduce((sum, it) => sum + it.quantity, 0);

  return (
    <li className="flex flex-col">
      {/* Fila colapsada */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
        <div className="min-w-28">
          <p className="font-mono text-sm font-medium">#{order.id.slice(0, 8)}</p>
          <p className="text-xs text-muted-foreground">
            {dateFmt.format(new Date(order.created_at))}
          </p>
        </div>
        <div className="min-w-32 flex-1">
          <p className="text-sm">
            {order.shipping_city}, {order.shipping_department}
          </p>
          <p className="text-xs text-muted-foreground">
            {itemCount} {itemCount === 1 ? "bolsa" : "bolsas"}
          </p>
        </div>
        <p className="text-sm font-medium tabular-nums">
          {formatPrice(order.total_cents, order.currency)}
        </p>
        <PaymentBadge status={order.payment_status} />
        <OrderStatusBadge status={order.status} />
        {order.tracking_number && (
          <span className="hidden font-mono text-xs text-muted-foreground md:inline">
            {order.tracking_number}
          </span>
        )}
        <Button variant="outline" size="sm" onClick={() => setExpanded(!expanded)}>
          {expanded ? "Ocultar" : "Gestionar"}
        </Button>
      </div>

      {/* Detalle expandible */}
      {expanded && (
        <div className="border-t bg-muted/30 px-4 py-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="flex flex-col gap-3">
              <h4 className="text-sm font-semibold">Ítems</h4>
              <ul className="divide-y rounded-lg border bg-background">
                {order.items.map((it) => (
                  <li key={it.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                    <span>
                      {it.quantity} × {it.coffee_name}
                    </span>
                    <span className="tabular-nums text-muted-foreground">
                      {formatPrice(it.subtotal_cents, order.currency)}
                    </span>
                  </li>
                ))}
              </ul>

              <div className="text-sm">
                <h4 className="font-semibold">Dirección de envío</h4>
                <p className="mt-1 text-muted-foreground">
                  {order.shipping_street}, {order.shipping_city},{" "}
                  {order.shipping_department}, {order.shipping_country}
                </p>
              </div>
            </div>

            <form onSubmit={handleApply} className="flex flex-col gap-3 self-start rounded-lg border bg-background p-4">
              <h4 className="text-sm font-semibold">Cambiar estado</h4>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`order-status-${order.id}`}>Nuevo estado</Label>
                <select
                  id={`order-status-${order.id}`}
                  className={selectClasses}
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as OrderStatus)}
                >
                  {ORDER_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABELS[s]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`order-tracking-${order.id}`}>
                  Tracking number {newStatus === "shipped" ? "(recomendado)" : "(opcional)"}
                </Label>
                <Input
                  id={`order-tracking-${order.id}`}
                  value={tracking}
                  onChange={(e) => setTracking(e.target.value)}
                  placeholder="Ej. SERVIENTREGA-987654"
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

              <div className="flex items-center gap-3">
                <Button
                  type="submit"
                  disabled={!statusChanged || updateStatus.isPending}
                >
                  {updateStatus.isPending ? "Guardando…" : "Guardar estado"}
                </Button>
                <span className="text-xs text-muted-foreground">
                  Estado actual: {STATUS_LABELS[order.status]}
                </span>
              </div>
            </form>
          </div>
        </div>
      )}
    </li>
  );
}

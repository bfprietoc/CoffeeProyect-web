"use client";

import { useState } from "react";
import type { OrderStatus } from "@/lib/types";
import { ORDER_STATUSES } from "@/lib/types";
import { useAdminOrders } from "@/lib/query/admin";
import { AdminOrderRow } from "./admin-order-row";
import { Button } from "@/components/ui/button";

const STATUS_LABELS: Record<OrderStatus, string> = {
  confirmed: "Confirmado",
  processing: "En preparación",
  shipped: "Enviado",
  delivered: "Entregado",
  cancelled: "Cancelado",
};

const selectClasses =
  "h-9 w-full rounded-lg border border-input bg-background px-2.5 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50";

/**
 * Pestaña «Órdenes» del panel: todas las órdenes de todos los usuarios
 * (GET /admin/orders) con filtro por estado y gestión inline
 * (cambio de estado + tracking number, ver AdminOrderRow).
 */
export function OrdersTab() {
  const [status, setStatus] = useState<OrderStatus | undefined>(undefined);
  const orders = useAdminOrders(status);

  if (orders.isPending) {
    return (
      <div className="space-y-3" aria-busy>
        <div className="h-10 w-40 animate-pulse rounded-lg bg-muted" />
        <div className="h-48 animate-pulse rounded-xl bg-muted" />
      </div>
    );
  }

  if (orders.isError) {
    return (
      <div className="rounded-lg border p-6 text-center">
        <p className="text-muted-foreground">No se pudieron cargar las órdenes.</p>
        <Button variant="outline" className="mt-3" onClick={() => orders.refetch()}>
          Reintentar
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex w-full max-w-56 flex-col gap-1 text-xs font-medium text-muted-foreground">
          Filtrar por estado
          <select
            className={selectClasses}
            value={status ?? ""}
            onChange={(e) =>
              setStatus(e.target.value ? (e.target.value as OrderStatus) : undefined)
            }
          >
            <option value="">Todos</option>
            {ORDER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </label>
        <p className="text-sm text-muted-foreground">
          {orders.data.length}{" "}
          {orders.data.length === 1 ? "orden" : "órdenes"}
          {status ? ` · ${STATUS_LABELS[status]}` : ""}
        </p>
      </div>

      {orders.data.length === 0 ? (
        <div className="rounded-lg border p-10 text-center">
          <p className="font-medium">
            {status ? `No hay órdenes «${STATUS_LABELS[status]}».` : "Aún no hay órdenes."}
          </p>
        </div>
      ) : (
        <ul className="divide-y overflow-x-auto rounded-xl border">
          {orders.data.map((order) => (
            <AdminOrderRow key={order.id} order={order} />
          ))}
        </ul>
      )}
    </div>
  );
}

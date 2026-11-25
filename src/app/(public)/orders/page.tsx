"use client";

import Link from "next/link";
import { useMounted } from "@/lib/hooks/use-mounted";
import { formatPrice } from "@/lib/format";
import { useIsAuthenticated, useOrders } from "@/lib/query/orders";
import { OrderStatusBadge } from "@/components/orders/order-status-badge";
import { PaymentBadge } from "@/components/orders/payment-badge";
import { LoginPrompt } from "@/components/layout/login-prompt";
import { Button } from "@/components/ui/button";

const dateFmt = new Intl.DateTimeFormat("es-CO", { dateStyle: "medium" });

export default function OrdersPage() {
  const mounted = useMounted();
  const authed = useIsAuthenticated();
  const orders = useOrders();

  // SSR y primer render: skeleton (evita flash del login prompt para
  // usuarios autenticados; ver nota en checkout/page.tsx).
  if (!mounted) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-10" aria-busy>
        <h1 className="text-2xl font-bold tracking-tight">Mis pedidos</h1>
        <div className="mt-6 space-y-3">
          <div className="h-16 animate-pulse rounded-lg bg-muted" />
          <div className="h-16 animate-pulse rounded-lg bg-muted" />
        </div>
      </div>
    );
  }

  if (!authed) return <LoginPrompt next="/orders" />;

  if (orders.isPending) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-10" aria-busy>
        <h1 className="text-2xl font-bold tracking-tight">Mis pedidos</h1>
        <div className="mt-6 space-y-3">
          <div className="h-16 animate-pulse rounded-lg bg-muted" />
          <div className="h-16 animate-pulse rounded-lg bg-muted" />
        </div>
      </div>
    );
  }

  if (orders.isError) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-10">
        <h1 className="text-2xl font-bold tracking-tight">Mis pedidos</h1>
        <div className="mt-6 rounded-lg border p-6 text-center">
          <p className="text-muted-foreground">No se pudieron cargar tus pedidos.</p>
          <Button variant="outline" className="mt-3" onClick={() => orders.refetch()}>
            Reintentar
          </Button>
        </div>
      </div>
    );
  }

  if (orders.data.length === 0) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-10">
        <h1 className="text-2xl font-bold tracking-tight">Mis pedidos</h1>
        <div className="mt-6 rounded-lg border p-10 text-center">
          <p className="text-muted-foreground">Aún no tienes pedidos.</p>
          <Link href="/coffees" className="mt-3 inline-block">
            <Button>Ver catálogo</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-bold tracking-tight">Mis pedidos</h1>

      <ul className="mt-6 divide-y rounded-xl border">
        {orders.data.map((order) => (
          <li key={order.id} className="flex flex-wrap items-center gap-3 p-4">
            <div className="min-w-0 flex-1">
              <Link
                href={`/orders/${order.id}`}
                className="font-medium transition-colors hover:text-primary"
              >
                Pedido {order.id.slice(0, 8)}
              </Link>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {dateFmt.format(new Date(order.created_at))} ·{" "}
                {order.items.length === 1 ? "1 ítem" : `${order.items.length} ítems`}
              </p>
            </div>

            <PaymentBadge status={order.payment_status} />
            <OrderStatusBadge status={order.status} />

            <span className="w-24 text-right font-medium tabular-nums">
              {formatPrice(order.total_cents, order.currency)}
            </span>

            <Link href={`/orders/${order.id}`}>
              <Button variant="outline" size="sm">
                Ver detalle
              </Button>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

"use client";

import { Suspense, use } from "react";
import Link from "next/link";
import { ApiError } from "@/lib/api/client";
import { useMounted } from "@/lib/hooks/use-mounted";
import { formatPrice } from "@/lib/format";
import type { Order } from "@/lib/types";
import { useIsAuthenticated, useOrder } from "@/lib/query/orders";
import { OrderStatusBadge } from "@/components/orders/order-status-badge";
import { CancelOrderButton } from "@/components/orders/cancel-order-button";
import { LoginPrompt } from "@/components/layout/login-prompt";
import { Button } from "@/components/ui/button";

const dateFmt = new Intl.DateTimeFormat("es-CO", {
  dateStyle: "medium",
  timeStyle: "short",
});

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  // Next 16 + Cache Components: `use(params)` suspende durante el prerender
  // (blocking-prerender-dynamic); el fallback de Suspense es lo que viaja en
  // el shell estático y el contenido se streamea después.
  return (
    <Suspense fallback={<OrderDetailSkeleton />}>
      <OrderDetailFromParams params={params} />
    </Suspense>
  );
}

function OrderDetailFromParams({ params }: { params: Promise<{ id: string }> }) {
  // Next 16: en client components `params` llega como Promise.
  const { id } = use(params);
  return <OrderDetail id={id} />;
}

function OrderDetailSkeleton() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10" aria-busy>
      <div className="h-8 w-40 animate-pulse rounded-lg bg-muted" />
      <div className="mt-6 h-40 animate-pulse rounded-xl bg-muted" />
    </div>
  );
}

function OrderDetail({ id }: { id: string }) {
  const mounted = useMounted();
  const authed = useIsAuthenticated();
  const order = useOrder(id);

  if (!mounted) return <OrderDetailSkeleton />;

  if (!authed) return <LoginPrompt next={`/orders/${id}`} />;

  if (order.isPending) return <OrderDetailSkeleton />;

  if (order.isError) {
    const notFound = order.error instanceof ApiError && order.error.status === 404;
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-10">
        <div className="mt-6 rounded-lg border p-10 text-center">
          <p className="font-medium">
            {notFound ? "Pedido no encontrado." : "No se pudo cargar el pedido."}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {notFound
              ? "Puede que no exista o no sea tuyo."
              : "Revisa tu conexión e intenta de nuevo."}
          </p>
          <div className="mt-4 flex justify-center gap-3">
            {notFound ? (
              <Link href="/orders">
                <Button variant="outline">Ver mis pedidos</Button>
              </Link>
            ) : (
              <Button variant="outline" onClick={() => order.refetch()}>
                Reintentar
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const o: Order = order.data;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <Link
        href="/orders"
        className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        ← Mis pedidos
      </Link>

      <div className="mt-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pedido {o.id.slice(0, 8)}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {dateFmt.format(new Date(o.created_at))}
          </p>
        </div>
        <OrderStatusBadge status={o.status} />
      </div>

      <section className="mt-6 rounded-xl border p-4">
        <h2 className="text-lg font-semibold">Ítems</h2>
        <ul className="mt-3 divide-y">
          {o.items.map((item) => (
            <li key={item.id} className="flex flex-wrap items-center gap-3 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="font-medium">{item.coffee_name}</p>
                <p className="text-sm text-muted-foreground">
                  {item.quantity} × {formatPrice(item.unit_price_cents, o.currency)}
                </p>
              </div>
              <span className="font-medium tabular-nums">
                {formatPrice(item.subtotal_cents, o.currency)}
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex items-center justify-between border-t pt-3">
          <p className="text-sm text-muted-foreground">Total</p>
          <p className="text-xl font-bold tabular-nums">
            {formatPrice(o.total_cents, o.currency)}
          </p>
        </div>
      </section>

      <section className="mt-4 rounded-xl border p-4">
        <h2 className="text-lg font-semibold">Dirección de envío</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {o.shipping_street}, {o.shipping_city}, {o.shipping_department} · {o.shipping_country}
        </p>
      </section>

      {o.tracking_number && (
        <section className="mt-4 rounded-xl border p-4">
          <h2 className="text-lg font-semibold">Envío</h2>
          <p className="mt-2 text-sm tabular-nums">Guía: {o.tracking_number}</p>
        </section>
      )}

      <div className="mt-6">
        <CancelOrderButton orderId={o.id} status={o.status} />
      </div>
    </div>
  );
}

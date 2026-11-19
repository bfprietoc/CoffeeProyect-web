"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { QuantityStepper } from "@/components/cart/quantity-stepper";
import { formatPrice } from "@/lib/format";
import {
  useCart,
  useClearCart,
  useRemoveCartItem,
  useSetCartItemQuantity,
} from "@/lib/query/cart";
import { useIsAuthenticated } from "@/lib/query/orders";

export default function CartPage() {
  const cart = useCart();

  if (cart.isPending) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-10" aria-busy>
        <h1 className="text-2xl font-bold tracking-tight">Tu carrito</h1>
        <div className="mt-6 space-y-3">
          <div className="h-16 animate-pulse rounded-lg bg-muted" />
          <div className="h-16 animate-pulse rounded-lg bg-muted" />
        </div>
      </div>
    );
  }

  if (cart.isError) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-10">
        <h1 className="text-2xl font-bold tracking-tight">Tu carrito</h1>
        <div className="mt-6 rounded-lg border p-6 text-center">
          <p className="text-muted-foreground">No se pudo cargar el carrito.</p>
          <Button variant="outline" className="mt-3" onClick={() => cart.refetch()}>
            Reintentar
          </Button>
        </div>
      </div>
    );
  }

  const { items, total_cents, currency } = cart.data;

  if (items.length === 0) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-10">
        <h1 className="text-2xl font-bold tracking-tight">Tu carrito</h1>
        <div className="mt-6 rounded-lg border p-10 text-center">
          <p className="text-muted-foreground">Tu carrito está vacío.</p>
          <Link href="/coffees" className="mt-3 inline-block">
            <Button>Ver catálogo</Button>
          </Link>
        </div>
      </div>
    );
  }

  return <CartItems items={items} totalCents={total_cents} currency={currency} />;
}

function CartItems({
  items,
  totalCents,
  currency,
}: {
  items: NonNullable<ReturnType<typeof useCart>["data"]>["items"];
  totalCents: number;
  currency: string;
}) {
  const setQuantity = useSetCartItemQuantity();
  const removeItem = useRemoveCartItem();
  const clearCart = useClearCart();
  const authed = useIsAuthenticated();

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-bold tracking-tight">Tu carrito</h1>

      <ul className="mt-6 divide-y rounded-xl border">
        {items.map((item) => (
          <li key={item.coffee_id} className="flex flex-wrap items-center gap-3 p-4">
            <div className="min-w-0 flex-1">
              <Link
                href={`/coffees/${item.coffee_id}`}
                className="font-medium transition-colors hover:text-primary"
              >
                {item.coffee_name}
              </Link>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Bolsa de {item.bag_size_grams} g · {formatPrice(item.unit_price_cents, currency)} c/u
              </p>
            </div>

            <QuantityStepper
              value={item.quantity}
              onChange={(quantity) =>
                setQuantity.mutate({ coffeeId: item.coffee_id, quantity })
              }
              label={item.coffee_name}
              max={20}
            />

            <span className="w-24 text-right font-medium tabular-nums">
              {formatPrice(item.subtotal_cents, currency)}
            </span>

            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-destructive"
              onClick={() => removeItem.mutate(item.coffee_id)}
            >
              Quitar
            </Button>
          </li>
        ))}
      </ul>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border p-4">
        <div>
          <p className="text-sm text-muted-foreground">Total</p>
          <p className="text-xl font-bold tabular-nums">
            {formatPrice(totalCents, currency)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => clearCart.mutate()}>
            Vaciar carrito
          </Button>
          <Link href={authed ? "/checkout" : "/login?next=/checkout"}>
            <Button>Ir a pagar</Button>
          </Link>
        </div>
      </div>

      <p className="mt-4 text-center">
        <Link href="/coffees" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
          ← Seguir comprando
        </Link>
      </p>
    </div>
  );
}

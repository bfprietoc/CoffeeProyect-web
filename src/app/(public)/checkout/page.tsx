"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ApiError } from "@/lib/api/client";
import { useCart } from "@/lib/query/cart";
import { useAddresses, useIsAuthenticated } from "@/lib/query/orders";
import { useCheckoutValidation, usePlaceOrder } from "@/lib/query/checkout";
import { AddressSelector } from "@/components/checkout/address-selector";
import { ValidationSummary } from "@/components/checkout/validation-summary";
import { LoginPrompt } from "@/components/layout/login-prompt";
import { Button } from "@/components/ui/button";

/** Mapea los errores de POST /orders a mensajes accionables (ver checkout_handler.go). */
function placeOrderErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 422 && err.code === "UNAVAILABLE")
      return "Algunos productos no tienen stock suficiente. Revisa tu carrito e intenta de nuevo.";
    if (err.status === 404) return "La dirección seleccionada ya no existe. Elige otra.";
    if (err.status === 400) return "No se pudo crear el pedido: verifica tu carrito y la dirección.";
    return err.message;
  }
  return "No se pudo crear el pedido. Intenta de nuevo.";
}

export default function CheckoutPage() {
  const authed = useIsAuthenticated();
  const cart = useCart();

  // Orden de gates: SSR y primer render = skeleton (cart pending); luego
  // invitado → login; error/vacío del carrito; y recién el flujo.
  if (cart.isPending) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-10" aria-busy>
        <h1 className="text-2xl font-bold tracking-tight">Checkout</h1>
        <div className="mt-6 space-y-3">
          <div className="h-24 animate-pulse rounded-lg bg-muted" />
          <div className="h-32 animate-pulse rounded-lg bg-muted" />
        </div>
      </div>
    );
  }

  if (!authed) return <LoginPrompt next="/checkout" />;

  if (cart.isError) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-10">
        <h1 className="text-2xl font-bold tracking-tight">Checkout</h1>
        <div className="mt-6 rounded-lg border p-6 text-center">
          <p className="text-muted-foreground">No se pudo cargar tu carrito.</p>
          <Button variant="outline" className="mt-3" onClick={() => cart.refetch()}>
            Reintentar
          </Button>
        </div>
      </div>
    );
  }

  if (cart.data.items.length === 0) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-10">
        <h1 className="text-2xl font-bold tracking-tight">Checkout</h1>
        <div className="mt-6 rounded-lg border p-10 text-center">
          <p className="text-muted-foreground">Tu carrito está vacío.</p>
          <Link href="/coffees" className="mt-3 inline-block">
            <Button>Ver catálogo</Button>
          </Link>
        </div>
      </div>
    );
  }

  return <CheckoutFlow />;
}

function CheckoutFlow() {
  const router = useRouter();
  const addresses = useAddresses();
  // Aquí ya hay sesión y carrito no vacío (gates de la página padre).
  const validation = useCheckoutValidation(true);
  const placeOrder = usePlaceOrder();

  // Selección explícita del usuario; si no hay (o la dirección ya no
  // existe), cae en la predeterminada y luego en la primera.
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const list = addresses.data ?? [];
  const effectiveSelectedId = list.some((a) => a.id === selectedAddressId)
    ? (selectedAddressId as string)
    : list.find((a) => a.is_default)?.id ?? list[0]?.id ?? null;

  const canConfirm =
    effectiveSelectedId !== null && validation.data?.can_checkout === true && !placeOrder.isPending;

  function handleConfirm() {
    if (!effectiveSelectedId) return;
    placeOrder.mutate({ address_id: effectiveSelectedId }, {
      onSuccess: (order) => router.push(`/orders/${order.id}`),
    });
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-bold tracking-tight">Checkout</h1>

      <div className="mt-6 flex flex-col gap-4">
        {addresses.isPending ? (
          <div className="h-24 animate-pulse rounded-xl bg-muted" />
        ) : addresses.isError ? (
          <div className="rounded-xl border p-4 text-center">
            <p className="text-sm text-muted-foreground">No se pudieron cargar tus direcciones.</p>
            <Button variant="outline" size="sm" className="mt-2" onClick={() => addresses.refetch()}>
              Reintentar
            </Button>
          </div>
        ) : (
          <AddressSelector
            addresses={list}
            selectedId={effectiveSelectedId}
            onSelect={setSelectedAddressId}
          />
        )}

        {validation.isPending ? (
          <div className="h-32 animate-pulse rounded-xl bg-muted" />
        ) : validation.isError ? (
          <div className="rounded-xl border p-4 text-center">
            <p className="text-sm text-muted-foreground">No se pudo verificar el stock.</p>
            <Button variant="outline" size="sm" className="mt-2" onClick={() => validation.refetch()}>
              Reintentar
            </Button>
          </div>
        ) : (
          <ValidationSummary result={validation.data} />
        )}

        {placeOrder.isError && (
          <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm font-medium text-destructive">
            {placeOrderErrorMessage(placeOrder.error)}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/cart"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            ← Volver al carrito
          </Link>
          <Button onClick={handleConfirm} disabled={!canConfirm}>
            {placeOrder.isPending ? "Creando pedido…" : "Confirmar pedido"}
          </Button>
        </div>
      </div>
    </div>
  );
}

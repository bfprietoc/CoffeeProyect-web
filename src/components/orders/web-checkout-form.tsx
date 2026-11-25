"use client";

import type { PaymentCheckoutParams } from "@/lib/types";

/**
 * Formulario de Web Checkout de Wompi: GET a checkout.wompi.co/p/ con los
 * parámetros ocultos que devuelve el backend (publicKey, reference,
 * amount-in-cents, currency, signature:integrity, redirect-url).
 *
 * El backend computa la firma de integridad — el secreto nunca llega al
 * navegador (verificado: celdas de Wompi documentan no calcularla en el
 * frontend).
 */
export function WebCheckoutForm({ params }: { params: PaymentCheckoutParams }) {
  return (
    <form
      action="https://checkout.wompi.co/p/"
      method="GET"
      data-testid="wompi-checkout-form"
      className="flex flex-col gap-2"
    >
      <input type="hidden" name="public-key" value={params.publicKey} />
      <input type="hidden" name="currency" value={params.currency} />
      <input type="hidden" name="amount-in-cents" value={params.amountInCents} />
      <input type="hidden" name="reference" value={params.reference} />
      <input type="hidden" name="signature:integrity" value={params.signature} />
      {params.redirectUrl ? (
        <input type="hidden" name="redirect-url" value={params.redirectUrl} />
      ) : null}
      {params.customerEmail ? (
        <input type="hidden" name="customer-data:email" value={params.customerEmail} />
      ) : null}
      <button type="submit" data-testid="wompi-checkout-submit">
        Pagar con tarjeta o PSE
      </button>
    </form>
  );
}

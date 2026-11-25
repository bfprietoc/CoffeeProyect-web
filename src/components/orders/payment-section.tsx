"use client";

import { useState } from "react";
import { ApiError } from "@/lib/api/client";
import type { Order, PaymentCheckoutParams } from "@/lib/types";
import { paymentsEnabled } from "@/lib/payments";
import { useCreatePayment } from "@/lib/query/payments";
import { Button } from "@/components/ui/button";
import { PaymentBadge } from "./payment-badge";
import { WebCheckoutForm } from "./web-checkout-form";

/** Mensaje claro para los estados de pago que no pueden proceder. */
function paymentErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 503 || err.code === "PAYMENTS_DISABLED")
      return "Los pagos no están disponibles en este momento.";
    if (err.code === "PAYMENT_ALREADY_PAID") return "Este pedido ya está pagado.";
    if (err.code === "PAYMENT_UNAVAILABLE") return "Este pedido no se puede pagar en su estado actual.";
    if (err.code === "NOT_FOUND") return "No se encontró el pedido.";
    if (err.status === 401) return "Tu sesión expiró — inicia sesión de nuevo.";
    return err.message;
  }
  return "No se pudo iniciar el pago. Intenta de nuevo.";
}

/**
 * Sección de pago del pedido: badge de estado + botón «Pagar con tarjeta o
 * PSE». Si el backend devuelve los parámetros del Web Checkout, se muestra el
 * formulario Wompi (método GET a checkout.wompi.co/p/) y el clic lo envía.
 *
 * Gated por NEXT_PUBLIC_PAYMENTS_ENABLED (CI/E2E sin la variable → oculto).
 */
export function PaymentSection({ order }: { order: Order }) {
  const [params, setParams] = useState<PaymentCheckoutParams | null>(null);
  const payment = useCreatePayment();

  if (!paymentsEnabled()) return null;

  const retryable = order.payment_status === "pending" || order.payment_status === "failed";
  const cancelled = order.status === "cancelled";

  // Pedido cancelado o pagado: solo el badge.
  if (cancelled || !retryable) {
    return (
      <div className="mt-6 flex items-center justify-between gap-4 rounded-xl border p-4">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Pago</p>
          <PaymentBadge status={order.payment_status} />
        </div>
        {order.payment_status === "paid" && order.paid_at && (
          <p className="text-xs text-muted-foreground">
            Pagado el {new Date(order.paid_at).toLocaleDateString("es-CO")}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="mt-6 rounded-xl border p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold">Pago</h2>
          <PaymentBadge status={order.payment_status} />
        </div>
        {order.payment_status === "failed" && (
          <p className="text-xs text-muted-foreground">
            El pago anterior falló — puedes intentarlo de nuevo.
          </p>
        )}
      </div>

      {params ? (
        <WebCheckoutForm params={params} />
      ) : (
        <div className="mt-3">
          <Button
            onClick={() => payment.mutate(order.id, { onSuccess: setParams })}
            disabled={payment.isPending}
          >
            {payment.isPending ? "Preparando pago…" : "Pagar con tarjeta o PSE"}
          </Button>
          {payment.isError && (
            <p role="alert" className="mt-2 text-sm font-medium text-destructive">
              {paymentErrorMessage(payment.error)}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

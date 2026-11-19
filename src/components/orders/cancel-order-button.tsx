"use client";

import { useState } from "react";
import { ApiError } from "@/lib/api/client";
import type { OrderStatus } from "@/lib/types";
import { CANCELLABLE_STATUSES } from "@/lib/types";
import { useCancelOrder } from "@/lib/query/orders";
import { Button } from "@/components/ui/button";

interface CancelOrderButtonProps {
  orderId: string;
  status: OrderStatus;
}

/**
 * Cancelación con confirmación en dos pasos (sin window.confirm). Solo se
 * muestra en estados cancelables; el backend sigue siendo la puerta final
 * (422 UNAVAILABLE si ya no se puede cancelar).
 */
export function CancelOrderButton({ orderId, status }: CancelOrderButtonProps) {
  const cancelOrder = useCancelOrder();
  const [confirming, setConfirming] = useState(false);

  if (!CANCELLABLE_STATUSES.includes(status)) return null;

  function handleConfirm() {
    cancelOrder.mutate(orderId, { onSettled: () => setConfirming(false) });
  }

  if (cancelOrder.isError) {
    const message =
      cancelOrder.error instanceof ApiError && cancelOrder.error.status === 422
        ? "Este pedido ya no se puede cancelar."
        : "No se pudo cancelar el pedido. Intenta de nuevo.";
    return (
      <div className="flex flex-wrap items-center gap-3">
        <p role="alert" className="text-sm font-medium text-destructive">
          {message}
        </p>
        <Button variant="ghost" size="sm" onClick={() => cancelOrder.reset()}>
          Volver a intentar
        </Button>
      </div>
    );
  }

  if (confirming) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm font-medium">¿Cancelar este pedido?</p>
        <Button variant="destructive" size="sm" onClick={handleConfirm}>
          Sí, cancelar
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>
          Volver
        </Button>
      </div>
    );
  }

  return (
    <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive/10" onClick={() => setConfirming(true)}>
      Cancelar pedido
    </Button>
  );
}

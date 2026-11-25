"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createPayment } from "@/lib/api/endpoints";
import { orderKey, ordersKey } from "@/lib/query/orders";

/**
 * Crea una transacción de pago (Web Checkout) para un pedido. El webhook de
 * Wompi — no la redirición — es la fuente de verdad del estado final; al
 * volver del portal, el pedido se refetchea (efecto en la página de detalle).
 */
export function useCreatePayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (orderId: string) => createPayment(orderId),
    onSuccess: (_params, orderId) => {
      // El backend ya dejó el pedido como "pending" con su nueva referencia:
      // refrescar la vista y el historial.
      void queryClient.invalidateQueries({ queryKey: orderKey(orderId) });
      void queryClient.invalidateQueries({ queryKey: ordersKey });
    },
  });
}

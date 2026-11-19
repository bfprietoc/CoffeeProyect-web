"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { placeOrder, validateCheckout } from "@/lib/api/endpoints";
import type { PlaceOrderRequest } from "@/lib/types";
import { cartKey } from "./cart";
import { ordersKey } from "./orders";

export const checkoutValidateKey = ["checkout", "validate"] as const;

/**
 * Validación de checkout (read-only): stock disponible por ítem + total.
 * `enabled` lo controla la página (solo con sesión y carrito no vacío).
 */
export function useCheckoutValidation(enabled: boolean) {
  return useQuery({
    queryKey: checkoutValidateKey,
    queryFn: validateCheckout,
    enabled,
  });
}

export function usePlaceOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: PlaceOrderRequest) => placeOrder(body),
    onSuccess: () => {
      // El backend deja el carrito vacío y agrega la orden al historial.
      void queryClient.invalidateQueries({ queryKey: cartKey });
      void queryClient.invalidateQueries({ queryKey: ordersKey });
    },
  });
}

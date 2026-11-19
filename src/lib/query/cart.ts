"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSyncExternalStore } from "react";
import { getAccessToken, onSessionChange } from "@/lib/auth/session";
import {
  addCartItem,
  clearCart,
  getCart,
  getMe,
  removeCartItem,
  setCartItemQuantity,
} from "@/lib/api/endpoints";
import { useMounted } from "@/lib/hooks/use-mounted";

/** Claves de query compartidas (cart + usuario actual). */
export const cartKey = ["cart"] as const;
export const meKey = ["me"] as const;

/** Token en memoria: distingue carrito de invitado del de usuario. */
function useSessionToken(): string | null {
  return useSyncExternalStore(onSessionChange, getAccessToken, () => null);
}

/**
 * Carrito actual (invitado o autenticado). El suffix en la clave hace que
 * login/logout cambie de identidad y refetchea sin tocar la otra cache.
 */
export function useCart() {
  const mounted = useMounted();
  const token = useSessionToken();
  return useQuery({
    queryKey: [...cartKey, token ? "user" : "guest"],
    queryFn: getCart,
    enabled: mounted,
  });
}

/** Usuario autenticado (header). Solo con sesión activa. */
export function useMe() {
  const mounted = useMounted();
  const token = useSessionToken();
  return useQuery({
    queryKey: meKey,
    queryFn: getMe,
    enabled: mounted && token !== null,
  });
}

function useInvalidateCart() {
  const queryClient = useQueryClient();
  return () => {
    // Invalida por prefijo: refetchea la identidad activa (invitado o usuario).
    void queryClient.invalidateQueries({ queryKey: cartKey });
  };
}

export function useAddToCart() {
  const invalidate = useInvalidateCart();
  return useMutation({ mutationFn: addCartItem, onSuccess: invalidate });
}

export function useSetCartItemQuantity() {
  const invalidate = useInvalidateCart();
  return useMutation({
    mutationFn: ({ coffeeId, quantity }: { coffeeId: string; quantity: number }) =>
      setCartItemQuantity(coffeeId, { quantity }),
    onSuccess: invalidate,
  });
}

export function useRemoveCartItem() {
  const invalidate = useInvalidateCart();
  return useMutation({ mutationFn: removeCartItem, onSuccess: invalidate });
}

export function useClearCart() {
  const invalidate = useInvalidateCart();
  return useMutation({ mutationFn: clearCart, onSuccess: invalidate });
}

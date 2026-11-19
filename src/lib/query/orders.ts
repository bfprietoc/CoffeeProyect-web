"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSyncExternalStore } from "react";
import { getAccessToken, onSessionChange } from "@/lib/auth/session";
import {
  addAddress,
  cancelOrder,
  getOrder,
  listAddresses,
  listOrders,
} from "@/lib/api/endpoints";
import { useMounted } from "@/lib/hooks/use-mounted";

/** Claves de query compartidas (órdenes + direcciones). */
export const ordersKey = ["orders"] as const;
export const orderKey = (id: string) => ["orders", id] as const;
export const addressesKey = ["addresses"] as const;

function useSessionToken(): string | null {
  return useSyncExternalStore(onSessionChange, getAccessToken, () => null);
}

/**
 * true solo en el cliente con sesión activa. Los endpoints de órdenes y
 * direcciones requieren JWT; en SSR/invitado las queries quedan deshabilitadas.
 */
export function useIsAuthenticated(): boolean {
  const mounted = useMounted();
  const token = useSessionToken();
  return mounted && token !== null;
}

/** Historial de pedidos del usuario autenticado. */
export function useOrders() {
  const authed = useIsAuthenticated();
  return useQuery({
    queryKey: ordersKey,
    queryFn: listOrders,
    enabled: authed,
  });
}

/** Detalle de un pedido (404 → ApiError NOT_FOUND). */
export function useOrder(id: string) {
  const authed = useIsAuthenticated();
  return useQuery({
    queryKey: orderKey(id),
    queryFn: () => getOrder(id),
    enabled: authed && id !== "",
  });
}

/** Direcciones guardadas del usuario autenticado. */
export function useAddresses() {
  const authed = useIsAuthenticated();
  return useQuery({
    queryKey: addressesKey,
    queryFn: listAddresses,
    enabled: authed,
  });
}

export function useAddAddress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: addAddress,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: addressesKey });
    },
  });
}

export function useCancelOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: cancelOrder,
    onSuccess: (_order, id) => {
      // Refetchea el detalle y el historial (el estado cambió a cancelled).
      void queryClient.invalidateQueries({ queryKey: orderKey(id) });
      void queryClient.invalidateQueries({ queryKey: ordersKey });
    },
  });
}

"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSyncExternalStore } from "react";
import { getAdminKey, onAdminSessionChange } from "@/lib/auth/admin-session";
import {
  adminAdjustStock,
  adminCreateCoffee,
  adminDeleteCoffee,
  adminGetStock,
  adminListOrders,
  adminUpdateCoffee,
  adminUpdateOrderStatus,
  listCoffees,
} from "@/lib/api/endpoints";
import type {
  AdjustStockRequest,
  AdminOrderFilters,
  CreateCoffeeRequest,
  OrderStatus,
  UpdateCoffeeRequest,
  UpdateOrderStatusRequest,
} from "@/lib/types";

/** Claves de query del panel admin (prefijo "admin" para no chocar con las públicas). */
export const adminCoffeesKey = ["admin", "coffees"] as const;
export const adminStockKey = (coffeeId: string) =>
  ["admin", "coffees", coffeeId, "stock"] as const;
export const adminOrdersKey = (status?: OrderStatus) =>
  ["admin", "orders", status ?? "all"] as const;

/** API key en memoria: sin ella las queries/mutaciones del panel no corren. */
function useAdminToken(): string | null {
  return useSyncExternalStore(onAdminSessionChange, getAdminKey, () => null);
}

/**
 * Lista de cafés para el panel (limit 50). Usa el endpoint PÚBLICO
 * GET /coffees: no hay GET /admin/coffees en el backend y la lectura no
 * necesita clave. Incluye agotados (sin filtro `available`).
 */
export function useAdminCoffees() {
  const key = useAdminToken();
  return useQuery({
    queryKey: adminCoffeesKey,
    queryFn: () => listCoffees({ limit: 50 }),
    enabled: key !== null,
  });
}

/** Stock + movimientos de un café (GET /admin/coffees/{id}/stock). */
export function useAdminStock(coffeeId: string | null) {
  const key = useAdminToken();
  return useQuery({
    queryKey: adminStockKey(coffeeId ?? ""),
    queryFn: () => adminGetStock(key as string, coffeeId as string),
    enabled: key !== null && coffeeId !== null,
  });
}

/** Órdenes de todos los usuarios (GET /admin/orders), con filtro por estado. */
export function useAdminOrders(status?: OrderStatus, filters?: AdminOrderFilters) {
  const key = useAdminToken();
  return useQuery({
    queryKey: adminOrdersKey(status),
    queryFn: () => adminListOrders(key as string, { limit: 50, status, ...filters }),
    enabled: key !== null,
  });
}

// ---------- mutaciones (la key se lee en el momento del llamado) ----------

export function useAdminCreateCoffee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateCoffeeRequest) =>
      adminCreateCoffee(getAdminKey() as string, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminCoffeesKey });
    },
  });
}

export function useAdminUpdateCoffee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; body: UpdateCoffeeRequest }) =>
      adminUpdateCoffee(getAdminKey() as string, vars.id, vars.body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminCoffeesKey });
    },
  });
}

export function useAdminDeleteCoffee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminDeleteCoffee(getAdminKey() as string, id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminCoffeesKey });
    },
  });
}

/**
 * Ajuste de stock (PATCH /admin/coffees/{id}/stock). Invalida con el prefijo
 * `adminCoffeesKey`, que cubre tanto la lista de cafés (cambia `stock_bags`)
 * como el stock del café afectado (su clave es descendiente del prefijo).
 */
export function useAdminAdjustStock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { coffeeId: string; body: AdjustStockRequest }) =>
      adminAdjustStock(getAdminKey() as string, vars.coffeeId, vars.body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminCoffeesKey });
    },
  });
}

/** Cambio de estado/tracking (PATCH /admin/orders/{id}/status). */
export function useAdminUpdateOrderStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; body: UpdateOrderStatusRequest }) =>
      adminUpdateOrderStatus(getAdminKey() as string, vars.id, vars.body),
    onSuccess: () => {
      // Prefijo "admin/orders": refetchea todos los filtros de estado.
      void queryClient.invalidateQueries({ queryKey: ["admin", "orders"] });
    },
  });
}

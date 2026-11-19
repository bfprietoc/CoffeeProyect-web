"use client";

import { useSyncExternalStore } from "react";
import { clearAdminKey, getAdminKey, onAdminSessionChange } from "./admin-session";

/**
 * Hook de sesión de admin: `isAdmin` refleja si hay API key en memoria.
 * SSR/invitado: false (snapshot de servidor = null).
 */
export function useAdminSession() {
  const key = useSyncExternalStore(onAdminSessionChange, getAdminKey, () => null);
  return { isAdmin: key !== null, logout: clearAdminKey };
}

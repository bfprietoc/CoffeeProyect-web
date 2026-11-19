"use client";

import { useSyncExternalStore } from "react";
import { clearSession, getAccessToken, onSessionChange } from "./session";

/**
 * Hook de sesión para componentes (ver session.ts):
 * - `isAuthenticated` refleja el access token en memoria (cambia al
 *   registrar/loguear/logout o cuando el refresh lo renueva).
 * - `logout` descarta la sesión. El carrito invitado (X-Session-ID) se
 *   conserva: es otra identidad, no la sesión de auth.
 */
export function useSession() {
  const token = useSyncExternalStore(
    onSessionChange,
    getAccessToken,
    () => null,
  );
  return { isAuthenticated: token !== null, logout: clearSession };
}

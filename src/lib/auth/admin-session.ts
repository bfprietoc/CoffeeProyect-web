/**
 * Sesión de admin (MVP — Fase 5): la API key vive SOLO en memoria.
 * - Nunca toca localStorage/cookie: al recargar la pestaña se pierde y hay
 *   que volver a ingresarla (diseño deliberado; ver FRONTEND_PLAN.md Fase 5).
 * - Es independiente de la sesión de cliente (JWT): un admin puede estar
 *   logueado como cliente a la vez que tiene el panel abierto.
 */

let adminKey: string | null = null;
const listeners = new Set<() => void>();

function notify(): void {
  for (const fn of listeners) fn();
}

export function setAdminKey(key: string): void {
  adminKey = key;
  notify();
}

export function getAdminKey(): string | null {
  return adminKey;
}

export function clearAdminKey(): void {
  adminKey = null;
  notify();
}

/** Suscripción para useSyncExternalStore. */
export function onAdminSessionChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

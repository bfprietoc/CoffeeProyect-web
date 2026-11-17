import type { TokenPair } from "@/lib/types";
import { API_URL } from "@/lib/api/config";

/**
 * Sesión del cliente (MVP — ver riesgo 1 de FRONTEND_PLAN.md):
 * - access token: solo en memoria (no sobrevive a recarga)
 * - refresh token: localStorage
 * - carrito invitado: X-Session-ID (UUID) persistido en localStorage
 */

const REFRESH_KEY = "cp_refresh_token";
const GUEST_SESSION_KEY = "cp_guest_session_id";

let accessToken: string | null = null;
const listeners = new Set<() => void>();

function notify(): void {
  for (const fn of listeners) fn();
}

/** Guarda la pareja de tokens (tras register/login/refresh). */
export function setTokens(access: string, refresh: string): void {
  accessToken = access;
  if (typeof window !== "undefined") {
    localStorage.setItem(REFRESH_KEY, refresh);
  }
  notify();
}

export function getAccessToken(): string | null {
  return accessToken;
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(REFRESH_KEY);
}

/** Desecha la sesión (logout, refresh inválido). */
export function clearSession(): void {
  accessToken = null;
  if (typeof window !== "undefined") {
    localStorage.removeItem(REFRESH_KEY);
  }
  notify();
}

/** Suscripción al cambio de sesión (para React con useSyncExternalStore). */
export function onSessionChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

let inFlight: Promise<boolean> | null = null;

/**
 * Renueva el access token con el refresh de localStorage.
 * Devuelve true si logró renovar (y actualiza el access en memoria).
 * Si el refresh ya no es válido, descarta la sesión.
 * Las llamadas concurrentes comparten el mismo request (dedupe).
 */
export function refreshTokens(): Promise<boolean> {
  inFlight ??= (async () => {
    const current = getRefreshToken();
    if (!current) return false;
    try {
      const res = await fetch(`${API_URL}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: current }),
        cache: "no-store",
      });
      if (!res.ok) {
        clearSession();
        return false;
      }
      const tokens = (await res.json()) as TokenPair;
      setTokens(tokens.access_token, tokens.refresh_token);
      return true;
    } catch {
      // Sin red: conservamos la sesión, el próximo intento lo reintentará
      return false;
    }
  })().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

/** UUID del carrito invitado (header X-Session-ID), persistido entre visitas. */
export function getGuestSessionId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem(GUEST_SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(GUEST_SESSION_KEY, id);
  }
  return id;
}

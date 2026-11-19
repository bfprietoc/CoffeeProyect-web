/**
 * Base URL de la API (FRONTEND_PLAN.md → "Contrato con el backend").
 *
 * Dev: `http://localhost:8080` (NEXT_PUBLIC_API_URL en .env.local).
 * Prod (Docker): el CLIENT llama a `/api` relativo (NEXT_PUBLIC_API_URL,
 * ruteado por Caddy) y el SERVIDOR (RSC) llama directo al contenedor de la
 * API (`http://api:8080`, SERVER_API_URL): Node fetch no acepta URLs
 * relativas, así que el servidor no puede usar `/api`.
 */
const isBrowser = typeof window !== "undefined";

export const API_URL = isBrowser
  ? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080"
  : (process.env.SERVER_API_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    "http://localhost:8080");

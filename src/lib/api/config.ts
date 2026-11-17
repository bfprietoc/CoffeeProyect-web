/**
 * Base URL de la API (FRONTEND_PLAN.md → "Contrato con el backend").
 * Dev: http://localhost:8080 — Prod (mini PC): "/api" relativo, ruteado por Caddy.
 */
export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

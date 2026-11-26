# CoffeeProyect-web

Frontend de [CoffeeProyect](https://github.com/bfprietoc/CoffeeProyect) — tienda de café.

## Estado

**Release `v1.2.0` en `main`** (2026-11-25/26) — con `v1.2.1` en backend @ 6a0d207 —
`develop` = `main` en ambos repos. Ambas features mergeadas y en `main`:
**login con Google** ( verificado en vivo 2026-11-26) y **pagos en línea con
Wompi** (PSE + tarjetas).

**Fase A (Google) ✅ CERRADA** — login real verificado 2026-11-26.
**Pendiente del dueño:** activar el pago con credenciales reales de Wompi —
está en [SETUP_GUIDE.md](./SETUP_GUIDE.md) (checklist B1–B7 + estado de
branches). Wompi queda apagado (503) hasta que se completen.

**¿Querés activar login con Google y pagos Wompi?** →
[SETUP_GUIDE.md](./SETUP_GUIDE.md) (guía operativa unificada: checklist de
credenciales, variables, pruebas y usuarios de prueba).

Plan completo de features y fases: [FRONTEND_PLAN.md](./FRONTEND_PLAN.md).

## Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS
- TanStack Query (server state) / Zustand (client state)
- Vitest + Testing Library (148 tests), Playwright E2E (19 tests)

## Desarrollo

```bash
cp .env.example .env.local   # variables locales (ver el archivo para cada uno)
npm install
npm run dev                  # :3000 (o :3001/:3002 si ya hay instancias)
```

| Comando | Qué hace |
|---|---|
| `npm run lint` | ESLint |
| `npm run typecheck` | tsc --noEmit |
| `npm test` | Vitest (unitarios + integración de store) |
| `npm run build` | next build (producción) |
| `npm run e2e` | Playwright (requiere API + web corriendo) |

Variables de entorno: `.env.example` (Google: `NEXT_PUBLIC_GOOGLE_CLIENT_ID`;
pagos: `NEXT_PUBLIC_PAYMENTS_ENABLED`). Las keys públicas (`NEXT_PUBLIC_*`)
se inlinan en build time; las servidoras (backend, vía `.env`) nunca van al
front.

## Despliegue

Docker + Caddy (reverse proxy) + Tailscale serve — ver
[DEPLOY.md](./DEPLOY.md). Release actual desplegado: `v1.1.0` (wake-agent,
`https://wake-agent.taile51409.ts.net`).

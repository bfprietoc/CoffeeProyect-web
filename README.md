# CoffeeProyect-web

Frontend de [CoffeeProyect](https://github.com/bfprietoc/CoffeeProyect) — tienda de café.

## Estado

En desarrollo activo (release `v1.1.0` en `main`; `develop` con dos features
en PRs pendientes de validación con credenciales reales — ver
[AUTH_PAYMENTS_PLAN.md](./AUTH_PAYMENTS_PLAN.md)).

**En curso (en PRs abiertos, merge pendientes):**

- **Login con Google** — Feature A: botón Google en `/login` y `/register`
  (backend PR [CoffeeProyect#4](https://github.com/bfprietoc/CoffeeProyect/pull/4)
  + web PR [#5](https://github.com/bfprietoc/CoffeeProyect-web/pull/5)).
- **Pagos en línea con Wompi** (tarjetas + PSE) — Feature B: Web Checkout
  Wompi (backend PR [CoffeeProyect#6](https://github.com/bfprietoc/CoffeeProyect/pull/6)
  + web PR [#6](https://github.com/bfprietoc/CoffeeProyect-web/pull/6)).

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

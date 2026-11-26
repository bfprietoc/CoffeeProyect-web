# CoffeeProyect-web

Frontend de [CoffeeProyect](https://github.com/bfprietoc/CoffeeProyect) — tienda de café.

## Estado

**Release `v1.2.0` en `main`** (2026-11-25): `develop` = `main` en ambos
repos, `develop` alineada tras release. Las dos features nuevas de la
columna están mergeadas: **login con Google** (backend #4 + web #5) y **pagos
en línea con Wompi** (PSE + tarjetas) (backend #6 + web #6).

**Pendiente del dueño:** activar ambos features con credenciales reales —
está en [SETUP_GUIDE.md](./SETUP_GUIDE.md) (checklist A1/A3/A4/A5 y B1–B7 +
usuarios de prueba + estado de branches). Las features quedan apagadas por
diseño hasta que se completen (Google: 503/botón oculto; Wompi: 503 + botón
visible que responde 503).

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

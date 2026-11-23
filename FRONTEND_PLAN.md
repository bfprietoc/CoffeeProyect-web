# Plan — Frontend (CoffeeProyect Web)

## Contexto

El backend Go (este repo) quedó completo y validado: API REST en `:8080`
con batería E2E de 126 aserciones en verde (modo Postgres + Redis). No existe
frontend. Este plan cubre la creación del front como **repo separado**
(decisión tomada: no monorepo).

**Decisión de despliegue:** todo (front + back + infra) corre self-hosted en
una mini PC siempre disponible — sin pagar infraestructura, el tráfico es
bajo. Ver sección [Despliegue](#despliegue--self-hosted-en-mini-pc).

> Este doc vive en el repo del backend como referencia de proyecto; al crear
> el repo del front se mueve a su raíz.

## Decisiones de stack (recomendadas)

| Decisión | Opción | Por qué |
|---|---|---|
| Framework | **Next.js (App Router) + TypeScript** | SSG/ISR para SEO de las fichas de café, ecosistema grande, self-hosteable con Docker (sin dependencia de serverless) |
| Estilos | **Tailwind CSS** | Rápido de iterar, consistente, sin CSS sprawl |
| Componentes UI | **shadcn/ui** (sobre Tailwind) | Estándar 2026 en apps Next.js: componentes accesibles que se copian al codebase (sin dependencia externa) y se personalizan a la marca |
| Server state | **TanStack Query** | Cacheo, refetch y mutaciones del lado cliente; complementa el cache de Redis del backend |
| Client state | **Zustand** (carrito, sesión) | Mínimo boilerplate para este tamaño de app |
| API client | **fetch wrapper propio + tipos TS a mano** | El backend no expone OpenAPI; los tipos espejan `internal/domain` (ver riesgo 2) |
| Testing | **Vitest + Testing Library**, y Playwright E2E contra el backend real | Mismo criterio de validación que la batería E2E del backend |
| CI/CD | **GitHub Actions** (lint + typecheck + build + Playwright E2E contra el stack real); deploy manual vía `deploy.sh` | Ver sección Despliegue |

**Alternativas descartadas:**
- SPA pura (Vite + React): más simple, pero sin SSR/ISR → las fichas de
  producto (lo que más SEO trae en una tienda) no indexan bien.
- Nuxt/Vue: válido, pero menos material y ecosistema que React para este caso.
- Monorepo: complejidad de tooling innecesaria para dos apps independientes.

## Repo del front

- **Nombre sugerido:** `CoffeeProyect-web` (mismo owner, privado como el backend)
- **Estructura:**

```
src/
├── app/                      # App Router (rutas)
│   ├── (public)/             # home, coffees (lista+filtros), coffees/[id], waitlist
│   ├── (auth)/               # login, register
│   ├── account/              # perfil + direcciones (protegido con JWT)
│   ├── cart/                 # carrito (invitado o usuario)
│   ├── checkout/             # validación + confirmación de pedido
│   ├── orders/               # historial + detalle (protegido)
│   └── admin/                # panel admin (protegido por X-Api-Key)
├── lib/
│   ├── api/                  # client con interceptors + endpoints tipados por recurso
│   ├── auth/                 # manejo de tokens, refresh, session guest (X-Session-ID)
│   └── types/                # tipos TS espejo de internal/domain
├── components/               # ui/, catalog/, cart/, orders/, admin/
└── middleware.ts             # protección de rutas (account, orders, admin)
```

## Contrato con el backend (ya probado en E2E)

- **Base URL:** `NEXT_PUBLIC_API_URL` (dev: `http://localhost:8080`;
  producción: `/api` relativo, ruteado por Caddy — ver Despliegue). CORS ya
  está habilitado en el backend (verificado), pero en producción no hace falta.
- **Auth:** JWT access + refresh devueltos en body JSON. Access token en
  memoria, refresh en `localStorage` (MVP — ver riesgo 1).
- **Carrito invitado:** header `X-Session-ID` con un UUID generado
  (`crypto.randomUUID()`) y persistido en `localStorage`.
- **Merge on login:** enviar el `X-Session-ID` en `POST /auth/login` — el
  backend fusiona el carrito invitado al del usuario (flujo probado).
- **Admin:** header `X-Api-Key`; el panel pide la key en su "login" y la
  guarda **solo en memoria** (nunca en localStorage).
- **Errores:** respuesta `{ "error": ..., "code": ... }`. Mapear los codes a
  mensajes de usuario: `NOT_FOUND`, `UNAUTHORIZED`, `EMAIL_CONFLICT`,
  `BAD_REQUEST`, `UNAVAILABLE`, `INTERNAL_ERROR`.
- **Datos frescos:** el backend invalida su cache de Redis correctamente tras
  cada mutación (fix de esta semana), así que el front puede confiar en lo que
  devuelve la API tras mutar (TanStack Query invalida sus queries locales).

## Despliegue — self-hosted en mini PC

**Decisión:** todo (front + back + infra) corre en una mini PC siempre
disponible. Sin pagar infraestructura: el tráfico esperado es bajo.

**Hardware:** ThinkCentre 8va gen, 16 GB RAM, 256 GB SSD. Uso estimado del
stack completo: **~1.5 GB de RAM y 10–30 GB de disco** (web ~250MB, api
~50MB, postgres ~300MB, redis ~50MB, caddy + Docker). Sobrado — incluso
podría correr los stacks de dev y prod a la vez.

**Máquina real (2026-11-20): `wake-agent`** — PC de escritorio vieja con
Arch Linux, 2 cores, 3.6 GB RAM + `zram0` (1.8 GB de swap), ~447 GB disco,
encendida 24/7 (enciende a `ia-server`) y ya con Tailscale. El stack corre
ahí desde el **2026-11-20** (release `v1.0.0`), accesible en el tailnet en
**https://wake-agent.taile51409.ts.net**; queda pendiente el dominio propio
+ Cloudflare Tunnel para acceso público. El `docker system prune` por deploy
es obligatorio (lo hace `deploy.sh`) para no llenar el disco con imágenes.

**Arquitectura (un solo Docker Compose en la mini PC):**

```
Caddy (reverse proxy + routing, :80/:443)
├── /          → web    (Next.js, `next start`)
└── /api/*     → api    (backend Go, :8080)
postgres  (volume persistente — fuente de verdad)
redis     (volume persistente)
```

- `restart: unless-stopped` en todos los servicios: si la máquina se reinicia
  (corte de luz, update), todo vuelve solo.
- El backend no se expone directo: el front llama a `/api/...` (relativo) y
  Caddy lo rutea → sin CORS en producción.
- `NEXT_PUBLIC_API_URL` relativo (`/api`) en producción,
  `http://localhost:8080` en desarrollo.

**Acceso y TLS — Decisión (2026-11-19): sitio público 24/7.**
Objetivo confirmado: la página es pública (marca de café), no solo para el
equipo. La arquitectura Docker no cambia; solo la puerta de entrada:

- **Cloudflare Tunnel + dominio (~$10/año)** — la puerta principal:
  conexión saliente desde la mini PC (sin abrir puertos, funciona con CGNAT),
  URL real `https://tudominio.com` con HTTPS automático. El tunnel apunta a
  `localhost:80` (Caddy).
- **Tailscale** — alternativa/complemento de acceso privado: URL tipo
  `https://<host>.tailnet.ts.net` (HTTPS del tailnet, sin dominio), solo
  para miembros. Útil para probar antes de tener el dominio.

**Nota técnica (2026-11-19):** el front llama a `/api` relativo en el
navegador (Caddy lo rutea), pero los fetch del servidor (RSC) usan
`SERVER_API_URL=http://api:8080` directo al contenedor — Node fetch no
acepta URLs relativas. Ver `src/lib/api/config.ts`.

**Backups y mantenimiento:**
- `pg_dump` en cada deploy (`deploy.sh`, en `backups/`; es la única copia de
  los datos — no negociable).
- `docker system prune` en cada deploy (imágenes viejas no llenan el SSD).
- Monitoring: `/health` del backend + healthchecks de Docker; opcional
  uptime-kuma.

**Workflow de deploy (simple, suficiente para este tráfico):**

```bash
# En wake-agent (una vez): Docker + buildx (Tailscale ya estaba instalado)
sudo pacman -Sy docker docker-compose docker-buildx

# Clonar los dos repos lado a lado (el compose referencia ../CoffeeProyect):
#   ~/coffee/CoffeeProyect  (backend)
#   ~/coffee/CoffeeProyect-web  (front; el compose y deploy.sh viven acá)

# Cada deploy:
cd ~/coffee/CoffeeProyect-web && ./deploy.sh
```

`deploy.sh` envuelve: `git pull` de ambos repos → backup `pg_dump` (si ya
hay stack) → `docker compose up -d --build` → caddy reload →
`docker system prune`. El CI (GitHub Actions) valida lint, typecheck, build
y E2E; el deploy es manual con el script.

**Estrategia de ramas (2026-11-19):** `develop` = trabajo diario (ambos
repos), `main` = producción (lo que corre en la PC; de ahí hace pull
`deploy.sh`), tags `vX.Y.Z` por release. El CI corre en `main` y
`develop`. El `master` viejo del backend (reliquia del scaffold) se
eliminó: no hay rama aparte, `main` es la "master".

> **Guía completa para la máquina de despliegue: [`DEPLOY.md`](./DEPLOY.md)** —
> setup one-time (Docker + buildx, deploy keys de GitHub, `.env`, primer
> deploy + seed, `tailscale serve`), acceso público pendiente (Cloudflare
> Tunnel) y operación diaria. Pensada para leerse una sola vez frente a
> wake-agent, y como guía de reconstrucción si la máquina muere.

## Fases

### Fase 0 — Scaffold (1–2 días) ✅
- `create-next-app` + TS + Tailwind + ESLint/Prettier + shadcn/ui
- Repo en GitHub + CI (lint, typecheck, build)
- `lib/api`: client con interceptors (inyectar `Authorization`, `X-Session-ID`;
  en 401 → intentar refresh → reintentar la request una vez)
- Tipos TS espejo del domain: `Coffee`, `User`, `Address`, `Cart`,
  `Order`/`OrderItem`, `WaitlistEntry`, `ValidationResult`
- Smoke: `/health` + render del listado de cafés

### Fase 1 — Catálogo público (read-only) ✅
- Home + lista con filtros (`roast_level`, `country`, `process`,
  `available=true`) y paginación (`page`/`limit`, máx 50)
- Ficha de detalle: producer, farm, notas de cata, precio, stock
- Botón "avísame cuando vuelva" (waitlist) en productos sin stock
- States explícitos: loading / error / vacío

### Fase 2 — Carrito invitado + auth ✅
- Carrito: agregar, set quantity (PATCH), quitar; snapshot de nombre/precio
  ya viene del backend
- Register / login / refresh automático
- Merge del carrito invitado al login (el usuario ve su carrito fusionado)

### Fase 3 — Checkout y órdenes ✅
- Selección o creación de dirección → `GET /checkout/validate` (muestra stock
  disponible por ítem y total) → `POST /orders`
- Historial + detalle; cancelación solo en `confirmed`/`processing`
  (el backend devuelve 422 si no es cancelable)

### Fase 4 — Cuenta ✅
- Perfil (nombre) + CRUD de direcciones con `is_default`

### Fase 5 — Panel admin ✅
- "Login" con API key (memoria): se verifica contra la API antes de
  aceptarla; nunca persiste (al recargar se pierde)
- CRUD de cafés (crear/editar inline, eliminar en dos pasos), ajuste de
  stock con movimientos auditables, gestión de órdenes (estado + tracking
  number) con filtro por estado
- Chrome propio del panel (header "⚙️ Panel admin", sin nav de tienda ni
  carrito); grupo de rutas `(admin)` separado del público

### Fase 6 — Pulido y deploy self-hosted
- ✅ Responsive, metadata/OG por café (SEO), accesibilidad básica
  (ver "Fase 6 — Pulido" en el registro de E2E, 2026-11-19)
- ✅ Playwright E2E contra el backend real (commit `b6c655d`, 2026-11-19):
  13 tests en `e2e/` (catálogo + not-found, carrito invitado, auth + merge
  en login, checkout completo, cancelación con restitución de stock por
  API). Workflow `.github/workflows/e2e.yml` separado del CI rápido: levanta
  postgres+redis (services), backend Go (checkout de `bfprietoc/CoffeeProyect`
  `develop`, auto-migra al arrancar) + seed idempotente, `next start :3001`;
  CI verde en 1m52s (13 passed). Fix que exigió el E2E: la ficha de café
  inexistente mostraba el error boundary en vez del not-found de la ruta —
  con PPR, `notFound()` lanzado desde un catch no es fiable (el error se
  sanitiza entre pases de render); ahora `getCoffeeByIdOrNull` resuelve
  `null` ante 404 y la página llama `notFound()` en el flujo normal
  (patrón documentado en `not-found.md` del Next instalado)
- ✅ Docker: `Dockerfile` multi-stage de Next.js (build con
  `NEXT_PUBLIC_API_URL=/api` horneado → `next start :3000`), `Dockerfile`
  del backend (binario estático + `migrations/` para el auto-migrate),
  `Caddyfile` (`/api/*` → api con `strip_prefix`, resto → web; TLS lo pone
  la puerta de acceso) y `docker-compose.prod.yml` (web+api+postgres+redis+
  caddy; solo Caddy publica :80) — commit del push de 2026-11-19.
  **Validado contra el stack Docker real: 13/13 de la suite Playwright**
  (flujos de compra de punta a punta vía Caddy).
- ✅ `deploy.sh`: pull de ambos repos → `pg_dump` (si ya hay stack) →
  `up -d --build` → caddy reload explícito → `docker system prune`.
  Backup nocturno por cron: opcional en la máquina de despliegue
  (el backup por deploy ya cubre los cambios de esquema/datos propios).
- Tailscale en la mini PC + dispositivos; primer acceso real vía URL del
  tailnet (o Cloudflare Tunnel + dominio para acceso público 24/7 — ver
  Decisiones de despliegue, 2026-11-19)

### Fase 7 — Ronda de funcionalidades (2026-11-20)

Plan en [`FEATURES_PLAN.md`](./FEATURES_PLAN.md) (ronda 1; detectado en la
app desplegada). Flujo: rama feature desde `develop` → PR con CI verde
(quality + E2E) → merge squash a `develop` → **PR de release `develop` →
`main`** (CI sobre main) → merge ff + tag. Desde 2026-11-22 `main` está
protegida en ambos repos (ruleset "proteger-main": PR obligatorio, checks
quality+e2e en web, sin force push ni borrado); el repo web pasó a público
para poder aplicarla.

- ✅ **Descubribilidad de "Mis pedidos"** (`25b7622`): link en el header
  (autenticado) + sección "Pedidos" en la página de cuenta. Las páginas
  `/orders` y `/orders/{id}` ya existían (Fase 3) y el checkout redirige al
  detalle; lo que faltaba era la entrada permanente — después de esa
  redirección el usuario perdía sus pedidos salvo sabiendo la URL.
- ✅ **Quick add desde el catálogo** (`25b7622`): `CoffeeCard`
  reestructurada (antes toda la tarjeta era un `<Link>` a la ficha; un
  botón dentro de link es HTML inválido — ahora solo el título enlaza) +
  `QuickAddButton` (cantidad 1, feedback "Agregado ✓" como en la ficha,
  deshabilitado como "Agotado" sin stock, funciona igual para invitados).
- E2E: 18 tests (5 nuevos en `e2e/catalog.spec.ts` + `e2e/orders.spec.ts`:
  quick add sin navegar, agotado deshabilitado [seed con stock 0], header →
  lista de pedidos, post-pedido la lista muestra el pedido, cuenta →
  pedidos). Release `v1.1.0` desplegada en wake-agent.

## Riesgos y notas

1. **Tokens en `localStorage`**: un XSS expondría el refresh token.
   Aceptable para MVP; mejora futura: cookies `httpOnly` (requiere cambio en
   el backend para emitir cookies + endpoint de logout).
2. **Sin OpenAPI en el backend**: los tipos TS se mantienen a mano y pueden
   desincronizarse. Opcional (follow-up en el repo del backend): generar spec
   OpenAPI y derivar los tipos.
3. **Admin en el mismo repo**: la API key viaja desde el browser a los
   endpoints `/admin/*`. Para producción seria, el panel debería ir detrás de
   un BFF o con auth propia. Para MVP interno está bien.
4. **Carreras de stock**: el backend garantiza atomicidad (FOR UPDATE,
   verificado con test de concurrencia); el front solo debe tratar el 422
   "out of stock" de checkout como estado válido y mostrarlo.
5. **Punto único de falla (la máquina de despliegue)**: si muere, todo cae.
   Mitigaciones: `restart: unless-stopped` en todos los servicios, backup
   `pg_dump` por deploy (`deploy.sh`, en `backups/`) y el código vive en
   GitHub (reconstruir en otra máquina = clonar los dos repos + `./deploy.sh`).
6. **Imágenes Docker acumuladas**: el `docker system prune` en cada deploy
   (obligatorio en la máquina de 4 GB) mantiene el uso bajo; con 512 GB de
   disco hay margen, pero el prune evita sorpresas.
7. **Build PPR + `next start` en dev**: borrar `.next` con el server corriendo
   rompe las rutas `◐ Partial Prerender` (chunks SSR lazy → `ChunkLoadError`).
   Rebuild + restart por PID; ver "Revisión visual del front" (2026-11-19).

## Criterio de "listo" por fase

Cada fase termina con: CI verde, los flujos de la fase cubiertos por tests
(componentes + al menos un E2E manual documentado), y el flujo correspondiente
de la batería E2E del backend pasando contra el front real.

## Registro de E2E manuales

Flujos probados a mano contra el backend real (`:8080`) con datos de dev.
Precondición: backend corriendo + `npm run dev` (o build de prod en `:3001`).

### Fase 1 — Catálogo público (probado 2026-11-17)

**1. Home (`/`)**
- Se ve el hero + "Nuestros cafés" con los 4 cafés disponibles (el agotado
  no aparece). Todo renderizado en el HTML inicial (SSR/prerender).
- "Ver catálogo" y "Ver todos →" navegan a `/coffees`.

**2. Listado + filtros (`/coffees`)**
- Grilla con las 5 fichas; cada tarjeta enlaza a su detalle.
- Filtro `process=washed` → 2 resultados (El Paraíso 92, Finca La Esperanza).
- Filtro `roast_level=dark` → 1 resultado (Antioquia Dark Roast Blend).
- Checkbox "Solo disponibles" → 4 resultados (quita el agotado).
- Cambiar un filtro reinicia la paginación a página 1 y actualiza la URL
  (transición de cliente, sin recarga). "Limpiar filtros" vuelve a `/coffees`.
- Filtro sin resultados (p. ej. `process=honey&roast_level=dark`) → estado
  vacío con CTA "Ver todo el catálogo".

**3. Ficha de detalle (`/coffees/{id}`)**
- Café disponible: productor, finca/región/país, proceso, tostado, notas de
  cata, descripción, bolsa (g), precio COP y badge de stock. Botón "Agregar
  al carrito" deshabilitado (Fase 2).
- Café agotado: badge "Agotado" + formulario de waitlist.

**4. Waitlist (café agotado)**
- Correo inválido → error de validación en cliente, sin llamada a la API.
- Correo válido → `POST /waitlist` 201, la UI muestra "¡Listo! Te avisaremos
  cuando {café} vuelva a estar disponible." (verificado en DB: entry creada).

**5. Estados de error y 404**
- Backend caído (`:8080` detenido) → `/coffees` muestra el error boundary con
  "Reintentar" (que recupera al volver el backend); la home degrada a sección
  de destacados vacía sin tumbar la página.
- ID inexistente → UI "Café no encontrado" (soft-404: HTTP 200 + contenido
  stream, comportamiento documentado de PPR en esta Next.js; ver nota en
  `src/app/(public)/coffees/[id]/page.tsx`).

**Tests automatizados de la fase:** `npm test` (20 tests: format, CoffeeCard,
WaitlistForm, Pagination, CoffeeFilters) + CI (lint, typecheck, test, build).

### Fase 2 — Carrito invitado + auth (probado 2026-11-19)

Método: Chromium headless vía CDP (`/tmp/opencode/e2e-fase2.cjs`, reproducible
con `node e2e-fase2.cjs`) contra build de prod en `:3001` + backend real en
`:8080`, con perfil de browser limpio (nueva sesión de invitado). 11 checks.

**1. Carrito invitado (sin login)**
- Ficha de detalle → "Agregar al carrito" → botón pasa a "Agregado ✓"; el
  contador del header muestra "Carrito, 1 artículo". El guest session ID
  (UUID en localStorage) viaja en `X-Session-ID`; el carrito vive en Redis.

**2. Página `/cart`**
- Ítem con nombre, foto, precio unitario ($ 92.000) y total.
- Stepper "+" sube a cantidad 2 → total $ 184.000 (PATCH al backend).
- "Quitar" → estado vacío "Tu carrito está vacío." con CTA al catálogo.

**3. Registro, logout y login con merge del carrito invitado**
- Con 1 unidad en el carrito de invitado: registro → header saluda
  "Hola, {nombre}"; logout → header vuelve a "Ingresar" (estado invitado).
- Login con la cuenta recién creada → el carrito del usuario trae la unidad
  mergeada desde el invitado (backend fusiona vía `X-Session-ID` en el login).

**4. Credenciales inválidas**
- Login con contraseña incorrecta → alert "Correo o contraseña incorrectos."
  (mapeo del 401 `UNAUTHORIZED`), sin tokens en sesión.

**Hallazgo (bug corregido):** Next 16 con Cache Components preserva hasta 3
rutas ocultas con `<Activity>` **sin desmontarlas ni resetear su estado**.
Tras un login exitoso el form de `/login` quedaba con `status="submitting"`
(botón "Ingresando…" deshabilitado) y al volver a la ruta se re-mostraba
atorado. Corrección: el submit exitoso hace `resetForm()` antes de
`router.push()` (ver `src/app/(auth)/login/page.tsx` y `register/page.tsx`).
El E2E lee texto con `innerText` y filtra finders a elementos visibles, por
los árboles ocultos de Activity.

**Tests automatizados de la fase:** `npm test` (46 tests: + cart hooks,
AddToCart, QuantityStepper, HeaderActions, página /cart, login, register —
incluye 2 tests de regresión del reset post-submit) + CI (lint, typecheck,
test, build).

### Fase 3 — Checkout y órdenes (probado 2026-11-19)

Método: Chromium headless vía CDP (`/tmp/opencode/e2e-fase3.cjs`, reproducible
con `node e2e-fase3.cjs`) contra build de prod en `:3001` + backend real en
`:8080`, con perfil de browser limpio. 24 checks, café de prueba "El Paraíso
92" ($ 85.000, stock 12 en dev).

**1. Invitado: gates de sesión**
- `/checkout` y `/orders` → "Inicia sesión para continuar." con links
  `/login?next=…` y `/register?next=…` (la ruta de origen se preserva).

**2. Registro y carrito**
- Registro → header saluda "Hola, E2E Fase 3"; ficha de café → "Agregar al
  carrito" → "Agregado ✓".

**3. Checkout (`/checkout`)**
- Sin direcciones guardadas → hint "Aún no tienes direcciones guardadas."
- "Agregar nueva dirección" → formulario (etiqueta, calle, ciudad,
  departamento, país default CO) → "Guardar dirección" (POST
  `/users/me/addresses`). La nueva dirección queda seleccionada por radio y
  marcada "Predeterminada" (era la primera).
- `GET /checkout/validate` → por ítem: "Cantidad: 1 · Stock disponible: 12"
  + "Disponible ✓"; total $ 85.000.
- "Confirmar pedido" (POST `/orders` con la dirección) → navega a
  `/orders/{id}`.

**4. Detalle (`/orders/{id}`)**
- Estado "Confirmado", ítem con cantidad y precio, dirección de envío
  ("Cra 1 #2-3, Medellín, Antioquia · CO"), total $ 85.000.

**5. Historial (`/orders`)**
- Lista la orden (id corto, fecha, "1 ítem", badge de estado, total) con
  link "Ver detalle".

**6. Cancelación (dos pasos) + carrito vaciado**
- "Cancelar pedido" → confirmación inline "¿Cancelar este pedido?" →
  "Sí, cancelar" (POST `/orders/{id}/cancel`) → badge cambia a "Cancelado"
  y el botón de cancelar desaparece (estado no cancelable).
- El carrito quedó vacío tras el pedido ("Tu carrito está vacío.").

**7. Estado no cancelable (puerta 422 del backend)**
- 2ª orden con la dirección ya guardada (queda preseleccionada, predeterminada).
- `PATCH /admin/orders/{id}/status` (API key) → `shipped` + guía
  "GUIA-E2E-42" → el detalle muestra "Enviado", la guía, y **sin** botón de
  cancelar (el backend respondería 422 `UNAVAILABLE`).

**Hallazgos (bugs corregidos en la fase):**
1. **Bootstrap de sesión tras recarga:** el access token vive en memoria y
   solo se restauraba ante un 401; tras una recarga completa el usuario
   quedaba "deslogueado" (carrito invitado, gates de login en
   `/checkout`/`/orders`). Corrección: `Providers` llama a `refreshTokens()`
   en mount si no hay access token pero sí refresh en localStorage (ver
   `src/components/providers.tsx` + 3 tests).
2. **Build Next 16 (Cache Components):** `use(params)` en client page fuera
   de `<Suspense>` rompe el build ("blocking-prerender-dynamic"); se envuelve
   con un boundary y `/orders/[id]` quedó `◐ Partial Prerender`.
3. **Testing de params en jsdom:** el retry de suspensión no se flusha en
   este entorno (React 19.3 + jsdom, verificado con probes). En tests se usa
   `resolvedParams()` (`src/test/utils.tsx`): Promise pre-marcada
   `status:"fulfilled"` + `value`, que es lo que Next hace en prod y lo que
   `use()` lee de forma síncrona (`resolveThenable`).
4. **CI typecheck en checkout limpio (preexistente, Fases 1–3):**
   `PageProps`/`LayoutProps` son tipos globales que Next genera en
   `.next/types`; sin ese directorio el typecheck fallaba siempre. Fix: script
   `typegen` (`next typegen`) en package.json + step en CI antes de
   lint/typecheck (commit `153abf6`).

**Tests automatizados de la fase:** `npm test` (83 tests: + address form,
address selector, validation summary, order status badge, cancel button,
páginas /checkout, /orders, /orders/[id], providers) + CI (lint, typecheck,
test, build).

### Revisión visual del front (2026-11-19)

Método: 17 screenshots capturadas con Chromium headless vía CDP (mismo
harness que el E2E, `/tmp/opencode/shots-fase3.cjs`) contra build de prod en
`:3001` + backend real. Viewport 1280x900 (desktop) y 390x844 (móvil),
recorriendo invitado + flujo completo logueado (registro → carrito → checkout
con dirección nueva → orden → historial → cancelación) + móvil. Revisión
manual de cada captura.

**Páginas verificadas (todas OK):** home, catálogo (filtros, paginación,
badges de stock, agotado), ficha de café (stepper de cantidad), carrito vacío
y con ítem, gates de `/checkout` y `/orders` (invitado), login, checkout sin
dirección / form de dirección / completo (predeterminada auto-marcada, botón
"Confirmar pedido" deshabilitado sin dirección), detalle de orden, historial,
cancelación en dos pasos (confirmación inline), detalle cancelado, móvil
(catálogo + detalle, sin overflow).

**Hallazgos menores (cosméticos — se pulen en Fase 6):**
- Espacio muerto en las tarjetas de la home (el grid estira los items).
- Sin fotos de producto: el schema del backend no tiene campo de imagen.

**Duda resuelta — restock al cancelar:** en las capturas el stock de "El
Paraíso 92" mostraba 10 (no 12). Verificado en código: `OrderStore.Cancel`
restaura el stock **atómicamente en la misma transacción** que marca
`cancelled` (`internal/store/postgres/order_store.go`). El 10 era correcto:
dos órdenes de prueba activas habían consumido bolsas (1 `shipped` del E2E +
1 `confirmed` de un run de screenshots fallido antes de cancelar); la orden
cancelada sí devolvió la suya (neto 0). Tras el cleanup, stock restaurado a
12.

**Lección operativa:** nunca `rm -rf .next` con el server de prod
(`next start :3001`) corriendo desde ese build — la parte dinámica PPR carga
los chunks SSR de forma lazy y las rutas `◐` se quedan en skeleton con
`ChunkLoadError` (digest 2413310770). Fix: rebuild + restart por PID (el
proceso se titula `next-server`; `pkill` no lo toma).

### Fase 4 — Cuenta (probado 2026-11-19)

Método: Chromium headless vía CDP (`/tmp/opencode/e2e-fase4.cjs`, reproducible
con `node e2e-fase4.cjs`) contra build de prod en `:3001` + backend real en
`:8080`, con perfil de browser limpio. 14 checks.

**1. Registro y `/account` (perfil)**
- Registro → header saluda "Hola, E2E Fase 4".
- `/account` → sección "Perfil": input de nombre con el valor actual, correo
  **de solo lectura** (disabled; el backend no expone cambio de email/clave),
  botón "Guardar cambios" deshabilitado sin cambios.
- Sección "Direcciones": estado vacío "Aún no tienes direcciones guardadas."
  + CTA "Agregar dirección".

**2. Crear direcciones con `is_default`**
- "Agregar dirección" → formulario (el mismo `AddressForm` del checkout, con
  checkbox "Dirección predeterminada") → guardar → la dirección aparece en la
  lista con badge "Predeterminada" (único).
- 2ª dirección sin marcar default → aparece sin badge; sigue habiendo
  exactamente 1 default (el backend desmarca la anterior al crear una nueva).

**3. Eliminar (dos pasos, inline en la fila)**
- "Eliminar" → "¿Eliminar esta dirección?" + "Sí, eliminar"/"Volver" (mismo
  patrón que la cancelación de pedidos) → la fila desaparece; la default
  intacta.

**4. Rename de perfil → header sin recarga**
- Cambiar el nombre + "Guardar cambios" → feedback "Perfil guardado ✓" y el
  header actualiza a "Hola, {nuevo nombre}" **sin recarga** (invalidación de
  la query `me` compartida con el header).

**5. Recarga completa + navegación**
- Reload de `/account` → sesión restaurada (bootstrap de Fase 3) con el nombre
  nuevo persistido en el input.
- Header autenticado: link "Mi cuenta" → `/account`.

**Hallazgos:**
1. **Contrato del backend (limitación documentada):** no existe endpoint de
   edición de direcciones ni de cambio de default en una existente —
   `is_default` solo se fija al crear (`POST /users/me/addresses`; el backend
   desmarca las anteriores en `UserStore.AddAddress`). El front implementa
   C/R/D + default al crear. Follow-up backend opcional: `PATCH
   /users/me/addresses/{id}`. Las órdenes guardan snapshot de la dirección
   (sin FK), así que borrar una no afecta pedidos pasados.
2. **Cosmético (Fase 6):** el link "Mi cuenta" del header hace wrap a dos
   líneas en 390px.

**Revisión visual:** 6 screenshots (gate invitado, cuenta vacía, form de
dirección, dos direcciones con badge, confirmación de eliminación inline,
móvil 390px) — todas OK.

**Tests automatizados de la fase:** `npm test` (98 tests: + hooks account
[invalidación de `me` y `addresses`], profile-form, address-list, página
/account) + CI (lint, typecheck, test, build).

### Fase 5 — Panel admin (probado 2026-11-19)

Método: Chromium headless vía CDP (`/tmp/opencode/e2e-fase5.cjs`, reproducible
con `node e2e-fase5.cjs`) contra build de prod en `:3001` + backend real en
`:8080`, con perfil de browser limpio. 30 checks. La orden de prueba se crea
por API sobre un café real del catálogo ("El Paraíso 92", stock suficiente);
el café CRUD se crea/borra durante el run. Cleanup automático al final
(usuario/orden/direcciones/carts por SQL + restitución de stock vía API con
movimiento auditable).

**1. Login (API key en memoria)**
- Clave inválida → "Clave inválida. Verifica con quien administra el backend."
  (el login verifica la clave contra `GET /admin/orders?limit=1`; 401 → error,
  sin sesión). Clave válida (`ADMIN_API_KEY`) → entra al panel.
- La clave vive solo en memoria (`admin-session.ts`, patrón listeners igual
  que `session.ts`): al recargar la pestaña el gate vuelve a pedirla.

**2. Crear café (POST /admin/coffees)**
- "Nuevo café" → form inline reemplaza la tabla (nombre, proceso/tostado en
  selects, precio en pesos COP → centavos, notas comma-separated → array,
  bolsa, moneda, productor, finca/país/región, stock inicial) → el café
  aparece en la tabla y en `GET /coffees` (precio/notas/stock verificados).

**3. Editar café (PUT /admin/coffees/{id})**
- Form prellenado; productor/finca en bloque de solo lectura (el service los
  conserva) y stock no editable (se gestiona en «Stock»). Guardar → nombre y
  precio actualizados, finca conservada (verificado en API).

**4. Stock (GET/PATCH /admin/coffees/{id}/stock)**
- Panel inline: stock actual + form de ajuste (add/subtract, cantidad, nota)
  + listado de movimientos (el backend los devuelve en DESC).
- Ajuste +5 → feedback "Stock ajustado: 3 → 8 bolsas." + movimiento visible.
- Restar 99 con stock 8 → error del backend "not enough stock to subtract"
  (HTTP 422) mostrado en el panel.

**5. Eliminar café (DELETE /admin/coffees/{id}, dos pasos)**
- "Eliminar" → confirmación inline "¿Eliminar este café?" → "Sí, eliminar" →
  la fila desaparece y el backend ya no lo expone; `GET .../stock` del café
  borrado responde 404 (los `stock_movements` se limpian en la misma
  transacción — ver hallazgo 2).

**6. Órdenes (GET /admin/orders + PATCH .../status)**
- Orden creada por API (confirmed) aparece en la pestaña Órdenes con id corto,
  fecha, destino, total y badge de estado.
- "Gestionar" → detalle expandible: ítems, dirección completa y form de
  cambio de estado (select + tracking number opcional; el botón queda
  deshabilitado sin cambio).
- → processing → feedback "Estado actualizado a «En preparación»."; →
  shipped + tracking "SEI-E2E-123" → el backend confirma ambos (verificado en
  `GET /orders/{id}`).
- Filtro por estado: "shipped" → solo órdenes enviadas; el contador coincide
  con las filas visibles.

**7. Eliminar café con órdenes → bloqueado (409)**
- Intentar borrar "El Paraíso 92" (tiene órdenes) → la fila muestra el error
  del backend: "No se pudo eliminar «El Paraíso 92»: coffee has orders and
  cannot be deleted (HTTP 409)." La API responde `409 CONFLICT` y el café
  sigue existiendo (el historial de órdenes no se destruye).

**8. Cerrar panel**
- "Cerrar panel" descarta la clave de memoria → vuelve al form de login, sin
  tocar la sesión de cliente (JWT).

**Hallazgos (2 bugs críticos del backend descubiertos en el E2E y corregidos
en `CoffeeProyect` @ `develop`, commit `5bff7fe`):**
1. **`writeInternalError` recursivo (crash total del servidor):**
   `internal/handler/response.go` se llamaba a sí mismo en vez de responder:
   un solo 500 generaba ~4.8M líneas de log y un stack overflow que mataba
   todo el backend (lo provocó el primer run del E2E). Fix: responde una
   única vez con 500 + `INTERNAL_ERROR` (+ test de regresión).
2. **`DELETE /admin/coffees/{id}` imposible para cafés con movimientos:**
   `stock_movements` (y también `cart_items`/`waitlist`) tienen FK NO ACTION
   a `coffees` y el store no las limpiaba → 500 (23503) en el primer café con
   movimientos. Fix: `CoffeeStore.Delete` ahora es una transacción que borra
   esos datos efímeros y **bloquea** (nuevo `ErrCoffeeHasOrders` → 409
   `CONFLICT`) si el café ya fue vendido, para no destruir `order_items`.
   El panel muestra el mensaje del backend en la fila (no un genérico).
   Tests: 2 integration tests del Delete + test de propagación en service.

**Limitaciones documentadas (backend):**
- No valida transiciones de estado de órdenes: cualquier estado es aceptable
  desde cualquier otro (el panel lo permite; follow-up backend opcional:
  máquina de estados).
- No existe `GET /admin/coffees`: la tabla del panel usa el endpoint público
  `GET /coffees?limit=50` (la lectura no necesita clave).

**Revisión visual:** 10 screenshots (login con error, tabla de cafés con
badge "Agotado", form crear, form editar con bloque read-only, panel de stock
con movimiento real, confirmación de eliminación inline, error 409 en la
fila, pestaña Órdenes con filtros/badges/guías, orden expandida con ítems +
dirección + cambio de estado, móvil 390px) — todas OK
(`/tmp/opencode/shots-fase5.cjs`).

**Tests automatizados de la fase:** `npm test` (130 tests: + admin session,
hooks admin [probes de invalidación por prefijo], login-form, coffee-form,
stock-panel, orders-tab, página /admin) + CI (lint, typecheck, test, build).

### Fase 6 — Pulido (probado 2026-11-19)

Método: screenshots Chromium headless vía CDP (`/tmp/opencode/shots-fase6.cjs`,
baseline) y `/tmp/opencode/shots-fase6-despues.cjs` (post-fix) contra build de
prod en `:3001` + backend real en `:8080`, viewport 1280x900 (desktop) y
390x844 (móvil, con usuario logueado para el header completo).

**1. Header móvil (390px) — wrap de "Mi cuenta" corregido**
- Baseline: con sesión logueada, "Mi cuenta" hacía wrap a dos líneas
  (logo + Catálogo + carrito + Mi cuenta + Salir no cabían en 390px).
- Fix: el logo pasa a icono-only bajo `sm` (`☕` + texto oculto) y todos los
  links de nav llevan `whitespace-nowrap`. Post-fix: todo en una línea.

**2. Tarjetas del catálogo — espacio muerto corregido**
- Baseline: el grid estira las tarjetas a la altura de la fila; la tarjeta
  con título/descripción de 2 líneas ("Finca La Esperanza Wush Wush") dejaba
  un hueco visible entre las notas y el footer en las tarjetas cortas.
- Fix: `line-clamp-1` en la descripción de `CoffeeCard`. Alturas uniformes,
  footer pegado al contenido; el origen completo sigue en la ficha de detalle.

**3. Metadata/OG por café (SEO)**
- `generateMetadata` de la ficha ahora emite `openGraph` (título con origen:
  "El Paraíso 92 — El Paraíso, Colombia", descripción, `type: website`)
  además del título/descripción existentes.
- Layout raíz: `metadataBase` (env `NEXT_PUBLIC_SITE_URL`, default
  `http://localhost:3001`), defaults de `openGraph` (siteName, locale `es_CO`)
  y `twitter:card summary`.
- Verificado en el HTML final de `GET /coffees/{id}` con backend vivo:
  `<title>`, `og:title` y `og:description` por café presentes (PPR: el shell
  statico trae la metadata del layout y la parte dinámica streaméa la del
  café — si el backend está caído se queda con los defaults, sin tumbar la
  página). Sin `og:image`: el schema del backend no tiene campo de imagen
  (limitación documentada).
- Sin sitemap/canonical: la app vive en un tailnet privado (sin valor de
  indexación); `metadataBase` queda listo si se expone públicamente.

**4. Accesibilidad básica**
- Skip-link "Saltar al contenido" en el layout público (visible solo con
  foco) + `id="contenido"` en `<main>`.
- Auditoría del estado existente (todo ya cubierto): labels reales en los 31
  inputs, `aria-label` en botones de icono (carrito), `role="group"` +
  `aria-live` en el stepper de cantidad, selects de filtros dentro de
  `<label>`, `lang="es"`.

**Hallazgo operativo (esta máquina de dev):** los procesos levantados con
`nohup`/`setsid` (backend `go run`, `next start`) morían sin rastro cuando la
sesión de escritorio se reiniciaba o el equipo suspendía. Solución: servicios
de usuario systemd con `Restart=always` (`~/.config/systemd/user/coffee-api.service`
y `coffee-web.service`; backend como binario precompilado en
`~/.local/bin/coffee-api`). `systemctl --user restart coffee-api|coffee-web`;
logs en `journalctl --user -u <svc>`. No enabled at boot a propósito.

**Tests automatizados de la fase:** `npm test` (133 tests: + generateMetadata
de la ficha [openGraph con origen, 404 → {}, API caída → {}]) + CI
(lint, typecheck, test, build).

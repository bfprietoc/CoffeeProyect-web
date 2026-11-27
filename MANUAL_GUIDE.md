# CoffeeProyect — Guía Manual (levantar todo a mano)

> **Propósito:** operar el proyecto entero **a mano**, sin deploy automation,
> desde una máquina de desarrollo. Incluye la arquitectura, las variables de
> entorno, los pasos de arranque, los túneles, y una referencia de endpoints
> con payloads. **Antes de tocar algo, leé la sección que corresponde.**
>
> Repos relacionados:
> - Backend: `../CoffeeProyect` (API REST Go :8080)
> - Frontend: este repo (`CoffeeProyect-web`, Next.js :3001)
>
> **Estado del proyecto (2026-11-27):** v1.2.0 (web + backend) con Google login
> validado en vivo (producción aprobada) y Wompi sandbox listo para validar.

---

## 1. Arquitectura (el panorama)

```
Browser (localhost:3001 o tailnet)
        │  (HTTP en dev; HTTPS en producción via Caddy + tailscale)
        ▼
Frontend Next.js (:3001)  ──NEXT_PUBLIC_API_URL──►  Backend Go (:8080)
                                                      │
                                                      ▼
                                            Postgres (opcional) + Redis (opcional)
```

- **Backend** — API REST Go. Sin `DATABASE_URL` corre en **in-memory** (datos se
  pierden al reiniciar). Con `DATABASE_URL` usa Postgres (Docker). Redis es opcional.
- **Frontend** — Next.js + TS + Tailwind. `.env.local` define `NEXT_PUBLIC_API_URL`.
- **Producción** (wake-agent) — Docker + Caddy + tailscale. Ver `DEPLOY.md`.

**Donde corre qué** (esta máquina de desarrollo, in-memory):

| Servicio | Comando | Puerto | systemd |
|---|---|---|---|
| `coffee-api` | `~/.local/bin/coffee-api` (o `go run main.go`) | 8080 | `systemctl --user` |
| `coffee-web` | `next start` (build + start) | 3001 | `systemctl --user` |

Los unit systemd del usuario son: `~/.config/systemd/user/coffee-api.service` y
`~/.config/systemd/user/coffee-web.service`.

---

## 2. Variables de entorno

### 2.1 Backend — `../CoffeeProyect/.env` (gitignored)

> **Nunca commitear `.env`.** Solo `.env.example` (placeholders) va al repo.

| Variable | Requerida | Default | Descripción |
|---|---|---|---|
| `PORT` | no | `8080` | Puerto HTTP |
| `DATABASE_URL` | no | — (in-memory) | DSN Postgres. Sin ella, todo en memoria |
| `REDIS_URL` | no | — (in-memory) | URL Redis. Sin ella, carrito de invitados en memoria |
| `JWT_SECRET` | ⚠️ prod | `dev-secret-change-in-production` | Secreto para firmar JWT. **En prod: `openssl rand -hex 32`** |
| `ADMIN_API_KEY` | no | — (endpoints admin deshabilitados) | Header `X-Api-Key` para `/admin/*` |
| `GOOGLE_CLIENT_ID` | no | — (Google 503) | OAuth Client ID (tipo Web) de Google Cloud Console |
| `WOMPI_PUBLIC_KEY` | no | — (pagos 503) | `pub_test_…` (sandbox) o `pub_prod_…` (producción) |
| `WOMPI_INTEGRITY_SECRET` | no | — (pagos 503) | `test_integrity_…` / `prod_integrity_…` — **server-only** |
| `WOMPI_EVENT_SECRET` | no | — (pagos 503) | `test_events_…` / `prod_events_…` — **server-only**, distinto del anterior |
| `PUBLIC_BASE_URL` | no | — (redirect omitido) | URL pública del sitio. Si está vacío, el checkout de Wompi muestra su propia página de éxito. Si falta → los pagos están habilitados, pero no hay redirect |
| `SMTP_HOST` | no | — (email deshabilitado) | Host SMTP. Sin él, emails se omiten silenciosamente |
| `SMTP_PORT` | no | `587` | Puerto SMTP |
| `SMTP_USER` / `SMTP_PASS` | no | — | Usuario/contraseña SMTP |
| `SMTP_FROM` | no | — | Dirección de origen de emails |
| `CORS_ORIGIN` | no | `*` | Origen permitido por CORS |

**Formato de `DATABASE_URL`:**
```
postgres://usuario:password@host:puerto/nombre_db?sslmode=disable
```
Valor local (Docker): `postgres://coffee:coffee@localhost:5432/coffeedb?sslmode=disable`

### 2.2 Frontend — `.env.local` (gitignored en dev; `.env.production` en deploy)

> Las variables `NEXT_PUBLIC_*` se **inlinan en build time** — tras cambiarlas
> hay que rebuild (`npm run build`) y restart del servicio.

| Variable | Requerida | Default | Descripción |
|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | no | `http://localhost:8080` | URL de la API. En prod (Docker): `/api` relativo (Caddy rutea) |
| `NEXT_PUBLIC_SITE_URL` | no | — | URL pública del sitio (metadataBase/OG) |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | no | — (botón oculto) | OAuth Client ID. Mismo valor que backend |
| `NEXT_PUBLIC_PAYMENTS_ENABLED` | no | — (botón oculto) | `"true"` muestra el botón de pago. El backend debe tener las llaves de Wompi |

### 2.3 Cómo modificar y dónde quedan

**Reglas:**
- Backend `.env` → cambia → **reinicia** el servicio (`systemctl --user restart coffee-api`)
- Frontend `.env.local` → cambia → **rebuild** (`npm run build`) → **restart** (`systemctl --user restart coffee-web`)
- Frontend `.env.local` en CI/E2E → **vacío** (CI corren sin Google/pagos)
- `.env` y `.env.local` están en `.gitignore` → verificar nunca van a git con `git check-ignore .env`

---

## 3. Levantar todo a mano

### 3.1 Preparación (primera vez)

```bash
# Backend
cd /home/bfprietoc/Documents/Repos/CoffeeProyect
cp .env.example .env       # editar con valores reales
go mod download            # descargar dependencias

# Frontend
cd /home/bfprietoc/Documents/Repos/CoffeeProyect-web
cp .env.example .env.local # editar con valores reales
npm install
```

### 3.2 Infraestructura (Docker — Postgres + Redis)

```bash
cd /home/bfprietoc/Documents/Repos/CoffeeProyect
make infra-up        # docker compose up -d (espera hasta que Postgres esté listo)
```

> **Opcional:** si no querés Docker, omití esta sección — el backend corre en modo
> in-memory (los datos se pierden al reiniciar). Para flujo completo de pruebas
> usá Docker.

Verificar: `docker compose ps` → `postgres` y `redis` en estado `Up`.

### 3.3 Migraciones y seed

> Las migraciones también se aplican **automáticamente** al arrancar el backend
> con `DATABASE_URL` (`internal/db/migrate.go`). El comando manual es opcional.

```bash
make migrate-up      # binario golang-migrate (make usa $(DATABASE_URL) del .env)
make seed            # carga los 5 cafés colombianos
```

Revertir la última migración (solo dev): `make migrate-down`

### 3.4 Backend

```bash
# Como servicio systemd (in-memory o con DB, según .env)
systemctl --user start coffee-api
systemctl --user is-active coffee-api    # → active

# O a mano (terminal dedicada)
cd ../CoffeeProyect
go run main.go
```

Verificar:

```bash
curl http://localhost:8080/health    # {"status":"ok"}
curl http://localhost:8080/coffees    # 5 cafés
```

Log típico al arrancar (in-memory):
```
2026/11/26 ... DATABASE_URL not set — using in-memory store
2026/11/26 ... listening on :8080
```

### 3.5 Frontend

```bash
cd /home/bfprietoc/Documents/Repos/CoffeeProyect-web

# Rebuild si cambió el .env.local (NEXT_PUBLIC_* se inlinan en build)
npm run build

# Como servicio systemd
systemctl --user start coffee-web
systemctl --user is-active coffee-web   # → active

# O con hot-reload (desarrollo)
npm run dev    # next dev (:3001)
```

Verificar: `curl -I http://localhost:3001/` → HTTP 200

### 3.6 Verificación end-to-end

```bash
# 1. Login con Google (botón en /login y /register, si NEXT_PUBLIC_GOOGLE_CLIENT_ID está)
# 2. Login con email+contraseña → /orders lista
# 3. Crear pedido: /orders/nuevo? (o desde el carrito)
# 4. Pago: /orders/{id} → botón "Pagar con tarjeta o PSE" (si NEXT_PUBLIC_PAYMENTS_ENABLED=true)
```

---

## 4. Túneles (cloudflared) — para probar pagos/webhooks desde local

> **Esto NO es automático.** Los túneles son procesos largos que se levantan
> manualmente y **expiran en horas** (quick tunnels). No hay hook que los active
> al recibir una request — cuando mueren, la URL pública deja de responder.

### 4.1 Cómo levantar un túnel a mano

La instalación en esta máquina usa el binario `cloudflared` vía npm:

```bash
cd /tmp
nohup node node_modules/cloudflared/lib/cloudflared.js tunnel --url http://localhost:8080 \
  > /tmp/tunnel-backend.log 2>&1 &
nohup node node_modules/cloudflared/lib/cloudflared.js tunnel --url http://localhost:3001 \
  > /tmp/tunnel-frontend.log 2>&1 &

# Esperar ~10s y grep la URL
grep "trycloudflare" /tmp/tunnel-backend.log
```

**Reglas importantes:**
- **Frontend**: si el front viaja por el túnel (HTTPS), el backend DEBE estar
  en una URL HTTPS alcanzable desde el browser — no se puede llamar `http://localhost:8080`
  desde HTTPS (mixed content lo bloquea). El front se rebuilda con `NEXT_PUBLIC_API_URL`
  = la URL del túnel del backend.
- **Backend**: el webhook en Wompi apunta a `https://<tunnel-backend>/webhooks/wompi`
  (producción: `https://<host>/api/webhooks/wompi` vía Caddy).
- **Expiración**: los quick tunnels son temporales (~horas). Cuando caduquen:
  - Los logs muestran `ERR Register tunnel error ... "Unauthorized: Tunnel not found"`
  - El frontend (con la URL del túnel bakeada) deja de funcionar — **hay que rebuild** con
    `NEXT_PUBLIC_API_URL` real y restart.
- **Cómo matar el túnel**: `pkill -f "cloudflared tunnel"` (ojo: `pkill -f cloudflared`
  mató el shell propio en una ocasión — usá el patrón más específico).

### 4.2 Alternativas

| Opción | Cuándo |
|---|---|
| Túnel cloudflared (quick) | Probar pagos/webhooks hoy. Temporal |
| Producción (wake-agent + tailnet) | Para flujos reales — sin túneles. Ver `DEPLOY.md` |
| Localhost directo | Editar/debug del front — sin webhooks ni redirects HTTPS |

---

## 5. Endpoints — referencia

> Servidor en `http://localhost:8080` (o `:$PORT`). Incluye Google y Wompi.
> Payloads: JSON salvo indicación. Errores: `{"error":"...","code":"..."}`.

### 5.1 Públicos

| Método | Ruta | Auth | Payload / Descripción |
|---|---|---|---|
| GET | `/health` | — | → `{"status":"ok"}` |
| GET | `/coffees` | — | → lista de cafés. Params: `available=true`, `roast_level=light`, `country=Colombia`, `process=natural`, `page=1&limit=2` |
| GET | `/coffees/{id}` | — | → café |
| POST | `/auth/register` | — | `{name,email,password}` (email único, password ≥8) → `{user,tokens}` 201. Error: 400 INVALID_INPUT / 409 EMAIL_CONFLICT |
| POST | `/auth/login` | — | `{email,password}` → `{user,tokens}` |
| POST | `/auth/refresh` | — | `{refresh_token}` → `{user,tokens}` |
| POST | `/auth/google` | — | `{credential}` (ID token de Google) → `{user,tokens}`. 503 si `GOOGLE_CLIENT_ID` no configurado; 401 si el token es inválido |
| GET | `/cart` | opt-auth | Devuelve carrito. Invitado: header `X-Session-ID: <uuid>` |
| POST | `/cart/items` | opt-auth | `{coffee_id,quantity}` → carrito actualizado |
| PATCH | `/cart/items/{coffeeId}` | opt-auth | `{quantity}` → carrito |
| DELETE | `/cart/items/{coffeeId}` | opt-auth | → carrito |
| DELETE | `/cart` | opt-auth | Vacía el carrito |
| POST | `/waitlist` | opt-auth | `{coffee_id,email}` → entrada. Error 422 si el café tiene stock |
| POST | `/webhooks/wompi` | — (público) | Payload Wompi `transaction.updated`. Verificado por checksum → 200 siempre si es procesable, 401 si el checksum es inválido |

### 5.2 Usuario (JWT)

| Método | Ruta | Payload / Descripción |
|---|---|---|
| GET | `/users/me` | → `{id,name,email,...}` |
| PUT | `/users/me` | `{name}` → perfil actualizado |
| GET | `/users/me/addresses` | → lista de direcciones |
| POST | `/users/me/addresses` | `{label,street,city,department,country,is_default?}` → dirección 201 |
| DELETE | `/users/me/addresses/{id}` | → 200 |
| GET | `/checkout/validate` | → validación del carrito (200 OK) |
| POST | `/orders` | `{address_id}` → pedido creado (descuenta stock atómicamente) 201 |
| GET | `/orders` | → historial de pedidos del usuario |
| GET | `/orders/{id}` | → detalle |
| POST | `/orders/{id}/cancel` | → pedido cancelado (solo `confirmed`/`processing`) 200 |
| POST | `/orders/{id}/payment` | **Sin body** → `{publicKey,reference,amountInCents,currency,signature,redirectUrl,customerEmail}`. redirectUrl es **vacío** si no hay PUBLIC_BASE_URL configurado |

### 5.3 Admin (header `X-Api-Key: <ADMIN_API_KEY>`)

| Método | Ruta | Payload / Descripción |
|---|---|---|
| POST | `/admin/coffees` | `{name,process,roast_level,description,tasting_notes[],bag_size_grams,price_cents,currency,stock_bags,producer_name,farm_name,farm_country,farm_region}` → café 201 |
| PUT | `/admin/coffees/{id}` | mismo (preserva stock/productor/finca) |
| DELETE | `/admin/coffees/{id}` | → 200 |
| GET | `/admin/coffees/{id}/stock` | → stock + movimientos |
| PATCH | `/admin/coffees/{id}/stock` | `{operation:"add"\|"subtract",quantity,note?}` → stock actualizado |
| GET | `/admin/orders` | → lista de todos los pedidos |
| PATCH | `/admin/orders/{id}/status` | `{status:"processing"\|"shipped"\|"delivered"\|"cancelled",tracking_number?}` → pedido |

### 5.4 Reglas de pago (Feature B)

- `POST /orders/{id}/payment` es idempotente: `pending`/`failed` → 200 con los params; `paid` → 409; pedido no pagable → 422; Wompi no configurado → 503.
- El pedido **nunca** puede ir a `processing` si no está `paid` (422 PAYMENT_REQUIRED).
- **La verdad del pago es el webhook**, no el redirect. El front nunca debe
  trustear `?payment=1` como confirmación — refetchee al pedido.

### 5.5 Error codes

| Code | HTTP | Cuándo |
|---|---|---|
| `NOT_FOUND` | 404 | Recurso inexistente |
| `BAD_REQUEST` | 400 | Parámetro/body inválido |
| `UNAUTHORIZED` | 401 | Token ausente/inválido/expirado (o credenciales incorrectas en login) |
| `EMAIL_CONFLICT` | 409 | Email ya registrado |
| `CONFLICT` | 409 | Café con pedidos no se puede eliminar |
| `UNAVAILABLE` | 422 | Café sin stock / pedido no cancelable / stock insuficiente |
| `INVALID_INPUT` | 422 | Input válido con restricción de negocio (p. ej. waitlist de café con stock) |
| `PAYMENT_ALREADY_PAID` | 409 | Pedido ya pagado |
| `PAYMENT_UNAVAILABLE` | 422 | Pedido no pagable en su estado |
| `PAYMENT_REQUIRED` | 422 | Pedido debe estar pagado para procesarse |
| `PAYMENTS_DISABLED` | 503 | Wompi no configurado (pago o webhook) |
| `BAD_SIGNATURE` | 401 | Checksum del webhook inválido |
| `GOOGLE_AUTH_DISABLED` | 503 | Google no configurado |
| `INVALID_GOOGLE_TOKEN` | 401 | ID token de Google inválido (aud/issuer/exp/JWT) |
| `INTERNAL_ERROR` | 500 | Error inesperado |

---

## 6. Troubleshooting

| Síntoma | Causa | Arreglo |
|---|---|---|
| `/coffees` vacío | Servidor en modo in-memory y reiniciado | Normal: recrear datos o restaurar DB |
| Login con Google 503 | `GOOGLE_CLIENT_ID` no está | Ponerlo en backend `.env` + reiniciar |
| Botón Google no aparece | `NEXT_PUBLIC_GOOGLE_CLIENT_ID` no está o backend usa otra key | Ponerlo en `.env.local` + **rebuild** + restart |
| Botón de pago no aparece (frontend) | `NEXT_PUBLIC_PAYMENTS_ENABLED` no es `"true"` | Ponerlo en `.env.local` + **rebuild** + restart |
| Pago: 503 | Backend sin llaves Wompi | Poner `WOMPI_*` en backend `.env` + reiniciar |
| Pago: 422/409 | Pedido no pagable (cancelado o ya pagado) | Crear otro pedido |
| Wompi: 403 en checkout | redirect URL (localhost) rechazada por Wompi | Omitir redirect (PUBLIC_BASE_URL sin valor) o usar URL pública |
| Webhook: 401 | Checksum inválido (secreto incorrecto o formato) | Verificar `WOMPI_EVENT_SECRET` con el dashboard; logs muestran el motivo exacto |
| Webhook nunca llega | URL de eventos no configurada en el panel, o túnel cae | Configurar URL (ver §4); verificar túnel/panel |
| Frontend: "No se pudo conectar con la API" | `NEXT_PUBLIC_API_URL` mal o backend caído | Verificar backend activo + `.env.local` + rebuild |
| Login/navegación roto tras restart frontend | Build stale | Rebuild + restart (`npm run build` + `systemctl --user restart coffee-web`) |
| Frontend UI no responde tras redirect Wompi | Tokens guardados en localStorage en otro origen | Usar siempre el mismo origen (localhost o túnel) para entrar y pagar |

---

## 7. Checklist de arranque a mano

```
[ ] .env backend (JWT_SECRET real, Wompi/Google si se testean)
[ ] make infra-up → docker compose ps
[ ] make migrate-up (o dejar que el server migre solo)
[ ] make seed
[ ] systemctl --user start coffee-api → curl /health
[ ] .env.local frontend (NEXT_PUBLIC_API_URL + keys)
[ ] npm run build → systemctl --user start coffee-web
[ ] Abrir localhost:3001 → login → catálogo
[ ] Pagos: botón visible → click → checkout
[ ] Webhook: re-configurar URL → pagar → pedido paid
```

---

## 8. Resumen de comandos

```bash
# Infra
make infra-up / make infra-down / docker compose ps

# Backend (terminal)
cd ../CoffeeProyect && go run main.go    # o systemctl --user start coffee-api

# Frontend (terminal)
npm run dev                              # hot-reload
npm run build && systemctl --user start coffee-web   # producción local

# Tunnel (backend)
node /tmp/node_modules/cloudflared/lib/cloudflared.js tunnel --url http://localhost:8080

# Logs / estado
journalctl --user -u coffee-api -n 50
journalctl --user -u coffee-web -n 50
curl http://localhost:8080/health
```

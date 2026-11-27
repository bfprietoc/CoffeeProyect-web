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
> validado en vivo (producción aprobada) y Wompi sandbox validado en vivo
> (pago + webhook 200 → pedido `paid`, 2026-11-27).

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

## 4. Túneles (cloudflared) — para probar pagos/webhooks en sandbox

> **TL;DR:** el backend corre en tu máquina (`localhost:8080`). Wompi necesita
> llamar a un endpoint **público** para notificarte cada pago — eso no funciona
> desde localhost. El túnel es la única pieza que convierte tu máquina local en
> una URL pública temporal. **Solo lo necesitás para los pagos en sandbox** —
> el frontend y el pago en sí funcionan sin él.

### 4.0 Qué es y por qué existe (el modelo mental)

```
[Wompi] ── POST /webhooks/wompi ──► [Cloudflare] ──► [tu máquina → localhost:8080]
              (HTTPS, desde internet)      (túnel saliente que TÚ abres)
```

- **El túnel NO lo abre Wompi.** Lo abres vos: es un proceso largo (en
  background) que crea una conexión **saliente** desde tu máquina hacia
  Cloudflare. Al hacerlo, Cloudflare te asigna una URL pública temporal
  (`https://<algo>.trycloudflare.com`).
- **La conexión es unidireccional y entrante:** Wompi hace un `POST` a esa URL
  y Cloudflare lo reenvía a tu backend local. Nadie se conecta hacia afuera de
  tu máquina — la conexión se inicia siempre desde vos hacia Cloudflare.
- **NO es un tailscale/VPN entre Wompi y tu máquina.** No existe un vínculo
  privado bilateral; el túnel es un "puente" público de una sola vía.
- **NO es permanente:** los quick tunnels son temporales (horas) y cada vez que
  levantás uno nuevo **cambia de URL**. Eso no es un bug — es el diseño de los
  quick tunnels. (Para un túnel permanente con dominio, ver `DEPLOY.md`.)
- **NO es automático:** no hay hook que lo levante. Si muere o expira, la URL
  pública deja de responder y los webhooks se pierden hasta que lo relevenas.

**Cuándo lo necesitás:** exclusivamente para que Wompi pueda **notificarte**
(webhook) los pagos en el ambiente **Sandbox**. Todo lo demás funciona sin
él:

| Paso del flujo de pago | Necesita túnel |
|---|---|
| Browser → `checkout.wompi.co` y pagar con tarjeta | ❌ No — el browser navega directo a Wompi (internet) |
| Backend → `/orders/{id}/payment` (firmar) | ❌ No — es localhost puro |
| Wompi → webhook → backend → pedido `paid` | ✅ **SÍ** |

**Qué pasa sin túnel:** podés pagar (el checkout y el pago en Wompi funcionan),
pero el webhook nunca llega. La página de éxito de Wompi te dice que pagaste,
pero **el backend nunca se entera** — el pedido queda `pending` para siempre.
La fuente de verdad del pago es el webhook, nunca el redirect ni la página de
éxito.

### 4.1 Checklist completo para probar un pago en sandbox

Hacé estos pasos en orden. La numeración coincide con el flujo de Wompi.

**Paso 1 — Backend arriba**
```bash
systemctl --user start coffee-api   # o: go run main.go en ../CoffeeProyect
curl http://localhost:8080/health   # → {"status":"ok"}
```

**Paso 2 — Túnel del backend**
```bash
cd /tmp
nohup node node_modules/cloudflared/lib/cloudflared.js tunnel --url http://localhost:8080 \
  > /tmp/tunnel-backend.log 2>&1 &
sleep 10
grep "trycloudflare" /tmp/tunnel-backend.log
# → https://<algo>.trycloudflare.com   (anotá la URL — es la del túnel NUEVO)
```
> ⚠️ **Solo el backend necesita túnel.** El frontend queda en `localhost:3001`
> (HTTP) y sigue hablando con `localhost:8080` sin problemas. NO levantes
> túnel del frontend: introduciría mixed content y obligaría a rebuild del
> front con `NEXT_PUBLIC_API_URL` = URL pública.

**Paso 3 — Verificar el túnel**
```bash
# Health check a través del túnel (debe responder 200):
curl -s -m 15 https://<algo>.trycloudflare.com/health
# POST al webhook (vacío) → debe responder 401 = endpoint alcanzable
curl -s -m 15 -o /dev/null -w "%{http_code}\n" -X POST \
  https://<algo>.trycloudflare.com/webhooks/wompi \
  -H "Content-Type: application/json" -d '{}'
```

**Paso 4 — Panel Wompi (solo dueño)**
1. Desarrolladores → **Webhooks**
2. Activar **Modo de pruebas** / ambiente **Sandbox**
   (sin esto, Wompi no genera eventos — el debugger se queda vacío)
3. URL de eventos para **Sandbox** (ambiente de prueba):
   ```
   https://<algo>.trycloudflare.com/webhooks/wompi
   ```
   > Ojo: ambiente distinto a producción. La doc de Wompi lo dice explícito —
   > una URL de eventos diferente por ambiente.

**Paso 5 — Pagar con tarjeta de prueba**
1. En `localhost:3001`, logueate (o usá el test user:
   `pagos-test@coffeeproyect.test` / `Test1234!`)
2. Abrir `/orders/{id}` → botón «Pagar con tarjeta o PSE»
3. El form redirige a `checkout.wompi.co` → pagar con la **tarjeta de prueba**
4. Wompi procesa → envía el webhook → backend valida checksum → pedido `paid`

**Paso 6 — Verificar el resultado**
```bash
# 1. Logs del backend (debe aparecer la línea de éxito):
journalctl --user -u coffee-api --since "-2 min" | grep wompi
# → wompi webhook: order <id> payment_status=paid (transaction <tx>)
# → POST /webhooks/wompi 200

# 2. API (debe mostrar paid):
TOKEN=$(curl -s -X POST http://localhost:8080/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"pagos-test@coffeeproyect.test","password":"Test1234!"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['tokens']['access_token'])")
curl -s http://localhost:8080/orders/<id> \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool | grep -E "payment_status|paid_at|updated_at"
```

**Paso 7 — Limpieza al terminar**
```bash
pkill -f "cloudflared tunnel"   # ojo: NO "pkill -f cloudflared" — mata el shell propio
```
El túnel no apunta a ningún dominio permanente; mata solo proceso local.

### 4.2 qué pasa cuando el túnel expira o cae

- El log muestra `ERR Register tunnel error ... "Unauthorized: Tunnel not found"`
  o la URL simplemente deja de responder.
- Wompi está reintentando el webhook contra la URL vieja (hasta 3 veces en 24h,
  sin que nada llegue). **Nada llega a tu backend.**
- Período típico de duración: **horas** (no es permanente).
- **Re-levantar = nuevo túnel = nueva URL.** Tenés que re-escribir la URL del
  webhook en el panel de Wompi. No se puede "renovar" el túnel viejo.

### 4.3 Troubleshooting del túnel

| Síntoma | Causa | Arreglo |
|---|---|---|
| `curl /health` del túnel → 000/timeout | Túnel caído o no llegó a estar arriba | Re-levantar (Paso 2). Verificar que el backend está arriba |
| Health → 200, pero webhook no llega | URL de eventos en panel no apunta al túnel nuevo, o modo de pruebas desactivado | Paso 4 (panel) |
| Health → 200, webhook llega → 401 | Checksum inválido (secreto evento/integrity mal o evento corrupto) | Verificar `WOMPI_EVENT_SECRET` en backend `.env` (debe coincidir con el panel) y que llega por HTTPS al túnel |
| Pagé, pero el pedido quedó `pending` | Webhook nunca llegó (URL vieja/muerta o modo de pruebas desactivado) | Chequear debugger de Wompi: si no hay eventos, el ambiente está apagado |
| Pago offline (sin túnel) pero el pedido no se actualiza | Es lo esperado sin túnel — ver "qué pasa sin túnel" arriba | Levantar túnel y re-pagar |

### 4.4 Alternativas para acceso público

| Opción | Cuándo |
|---|---|
| Túnel cloudflared quick (este doc) | Probar pagos en sandbox, temporal |
| Producción (wake-agent + tailnet) | Flujos reales — sin túneles. Ver `DEPLOY.md` |
| Localhost directo | Editar/debug del front — sin webhooks ni redirects HTTPS |

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

# Tunnel (backend) — para webhooks en sandbox (ver §4)
cd /tmp && nohup node node_modules/cloudflared/lib/cloudflared.js tunnel --url http://localhost:8080 > /tmp/tunnel-backend.log 2>&1 &
grep "trycloudflare" /tmp/tunnel-backend.log
pkill -f "cloudflared tunnel"   # matar (ojo: pattern específico)

# Logs / estado
journalctl --user -u coffee-api -n 50
journalctl --user -u coffee-web -n 50
curl http://localhost:8080/health
```

# Plan: Login con Google + Pagos en línea (Wompi)

> **Estado (2026-11-23): Feature A implementada en ambos repos, pendiente de
> merge** (espera el E2E real con OAuth Client ID). Backend: PR
> [CoffeeProyect#4](https://github.com/bfprietoc/CoffeeProyect/pull/4) (CI verde).
> Web: PR [CoffeeProyect-web#5](https://github.com/bfprietoc/CoffeeProyect-web/pull/5)
> (CI quality+e2e verde). Feature B sin empezar.
>
> **PUNTO ACTUAL:** el dueño crea el OAuth Client ID de Google (sección
> Solicitudes de Feature A, pasos actualizados). Con el Client ID en mano se
> corre el plan de pruebas real (sección Validación) y se mergan los PRs.
> Pendiente del dueño después: cuenta Wompi sandbox (Feature B).
> Nota: el backend ganó CI (`quality`: vet+build+test -race) en
> [CoffeeProyect#5](https://github.com/bfprietoc/CoffeeProyect/pull/5), mergeado a develop.
>
> Dos features nuevas, una por rama, siguiendo el flujo estándar:
> rama `feat/*` desde `develop` → PR (CI verde) → merge squash a `develop`
> → al cerrar ambas, PR de release `develop` → `main` + tag.
> `main` protegida en ambos repos (ruleset "proteger-main").
>
> **Cada paso se marca `[x]` al completarse** y el "Registro de avances"
> del final se actualiza con fecha + commit.

---

## Contexto (verificado en el código, 2026-11-23)

### Auth actual (backend Go, repo `CoffeeProyect`)

| Dato | Estado |
|---|---|
| Emisión de tokens | JWT propio: access 15 min + refresh 7 días (`internal/auth/jwt.go`, `golang-jwt/v5`) |
| Contraseñas | bcrypt (`internal/auth/password.go`) |
| Endpoints | `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh` |
| Merge carrito invitado | Sí — en `Login`, vía header `X-Session-ID` (`auth_handler.go`) |
| Middleware | `RequireAuth` / `OptionalAuth` (Bearer token) |
| Front | SPA con tokens en `src/lib/auth/session.ts`, páginas `(auth)/login` y `(auth)/register` |

### Pedidos actual

| Dato | Estado |
|---|---|
| Estados | `confirmed → processing → shipped → delivered` (+ `cancelled`) — **no hay estado de pago** |
| Checkout | Crea el pedido directamente; no existe paso de pago (se asume pago contra entrega) |
| Webhooks | No existen en el backend |

---

## Feature A — Login con Google

**Rama:** `feat/google-login` (backend) + cambio acoplado en web
**Objetivo:** que el usuario pueda iniciar sesión (y crearse cuenta) con su
cuenta de Google, sin contraseña. Misma sesión JWT que el login actual.

### Alcance

- ✅ Botón "Continuar con Google" en `/login` y `/register`.
- ✅ Primer ingreso con Google → crea la cuenta automáticamente (sin password).
- ✅ Email ya registrado con contraseña → entra directo (mismo usuario).
- ✅ Merge del carrito de invitado al entrar con Google (igual que login).
- ❌ Fuera de alcance: Google en el panel admin, SSO para admins, logout
  federado de Google.

### Flujo

```
[Botón Google (Google Identity Services)]  en /login y /register
   │  credential = ID token (JWT firmado por Google, aud = GOOGLE_CLIENT_ID)
   ▼
POST /auth/google  { "credential": "<id_token>" }     ← endpoint nuevo
   │  1. valida el ID token contra Google (emisor, aud, exp)
   │  2. extrae email / name / picture
   │  3. busca usuario por email
   │     └─ si no existe → lo crea SIN password (hash vacío)
   │  4. reutiliza el merge de carrito (X-Session-ID)
   ▼
{ "user": {...}, "tokens": { access, refresh } }      ← idéntico al login
   ▼
Front: setTokens() + router.push(next)                 ← mismo código del login
```

**Por qué este enfoque:** no agrega sesiones ni otra capa de auth; el
ID token se valida con las claves públicas de Google (no se necesita
client secret, solo el client ID). Alternativas descartadas: OIDC completo
en el backend (más piezas, no encaja con SPA+JWT) y next-auth (choca con el
flujo actual de tokens).

### Solicitudes (solo el dueño puede hacerlas)

- [ ] **Crear OAuth Client ID en Google Cloud Console** (gratis, ~5 min) — **PUNTO ACTUAL**: todo lo demás de la Feature A está implementado y testeado; esto es lo único que falta para la validación real.
  - **No se necesita una cuenta de Google nueva**: con el Gmail personal basta. Lo nuevo es un *proyecto* en Google Cloud (contenedor lógico, gratis) y la credencial OAuth dentro de él.
  1. [console.cloud.google.com](https://console.cloud.google.com) → **crear proyecto** (p. ej. `coffee-proyect`).
  2. "APIs y servicios" → "IDs de OAuth" → configurar pantalla de consentimiento (tipo **Externo**, nombre = el de la cafetería — es lo que verá el cliente en el popup; ver pregunta abierta sobre la marca). No hace falta habilitar APIs.
  3. "Credenciales" → "Crear credenciales" → **ID de cliente de OAuth** → tipo **Aplicación web**.
  4. "Orígenes autorizados de JavaScript":
     - `http://localhost:3000` (dev)
     - `http://localhost:3001` (E2E local)
     - `https://wake-agent.taile51409.ts.net` (producción actual)
     - *(después: el dominio público, cuando se compre)*
  5. Entregar el **Client ID** (formato `xxx.apps.googleusercontent.com`) → va al `.env` del backend como `GOOGLE_CLIENT_ID` y al front como `NEXT_PUBLIC_GOOGLE_CLIENT_ID`.
  - **Si al probar sale `403 access_denied` / "no está en la lista"**: el consent screen está en modo desarrollo (solo permite ~10 cuentas). Solución: *IDs de OAuth → Usuarios de prueba* → agregar las cuentas que vayan a probar. Para uso propio/familiar sobra; para público general se pasa la app a "En producción" desde el mismo menú.

### Pasos — Backend (repo `CoffeeProyect`) — PR #4, CI verde

- [x] Verificación del ID token contra el JWKS de Google: `internal/auth/google.go` con `golang-jwt/v5` (ya en el proyecto) + fetch del JWKS con cache TTL 10 min. **Sin dependencias nuevas** (se descartaron `golang.org/x/oauth2` y `google.golang.org/api`: el primero no trae el paquete idtoken en versiones compatibles con Go 1.25; el segundo, por su peso).
- [x] Método en `UserService`: `RegisterOrLoginWithGoogle(email, name)` → busca por email; si no existe crea usuario sin password (hash vacío; fallback de nombre desde el email). `picture` quedó fuera: el modelo User no la tiene (se puede agregar después si se quiere mostrar avatar).
- [x] Endpoint `POST /auth/google` en `AuthHandler`: decodifica `{credential}`, valida token (RS256, emisor `accounts.google.com` o `https://accounts.google.com`, exp, aud = `GOOGLE_CLIENT_ID`), llama al servicio, responde `{user, tokens}` (mismo shape que login).
- [x] Merge de carrito invitado: reutiliza el bloque del `Login` (header `X-Session-ID`).
- [x] Config: `GOOGLE_CLIENT_ID` desde env; si está vacío, 503 `GOOGLE_AUTH_DISABLED` + warning al arrancar.
- [x] Tests: 14 nuevos — 6 de verificación JWT con JWKS fake (válido, aud errada, issuer errado, expirado, kid desconocido, sin email), 5 de servicio (nuevo/existente/fallback/validación), 3 de handler (503, 400, 401) + 2 de flujo (nuevo usuario con token válido, mismo user ID que registro previo por email).
- [x] `.env.example` + README (tabla de env): `GOOGLE_CLIENT_ID` documentado.

### Pasos — Frontend (repo `CoffeeProyect-web`) — PR #5, CI quality+e2e verde

- [x] `NEXT_PUBLIC_GOOGLE_CLIENT_ID` documentado en `.env.example` (el valor real se pone en el `.env` local/prod cuando exista el Client ID).
- [x] Endpoint `googleLogin(credential)` en `src/lib/api/endpoints.ts`.
- [x] Componente `GoogleLoginButton` (`src/components/auth/google-login-button.tsx`): carga Google Identity Services una sola vez, botón oficial (`theme: outline`, pill), callback transmite el `credential`. Si el script no carga (sin red/bloqueado) nunca rompe la página.
- [x] Integrado en `/login` (texto `continue_with`) y `/register` (`signup_with`): botón + separador "o" sobre el formulario; al recibir credential → `googleLogin` → `setTokens` → redirect a `next` (mismo post-proceso que el submit actual, con reset del formulario).
- [x] Sin `NEXT_PUBLIC_GOOGLE_CLIENT_ID` → no renderiza nada (CI/E2E corren sin la key).
- [x] Tests: 4 unitarios (oculto sin key; configura GIS con client ID y renderiza; transmite el credential del callback; script fallido no rompe) + E2E de regresión (sin key: botón ausente en /login y /register, formulario por email intacto). Códigos `INVALID_GOOGLE_TOKEN`/`GOOGLE_AUTH_DISABLED` agregados a `ApiErrorCode` con mensajes específicos.

### Validación (E2E / manual)

- [x] E2E en CI: sin `GOOGLE_CLIENT_ID` el botón no existe; login/register por email intactos (PR web #5, job e2e verde).
- [ ] **E2E real con la key** — pendiente del OAuth Client ID (solicitud de arriba). Con el Client ID en mano, el plan de pruebas:
  1. Backend (rama `feat/google-login` local) arranca con `GOOGLE_CLIENT_ID=…` en el `.env` de dev; web con `NEXT_PUBLIC_GOOGLE_CLIENT_ID=…` → el botón aparece en /login y /register.
  2. **Login Google → sesión**: entrar con la cuenta de prueba → redirect a `/` autenticado ("Hola, <nombre>").
  3. **Mismo usuario por dos vías**: cerrar sesión → entrar con email+password de una cuenta existente cuyo email sea el de Google → mismo `user.id` (verificar en `/account` y en la DB).
  4. **Merge carrito invitado**: como invitado, agregar 1 café al carrito → entrar con Google → el ítem aparece en el carrito de la sesión.
  5. **Registro con Google** (desde /register): cuenta nueva → se crea sin password; después puede entrar también por Google (no por contraseña: el hash está vacío).
  6. **Errores**: con `GOOGLE_CLIENT_ID` ausente en el backend → 503 y mensaje "no está disponible"; token manipulado → 401.
- [ ] **Merge de ambos PRs** (backend #4 + web #5) al cerrar la validación, y después PR de release `develop` → `main` + tag.

---

## Feature B — Pagos en línea con Wompi (tarjetas + PSE)

**Rama:** `feat/wompi-payments` (backend) + cambio acoplado en web
**Objetivo:** cobrar el pedido en línea con tarjetas y **PSE** (el método
dominante en Colombia, ~45% de los pagos digitales). Al pagar con PSE el
banco del cliente autentica con **Llave Virtual/Móvil** — viene incluido en
el flujo PSE de Wompi, **no requiere integración aparte**.

### Por qué Wompi (investigado 2026-11-23)

| Criterio | Wompi ⭐ | Mercado Pago | Bold | PayU |
|---|---|---|---|---|
| Comisión tarjetas | 2,65% + $700 COP + IVA | 3,29% + $800 (inmediato) / 2,99% + $800 (14 días) | 2,99% + $900 | 2,79% + $300 (contrato) |
| PSE | ✅ | ✅ | ✅ ($900 fijo) | ✅ (plan Gateway, contrato) |
| Otros métodos | Nequi, Botón Bancolombia, Efectivo | — | datáfono | amplio |
| Sandbox | ✅ tarjetas de prueba | ✅ | ✅ | limitado |
| Onboarding | self-service, claves al instante | self-service | self-service | **requiere contrato** |
| Checkout | redirect / widget (cero scope PCI) | Checkout Pro (redirect) | link/botón | API |
| Webhook firmado | ✅ header `wompi_hash` (HMAC-SHA256) | ✅ `x-signature` | ✅ firma secreta | — |

Ninguna pasarela cobra mensualidad ("gratuita" = solo comisión por
transacción). Wompi: la más barata + self-service + sandbox completo.
Fuentes: wompi.com/es/co/planes-tarifas, docs.wompi.co, comparativas
doneapi.com / siigo.com (2025–2026).

### Solicitudes (solo el dueño puede hacerlas)

- [ ] **Crear cuenta Wompi** (gratis, self-service):
  1. [wompi.com](https://www.wompi.com) → "Comenzar" → registro con datos personales/empresa (cédula/NIT, datos bancarios para dispersión).
  2. En el panel: copiar **API Key de sandbox** (pruebas) → `.env` del backend como `WOMPI_API_KEY`.
  3. Configurar **webhook de sandbox** apuntando a la URL de pruebas (local: `https://<host-tailscale>/api/webhooks/wompi` o tunnel temporal) y copiar el **API Secret** (para validar `wompi_hash`) → `WOMPI_API_SECRET`.
  4. Probar con la tarjeta de prueba de Wompi (documentada en docs.wompi.co, sección sandbox).
- [ ] **(Más adelante, para producción):** aprobar/activar la cuenta en
  producción del panel Wompi → `WOMPI_API_KEY`/`WOMPI_API_SECRET` de prod en
  el `.env` de wake-agent. No bloquea el desarrollo (sandbox primero).

### Flujo

```
Checkout (/checkout, autenticado)
   │ 1. POST /orders  (como hoy) → pedido con payment_status = "pending"
   │ 2. POST /orders/{id}/payment → backend crea transacción Wompi:
   │      POST https://api.wompi.co/v1.0/test/transactions   (Bearer WOMPI_API_KEY)
   │      { amount, description, redirect_url: /orders/{id}?payment=1,
   │        webhook_url: https://<prod>/api/webhooks/wompi }
   ▼
Front redirige a checkout_url (portal de Wompi)
   │  cliente paga con tarjeta o PSE (PSE → banco → llave virtual/móvil)
   ▼
Wompi: (a) redirige al cliente a redirect_url  +  (b) envía WEBHOOK
   │
   ▼
POST /webhooks/wompi (backend, SIN auth JWT — público pero firmado)
   │  valida wompi_hash (HMAC-SHA256 con WOMPI_API_SECRET)
   │  idempotente (mismo transaction id → 200 sin re-procesar)
   │  status "paid"    → payment_status = "paid"  (pedido pasa a confirmed)
   │  status "failed"  → payment_status = "failed" (se puede reintentar)
   ▼
Cliente vuelve a /orders/{id}?payment=1 → ve el estado real del pago
(admin puede ver payment_status en la lista de pedidos)
```

Reglas de negocio:

- Pedido **sin pagar** no entra a la cola de preparación: `payment_status
  = "pending"` se muestra como badge; solo con `"paid"` el admin lo pasa a
  `processing`. (El estado `confirmed` de hoy equivale a "creado".)
- Reintento: si el pago falla o se cierra sin pagar, el cliente puede
  generar una nueva transacción para el mismo pedido (la anterior queda
  `failed`). Un pedido solo paga una vez.
- Monto: el total del pedido (subtotal + envío) en centavos COP; nunca se
  confía en el monto del cliente.

### Pasos — Backend (repo `CoffeeProyect`)

- [ ] Migración: columna `payment_status` en orders (`pending|paid|failed`, default `pending`) + campos `payment_provider` (constante `wompi`), `payment_transaction_id`, `paid_at`.
- [ ] Cliente Wompi (`internal/payment/wompi.go`): base URL por env (sandbox/prod), `CreateTransaction(amount, description, redirectURL, webhookURL)`, validación de `wompi_hash`.
- [ ] Endpoint `POST /orders/{id}/payment` (auth): solo dueño del pedido, solo si `payment_status != "paid"`; crea transacción y responde `{ checkout_url }`.
- [ ] Endpoint `POST /webhooks/wompi` (público, firmado): valida hash, idempotencia por transaction id, actualiza `payment_status`/`paid_at`, responde 200. Eventos: `paid`, `failed` (y los que documente Wompi).
- [ ] Config/env: `WOMPI_API_KEY`, `WOMPI_API_SECRET`, `WOMPI_ENV=sandbox|prod`, `PUBLIC_BASE_URL` (para armar webhook/redirect). Si no hay keys → `503 PAYMENTS_DISABLED`.
- [ ] GET de pedido (lista y detalle) expone `payment_status`.
- [ ] Tests unitarios: cliente Wompi (mock HTTP) — crear transacción, validar hash válido/inválido; webhook idempotencia; endpoint de pago (ajeno al pedido → 403/404, ya pagado → 409); migración.
- [ ] E2E (CI): con `PAYMENTS_DISABLED` el checkout sigue creando pedidos (regresión) y el botón de pago no aparece.

### Pasos — Frontend (repo `CoffeeProyect-web`)

- [ ] `NEXT_PUBLIC_PAYMENTS_ENABLED` (o detectar por respuesta de la API) para mostrar/ocultar el paso de pago (CI sin keys → oculto, E2E actuales intactos).
- [ ] `createPayment(orderId)` en `src/lib/api/endpoints.ts`.
- [ ] Checkout: tras crear el pedido, botón **"Pagar con tarjeta o PSE"** → `createPayment` → `window.location = checkout_url`.
- [ ] `/orders/[id]`: badge de estado de pago (Pendiente de pago / Pagado / Fallido) + botón "Reintentar pago" si `failed`/`pending`; al llegar con `?payment=1` refetch del pedido (el redirect de Wompi no trae datos confiables: la fuente de verdad es la API).
- [ ] Lista `/orders`: badge compacto de `payment_status`.
- [ ] Admin: columna/badge `payment_status` en la lista de pedidos.
- [ ] Tests: unit (badge por estado, botón reintentar) + E2E (sin payments: flujo actual intacto).

### Validación (sandbox, manual + E2E)

- [ ] Local con keys sandbox: comprar → pagar con tarjeta de prueba Wompi → webhook marca `paid` → el detalle muestra "Pagado".
- [ ] Caso de falla: tarjeta rechazada de prueba → `failed` → "Reintentar pago" funciona.
- [ ] Webhook duplicado (reenviar el mismo evento) → no duplica efectos.
- [ ] Webhook con hash inválido → 401 y sin cambios.
- [ ] PSE en sandbox (si Wompi lo habilita en pruebas; si no, validar PSE con una compra real de bajo valor al pasar a producción).

---

## Orden de ejecución y dependencias

1. **Feature A (Google login)** — independiente, más pequeña → primero.
   Bloqueada solo por el OAuth Client ID (solicitud del dueño).
2. **Feature B (Wompi)** — independiente de A; bloqueada por la cuenta
   Wompi sandbox (solicitud del dueño). Los pasos que no requieren keys
   (migración, cliente Wompi con mock, UI condicional) pueden adelantarse.
3. Al cerrar ambas: PR de release `develop` → `main`, tag, deploy en
   wake-agent (recordar: `.env` de producción necesita las keys reales).

## Registro de avances

> Formato: `fecha — feature — qué pasó (commit/PR)`.

- 2026-11-23 — Plan creado (investigación de auth Google + pasarelas Colombia
  completada; Wompi elegida como pasarela). Sin código todavía.
- 2026-11-23 — Backend Feature A implementado: PR CoffeeProyect#4 (14 tests
  nuevos, CI verde). El backend no tenía CI: se creó el workflow `quality`
  (vet+build+test -race, Go 1.25) en PR CoffeeProyect#5, mergeado a develop.
- 2026-11-23 — Frontend Feature A implementado: PR CoffeeProyect-web#5
  (4 tests unit + E2E regresión; local: lint/typecheck/build limpios, unit
  143/143, E2E 19/19 contra el stack real). Ambos PRs pendientes de merge:
  falta la validación manual con el OAuth Client ID real (solicitud del dueño).
- 2026-11-23 — Plan actualizado al punto de pruebas: pasos del OAuth Client ID
  detallados (sin cuenta Google nueva; orígenes localhost:3000/3001 + tailnet;
  nota de "usuarios de prueba" para el 403) y plan de pruebas real en 6 pasos
  (login Google, mismo usuario por dos vías, merge carrito, registro con
  Google, errores 503/401).

## Preguntas abiertas

- [ ] ¿El nombre de la app en el consentimiento de Google? (usar el nombre
  de marca definitivo — pendiente junto con el dominio).
- [ ] ¿Habilitar Nequi desde el inicio o solo tarjetas + PSE? (Wompi lo
  ofrece; no cambia la integración, solo el display).
- [ ] ¿Pedidos sin pagar se cancelan solos a las X horas? (hoy no hay
  expiración; con pagos en línea convendría un TTL, p. ej. 24 h).

# Plan: Login con Google + Pagos en línea (Wompi)

> **Estado (2026-11-26): v1.2.0 released + backend v1.2.1 — Google login
> VALIDADO EN VIVO** (login real con cuenta de owner, `POST /auth/google 200`
> + `GET /users/me 200` en logs). Fase A lista para producción; Fase B (Wompi)
> pendiente de cuenta sandbox del dueño.
> Ambas features mergeadas y en `main` + `develop` (sincronizadas).
> Backend `main` @ 6a0d207 (**v1.2.1**: v1.2.0 + fix PR #8), web `main` @ 941cd03
> (**v1.2.0** + docs). Tag v1.2.0 en ambos repos, v1.2.1 backend.
>
> PR #4/#6 (backend) + PR #5/#6 (web) — mergeados a develop → release
> develop→main (rebase) → main protegida → tag + alineación de develop.
> PR #8 (backend) — fix in-memory → release v1.2.1.
>
> **PUNTO ACTUAL (2026-11-26): Fase A de Google VALIDADA EN VIVO.**
> Fase B (Wompi) pendiente — cuenta sandbox + credenciales del dueño. Orden:
> 1. ✅ **Google** — OAuth Client ID creado y seteado (A1–A3) — **validado en vivo**.
> 2. **Wompi** — cuenta sandbox + 3 credenciales + `PUBLIC_BASE_URL` (B1–B4) → validación B5.
> 3. **Deploy a wake-agent** (v1.2.1 backend / v1.2.0 web).
>
> **Lo que se sigue haciendo (post-merge): setup real de credenciales.**
> La release es segura porque la Feature B queda apagada por diseño hasta
> configurarla. 🔴 Lo que falta es la **cuenta Wompi + 3 credenciales del dueño**
> reales (6 pasos A + 6 pasos B).
>
> **Estado de las branches (2026-11-25):** `develop` = `main` en ambos repos.
> Backend en **v1.2.1** (fix #8 mergeado). Web en **v1.2.0** + docs.
> Sin ramas `feat/*` ni `fix/*` activas — todo mergeado. La única rama
> pendiente de merge era PR #8: **mergeado**.
>
> **Cada paso se marca `[x]` al completarse** y el "Registro de avances"
> del final se actualiza con fecha + commit.
>
> **Guía operativa unificada** (todo lo que hace falta para activar las dos
> features + usuarios de prueba + estado del entorno actual):
> [SETUP_GUIDE.md](./SETUP_GUIDE.md) — empieza ahí.

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

- [x] **Crear OAuth Client ID en Google Cloud Console** — **HECHO** (usuario validó el login en vivo)
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
- [x] **E2E real con la key** — VALIDADO EN VIVO (2026-11-26): proyecto +
  Client ID creado, `GOOGLE_CLIENT_ID` + `NEXT_PUBLIC_GOOGLE_CLIENT_ID`
  configurados (gitignored), botón visible, login real confirmado en logs
  (`POST /auth/google 200` → `GET /users/me 200`). Plan de pruebas:
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
| Webhook firmado | ✅ checksum SHA256 del evento (`wompi_hash` del plan viejo no aplica; verificado contra la doc oficial 2026-11-23) | ✅ `x-signature` | ✅ firma secreta | — |

Ninguna pasarela cobra mensualidad ("gratuita" = solo comisión por
transacción). Wompi: la más barata + self-service + sandbox completo.
Fuentes: wompi.com/es/co/planes-tarifas, docs.wompi.co, comparativas
doneapi.com / siigo.com (2025–2026).

### Solicitudes (solo el dueño puede hacerlas)

> **Nota:** el panel de Wompi entrega dos secretos distintos (integrity y
> events) — no los intercambies. Los valores descritos aquí son los de
> **sandbox** (pruebas, gratis). Cambia a `pub_live_…`/`prod_…` al activar
> producción.

- [ ] **Crear cuenta Wompi** (gratis, self-service):
  1. [wompi.com](https://www.wompi.com) → "Comenzar" → registro con datos personales/empresa (cédula/NIT, datos bancarios para dispersión).
  2. En el panel → Desarrolladores → **API keys**:
     - Copiar la **Public Key** de sandbox (`pub_test_…`) → backend `WOMPI_PUBLIC_KEY`.
     - Copiar el **Integrity Secret** (`prod_integrity_…`) → backend `WOMPI_INTEGRITY_SECRET`. **Nunca** exponer al frontend (no lleva prefijo `NEXT_PUBLIC_`).
     - Copiar el **Events Secret** (`prod_events_…`, distinto al de integridad) → backend `WOMPI_EVENT_SECRET`.
  3. En el panel → Desarrolladores → **Webhooks**: configurar la URL pública del webhook:
     - Sandbox/local vía tailnet: `https://wake-agent.taile51409.ts.net/api/webhooks/wompi` (Caddy quita el prefijo `/api` y enruta al backend).
     - *(Alternativa local sin túnel: tunnel temporal, p. ej. `cloudflared tunnel` → URL pública del equipo.)*
  4. Completar **`PUBLIC_BASE_URL`** (URL pública del front):
     - Prod actual: `https://wake-agent.taile51409.ts.net` (redirect del checkout → `/orders/{id}?payment=1`).
     - Dev: `http://localhost:3001` (o `:3002` si E2E local).
  5. Probar con la tarjeta de prueba de Wompi (documentada en docs.wompi.co, sección sandbox). **PSE no está disponible de forma fiable en sandbox** — validar PSE con una compra real de bajo valor al pasar a producción.
- [ ] **(Más adelante, para producción):** aprobar/activar la cuenta en
  producción del panel Wompi → keys de producción (`pub_live_…`) en el
  `.env` de wake-agent. No bloquea el desarrollo (sandbox primero).

**Dónde va cada valor:**

| Variable | De | A |
|---|---|---|
| `WOMPI_PUBLIC_KEY` | panel → API keys (`pub_test_…`) | `.env` del backend |
| `WOMPI_INTEGRITY_SECRET` | panel → API keys (`prod_integrity_…`) | `.env` del backend (**server-side**) |
| `WOMPI_EVENT_SECRET` | panel → API keys (`prod_events_…`) | `.env` del backend |
| `PUBLIC_BASE_URL` | URL pública del front | `.env` del backend (`.env.local` del web para dev) |
| `NEXT_PUBLIC_PAYMENTS_ENABLED` | este mismo plan | web: `.env.local` = `true` (CI/E2E: **no** — oculto) |

> El frontend usa `NEXT_PUBLIC_PAYMENTS_ENABLED=true` para mostrar el
> botón. Sin esa variable el botón no aparece (comportamiento actual de
> CI/E2E). La **verdad de runtime** la da el backend: si faltan las 4
> variables, responde 503 `PAYMENTS_DISABLED` y la UI muestra el mensaje
> amable.

### Flujo

> **Cambio de arquitectura (2026-11-23):** la doc actual de Wompi recomienda
> el **Web Checkout** (cero PCI scope) en vez de crear la transacción
> server-side. El backend valida el pedido y devuelve los parámetros del
> formulario de Wompi — **no llama a ningún endpoint de Wompi**. La firma de
> integridad se computa server-side y nunca sale del servidor.

```
Checkout (/checkout, autenticado)
   │ 1. POST /orders  (como hoy) → pedido con payment_status = "pending"
   ▼
/orders/{id} (detalle) — el front renderiza PaymentSection
   │  2. POST /orders/{id}/payment  → backend valida el pedido y devuelve
   │      { publicKey, reference, amountInCents, currency, signature,
   │        redirectUrl, customerEmail }
   │      (firma = SHA256(ref + monto_en_centavos + moneda + secreto de
   │       integridad), computada server-side)
   ▼
Front renderiza un formulario GET a https://checkout.wompi.co/p/
   │  (hidden inputs: public-key, currency, amount-in-cents, reference,
   │   signature:integrity, redirect-url, customer-data:email)
   ▼
Cliente paga con tarjeta o PSE (PSE → banco → llave virtual/móvil)
   │
   ▼
Wompi: (a) redirige al cliente a redirect_url (?payment=1)
        (b) envía WEBHOOK  POST /api/webhooks/wompi
   │  → backend valida checksum (SHA256 de las propiedades del evento
   │    + timestamp + secreto de eventos); solo transaction.updated
   │  → idempotente por referencia; APPROVED → paid (+paid_at),
   │                         DECLINED/ERROR/VOIDED → failed, resto → pending
   ▼
/orders/{id}?payment=1 → front refetchea el pedido — la fuente de verdad
es la API; el redirect nunca se confía
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

### Pasos — Backend (repo `CoffeeProyect`) — PR #6, mergeado

> **Cambio de arquitectura (2026-11-23):** la doc actual de Wompi recomienda el
> **Web Checkout** (cero PCI scope) en vez de crear la transacción server-side
> vía API. El backend valida el pedido y devuelve los parámetros del formulario
> de Wompi — **no llama a ningún endpoint de Wompi** —; la firma de
> integridad se computa server-side. El estado llega vía webhook firmado
> (`transaction.updated`).

- [x] Migración 010: `payment_status` (`pending|paid|failed`, default `pending`, CHECK) + `payment_provider` (constante `wompi`) + `payment_reference` (unique partial index) + `payment_transaction_id` + `paid_at`. Pedidos existentes → `payment_status='paid'` (se pagaban fuera del flujo transaccional — mantener esa regla deja intacto el flujo admin actual).
- [x] `internal/payment/wompi.go`: `IntegritySignature(ref, amount, currency, secret)` — SHA256 hex (verificada contra el vector oficial de la doc de Wompi); `VerifyAndParseEvent` — checksum de `concat(data[prop]) + timestamp + eventSecret` (propiedades siempre extraídas del evento, nunca asumidas), comparación case-insensitive; `TransactionFromEvent` (solo `transaction.updated`); `FinalStatus` (APPROVED→paid, DECLINED/ERROR/VOIDED→failed, resto→pending).
- [x] Endpoint `POST /orders/{id}/payment` (auth, dueño): 503 si no hay credenciales (`PAYMENTS_DISABLED`), 404 ajeno/inexistente, 422 cancelado (`PAYMENT_UNAVAILABLE`), 409 ya pagado (`PAYMENT_ALREADY_PAID`). Referencia única por intento (`{order_id}-{unix}`, evita 422 de referencia duplicada en reintentos). Devuelve `{publicKey, reference, amountInCents, currency, signature, redirectUrl, customerEmail}`.
- [x] Endpoint `POST /webhooks/wompi` (público, no JWT): valida checksum → 401 si inválido; evento no-transaction o referencia desconocida → 200 (ignorado, se loguea; Wompi reintenta hasta 3 veces ante no-200 — nunca lo devolvemos para algo que no podemos mapear); idempotente por `payment_reference`; `paid` guarda `paid_at` + `payment_transaction_id`; `failed` limpia `paid_at`; eventos no-terminales no cambian nada.
- [x] Config/env: `WOMPI_PUBLIC_KEY`, `WOMPI_INTEGRITY_SECRET`, `WOMPI_EVENT_SECRET`, `PUBLIC_BASE_URL`. Si falta cualquiera → 503 `PAYMENTS_DISABLED` + warning al arrancar (mismo patrón que GOOGLE_CLIENT_ID).
- [x] GET de pedido (lista y detalle, admin) expone `payment_status` (+ `paid_at`).
- [x] Guard de admin: un pedido solo puede pasar a `processing` si está `paid` (`PAYMENT_REQUIRED`, 422).
- [x] Tests: 7 de firma/checksum (incl. vector oficial Wompi), 10 de servicio (ciclo completo + idempotencia + duplicados + firma inválida + eventos no-terminales), 6 de handler, guard de admin (3 sub-tests).
- [ ] E2E (CI): con `PAYMENTS_DISABLED` el checkout sigue creando pedidos (regresión) y el botón de pago no aparece.

### Pasos — Frontend (repo `CoffeeProyect-web`) — PR #6, mergeado

- [x] `NEXT_PUBLIC_PAYMENTS_ENABLED` (gate build-time; la verdad de runtime es el backend) — oculto en CI/E2E actuales (flujo intacto).
- [x] Endpoint `createPayment(orderId)` en `src/lib/api/endpoints.ts` + `useCreatePayment` (`src/lib/query/payments.ts`).
- [x] `PaymentSection` en `/orders/[id]`: badge + botón «Pagar con tarjeta o PSE». Tras el click, renderiza el **formulario GET** a `https://checkout.wompi.co/p/` (`WebCheckoutForm`, hidden inputs con los parámetros del backend). Mensajes claros por error code (503/409/422/404/401). No se muestra si el pedido está cancelado o pagado (solo badge; con fecha de pago si aplica).
- [x] `/orders/[id]`: badge de pago junto al de estado + `?payment=1` → refetch (la fuente de verdad es la API).
- [x] Lista `/orders` y fila admin: badge compacto de `payment_status`.
- [x] Admin (`admin-order-row`): error claro cuando el backend rechaza «En preparación» (`PAYMENT_REQUIRED`).
- [x] Tests: 6 unitarios de PaymentSection (gate, botón, pagado sin botón + fecha, fallido con retry, flujo completo con form, 503 mensaje) + 3 de PaymentBadge. Unit 148/148. E2E de regresión pendiente (CI en el PR).

### Validación (sandbox, manual + E2E)

- [x] Unit + firma/checksum: 28 tests en backend (incl. vector oficial Wompi + rutas) + 9 en frontend; E2E de regresión en CI del PR web #6 (sin payments activo, flujo actual intacto).
- [ ] **Plan real en 6 pasos** (con las 4 credenciales sandbox + `NEXT_PUBLIC_PAYMENTS_ENABLED=true` en el front):
  1. Backend con `.env` de sandbox (key/integrity/event/BASE_URL) + web con `NEXT_PUBLIC_PAYMENTS_ENABLED=true` → en `/orders/{id}` aparece el botón «Pagar con tarjeta o PSE».
  2. Click → el form GET redirige a `checkout.wompi.co/p/` con los parámetros correctos (currency COP, monto en centavos, referencia `{order_id}-{unix}`).
  3. Pagar con la tarjeta de prueba de Wompi → redirige a `/orders/{id}?payment=1` → la API muestra «Pagado» (vía webhook, no por el redirect).
  4. Webhook duplicado (re-send del mismo evento desde el panel de Wompi) → el pedido sigue mostrado como Pagado sin duplicar efectos.
  5. Caso de falla (tarjeta rechazada de prueba) → «Fallido» + botón «Reintentar pago» → repetir el flujo con otra tarjeta de prueba.
  6. Cancelado: cancelar el pedido desde `/orders/{id}` y luego intentar pagar → mensaje claro (pedido indisponible).
- [x] Webhook con checksum inválido → 401 y sin cambios (test handler + servicio).
- [ ] PSE en sandbox (si Wompi lo habilita en pruebas; si no, validar PSE con una compra real de bajo valor al pasar a producción). PSE vía Web Checkout es automático (los bancos aparecen en el portal); el pago por API con PSE directo (`payment_method.PSE`) es otro flujo y queda fuera.

---

## Orden de ejecución y dependencias

1. **Feature A (Google login)** — independiente, más pequeña → primero.
   Bloqueada solo por el OAuth Client ID (solicitud del dueño).
2. **Feature B (Wompi)** — independiente de A; bloqueada por la cuenta
   Wompi sandbox (solicitud del dueño). Los pasos que no requieren keys
   (migración, cliente Wompi con mock, UI condicional) pueden adelantarse.
3. Al cerrar ambas: PR de release `develop` → `main`, tag, deploy en
   wake-agent (recordar: `.env` de producción necesita las keys reales).

## Estado de las branches y pruebas (2026-11-25)

### Branches

**Backend (CoffeeProyect)** — `main` = `develop` = `6a0d207` (tag v1.2.1)

| Rama | Estado |
|---|---|
| `main` / `develop` | ✅ v1.2.1 (Google #4 + Wompi #6 + fix #8, CI quality verde) |
| `feature/fix-error-handling` | Sin mergear — no relacionado con estas features |
| `feature/documentation-updates` | Sin mergear — docs, no relacionado |
| `feature/product-detail` | Sin mergear — no relacionado con estas features |

**Web (CoffeeProyect-web)** — `main` = `develop` = v1.2.0 + docs (tag v1.2.0)

| Rama | Estado |
|---|---|
| `main` / `develop` | ✅ v1.2.0 + docs (Google #5 + Wompi #6, CI quality+e2e verde) |

**Branches locales efímeras** (solo esta sesión, NUNCA pusheadas):
`test/features` (combine de ambos features para el bring-up local —
embostecedor local, no usar como referencia salvo el fix de IDs).

### Pruebas (verificado en vivo, 2026-11-25)

| Nivel | Resultado |
|---|---|
| Backend unit (`go test ./...`) | ✅ 165 tests OK |
| Web unit (Vitest) | ✅ 152 tests OK (38 archivos) |
| Web E2E (Playwright, stack real in-memory) | ✅ **19/19** |
| CI backend (quality) | ✅ en todos los merges y releases |
| CI web (quality + e2e) | ✅ en todos los merges y releases |
| Backend autorización de rutas | ✅ routes_test.go (rutas de pago existen vía `routes.Register`) |
| Bring-up local | ✅ backend :8080 + frontend :3001 (in-memory, datos se pierden al reiniciar) |

### Qué NO está verificado (limitaciones honestas)

- 🔴 **Login Google real** — no hay OAuth Client ID (dueño). Test verificada
  en CI solo en modo oculto (botón ausente). El plan A3 queda pendiente.
- 🔴 **Pago real con Wompi** — no hay cuenta sandbox (dueño). Lo verificado
  hasta ahora es el 503 PAYMENTS_DISABLED + el flujo completo hasta el
  botón (botón visible con flag ON, `/orders/{id}` renderizado).
- 🔴 **PSE** — no disponible de forma fiable en sandbox; validar con compra
  real de bajo valor al pasar a producción.
- ⚠️ **Docker/postgres** — el stack usa in-memory porque el daemon de
  Docker no está disponible en esta máquina (requiere root). Los datos
  (usuarios, pedidos, direcciones) se pierden al reiniciar el backend.
  Para el E2E contra postgres real hace falta `sudo systemctl start docker`
  + `docker compose up -d` (dueño).

---

## Cómo tratamos las credenciales (convención, 2026-11-26)

### En código y PRs — solo code, nunca credenciales

- **PRs y ramas**: llevan código y documentación. Ninguna rama contiene valores
  reales (`.env` / `.env.local` son gitignored y **nunca** entran a un PR).
- **`.env.example` / `.env.local.example`**: solo placeholders de documentación
  (`xxx.apps.googleusercontent.com`, `pub_test_xxx`…). Nada real.
- **`client_secret.json`** (de Google): **no se usa** (nuestro flujo verifica el
  ID token contra JWKS sin secret). Permanece localmente con el dueño; nunca se
  commitea, no se comparte, no entra a la raíz del repo. No debe servirse en
  ningun lado — Google lo rotación a la mano si se filtra.

### Dónde viven las credenciales (local)

| Archivo (gitignored) | Variables | Exposición |
|---|---|---|
| Backend `.env` | `GOOGLE_CLIENT_ID`, `WOMPI_*` (secrets), `PUBLIC_BASE_URL` | server-only |
| Frontend `.env.local` | `NEXT_PUBLIC_GOOGLE_CLIENT_ID`, `NEXT_PUBLIC_PAYMENTS_ENABLED`, `NEXT_PUBLIC_API_URL` | **pública por naturaleza** (va al bundle del front) |
| Prod `.env` en wake-agent | mismas que backend | server-only |

### Regla de oro

> Las credenciales se configuran **en el entorno** (`.env`), no en el código ni
> en PRs. No hay commits de configuración; si algo falla por config, se pide el
> valor y se corrige en el entorno — nunca se copia al repo ni se commitea.

---

## Cómo retomar el plan — paso a paso recomendado (2026-11-25)

> Secuencia concreta para continuar desde v1.2.1 (backend) / v1.2.0 (web). Cada paso dice qué necesita
> el dueño, qué hace el agente y cuándo se pide aprobación antes de avanzar.

### Fase A — Login con Google

| # | Paso | Quién | Cambio posible |
|---|---|---|---|
| A1 | ✅ OAuth Client ID tipo **Aplicación web** (proyecto `coffee-proyect`, orígenes localhost + tailnet) | **Dueño** | — |
| A2 | ✅ `GOOGLE_CLIENT_ID` backend + `NEXT_PUBLIC_GOOGLE_CLIENT_ID` frontend (rebuild hecho; button visible) | **Dueño / agente** | — |
| A3 | ✅ Boton aparece → login real → misma cuenta por email+contraseña y por Google (verificado en logs) | **Dueño / agente** | — |
| A4 | **Si la validación encuentra cambios** (p. ej. redirect URI faltante, falta un orígen, botón no aparece): rama `fix/google-<tema>` + PR → merge tras CI. NUNCA directo a develop | **Agente + dueño** | Rama separada |
| A5 | Con A1–A4 verdes: **deploy** en wake-agent (v1.2.1/v1.2.0, `.env` de prod con las keys reales). El release a main YA está hecho — solo falta el deploy | **Dueño** | — |

### Fase B — Pagos Wompi

| # | Paso | Quién | Cambio posible |
|---|---|---|---|
| B1 | Crear cuenta/panel sandbox en wompi.com (registro + cédula o NIT + cuenta bancaria) | **Dueño** | — |
| B2 | Copiar de sandbox: `WOMPI_PUBLIC_KEY` (pub_test_…), `WOMPI_INTEGRITY_SECRET` (prod_integrity_…, server-side), `WOMPI_EVENT_SECRET` (prod_events_…) | **Dueño** | — |
| B3 | Poner las 3 keys + `PUBLIC_BASE_URL` en backend `.env`; configurar webhook URL en el panel: `https://<host>/api/webhooks/wompi` | **Dueño / agente** | — |
| B4 | Poner `NEXT_PUBLIC_PAYMENTS_ENABLED=true` en frontend `.env.local` (dev), rebuild + restart | **Dueño / agente** | — |
| B5 | Validación (6 pasos): botón aparece → redirect al portal Wompi con parámetros correctos → pago con tarjeta de prueba → badge «Pagado» vía webhook → duplicado → rechazado → retry → cancelado → mensaje claro | **Dueño / agente** | — |
| B6 | **Si la validación encuentra cambios** (p. ej. webhook URL incorrecto, firma mal validada): rama `fix/wompi-<tema>` + PR tras CI | **Agente + dueño** | Rama separada |
| B7 | Con B1–B6 verdes: activar cuenta Wompi en **producción** (`pub_live_…`) y ponérselas en el `.env` de wake-agent. Deploy con credenciales de producción | **Dueño** | — |

### Convenciones de seguridad y operación (mantiene el plan hígado)

- Las dos features **quedan apagadas por diseño** sin credenciales: Google → 503/botón oculto; Wompi → 503 en pago/webhook + botón visible solo si `NEXT_PUBLIC_PAYMENTS_ENABLED=true` (un 503 visible del backend es lo correcto).
- Los secretos de Wompi NUNCA van al frontend (sin `NEXT_PUBLIC_`). El front solo ve la public key vía la respuesta del backend.
- Cambios de configuración (env var, URLs autorizadas, webhook URL) **no** son cambios de código: no requieren rama ni PR; solo cambios de comportamiento.
- Si aparece un bug real (como el de IDs, ver PR #8), va en su propia rama + PR — **nunca directo a develop**.

---

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
- 2026-11-24 — Feature B implementada: backend PR #6 + web PR #6 (ambos
  pendientes de merge). Arquitectura Web Checkout verificada contra la doc
  oficial de Wompi: firma de integridad server-side + checkout por form GET
  al portal (sin PCI) + webhook firmado (`transaction.updated`, checksum
  SHA256 de propiedades del evento + timestamp + secreto de eventos). El
  estado del pago solo cambia por el webhook; el front refetchea al volver.
- 2026-11-24 — Bug corregido en backend PR #6: `POST /orders/{id}/payment` y
  `POST /webhooks/wompi` nunca se registraron en `routes.go` (el handler
  existía pero el endpoint daba 404). Se registra y se agrega
  `routes/routes_test.go` (prueba que las rutas existen vía `routes.Register`
  real; falla sin el registro).
- 2026-11-25 — Bring-up local (in-memory, sin Docker): 165 tests backend OK
  (go test ./...) + 152 frontend; **E2E 19/19 contra el stack real**. Se encontró
  y corrigió un bug real del modo in-memory: `randomHex` determinista
  (`chars[i%16]` → siempre "01234567") — todos los usuarios/direcciones
  compartían ID y se filtraban datos entre cuentas. Fix: `newID()` con
  contador atómico + IDs UUID v4 en el store de pedidos (misma forma que
  postgres). Usuarios de prueba en la [Guía](./SETUP_GUIDE.md).
- 2026-11-25 — **Merge + release v1.2.0**: PRs backend #4/#6 + web #5/#6 mergeados
  a develop (squash). `develop→main` (rebase merge) → main protegida alineada →
  tag `v1.2.0` (main + develop @ e9505af backend, @ 3be2d5d web). CI verde en
  todos los pasos (quality backend, quality+e2e web).
- 2026-11-25 — **Merge + release v1.2.1** (backend): PR #8 mergeado (fix de
  IDs in-memory, squash) → release develop→main (rebase) → main protegida
  alineada → tag `v1.2.1` (main + develop @ 6a0d207).
- 2026-11-25 — **Docs al día** (plan + guía + README + FEATURES_PLAN): estado
  de branches (main/develop en v1.2.0), tabla de pruebas verificadas
  (165 backend + 152 web + E2E 19/19) y lo que falta (Google/Wompi reales,
  PSE, Docker). PR #8 mergeado (v1.2.1).
- 2026-11-26 — **Fase A de Google validada EN VIVO (A1–A3)**: proyecto en
  Google Cloud (OAuth Client ID "Aplicación web", orígenes
  localhost:3000/3001 + tailnet). `GOOGLE_CLIENT_ID` +
  `NEXT_PUBLIC_GOOGLE_CLIENT_ID` configurados en los dos `.env` (gitignored).
  Login real confirmado en logs (`POST /auth/google 200` + `GET /users/me 200`).
  Cuenta del owner: creada a mano vía email+contraseña, reconciliada con
  Google (mismo email → mismo `user.id`). Test users de in-memory eliminados
  (restart); recrear cuando se necesite E2E.

## Preguntas abiertas

- [ ] ¿El nombre de la app en el consentimiento de Google? (usar el nombre
  de marca definitivo — pendiente junto con el dominio).
- [ ] ¿Habilitar Nequi desde el inicio o solo tarjetas + PSE? (Wompi lo
  ofrece; no cambia la integración, solo el display).
- [ ] ¿Pedidos sin pagar se cancelan solos a las X horas? (hoy no hay
  expiración; con pagos en línea convendría un TTL, p. ej. 24 h).

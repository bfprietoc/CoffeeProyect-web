# Guía de puesta en marcha — Login con Google + Pagos Wompi

> **Propósito:** una sola guía con todo lo que hay que hacer para activar las
> dos features del proyecto — Google sign-in (Feature A) y pagos en línea con
> Wompi (Feature B) — más qué debe hacer cada quien y cómo verificar.
>
> **Estado (2026-11-25):** ambas features están **implementadas, testeadas
> (unit + E2E) y en PRs abiertos** — falta la creación de credenciales por el
> dueño y la validación final. La guía está organizada en 3 fases:
>
> 1. **Fase 0** — cosas que NO dependen de credenciales (opcionales, local)
> 2. **Fase A** — Login con Google (solo dueño)
> 3. **Fase B** — Pagos Wompi (solo dueño)
>
> Las features quedan **apagadas por diseño** hasta configurarlas: sin
> credenciales, el login Google responde 503 y el botón de pago no aparece —
> CI y E2E funcionan así.

---

## 📍 Resumen de lo que necesitás (checklist)

| # | Tarea | Quién | Dónde |
|---|---|---|---|
| A1 | Crear OAuth Client ID (tipo Web) en Google Cloud Console | **Dueño** | Google Cloud Console |
| A2 | Poner `GOOGLE_CLIENT_ID` y `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | **Dueño** | backend `.env` + frontend `.env.local` |
| A3 | Corrida del plan de pruebas (6 pasos) | **Dueño o agente** | backend + frontend |
| A4 | Merge PRs backend #4 + web #5 (+release) | **Dueño** | GitHub |
| B1 | Crear cuenta Wompi (self-service, gratis) y entrar al panel sandbox | **Dueño** | wompi.com |
| B2 | Copiar las 3 credenciales de sandbox + webhook URL | **Dueño** | Panel Wompi |
| B3 | Poner `WOMPI_*` + `PUBLIC_BASE_URL` en el backend `.env` | **Dueño** | backend `.env` |
| B4 | Poner `NEXT_PUBLIC_PAYMENTS_ENABLED=true` en el frontend | **Dueño** | frontend `.env.local` / prod |
| B5 | Validar con tarjeta de prueba (6 pasos) | **Dueño o agente** | end-to-end |
| B6 | Merge PRs backend #6 + web #6 (+release) | **Dueño** | GitHub |
| C | Decisión marca/dominio (consent screen + URLs autorizadas) | **Dueño** | Google Cloud Console + Caddy |

---

## Fase A — Login con Google (Feature A)

**Qué es:** botón "Continuar con Google" en `/login` y `/register`. El
backend valida el ID token contra el JWKS de Google (sin client secret) y
crea/reutiliza el usuario. **PRs backend #4 + web #5** (CI verde, pendientes
de merge).

### A1. Crear el OAuth Client ID (solo dueño)

1. [console.cloud.google.com](https://console.cloud.google.com) → **Crear proyecto** (p. ej. `coffee-proyect`).
2. **APIs y servicios** → **Elegir pantalla de consentimiento** → tipo **Externo** → nombre = **el de la marca** (es lo que ve el cliente en el popup de Google). No hace falta habilitar ninguna API.
3. **Credenciales** → **Crear credenciales** → **ID de cliente de OAuth** → tipo **Aplicación web**.
4. **Orígenes autorizados de JavaScript** (los orígenes donde vive el front):

 | Origen | Para qué |
|---|---|
| `http://localhost:3000` | dev local |
| `http://localhost:3001` | E2E local + `next start` del bring-up |
| `https://wake-agent.taile51409.ts.net` | producción actual (tailnet) |
| `https://<dominio>` | producción pública (cuando se compre) |

5. Copiar el **Client ID** (`xxx.apps.googleusercontent.com`).

> ⚠️ **Si al probar sale `403 access_denied` / "no está en la lista"**:
> el consent screen está en modo **Testing** (solo ~10 cuentas). Solución:
> **Credenciales → Usuarios de prueba** → agregar las cuentas que van a
> probar. Para uso público → pasar la app a **En producción** desde el mismo
> menú (en ese caso el logo/nombre de marca importa).

### A2. Configurar las variables

**Backend** — `/home/bfprietoc/Documents/Repos/CoffeeProyect/.env`:
```
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
```
Reinicia el servicio: `systemctl --user restart coffee-api`

**Frontend** — `.env.local` (dev) o `.env.production` (prod):
```
NEXT_PUBLIC_GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
```
Reinicia el build: `npm run build` + `systemctl --user restart coffee-web`
(**Las variables NEXT_PUBLIC_* se inlinan en build time** — hace falta rebuild).

### A3. Validar (6 pasos)

1. Con las dos variables puestas: el botón aparece en `/login` y `/register`.
2. **Login Google → sesión**: entrar con la cuenta de prueba → redirect a `/` autenticado ("Hola, <nombre>").
3. **Mismo usuario por dos vías**: cerrar sesión → entrar con email+contraseña de una cuenta cuyo email sea el de Google → mismo `user.id` (ver `/account`).
4. **Merge carrito invitado**: como invitado, agregar 1 café → entrar con Google → el ítem aparece en el carrito de la sesión.
5. **Registro con Google** (desde `/register`): cuenta nueva → se crea sin password; después entra también por Google (no por contraseña).
6. **Errores**: con `GOOGLE_CLIENT_ID` ausente en el backend → 503 y el botón desaparece; token manipulado → 401.

### A4. Merge + release

Con la validación verde: merge **backend #4** + **web #5** → release
`develop → main` con tag → deploy.

---

## Fase B — Pagos Wompi (tarjetas + PSE)

**Qué es:** cobrar el pedido en línea con el **Web Checkout** de Wompi (cero
PCI scope en nuestra app): el backend valida y firma los parámetros, el
cliente paga en el portal de Wompi, y el backend sabe el resultado vía
**webhook firmado**. **PRs backend #6 + web #6** (CI verde, pendientes de merge).
El método **PSE** (dominante en Colombia) está incluido en el flujo — el
banco del cliente autentica con Llave Virtual/Móvil.

### B1. Crear la cuenta (solo dueño)

1. [wompi.com](https://www.wompi.com) → "Comenzar" → registro con datos
   (cédula/NIT, datos bancarios para dispersión).
2. Entra al **panel sandbox** (entorno de pruebas — gratis).

### B2. Copiar las credenciales de sandbox (solo dueño)

Panel → **Desarrolladores → API keys** (nombres literales que espera el backend):

| Variable del backend | Valor del panel | Etapa |
|---|---|---|
| `WOMPI_PUBLIC_KEY` | Public Key (`pub_test_…`) | sandbox |
| `WOMPI_INTEGRITY_SECRET` | Secreto de **integridad** (`prod_integrity_…`) — **SOLO servidor** | sandbox |
| `WOMPI_EVENT_SECRET` | Secreto de **eventos** (`prod_events_…`, distinto al anterior) | sandbox |

> ⚠️ Jamás los secretos de integridad/eventos van al frontend (sin
> `NEXT_PUBLIC_`). Solo la **public key** viaja al front — y no por
> variable: la entrega el propio backend en la respuesta de
> `POST /orders/{id}/payment`.

### B3. Configurar el webhook (solo dueño)

Panel → **Desarrolladores → Webhooks**:

1. **URL del webhook:** `https://<host>/api/webhooks/wompi`
   - Producción actual: `https://wake-agent.taile51409.ts.net/api/webhooks/wompi`
   - Dev local: `/api/webhooks/wompi` a través del túnel de prueba (p. ej. `cloudflared`) — no se puede recibir desde localhost directo.
   - Caddy quita el prefijo `/api` antes de reenviar → el backend recibe `POST /webhooks/wompi`.

2. Backend `.env`:
```
PUBLIC_BASE_URL=https://<host>     # URL pública del front (redirect del checkout)
```
   El redirect del checkout apunta a `${PUBLIC_BASE_URL}/orders/{id}?payment=1`.

### B4. Habilitar el botón (frontend)

`.env.local` (dev) o prod:
```
NEXT_PUBLIC_PAYMENTS_ENABLED=true
```
*(No lleva valor de credenciales — solo habilita la UI. El botón aparece
**aunque no haya credenciales**, y entonces el flujo responde 503
`PAYMENTS_DISABLED` con mensaje amable — es el estado "no configurado".)*

Reinicia: `npm run build` + `systemctl --user restart coffee-web`

### B5. Validar con tarjeta de prueba (6 pasos)

1. En `/orders/{id}` aparece el botón «Pagar con tarjeta o PSE».
2. Click → el form GET redirige a `checkout.wompi.co/p/` con los parámetros correctos (moneda COP, monto en centavos, referencia `{order_id}-{unix}`).
3. Pagar con la **tarjeta de prueba de Wompi** (documentada en docs.wompi.co, sección sandbox) → redirect a `/orders/{id}?payment=1` → el badge muestra «Pagado» (la fuente de verdad es el **webhook**, no el redirect).
4. Webhook duplicado (re-enviar el mismo evento desde el panel) → el pedido sigue «Pagado» (no duplica efectos).
5. Tarjeta rechazada de prueba → badge «Fallido» + botón «Reintentar pago» → repetir con otra tarjeta de prueba.
6. Cancelar el pedido desde `/orders/{id}` y luego intentar pagar → mensaje claro (pedido indisponible).

> ⚠️ **PSE en sandbox:** Wompi no garantiza PSE estable en pruebas. Si no se prueba en sandbox, valida PSE con una **compra real de bajo valor** al activar producción. PSE vía Web Checkout sale automáticamente (los bancos aparecen en el portal).

### B6. Merge + release

Con la validación verde: merge **backend #6** + **web #6** → release
`develop → main` con tag → deploy wake-agent con `.env` de producción.

---

## 🏗️ Arquitectura (recordatorio rápido)

```
Checkout → POST /orders → pedido (payment_status: pending)
   │
   ▼
/orders/{id} → POST /orders/{id}/payment → backend valida
   │            → devuelve { publicKey, reference, amountInCents,
   │             currency, signature, redirectUrl, customerEmail }
   ▼
Form GET → checkout.wompi.co/p/  (cliente paga con tarjeta o PSE)
   │
   ▼
Wompi → (a) redirect a /orders/{id}?payment=1
        (b) webhook POST /api/webhooks/wompi → valida checksum → paid/failed
   │
   ▼
Frontend refetchea el pedido (la API es la fuente de verdad, no el redirect)
```

- **Firma de integridad:** `SHA256(referencia + monto_en_centavos + moneda + secreto_integridad)` — computada siempre server-side, nunca expuesta.
- **Webhook:** checksum = SHA256 de las propiedades del evento + timestamp + secreto de eventos (comparación case-insensitive), idempotente por referencia. Wompi reintenta 3 veces en 24h ante respuestas no-200, así que todo evento procesable responde 200.

---

## ⚠️ Notas de seguridad y de operación

- **Secretos:** solo viven en el backend `.env`. El frontend llega solo a la public key (devuelta por el backend en la respuesta de pago, no por variable de entorno).
- **Webhook público:** no lleva JWT; la verdad de que llegó de Wompi es el checksum del evento. Se prueba con el vector oficial en `internal/payment/wompi_test.go`.
- **Regla de admin crítica:** un pedido **solo** puede pasar a `processing` si está `paid` (422 `PAYMENT_REQUIRED` si no). El estado de pago no se edita a mano.
- **Si no hay credenciales:** el botón no aparece / responde 503 — nunca hay pago silencioso.

---

## 🧪 Estado actual del entorno de pruebas (2026-11-25)

**Stack activo en local (in-memory, sin Docker — datos se pierden al reiniciar):**

- Backend `coffee-api` :8080 — rama `test/features` (Google + Wompi combinados) + fix de IDs únicos (`eb96110`). 5 cafés seedeados.
- Frontend `coffee-web` :3001 — rama `test/features` (mismas dos features), `NEXT_PUBLIC_PAYMENTS_ENABLED=true`.
- Tests E2E: **19/19 verde** contra este stack. Frontend unit: **152/152**.

**Usuarios de prueba** (se pierden al reiniciar el backend — in-memory):

| Usuario | Email | Contraseña |
|---|---|---|
| Cliente 1 | `cliente1@coffeeproyect.test` | `Test1234!` |
| Cliente 2 | `cliente2@coffeeproyect.test` | `Test1234!` |

**Bloqueado por el dueño:** OAuth Client ID (fase A), cuenta Wompi + 4 credenciales (fase B), decisión de marca/dominio.

**Pendiente de merge:** backend #4 + #6, web #5 + #6 — el merge va tras las
validaciones reales de A y B (no antes: el CI verde no sustituye la prueba real).

---

## 🔗 Referencias

- Plan de la Feature A y B completas: [AUTH_PAYMENTS_PLAN.md](./AUTH_PAYMENTS_PLAN.md)
- Deploy: [DEPLOY.md](./DEPLOY.md)
- Release actual: `v1.1.0` (main) — pendiente de deploy en wake-agent

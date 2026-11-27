# Plan de funcionalidades — Ronda 1 (2026-11-20)

> **Estado (2026-11-27): ítems 1 y 2 completados** (release `v1.1.0`) + **v1.2.4
> released** — login con Google (Feature A) y pagos Wompi (Feature B) mergeados
> y en `main`/`develop`; desplegadas en wake-agent. **Fase A de Google
> VALIDADA EN VIVO** (2026-11-26) y cableada en producción (2026-11-27).
> **Fase B (Wompi) VALIDADA EN VIVO** (2026-11-27, sandbox) — checkout →
> webhook → pedido `paid`. Pendiente: credenciales de producción (B7) +
> dominio + cerrar el túnel temporal. Detalle paso a paso en
> [AUTH_PAYMENTS_PLAN.md](./AUTH_PAYMENTS_PLAN.md) y
> [SETUP_GUIDE.md](./SETUP_GUIDE.md). Pendientes: las ideas de
> features/estilos/imágenes por llegar (sección "Pendientes").
>
> Ronda de mejoras funcionales detectadas en la app desplegada (wake-agent,
> release `v1.0.0`). Cada ítem: **estado verificado → cambio → validación**
> (los cambios se prueban con E2E en CI, como el resto del proyecto).
> Al completar un ítem se marca ✅ y se registra en `FRONTEND_PLAN.md`.
> El trabajo se hace en `develop`; release a `main` al cerrar la ronda.
> Flujo de esta ronda: rama feature desde `develop` → PR (CI verde) →
> merge squash a `develop` → **PR de release `develop` → `main`** (CI sobre
> main) → merge rebase + alinear `develop` con `main` (`reset --hard` +
> force push) + tag. `main` está protegida en ambos repos (ruleset
> "proteger-main", 2026-11-22): PR obligatorio, checks quality+e2e (web),
> sin force push ni borrado. El repo web pasó a ser público para poder
> protegerlo (el backend ya lo era). Nota: la API de GitHub no expone
> fast-forward; el merge rebase reescribe el SHA, de ahí el paso de
> alineación de `develop`. Cambios puros de docs (planes, README): commit
> directo a `develop` (sin rama feature) + PR de release.

---

## 1. Descubribilidad de "Mis pedidos" ✅ (2026-11-20, `25b7622`)

### Verificado en el código (2026-11-20)

| Dato | Estado |
|---|---|
| `/orders` (lista de pedidos) | **Existe y funciona** (`(public)/orders/page.tsx`) |
| `/orders/[id]` (detalle + cancelar) | **Existe y funciona** (`(public)/orders/[id]/page.tsx`) |
| Redirección tras checkout | Sí: `router.push(/orders/${order.id})` — el usuario ve el pedido **una vez**, justo al confirmar |
| Link permanente a "Mis pedidos" | **NO existe en ningún lado** |

El gap real: el header autenticado solo muestra "Mi cuenta", y la página de
cuenta solo tiene Perfil + Direcciones. Después de la redirección inicial el
usuario pierde sus pedidos salvo que sepa la URL `/orders`.

### Cambios

1. **Header (autenticado):** link "Mis pedidos" junto a "Mi cuenta"
   (`src/components/layout/header-actions.tsx`). Es la entrada principal.
2. **Página de cuenta:** sección "Pedidos" con link a `/orders`
   (`src/app/(public)/account/page.tsx`) — segunda entrada, para quien llega
   desde "Mi cuenta".

### Validación (E2E)

- Usuario con 1 pedido: link "Mis pedidos" del header → la lista muestra el
  pedido (id corto, badge de estado, total).
- Desde `/account`, la sección "Pedidos" enlaza a la misma lista.
- Invitado: el link no aparece (o `/orders` muestra el login prompt — ya
  funciona así).

---

## 2. Agregar al carrito rápido desde el catálogo ✅ (2026-11-20, `25b7622`)

### Verificado en el código (2026-11-20)

| Dato | Estado |
|---|---|
| Botón de agregar en la tarjeta del catálogo | **No existe** — `CoffeeCard` es un solo `<Link>` a la ficha (comentario: "toda la tarjeta enlaza al detalle") |
| `AddToCart` (cantidad + botón) | Solo en la ficha de detalle (`src/components/cart/add-to-cart.tsx`) |

Hoy, agregar un café exige: catálogo → clic en la tarjeta → ficha → botón.
Tres pasos donde deberían bastar uno.

### Cambios

1. **Reestructurar `CoffeeCard`** (`src/components/catalog/coffee-card.tsx`):
   - Quitar el `<Link>` que envuelve toda la tarjeta (un botón dentro de
     `<Link>` es HTML inválido y rompe accesibilidad).
   - El **título** del café pasa a ser el link a la ficha (conserva el
     `hover:underline`); el resto de la tarjeta queda sin link.
2. **Botón "Agregar" en el footer de la tarjeta**, a la derecha del precio:
   - Agrega **cantidad 1** (sin stepper en la tarjeta; se ajusta después en
     el carrito o la ficha).
   - Feedback transitorio "Agregado ✓" por 2 s (mismo patrón que
     `AddToCart` en la ficha).
   - **Sin stock** (`coffee.available === false`): botón deshabilitado,
     etiqueta "Agotado" (coherente con `StockBadge`).
   - Invitado: funciona igual (carrito por `X-Session-ID`, sin login).
3. **Actualizar tests** de `coffee-card` y del catálogo que asuman la
   tarjeta como link.

### Validación (E2E)

- Desde `/coffees`: clic en "Agregar" de una tarjeta → el contador del
  carrito sube **sin navegar** a la ficha.
- Clic en el título de la tarjeta → sigue yendo a la ficha.
- Café agotado: botón "Agotado" deshabilitado (no agrega).
- Invitado: agregar desde tarjeta y luego loguearse → el ítem queda en el
  carrito (merge por `X-Session-ID`, ya probado en Fase 2).

---

## Pendientes (ideas por llegar)

El usuario pasará ideas de features/estilos/imágenes (logo del tío calvo,
etc.). Se agregan aquí al llegar y se priorizan antes de cerrar la ronda.

---

## Cierre de la ronda

1. ✅ Ítems 1 y 2 completados + E2E verde en `develop` (PR #1, squash).
2. ✅ Registro en `FRONTEND_PLAN.md` (sección de fases).
3. ✅ Release: `main` + tag `v1.1.0` (2026-11-20).
4. ⏳ `./deploy.sh` en wake-agent: pendiente — se valida primero en local
   (omarchy-x1, E2E 18/18, 2026-11-22); wake-agent sigue en `v1.0.0`.

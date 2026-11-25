/**
 * Gate de la Feature B (pagos Wompi).
 *
 * El botón de pago solo se renderiza si `NEXT_PUBLIC_PAYMENTS_ENABLED` está
 * en `"true"`. CI/E2E corren sin la variable: nada cambia. La verdad del
 * lado de la ejecución es el backend — el botón puede aparecer aunque el
 * backend esté sin configurar (503 PAYMENTS_DISABLED) y la página muestra
 * un mensaje claro en ese caso.
 *
 * Se lee como función (no constante a import time) para que sea falsificable
 * en tests (vi.stubEnv) y, en Next, sigue siendo inlined en build time.
 */
export function paymentsEnabled(): boolean {
  return process.env.NEXT_PUBLIC_PAYMENTS_ENABLED === "true";
}

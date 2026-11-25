/**
 * Parámetros del Web Checkout de Wompi — lo devuelve el backend
 * (POST /orders/{id}/payment) y el frontend los renderiza como inputs ocultos
 * del formulario. La firma de integridad se calcula siempre en el servidor.
 */
export interface PaymentCheckoutParams {
  publicKey: string;
  reference: string;
  amountInCents: number;
  currency: string;
  signature: string;
  redirectUrl: string;
  customerEmail: string;
}

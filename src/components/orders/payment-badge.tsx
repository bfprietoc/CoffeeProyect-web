import type { PaymentStatus } from "@/lib/types";
import { Badge } from "@/components/ui/badge";

const PAYMENT_META: Record<
  PaymentStatus,
  { label: string; variant: "default" | "secondary" | "outline" | "destructive" }
> = {
  pending: { label: "Pendiente", variant: "outline" },
  paid: { label: "Pagado", variant: "default" },
  failed: { label: "Fallido", variant: "destructive" },
};

/** Badge con la etiqueta en español del estado de pago de un pedido. */
export function PaymentBadge({ status }: { status: PaymentStatus }) {
  const meta = PAYMENT_META[status] ?? PAYMENT_META.pending;
  return <Badge variant={meta.variant}>{meta.label}</Badge>;
}

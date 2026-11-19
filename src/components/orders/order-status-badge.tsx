import type { OrderStatus } from "@/lib/types";
import { Badge } from "@/components/ui/badge";

const STATUS_META: Record<OrderStatus, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  confirmed: { label: "Confirmado", variant: "default" },
  processing: { label: "En preparación", variant: "secondary" },
  shipped: { label: "Enviado", variant: "secondary" },
  delivered: { label: "Entregado", variant: "outline" },
  cancelled: { label: "Cancelado", variant: "destructive" },
};

/** Badge con la etiqueta en español de cada estado del backend. */
export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const meta = STATUS_META[status];
  return <Badge variant={meta.variant}>{meta.label}</Badge>;
}

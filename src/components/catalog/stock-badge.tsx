import { Badge } from "@/components/ui/badge";

/** Estado de stock: agotado / pocas unidades / disponible. */
export function StockBadge({
  available,
  stockBags,
}: {
  available: boolean;
  stockBags: number;
}) {
  if (!available) {
    return <Badge variant="destructive">Agotado</Badge>;
  }
  if (stockBags <= 5) {
    return <Badge variant="secondary">Quedan {stockBags} bolsas</Badge>;
  }
  return <Badge variant="outline">Disponible</Badge>;
}

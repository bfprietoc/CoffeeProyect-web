import Link from "next/link";
import { formatPrice, processLabel, roastLabel } from "@/lib/format";
import type { Coffee } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { StockBadge } from "./stock-badge";

/** Tarjeta del listado/ficha: toda la tarjeta enlaza al detalle. */
export function CoffeeCard({ coffee }: { coffee: Coffee }) {
  const notes = coffee.tasting_notes.slice(0, 3);

  return (
    <Link href={`/coffees/${coffee.id}`} className="group/card-link block">
      <Card className="h-full transition-all group-hover/card-link:ring-foreground/25">
        <CardHeader>
          <CardAction>
            <StockBadge available={coffee.available} stockBags={coffee.stock_bags} />
          </CardAction>
          <CardTitle className="line-clamp-1 group-hover/card-link:underline">
            {coffee.name}
          </CardTitle>
          <CardDescription>
            {coffee.farm.name} · {coffee.farm.region}, {coffee.farm.country}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col gap-2">
          <div className="flex flex-wrap gap-1">
            <Badge variant="secondary">{processLabel(coffee.process)}</Badge>
            <Badge variant="secondary">{roastLabel(coffee.roast_level)}</Badge>
          </div>
          {notes.length > 0 && (
            <p className="text-sm text-muted-foreground">
              {notes.join(" · ")}
            </p>
          )}
        </CardContent>
        <CardFooter className="justify-between text-sm">
          <span className="font-semibold">
            {formatPrice(coffee.price_cents, coffee.currency)}
          </span>
          <span className="text-muted-foreground">{coffee.bag_size_grams} g</span>
        </CardFooter>
      </Card>
    </Link>
  );
}

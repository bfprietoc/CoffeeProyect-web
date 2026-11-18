import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ApiError } from "@/lib/api/client";
import { formatPrice, processLabel, roastLabel } from "@/lib/format";
import { getCoffeeById } from "@/lib/server/coffees";
import type { Coffee } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StockBadge } from "@/components/catalog/stock-badge";
import { WaitlistForm } from "@/components/catalog/waitlist-form";

async function CoffeeDetail({
  params,
}: Pick<PageProps<"/coffees/[id]">, "params">) {
  const { id } = await params;

  let coffee: Coffee;
  try {
    coffee = await getCoffeeById(id);
  } catch (err) {
    if (err instanceof ApiError && err.code === "NOT_FOUND") notFound();
    throw err; // otra falla → error boundary de la ruta
  }
  // Nota: con Cache Components (PPR) el shell se envía antes de que corra
  // notFound(), así que una ficha inexistente responde 200 con la UI de
  // not-found streaméada ("soft 404", comportamiento documentado en
  // loading.md → Status codes). Los IDs son UUIDs no adivinables, así que no
  // hay valor de SEO en el status; si algún día se necesita un 404 real,
  // la opción documentada es una check rápida en proxy.ts.

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10">
      <Link
        href="/coffees"
        className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        ← Volver al catálogo
      </Link>

      <div className="mt-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{coffee.name}</h1>
          <p className="mt-1 text-muted-foreground">
            {coffee.farm.name} · {coffee.farm.region}, {coffee.farm.country}
          </p>
        </div>
        <StockBadge available={coffee.available} stockBags={coffee.stock_bags} />
      </div>

      <div className="mt-8 grid gap-8 md:grid-cols-[1fr_320px]">
        <div className="space-y-8">
          <section>
            <h2 className="text-lg font-semibold">Notas de cata</h2>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {coffee.tasting_notes.map((note) => (
                <Badge key={note} variant="secondary">
                  {note}
                </Badge>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold">Descripción</h2>
            <p className="mt-2 leading-relaxed">{coffee.description}</p>
          </section>
        </div>

        <aside className="h-fit rounded-xl border bg-card p-5">
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-muted-foreground">Productor</dt>
              <dd className="mt-0.5 font-medium">{coffee.producer.name}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Proceso</dt>
              <dd className="mt-0.5 font-medium">
                {processLabel(coffee.process)}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Tostado</dt>
              <dd className="mt-0.5 font-medium">
                {roastLabel(coffee.roast_level)}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Bolsa</dt>
              <dd className="mt-0.5 font-medium">{coffee.bag_size_grams} g</dd>
            </div>
          </dl>

          <div className="mt-4 border-t pt-4">
            <p className="text-2xl font-bold">
              {formatPrice(coffee.price_cents, coffee.currency)}
            </p>
            {coffee.available ? (
              <Button className="mt-3 w-full" disabled>
                Agregar al carrito
              </Button>
            ) : (
              <div className="mt-3">
                <WaitlistForm coffeeId={coffee.id} coffeeName={coffee.name} />
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

export default function CoffeeDetailPage(props: PageProps<"/coffees/[id]">) {
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <CoffeeDetail params={props.params} />
    </Suspense>
  );
}

/** SEO: título y descripción por café (Fase 1 del plan; OG en Fase 6). */
export async function generateMetadata(
  props: PageProps<"/coffees/[id]">,
): Promise<Metadata> {
  const { id } = await props.params;
  try {
    const coffee = await getCoffeeById(id);
    return {
      title: coffee.name,
      description: coffee.description,
    };
  } catch {
    // 404 o API caída: se queda con la metadata por defecto del layout.
    return {};
  }
}

function DetailSkeleton() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10" aria-hidden>
      <div className="h-4 w-32 animate-pulse rounded bg-muted" />
      <div className="mt-4 h-9 w-2/3 animate-pulse rounded-lg bg-muted" />
      <div className="mt-8 grid gap-8 md:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <div className="h-24 animate-pulse rounded-lg bg-muted" />
          <div className="h-32 animate-pulse rounded-lg bg-muted" />
        </div>
        <div className="h-64 animate-pulse rounded-xl bg-muted" />
      </div>
    </div>
  );
}

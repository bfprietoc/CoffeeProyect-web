import Link from "next/link";
import { CoffeeCard } from "@/components/catalog/coffee-card";
import { Button } from "@/components/ui/button";
import { getFeaturedCoffees } from "@/lib/server/coffees";

export default async function HomePage() {
  const featured = await getFeaturedCoffees(6);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12">
      <section className="max-w-2xl">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Cafés de especialidad, directo de la finca
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Orígenes colombianos, procesos cuidados y notas de cata en cada
          bolsa. Tostamos bajo pedido para que lo pruebes en su mejor momento.
        </p>
        <Button size="lg" className="mt-6" render={<Link href="/coffees" />}>
          Ver catálogo
        </Button>
      </section>

      <section className="mt-16">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-2xl font-semibold tracking-tight">
            Nuestros cafés
          </h2>
          <Link
            href="/coffees"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Ver todos →
          </Link>
        </div>

        {featured.length === 0 ? (
          <p className="mt-6 rounded-lg border bg-card p-6 text-center text-muted-foreground">
            Estamos preparando el próximo lote. Vuelve pronto.
          </p>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((coffee) => (
              <CoffeeCard key={coffee.id} coffee={coffee} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

/** Loading de /coffees: la página ya define su propio fallback en <Suspense>;
 * este cubre navegaciones por el router mientras se resuelve la ruta. */
export default function CoffeesLoading() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10" aria-hidden>
      <div className="h-9 w-40 animate-pulse rounded-lg bg-muted" />
      <div className="mt-6 flex gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-8 w-32 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-48 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
    </div>
  );
}

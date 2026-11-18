export default function CoffeeDetailLoading() {
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

import Link from "next/link";

/** Chrome de las rutas públicas: header con nav + footer. */
export default function PublicLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4">
          <Link href="/" className="text-lg font-semibold tracking-tight">
            ☕ CoffeeProyect
          </Link>
          <nav className="flex items-center gap-1">
            <Link
              href="/coffees"
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              Catálogo
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t py-6">
        <div className="mx-auto w-full max-w-6xl px-4 text-sm text-muted-foreground">
          © 2026 CoffeeProyect — Cafés de especialidad, directo de la finca.
        </div>
      </footer>
    </>
  );
}

import Link from "next/link";
import { HeaderActions } from "@/components/layout/header-actions";

/** Chrome de las rutas públicas: header con nav + footer. */
export default function PublicLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-background focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:shadow focus:ring-2 focus:ring-ring"
      >
        Saltar al contenido
      </a>
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4">
          <Link
            href="/"
            className="whitespace-nowrap text-lg font-semibold tracking-tight"
          >
            ☕ <span className="hidden sm:inline">CoffeeProyect</span>
          </Link>
          <nav className="flex items-center gap-1">
            <Link
              href="/coffees"
              className="whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              Catálogo
            </Link>
            <HeaderActions />
          </nav>
        </div>
      </header>

      <main id="contenido" className="flex-1">
        {children}
      </main>

      <footer className="border-t py-6">
        <div className="mx-auto w-full max-w-6xl px-4 text-sm text-muted-foreground">
          © 2026 CoffeeProyect — Cafés de especialidad, directo de la finca.
        </div>
      </footer>
    </>
  );
}

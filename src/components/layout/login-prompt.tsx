import Link from "next/link";
import { Button } from "@/components/ui/button";

/**
 * Gate para rutas que requieren sesión (checkout, órdenes): invita a
 * ingresar o registrarse preservando la ruta de origen en `next`.
 */
export function LoginPrompt({ next }: { next: string }) {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <div className="mt-6 rounded-lg border p-10 text-center">
        <p className="font-medium">Inicia sesión para continuar.</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Necesitas una cuenta para {next === "/checkout" ? "comprar" : "ver tus pedidos"}.
        </p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
          <Link href={`/login?next=${encodeURIComponent(next)}`}>
            <Button>Ingresar</Button>
          </Link>
          <Link href={`/register?next=${encodeURIComponent(next)}`} className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            Crear cuenta
          </Link>
        </div>
      </div>
    </div>
  );
}

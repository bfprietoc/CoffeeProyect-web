"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

/** Error boundary de /coffees: la API caída o una respuesta inválida no
 * deben tumbar la página con un stack trace. */
export default function CoffeesError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // En producción el digest referencia el error completo en los logs del server.
    console.error("Error cargando el catálogo:", error.digest ?? error);
  }, [error]);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-bold tracking-tight">Catálogo</h1>
      <div className="mt-10 rounded-lg border bg-card p-10 text-center">
        <p className="font-medium">No pudimos cargar el catálogo.</p>
        <p className="mt-1 text-sm text-muted-foreground">
          El servidor no responde o devolvió una respuesta inesperada.
        </p>
        <div className="mt-4 flex justify-center gap-3">
          <Button onClick={reset}>Reintentar</Button>
          <Button variant="outline" render={<Link href="/" />}>
            Ir a la portada
          </Button>
        </div>
      </div>
    </div>
  );
}

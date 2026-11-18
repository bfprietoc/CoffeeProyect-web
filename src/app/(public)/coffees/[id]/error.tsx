"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

/** Error boundary de la ficha: API caída o respuesta inválida. */
export default function CoffeeDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Error cargando la ficha de café:", error.digest ?? error);
  }, [error]);

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10">
      <div className="mt-10 rounded-lg border bg-card p-10 text-center">
        <p className="text-lg font-semibold">No pudimos cargar este café.</p>
        <p className="mt-1 text-sm text-muted-foreground">
          El servidor no responde o devolvió una respuesta inesperada.
        </p>
        <div className="mt-4 flex justify-center gap-3">
          <Button onClick={reset}>Reintentar</Button>
          <Button variant="outline" render={<Link href="/coffees" />}>
            Ver catálogo
          </Button>
        </div>
      </div>
    </div>
  );
}

import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function CoffeeNotFound() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10">
      <div className="mt-10 rounded-lg border bg-card p-10 text-center">
        <p className="text-lg font-semibold">Café no encontrado</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Este café no existe o ya no está en el catálogo.
        </p>
        <Button className="mt-4" render={<Link href="/coffees" />}>
          Ver catálogo
        </Button>
      </div>
    </div>
  );
}

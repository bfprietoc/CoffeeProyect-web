import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function GlobalNotFound() {
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-20">
      <div className="rounded-lg border bg-card p-10 text-center">
        <p className="text-lg font-semibold">Página no encontrada</p>
        <p className="mt-1 text-sm text-muted-foreground">
          La ruta que buscas no existe.
        </p>
        <Button className="mt-4" render={<Link href="/" />}>
          Ir a la portada
        </Button>
      </div>
    </div>
  );
}

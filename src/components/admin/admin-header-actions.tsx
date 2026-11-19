"use client";

import Link from "next/link";
import { useAdminSession } from "@/lib/auth/use-admin-session";
import { Button } from "@/components/ui/button";

/**
 * Acciones del header del panel: link a la tienda + «Cerrar panel» (solo con
 * sesión de admin activa). Cerrar borra la API key de memoria: el gate vuelve
 * a pedir la clave, sin tocar la sesión de cliente (JWT).
 */
export function AdminHeaderActions() {
  const { isAdmin, logout } = useAdminSession();

  return (
    <div className="flex items-center gap-2">
      <Link
        href="/"
        className="rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        Ver tienda
      </Link>
      {isAdmin && (
        <Button variant="ghost" size="sm" onClick={logout}>
          Cerrar panel
        </Button>
      )}
    </div>
  );
}

"use client";

import Link from "next/link";
import { useSession } from "@/lib/auth/use-session";
import { useMe } from "@/lib/query/cart";
import { Button } from "@/components/ui/button";
import { CartButton } from "@/components/cart/cart-button";

/** Acciones del header: carrito + (invitado | usuario logueado). */
export function HeaderActions() {
  const { isAuthenticated, logout } = useSession();
  const me = useMe();

  return (
    <>
      <CartButton />
      {isAuthenticated ? (
        <div className="flex items-center gap-2">
          <Link
            href="/account"
            className="whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            Mi cuenta
          </Link>
          <Link
            href="/orders"
            className="whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            Mis pedidos
          </Link>
          <span className="hidden text-sm text-muted-foreground sm:inline">
            Hola, {me.data?.name ?? "…"}
          </span>
          <Button variant="ghost" size="sm" onClick={logout}>
            Salir
          </Button>
        </div>
      ) : (
        <Link
          href="/login"
          className="whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          Ingresar
        </Link>
      )}
    </>
  );
}

"use client";

import Link from "next/link";
import { useMounted } from "@/lib/hooks/use-mounted";
import { useMe } from "@/lib/query/cart";
import { useIsAuthenticated } from "@/lib/query/orders";
import { ProfileForm } from "@/components/account/profile-form";
import { AddressList } from "@/components/account/address-list";
import { LoginPrompt } from "@/components/layout/login-prompt";
import { Button } from "@/components/ui/button";

function AccountSkeleton() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10" aria-busy>
      <h1 className="text-2xl font-bold tracking-tight">Mi cuenta</h1>
      <div className="mt-6 space-y-3">
        <div className="h-24 animate-pulse rounded-lg bg-muted" />
        <div className="h-24 animate-pulse rounded-lg bg-muted" />
      </div>
    </div>
  );
}

export default function AccountPage() {
  const mounted = useMounted();
  const authed = useIsAuthenticated();
  const me = useMe();

  // SSR y primer render: skeleton (evita flash del login prompt para
  // usuarios autenticados; ver nota en checkout/page.tsx).
  if (!mounted) return <AccountSkeleton />;

  if (!authed) return <LoginPrompt next="/account" />;

  if (me.isPending) return <AccountSkeleton />;

  if (me.isError) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-10">
        <h1 className="text-2xl font-bold tracking-tight">Mi cuenta</h1>
        <div className="mt-6 rounded-lg border p-6 text-center">
          <p className="text-muted-foreground">No se pudo cargar tu cuenta.</p>
          <Button variant="outline" className="mt-3" onClick={() => me.refetch()}>
            Reintentar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-bold tracking-tight">Mi cuenta</h1>

      <div className="mt-6 space-y-8">
        <section aria-labelledby="perfil-heading">
          <h2 id="perfil-heading" className="text-lg font-semibold">
            Perfil
          </h2>
          <div className="mt-3 rounded-xl border p-4">
            <ProfileForm user={me.data} />
          </div>
        </section>

        <section aria-labelledby="direcciones-heading">
          <h2 id="direcciones-heading" className="text-lg font-semibold">
            Direcciones
          </h2>
          <div className="mt-3">
            <AddressList />
          </div>
        </section>

        <section aria-labelledby="pedidos-heading">
          <div className="flex items-center justify-between">
            <h2 id="pedidos-heading" className="text-lg font-semibold">
              Pedidos
            </h2>
            <Link
              href="/orders"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Ver mis pedidos →
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}

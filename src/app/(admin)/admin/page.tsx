"use client";

import { useState } from "react";
import { useMounted } from "@/lib/hooks/use-mounted";
import { useAdminSession } from "@/lib/auth/use-admin-session";
import { AdminLoginForm } from "@/components/admin/admin-login-form";
import { CoffeesTab } from "@/components/admin/coffees-tab";
import { OrdersTab } from "@/components/admin/orders-tab";

type Tab = "coffees" | "orders";

const TABS: { id: Tab; label: string }[] = [
  { id: "coffees", label: "Cafés" },
  { id: "orders", label: "Órdenes" },
];

function AdminSkeleton() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10" aria-busy>
      <div className="h-9 w-40 animate-pulse rounded-lg bg-muted" />
      <div className="mt-6 h-48 animate-pulse rounded-xl bg-muted" />
    </div>
  );
}

/**
 * Panel admin (Fase 5): gate por API key en memoria.
 * - SSR/primer render: skeleton (evita flash del form de login para quien ya
 *   tiene la clave en memoria, como el gate de /account).
 * - Sin clave: form de login (verifica la clave contra la API antes de
 *   aceptarla). La clave no persiste: al recargar vuelve a pedirla.
 * - Con clave: pestañas Cafés (CRUD + stock) y Órdenes (estado + tracking).
 */
export default function AdminPage() {
  const mounted = useMounted();
  const { isAdmin } = useAdminSession();
  const [tab, setTab] = useState<Tab>("coffees");

  if (!mounted) return <AdminSkeleton />;

  if (!isAdmin) {
    return (
      <div className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm rounded-xl border bg-card p-6">
          <AdminLoginForm />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10">
      <div className="flex items-center gap-1 border-b" role="tablist" aria-label="Secciones del panel">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              tab === t.id
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-6" role="tabpanel">
        {tab === "coffees" ? <CoffeesTab /> : <OrdersTab />}
      </div>
    </div>
  );
}

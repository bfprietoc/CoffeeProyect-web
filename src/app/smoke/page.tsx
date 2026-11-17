"use client";

// Smoke de Fase 0: verifica /health y el render del listado de cafés
// contra la API real (NEXT_PUBLIC_API_URL). Se elimina cuando exista la home.

import { useEffect, useState } from "react";
import { getHealth, listCoffees } from "@/lib/api/endpoints";
import type { Coffee } from "@/lib/types";

type Phase = "loading" | "done";

export default function SmokePage() {
  const [phase, setPhase] = useState<Phase>("loading");
  const [healthOk, setHealthOk] = useState(false);
  const [coffees, setCoffees] = useState<Coffee[] | null>(null);
  const [coffeesError, setCoffeesError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    getHealth()
      .then((h) => {
        if (!cancelled) setHealthOk(h.status === "ok");
      })
      .catch(() => {
        if (!cancelled) setHealthOk(false);
      })
      .finally(() => {
        if (!cancelled) setPhase("done");
    });

    listCoffees()
      .then((list) => {
        if (!cancelled) setCoffees(list);
      })
      .catch((e: unknown) => {
        if (!cancelled)
          setCoffeesError(e instanceof Error ? e.message : "error desconocido");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-2xl font-bold">Smoke — Fase 0</h1>
      <p className="mt-2 text-sm text-neutral-500">
        Verifica la conexión con el backend y el render del catálogo.
      </p>

      <section className="mt-8 rounded-lg border p-4">
        <h2 className="font-semibold">GET /health</h2>
        {phase === "loading" ? (
          <p className="mt-1 text-sm text-neutral-500">Consultando…</p>
        ) : healthOk ? (
          <p className="mt-1 text-sm font-medium text-green-600">✅ OK</p>
        ) : (
          <p className="mt-1 text-sm font-medium text-red-600">
            ❌ API no disponible (¿el backend está corriendo en :8080?)
          </p>
        )}
      </section>

      <section className="mt-4 rounded-lg border p-4">
        <h2 className="font-semibold">GET /coffees</h2>
        {coffeesError ? (
          <p className="mt-1 text-sm font-medium text-red-600">❌ {coffeesError}</p>
        ) : coffees === null ? (
          <p className="mt-1 text-sm text-neutral-500">Cargando…</p>
        ) : coffees.length === 0 ? (
          <p className="mt-1 text-sm text-neutral-500">Sin cafés en el catálogo.</p>
        ) : (
          <ul className="mt-2 divide-y">
            {coffees.map((coffee) => (
              <li key={coffee.id} className="flex items-baseline justify-between py-2">
                <div>
                  <span className="font-medium">{coffee.name}</span>
                  <span className="ml-2 text-xs text-neutral-500">
                    {coffee.farm.country} · {coffee.roast_level}
                  </span>
                </div>
                <span className="text-sm">
                  {(coffee.price_cents / 100).toFixed(2)} {coffee.currency}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

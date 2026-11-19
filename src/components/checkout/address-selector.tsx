"use client";

import { useState } from "react";
import type { Address } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AddressForm } from "./address-form";

interface AddressSelectorProps {
  addresses: Address[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

/**
 * Selección de dirección de envío: radio list de direcciones guardadas +
 * formulario para agregar una nueva. La selección la controla el padre
 * (el checkout necesita el id para POST /orders).
 */
export function AddressSelector({ addresses, selectedId, onSelect }: AddressSelectorProps) {
  const [showForm, setShowForm] = useState(false);

  function handleCreated(address: Address) {
    onSelect(address.id);
    setShowForm(false);
  }

  return (
    <section className="rounded-xl border p-4">
      <h2 className="text-lg font-semibold">Dirección de envío</h2>

      {addresses.length === 0 && !showForm && (
        <p className="mt-2 text-sm text-muted-foreground">
          Aún no tienes direcciones guardadas. Agrega una para continuar.
        </p>
      )}

      {addresses.length > 0 && (
        <div className="mt-3 flex flex-col gap-2" role="radiogroup" aria-label="Dirección de envío">
          {addresses.map((address) => (
            <label
              key={address.id}
              className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
                address.id === selectedId
                  ? "border-primary bg-primary/5"
                  : "hover:bg-muted/50"
              }`}
            >
              <input
                type="radio"
                name="shipping-address"
                value={address.id}
                checked={address.id === selectedId}
                onChange={() => onSelect(address.id)}
                className="mt-1 size-4 accent-[var(--primary)]"
              />
              <span className="min-w-0">
                <span className="flex flex-wrap items-center gap-2 font-medium">
                  {address.label}
                  {address.is_default && <Badge variant="secondary">Predeterminada</Badge>}
                </span>
                <span className="mt-0.5 block text-sm text-muted-foreground">
                  {address.street}, {address.city}, {address.department} · {address.country}
                </span>
              </span>
            </label>
          ))}
        </div>
      )}

      <div className="mt-3">
        {showForm ? (
          <div className="rounded-lg border bg-muted/30 p-4">
            <AddressForm onCreated={handleCreated} defaultIsDefault={addresses.length === 0} />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="mt-2 text-muted-foreground"
              onClick={() => setShowForm(false)}
            >
              Cerrar
            </Button>
          </div>
        ) : (
          <Button type="button" variant="outline" onClick={() => setShowForm(true)}>
            Agregar nueva dirección
          </Button>
        )}
      </div>
    </section>
  );
}

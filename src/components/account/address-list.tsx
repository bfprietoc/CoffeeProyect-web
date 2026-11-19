"use client";

import { useState } from "react";
import type { Address } from "@/lib/types";
import { useAddresses } from "@/lib/query/orders";
import { useDeleteAddress } from "@/lib/query/account";
import { AddressForm } from "@/components/checkout/address-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

/**
 * Direcciones guardadas (GET/DELETE /users/me/addresses): la lista llega
 * ordenada con la predeterminada primero. Se crea reutilizando el
 * AddressForm del checkout (con checkbox de predeterminada) y se elimina
 * con confirmación en dos pasos, como la cancelación de pedidos.
 *
 * Nota: el backend no expone edición de direcciones ni cambio de default
 * en una existente — `is_default` solo se fija al crear (y desmarca la
 * anterior). Ver registro de Fase 4 en FRONTEND_PLAN.md.
 */
export function AddressList() {
  const addresses = useAddresses();
  const [showForm, setShowForm] = useState(false);

  if (addresses.isPending) {
    return (
      <div className="space-y-3" aria-busy>
        <div className="h-16 animate-pulse rounded-lg bg-muted" />
        <div className="h-16 animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  if (addresses.isError) {
    return (
      <div className="rounded-lg border p-6 text-center">
        <p className="text-muted-foreground">No se pudieron cargar tus direcciones.</p>
        <Button variant="outline" className="mt-3" onClick={() => addresses.refetch()}>
          Reintentar
        </Button>
      </div>
    );
  }

  const list = addresses.data;

  return (
    <div className="flex flex-col gap-4">
      {list.length > 0 && (
        <ul className="divide-y rounded-xl border">
          {list.map((address) => (
            <AddressItem key={address.id} address={address} />
          ))}
        </ul>
      )}

      {list.length === 0 && !showForm && (
        <p className="text-sm text-muted-foreground">Aún no tienes direcciones guardadas.</p>
      )}

      {showForm ? (
        <div className="flex flex-col gap-3 rounded-xl border p-4">
          <AddressForm onCreated={() => setShowForm(false)} />
          <div>
            <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>
              Cerrar sin guardar
            </Button>
          </div>
        </div>
      ) : (
        <div>
          <Button variant="outline" onClick={() => setShowForm(true)}>
            Agregar dirección
          </Button>
        </div>
      )}
    </div>
  );
}

function AddressItem({ address }: { address: Address }) {
  const deleteAddress = useDeleteAddress();
  const [confirming, setConfirming] = useState(false);

  function handleConfirm() {
    deleteAddress.mutate(address.id, { onSettled: () => setConfirming(false) });
  }

  if (deleteAddress.isError) {
    return (
      <li className="flex flex-wrap items-center gap-3 p-4">
        <div className="min-w-0 flex-1">
          <p role="alert" className="text-sm font-medium text-destructive">
            No se pudo eliminar la dirección. Intenta de nuevo.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => deleteAddress.reset()}>
          Volver a intentar
        </Button>
      </li>
    );
  }

  return (
    <li className="flex flex-wrap items-center gap-3 p-4">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium">{address.label}</span>
          {address.is_default && <Badge variant="secondary">Predeterminada</Badge>}
        </div>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {address.street}, {address.city}, {address.department} · {address.country}
        </p>
      </div>

      {confirming ? (
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm font-medium">¿Eliminar esta dirección?</p>
          <Button variant="destructive" size="sm" onClick={handleConfirm}>
            Sí, eliminar
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>
            Volver
          </Button>
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          className="text-destructive hover:bg-destructive/10"
          onClick={() => setConfirming(true)}
        >
          Eliminar
        </Button>
      )}
    </li>
  );
}

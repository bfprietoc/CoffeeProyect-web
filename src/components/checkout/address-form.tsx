"use client";

import { useState } from "react";
import { ApiError } from "@/lib/api/client";
import type { Address, CreateAddressRequest } from "@/lib/types";
import { useAddAddress } from "@/lib/query/orders";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface AddressFormProps {
  /** Callback al crear la dirección (ej. seleccionarla en el selector). */
  onCreated?: (address: Address) => void;
  /** true si la dirección nueva debe marcarse como predeterminada (default). */
  defaultIsDefault?: boolean;
}

/**
 * Formulario para crear una dirección (POST /users/me/addresses).
 * La validación de requeridos espeja al backend: label, street, city y
 * department; country opcional (el backend defaultea a "CO").
 */
export function AddressForm({ onCreated, defaultIsDefault = false }: AddressFormProps) {
  const addAddress = useAddAddress();

  const [label, setLabel] = useState("");
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [department, setDepartment] = useState("");
  const [country, setCountry] = useState("CO");
  const [isDefault, setIsDefault] = useState(defaultIsDefault);
  const [errorMessage, setErrorMessage] = useState("");

  function resetForm() {
    setLabel("");
    setStreet("");
    setCity("");
    setDepartment("");
    setCountry("CO");
    setIsDefault(defaultIsDefault);
    setErrorMessage("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!label.trim() || !street.trim() || !city.trim() || !department.trim()) {
      setErrorMessage("Etiqueta, calle, ciudad y departamento son obligatorios.");
      return;
    }
    setErrorMessage("");
    const body: CreateAddressRequest = {
      label: label.trim(),
      street: street.trim(),
      city: city.trim(),
      department: department.trim(),
      country: country.trim() || "CO",
      is_default: isDefault,
    };
    try {
      const address = await addAddress.mutateAsync(body);
      resetForm();
      onCreated?.(address);
    } catch (err) {
      setErrorMessage(
        err instanceof ApiError
          ? err.message
          : "No se pudo guardar la dirección. Intenta de nuevo.",
      );
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="address-label">Etiqueta</Label>
          <Input
            id="address-label"
            placeholder="Casa, Oficina…"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="address-street">Calle y número</Label>
          <Input
            id="address-street"
            placeholder="Cra 15 #43-20"
            value={street}
            onChange={(e) => setStreet(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="address-city">Ciudad</Label>
          <Input
            id="address-city"
            placeholder="Medellín"
            value={city}
            onChange={(e) => setCity(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="address-department">Departamento</Label>
          <Input
            id="address-department"
            placeholder="Antioquia"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <div className="flex w-28 flex-col gap-1.5">
          <Label htmlFor="address-country">País (ISO)</Label>
          <Input
            id="address-country"
            placeholder="CO"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
          />
        </div>
        <label className="mb-1.5 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={isDefault}
            onChange={(e) => setIsDefault(e.target.checked)}
            className="size-4 accent-[var(--primary)]"
          />
          Dirección predeterminada
        </label>
      </div>

      {errorMessage && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {errorMessage}
        </p>
      )}

      <div className="flex items-center gap-2">
        <Button type="submit" disabled={addAddress.isPending}>
          {addAddress.isPending ? "Guardando…" : "Guardar dirección"}
        </Button>
      </div>
    </form>
  );
}

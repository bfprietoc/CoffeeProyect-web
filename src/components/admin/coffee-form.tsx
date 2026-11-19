"use client";

import { useState } from "react";
import { ApiError } from "@/lib/api/client";
import type { Coffee } from "@/lib/types";
import { useAdminCreateCoffee, useAdminUpdateCoffee } from "@/lib/query/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const PROCESS_OPTIONS = [
  { value: "washed", label: "Lavado" },
  { value: "natural", label: "Natural" },
  { value: "honey", label: "Honey" },
  { value: "anaerobic", label: "Anaeróbico" },
];

const ROAST_OPTIONS = [
  { value: "light", label: "Tostado claro" },
  { value: "medium", label: "Tostado medio" },
  { value: "dark", label: "Tostado oscuro" },
];

const selectClasses =
  "h-9 w-full rounded-lg border border-input bg-background px-2.5 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50";

interface CoffeeFormProps {
  mode: "create" | "edit";
  /** En modo edit: el café a modificar. */
  coffee?: Coffee;
  /** Cierra el formulario (tras guardar o al cancelar). */
  onDone: () => void;
}

/**
 * Crear (POST /admin/coffees) o editar (PUT /admin/coffees/{id}) un café.
 * La validación espeja al backend: name, process, roast_level y precio > 0
 * son obligatorios (400 si faltan). El precio se ingresa en pesos COP y se
 * convierte a centavos. En edit, producer/farm no son editables (el service
 * los conserva) y el stock se gestiona desde el panel de stock.
 */
export function CoffeeForm({ mode, coffee, onDone }: CoffeeFormProps) {
  const createCoffee = useAdminCreateCoffee();
  const updateCoffee = useAdminUpdateCoffee();
  const mutation = mode === "create" ? createCoffee : updateCoffee;

  const [name, setName] = useState(coffee?.name ?? "");
  const [process, setProcess] = useState(coffee?.process ?? "");
  const [roastLevel, setRoastLevel] = useState(coffee?.roast_level ?? "");
  const [description, setDescription] = useState(coffee?.description ?? "");
  const [tastingNotes, setTastingNotes] = useState(
    (coffee?.tasting_notes ?? []).join(", "),
  );
  const [bagSizeGrams, setBagSizeGrams] = useState(
    String(coffee?.bag_size_grams ?? 250),
  );
  // Precio en pesos (se convierte a centavos al enviar).
  const [pricePesos, setPricePesos] = useState(
    coffee ? String(coffee.price_cents / 100) : "",
  );
  const [currency, setCurrency] = useState(coffee?.currency ?? "COP");
  const [stockBags, setStockBags] = useState(String(coffee?.stock_bags ?? 0));
  const [producerName, setProducerName] = useState(coffee?.producer.name ?? "");
  const [farmName, setFarmName] = useState(coffee?.farm.name ?? "");
  const [farmCountry, setFarmCountry] = useState(coffee?.farm.country ?? "CO");
  const [farmRegion, setFarmRegion] = useState(coffee?.farm.region ?? "");
  const [errorMessage, setErrorMessage] = useState("");

  const priceCents = Math.round(Number.parseFloat(pricePesos) * 100);
  const isValid =
    name.trim() !== "" &&
    process !== "" &&
    roastLevel !== "" &&
    Number.isFinite(priceCents) &&
    priceCents > 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid || mutation.isPending) return;
    setErrorMessage("");

    const notes = tastingNotes
      .split(",")
      .map((n) => n.trim())
      .filter(Boolean);

    try {
      if (mode === "create") {
        await createCoffee.mutateAsync({
          name: name.trim(),
          process,
          roast_level: roastLevel,
          description: description.trim(),
          tasting_notes: notes,
          bag_size_grams: Number.parseInt(bagSizeGrams, 10) || 0,
          price_cents: priceCents,
          currency: currency.trim() || "COP",
          stock_bags: Number.parseInt(stockBags, 10) || 0,
          producer_name: producerName.trim(),
          farm_name: farmName.trim(),
          farm_country: farmCountry.trim() || "CO",
          farm_region: farmRegion.trim(),
        });
      } else {
        await updateCoffee.mutateAsync({
          id: (coffee as Coffee).id,
          body: {
            name: name.trim(),
            process,
            roast_level: roastLevel,
            description: description.trim(),
            tasting_notes: notes,
            bag_size_grams: Number.parseInt(bagSizeGrams, 10) || 0,
            price_cents: priceCents,
            currency: currency.trim() || "COP",
          },
        });
      }
      onDone();
    } catch (err) {
      setErrorMessage(
        err instanceof ApiError ? err.message : "No se pudo guardar el café.",
      );
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold">
          {mode === "create" ? "Nuevo café" : `Editar: ${coffee?.name ?? ""}`}
        </h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {mode === "create"
            ? "Los campos marcados con * son obligatorios (el backend los valida)."
            : "Productor, finca y stock no son editables aquí: el backend los conserva. El stock se ajusta desde «Stock»."}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="coffee-name">Nombre *</Label>
          <Input
            id="coffee-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="El Paraíso 92"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="coffee-process">Proceso *</Label>
          <select
            id="coffee-process"
            className={selectClasses}
            value={process}
            onChange={(e) => setProcess(e.target.value)}
          >
            <option value="">Seleccionar…</option>
            {PROCESS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="coffee-roast">Tostado *</Label>
          <select
            id="coffee-roast"
            className={selectClasses}
            value={roastLevel}
            onChange={(e) => setRoastLevel(e.target.value)}
          >
            <option value="">Seleccionar…</option>
            {ROAST_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="coffee-price">Precio (pesos COP) *</Label>
          <Input
            id="coffee-price"
            type="number"
            min="1"
            step="1000"
            value={pricePesos}
            onChange={(e) => setPricePesos(e.target.value)}
            placeholder="85000"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="coffee-bag">Bolsa (gramos)</Label>
          <Input
            id="coffee-bag"
            type="number"
            min="0"
            step="25"
            value={bagSizeGrams}
            onChange={(e) => setBagSizeGrams(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="coffee-currency">Moneda</Label>
          <Input
            id="coffee-currency"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="coffee-notes">Notas de cata (separadas por comas)</Label>
        <Input
          id="coffee-notes"
          value={tastingNotes}
          onChange={(e) => setTastingNotes(e.target.value)}
          placeholder="Caramelo, naranja, chocolate"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="coffee-description">Descripción</Label>
        <textarea
          id="coffee-description"
          className="min-h-20 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      {mode === "create" ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="coffee-producer">Productor</Label>
              <Input
                id="coffee-producer"
                value={producerName}
                onChange={(e) => setProducerName(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="coffee-stock">Stock inicial (bolsas)</Label>
              <Input
                id="coffee-stock"
                type="number"
                min="0"
                step="1"
                value={stockBags}
                onChange={(e) => setStockBags(e.target.value)}
              />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="coffee-farm">Finca</Label>
              <Input
                id="coffee-farm"
                value={farmName}
                onChange={(e) => setFarmName(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="coffee-farm-country">País</Label>
              <Input
                id="coffee-farm-country"
                value={farmCountry}
                onChange={(e) => setFarmCountry(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="coffee-farm-region">Región</Label>
              <Input
                id="coffee-farm-region"
                value={farmRegion}
                onChange={(e) => setFarmRegion(e.target.value)}
              />
            </div>
          </div>
        </>
      ) : (
        <div className="rounded-lg border bg-muted/40 p-3 text-sm">
          <p>
            <span className="font-medium">Productor:</span>{" "}
            {coffee?.producer.name || "—"}
          </p>
          <p className="mt-1">
            <span className="font-medium">Finca:</span>{" "}
            {coffee?.farm.name || "—"}
            {coffee?.farm.region ? ` · ${coffee.farm.region}` : ""} ·{" "}
            {coffee?.farm.country}
          </p>
        </div>
      )}

      {errorMessage && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {errorMessage}
        </p>
      )}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={!isValid || mutation.isPending}>
          {mutation.isPending
            ? "Guardando…"
            : mode === "create"
              ? "Crear café"
              : "Guardar cambios"}
        </Button>
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}

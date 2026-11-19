"use client";

import { useEffect, useState } from "react";
import { ApiError } from "@/lib/api/client";
import { useAddToCart } from "@/lib/query/cart";
import { Button } from "@/components/ui/button";
import { QuantityStepper } from "./quantity-stepper";

/** "Agregar al carrito" con selector de cantidad (ficha de detalle). */
export function AddToCart({ coffeeId, coffeeName }: { coffeeId: string; coffeeName: string }) {
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const add = useAddToCart();

  // Feedback transitorio "Agregado ✓" tras éxito (con cleanup del timer).
  useEffect(() => {
    if (!added) return;
    const timer = setTimeout(() => setAdded(false), 2000);
    return () => clearTimeout(timer);
  }, [added]);

  function handleAdd() {
    add.mutate(
      { coffee_id: coffeeId, quantity },
      {
        onSuccess: () => {
          setAdded(true);
          setQuantity(1);
        },
      },
    );
  }

  return (
    <div className="mt-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Cantidad</span>
        <QuantityStepper value={quantity} onChange={setQuantity} label={coffeeName} max={20} />
      </div>
      <Button className="w-full" onClick={handleAdd} disabled={add.isPending}>
        {added ? "Agregado ✓" : add.isPending ? "Agregando…" : "Agregar al carrito"}
      </Button>
      {add.isError && (
        <p role="alert" className="text-sm text-destructive">
          {add.error instanceof ApiError && add.error.code === "UNAVAILABLE"
            ? "Este café ya no está disponible."
            : add.error.message}
        </p>
      )}
    </div>
  );
}

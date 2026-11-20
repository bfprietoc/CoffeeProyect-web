"use client";

import { useEffect, useState } from "react";
import { useAddToCart } from "@/lib/query/cart";
import { Button } from "@/components/ui/button";

/**
 * Agregar rápido (cantidad 1) desde la tarjeta del catálogo, sin navegar a
 * la ficha. Mismo patrón de feedback transitorio que AddToCart (detalle).
 */
export function QuickAddButton({
  coffeeId,
  disabled,
}: {
  coffeeId: string;
  disabled?: boolean;
}) {
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
      { coffee_id: coffeeId, quantity: 1 },
      { onSuccess: () => setAdded(true) },
    );
  }

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={handleAdd}
      disabled={disabled || add.isPending}
    >
      {added
        ? "Agregado ✓"
        : add.isPending
          ? "Agregando…"
          : disabled
            ? "Agotado"
            : "Agregar"}
    </Button>
  );
}

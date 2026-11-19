import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ValidationResult } from "@/lib/types";
import { ValidationSummary } from "./validation-summary";

const available: ValidationResult = {
  items: [
    { coffee_id: "c1", coffee_name: "El Paraíso 92", quantity: 2, stock_bags: 10, available: true },
  ],
  total_cents: 17000000,
  currency: "COP",
  can_checkout: true,
};

const withUnavailable: ValidationResult = {
  items: [
    available.items[0],
    { coffee_id: "c2", coffee_name: "Huila Natural Caturra", quantity: 5, stock_bags: 2, available: false },
  ],
  total_cents: 17000000, // el backend solo suma ítems disponibles
  currency: "COP",
  can_checkout: false,
};

describe("ValidationSummary", () => {
  it("muestra stock disponible por ítem y el total", () => {
    render(<ValidationSummary result={available} />);

    expect(screen.getByText("El Paraíso 92")).toBeInTheDocument();
    expect(screen.getByText(/cantidad: 2/i)).toBeInTheDocument();
    expect(screen.getByText(/stock disponible: 10/i)).toBeInTheDocument();
    expect(screen.getByText(/disponible ✓/i)).toBeInTheDocument();
    expect(screen.getByText("Total")).toBeInTheDocument();
    // Intl es-CO usa U+00A0 entre $ y el número: normalizar antes de asertar.
    const total = screen.getByText(/170\.000/);
    expect(total.textContent?.replace(/\u00a0/g, " ")).toBe("$ 170.000");
  });

  it("marca ítems sin stock y muestra el aviso cuando no se puede pagar", () => {
    render(<ValidationSummary result={withUnavailable} />);

    expect(screen.getByText(/sin stock suficiente/i)).toBeInTheDocument();
    expect(
      screen.getByText(/no puedes completar la compra/i),
    ).toBeInTheDocument();
    // El total solo cuenta ítems disponibles: el label cambia.
    expect(screen.getByText(/total de ítems disponibles/i)).toBeInTheDocument();
  });
});

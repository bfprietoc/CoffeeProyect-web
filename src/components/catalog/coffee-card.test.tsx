import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Coffee } from "@/lib/types";
import { CoffeeCard } from "./coffee-card";

const coffee: Coffee = {
  id: "c1",
  name: "Finca La Esperanza Wush Wush",
  process: "washed",
  roast_level: "light",
  tasting_notes: ["jazmín", "durazno", "té negro"],
  description: "Variedad Wush Wush de origen etíope.",
  producer: { id: "p1", name: "Camilo Merizalde" },
  farm: {
    id: "f1",
    name: "La Esperanza",
    country: "Colombia",
    region: "Valle del Cauca",
  },
  bag_size_grams: 250,
  price_cents: 9200000,
  currency: "COP",
  available: true,
  stock_bags: 8,
};

describe("CoffeeCard", () => {
  it("muestra nombre, origen y precio, y enlaza al detalle", () => {
    render(<CoffeeCard coffee={coffee} />);
    expect(screen.getByText(coffee.name)).toBeInTheDocument();
    expect(
      screen.getByText("La Esperanza · Valle del Cauca, Colombia"),
    ).toBeInTheDocument();
    // 9.200.000 centavos = $92.000. El separador es-CO es NBSP (U+00A0),
    // pero getByText normaliza el texto del DOM (NBSP → espacio) y no la
    // búsqueda, así que se busca con espacio normal.
    expect(screen.getByText("$ 92.000")).toBeInTheDocument();
    const link = screen.getByRole("link", { name: new RegExp(coffee.name) });
    expect(link).toHaveAttribute("href", "/coffees/c1");
  });

  it("muestra badge Agotado cuando el café no está disponible", () => {
    render(<CoffeeCard coffee={{ ...coffee, available: false, stock_bags: 0 }} />);
    expect(screen.getByText("Agotado")).toBeInTheDocument();
  });

  it("muestra 'Quedan N bolsas' con stock bajo", () => {
    render(<CoffeeCard coffee={{ ...coffee, stock_bags: 3 }} />);
    expect(screen.getByText("Quedan 3 bolsas")).toBeInTheDocument();
  });

  it("limita las notas de cata a las primeras 3", () => {
    render(
      <CoffeeCard
        coffee={{ ...coffee, tasting_notes: ["a", "b", "c", "d"] }}
      />,
    );
    expect(screen.getByText("a · b · c")).toBeInTheDocument();
  });
});

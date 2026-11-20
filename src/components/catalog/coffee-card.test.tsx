import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { addCartItem } from "@/lib/api/endpoints";
import type { Cart, Coffee } from "@/lib/types";
import { renderWithQueryClient } from "@/test/utils";
import { CoffeeCard } from "./coffee-card";

vi.mock("@/lib/api/endpoints", () => ({
  addCartItem: vi.fn(),
}));

const emptyCart: Cart = { id: "g1", items: [], total_cents: 0, currency: "COP" };

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
  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it("muestra nombre, origen y precio, y enlaza al detalle", () => {
    renderWithQueryClient(<CoffeeCard coffee={coffee} />);
    expect(screen.getByText(coffee.name)).toBeInTheDocument();
    expect(
      screen.getByText("La Esperanza · Valle del Cauca, Colombia"),
    ).toBeInTheDocument();
    // 9.200.000 centavos = $92.000. El separador es-CO es NBSP (U+00A0),
    // pero getByText normaliza el texto del DOM (NBSP → espacio) y no la
    // búsqueda, así que se busca con espacio normal.
    expect(screen.getByText("$ 92.000")).toBeInTheDocument();
    // Solo el título enlaza a la ficha (el resto de la tarjeta no es link).
    const link = screen.getByRole("link", { name: new RegExp(coffee.name) });
    expect(link).toHaveAttribute("href", "/coffees/c1");
  });

  it("muestra badge Agotado cuando el café no está disponible", () => {
    renderWithQueryClient(
      <CoffeeCard coffee={{ ...coffee, available: false, stock_bags: 0 }} />,
    );
    // "Agotado" aparece en el badge y en el botón deshabilitado.
    expect(screen.getAllByText("Agotado").length).toBeGreaterThanOrEqual(1);
  });

  it("muestra 'Quedan N bolsas' con stock bajo", () => {
    renderWithQueryClient(<CoffeeCard coffee={{ ...coffee, stock_bags: 3 }} />);
    expect(screen.getByText("Quedan 3 bolsas")).toBeInTheDocument();
  });

  it("limita las notas de cata a las primeras 3", () => {
    renderWithQueryClient(
      <CoffeeCard coffee={{ ...coffee, tasting_notes: ["a", "b", "c", "d"] }} />,
    );
    expect(screen.getByText("a · b · c")).toBeInTheDocument();
  });

  it("muestra el botón Agregar cuando hay stock", () => {
    renderWithQueryClient(<CoffeeCard coffee={coffee} />);
    const button = screen.getByRole("button", { name: "Agregar" });
    expect(button).toBeEnabled();
  });

  it("deshabilita el botón con etiqueta Agotado sin stock", () => {
    renderWithQueryClient(
      <CoffeeCard coffee={{ ...coffee, available: false, stock_bags: 0 }} />,
    );
    const button = screen.getByRole("button", { name: "Agotado" });
    expect(button).toBeDisabled();
  });

  it("agrega cantidad 1 al hacer clic y muestra confirmación", async () => {
    vi.mocked(addCartItem).mockResolvedValue(emptyCart);
    const user = userEvent.setup();
    renderWithQueryClient(<CoffeeCard coffee={coffee} />);

    await user.click(screen.getByRole("button", { name: "Agregar" }));

    expect(addCartItem).toHaveBeenCalledWith(
      { coffee_id: "c1", quantity: 1 },
      expect.anything(),
    );
    expect(await screen.findByText("Agregado ✓")).toBeInTheDocument();
  });
});

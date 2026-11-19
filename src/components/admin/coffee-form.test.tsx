import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/client";
import { adminCreateCoffee, adminUpdateCoffee } from "@/lib/api/endpoints";
import { clearAdminKey, setAdminKey } from "@/lib/auth/admin-session";
import type { Coffee } from "@/lib/types";
import { renderWithQueryClient } from "@/test/utils";
import { CoffeeForm } from "./coffee-form";

vi.mock("@/lib/api/endpoints", () => ({
  adminCreateCoffee: vi.fn(),
  adminUpdateCoffee: vi.fn(),
  adminDeleteCoffee: vi.fn(),
  adminGetStock: vi.fn(),
  adminAdjustStock: vi.fn(),
  adminListOrders: vi.fn(),
  adminUpdateOrderStatus: vi.fn(),
  listCoffees: vi.fn(),
}));

const coffee: Coffee = {
  id: "c1",
  name: "El Paraíso 92",
  process: "washed",
  roast_level: "medium",
  tasting_notes: ["Caramelo", "Naranja"],
  description: "Un clásico de Urabá.",
  producer: { id: "p1", name: "Pedro Pardo" },
  farm: { id: "f1", name: "El Paraíso", country: "CO", region: "Urabá" },
  bag_size_grams: 250,
  price_cents: 8500000,
  currency: "COP",
  available: true,
  stock_bags: 12,
};

describe("CoffeeForm (crear)", () => {
  beforeEach(() => setAdminKey("k1")); // el gate de /admin garantiza la clave
  afterEach(() => {
    vi.clearAllMocks();
    clearAdminKey();
  });

  it("deshabilita crear sin los campos obligatorios", () => {
    renderWithQueryClient(<CoffeeForm mode="create" onDone={vi.fn()} />);
    expect(screen.getByRole("button", { name: /crear café/i })).toBeDisabled();
  });

  it("crea el café convirtiendo precio a centavos y notas a array", async () => {
    vi.mocked(adminCreateCoffee).mockResolvedValue(coffee);
    const onDone = vi.fn();
    const u = userEvent.setup();
    renderWithQueryClient(<CoffeeForm mode="create" onDone={onDone} />);

    await u.type(screen.getByLabelText(/^nombre \*$/i), "Nuevo Origen");
    await u.selectOptions(screen.getByLabelText(/^proceso \*$/i), "washed");
    await u.selectOptions(screen.getByLabelText(/^tostado \*$/i), "light");
    await u.type(screen.getByLabelText(/^precio \(pesos cop\) \*$/i), "85000");
    await u.type(screen.getByLabelText(/notas de cata/i), "Caramelo, Naranja , ");
    await u.type(screen.getByLabelText(/^productor/i), "Pedro");
    await u.type(screen.getByLabelText(/^finca/i), "La Esperanza");

    await u.click(screen.getByRole("button", { name: /crear café/i }));

    expect(adminCreateCoffee).toHaveBeenCalledWith(
      "k1",
      expect.objectContaining({
        name: "Nuevo Origen",
        process: "washed",
        roast_level: "light",
        price_cents: 8500000,
        tasting_notes: ["Caramelo", "Naranja"],
        producer_name: "Pedro",
        farm_name: "La Esperanza",
        stock_bags: 0,
      }),
    );
    await vi.waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
  });

  it("muestra el error del backend al fallar", async () => {
    vi.mocked(adminCreateCoffee).mockRejectedValue(
      new ApiError(400, "name, process, roast_level and price_cents are required", "BAD_REQUEST"),
    );
    const u = userEvent.setup();
    renderWithQueryClient(<CoffeeForm mode="create" onDone={vi.fn()} />);

    await u.type(screen.getByLabelText(/^nombre \*$/i), "X");
    await u.selectOptions(screen.getByLabelText(/^proceso \*$/i), "washed");
    await u.selectOptions(screen.getByLabelText(/^tostado \*$/i), "light");
    await u.type(screen.getByLabelText(/^precio \(pesos cop\) \*$/i), "1000");
    await u.click(screen.getByRole("button", { name: /crear café/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /name, process, roast_level/i,
    );
  });
});

describe("CoffeeForm (editar)", () => {
  beforeEach(() => setAdminKey("k1"));
  afterEach(() => {
    vi.clearAllMocks();
    clearAdminKey();
  });

  it("prellena los campos y muestra productor/finca de solo lectura", () => {
    renderWithQueryClient(<CoffeeForm mode="edit" coffee={coffee} onDone={vi.fn()} />);

    expect(screen.getByLabelText(/^nombre \*$/i)).toHaveValue("El Paraíso 92");
    // input type=number: toHaveValue compara como número
    expect(screen.getByLabelText(/^precio \(pesos cop\) \*$/i)).toHaveValue(85000);
    expect(screen.getByLabelText(/notas de cata/i)).toHaveValue("Caramelo, Naranja");
    // Productor/finca no son inputs editables en modo edición.
    expect(screen.queryByLabelText(/^productor/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Pedro Pardo/)).toBeInTheDocument();
    expect(screen.getByText(/El Paraíso · Urabá/)).toBeInTheDocument();
  });

  it("guarda los cambios llamando al endpoint de edición", async () => {
    vi.mocked(adminUpdateCoffee).mockResolvedValue({ ...coffee, name: "Renombrado" });
    const onDone = vi.fn();
    const u = userEvent.setup();
    renderWithQueryClient(<CoffeeForm mode="edit" coffee={coffee} onDone={onDone} />);

    const name = screen.getByLabelText(/^nombre \*$/i);
    await u.clear(name);
    await u.type(name, "Renombrado");

    await u.click(screen.getByRole("button", { name: /guardar cambios/i }));

    expect(adminUpdateCoffee).toHaveBeenCalledWith(
      "k1",
      "c1",
      expect.objectContaining({ name: "Renombrado", price_cents: 8500000 }),
    );
    await vi.waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
  });
});

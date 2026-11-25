import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { adminListOrders, listCoffees } from "@/lib/api/endpoints";
import { clearAdminKey, setAdminKey } from "@/lib/auth/admin-session";
import type { Coffee, Order } from "@/lib/types";
import { renderWithQueryClient } from "@/test/utils";
import AdminPage from "./page";

vi.mock("@/lib/api/endpoints", () => ({
  listCoffees: vi.fn(),
  adminCreateCoffee: vi.fn(),
  adminUpdateCoffee: vi.fn(),
  adminDeleteCoffee: vi.fn(),
  adminGetStock: vi.fn(),
  adminAdjustStock: vi.fn(),
  adminListOrders: vi.fn(),
  adminUpdateOrderStatus: vi.fn(),
}));

const coffee: Coffee = {
  id: "c1",
  name: "El Paraíso 92",
  process: "washed",
  roast_level: "medium",
  tasting_notes: [],
  description: "",
  producer: { id: "p1", name: "Pedro" },
  farm: { id: "f1", name: "El Paraíso", country: "CO", region: "Urabá" },
  bag_size_grams: 250,
  price_cents: 8500000,
  currency: "COP",
  available: true,
  stock_bags: 12,
};

const order: Order = {
  id: "o1",
  user_id: "u1",
  items: [],
  shipping_street: "Cra 1 #2-3",
  shipping_city: "Medellín",
  shipping_department: "Antioquia",
  shipping_country: "CO",
  total_cents: 8500000,
  currency: "COP",
  status: "confirmed",
  payment_status: "paid",
  created_at: "2026-11-19T12:00:00Z",
  updated_at: "2026-11-19T12:00:00Z",
};

describe("AdminPage", () => {
  afterEach(() => {
    vi.clearAllMocks();
    clearAdminKey();
  });

  it("muestra el form de login sin clave en memoria", () => {
    vi.mocked(listCoffees).mockResolvedValue([coffee]);
    renderWithQueryClient(<AdminPage />);

    expect(screen.getByRole("heading", { name: "Panel admin" })).toBeInTheDocument();
    expect(screen.getByLabelText(/api key/i)).toBeInTheDocument();
    // El panel no debe renderizarse sin clave.
    expect(screen.queryByRole("tab", { name: "Cafés" })).not.toBeInTheDocument();
  });

  it("muestra las pestañas y la lista de cafés con clave", async () => {
    setAdminKey("k1");
    vi.mocked(listCoffees).mockResolvedValue([coffee]);
    renderWithQueryClient(<AdminPage />);

    expect(screen.getByRole("tab", { name: "Cafés" })).toBeInTheDocument();
    expect(await screen.findByText("El Paraíso 92")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /nuevo café/i })).toBeInTheDocument();
  });

  it("cambia a la pestaña de órdenes y carga las órdenes", async () => {
    setAdminKey("k1");
    vi.mocked(listCoffees).mockResolvedValue([coffee]);
    vi.mocked(adminListOrders).mockResolvedValue([order]);
    const u = userEvent.setup();
    renderWithQueryClient(<AdminPage />);

    await screen.findByText("El Paraíso 92");
    await u.click(screen.getByRole("tab", { name: "Órdenes" }));

    expect(await screen.findByText("Medellín, Antioquia")).toBeInTheDocument();
  });
});

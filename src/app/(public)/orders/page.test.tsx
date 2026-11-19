import { screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { listOrders } from "@/lib/api/endpoints";
import { clearSession, setTokens } from "@/lib/auth/session";
import type { Order } from "@/lib/types";
import { renderWithQueryClient } from "@/test/utils";
import OrdersPage from "./page";

vi.mock("@/lib/api/endpoints", () => ({
  listOrders: vi.fn(),
}));

const order: Order = {
  id: "o1",
  user_id: "u1",
  items: [
    {
      id: "oi1",
      coffee_id: "c1",
      coffee_name: "El Paraíso 92",
      quantity: 1,
      unit_price_cents: 8500000,
      subtotal_cents: 8500000,
    },
  ],
  shipping_street: "Cra 1 #2-3",
  shipping_city: "Medellín",
  shipping_department: "Antioquia",
  shipping_country: "CO",
  total_cents: 8500000,
  currency: "COP",
  status: "confirmed",
  created_at: "2026-11-19T12:00:00Z",
  updated_at: "2026-11-19T12:00:00Z",
};

describe("OrdersPage", () => {
  afterEach(() => {
    vi.clearAllMocks();
    clearSession();
  });

  it("invita a ingresar si no hay sesión", async () => {
    renderWithQueryClient(<OrdersPage />);
    expect(await screen.findByText(/inicia sesión para continuar/i)).toBeInTheDocument();
  });

  it("lista los pedidos con estado, fecha y total", async () => {
    setTokens("a1", "r1");
    vi.mocked(listOrders).mockResolvedValue([order]);
    renderWithQueryClient(<OrdersPage />);

    expect(await screen.findByText("Pedido o1")).toBeInTheDocument();
    expect(screen.getByText("Confirmado")).toBeInTheDocument();
    // La fecha y la cantidad comparten el <p>: asertar con regex.
    expect(screen.getByText(/1 ítem/)).toBeInTheDocument();
    // Intl es-CO usa U+00A0 entre $ y el número: normalizar antes de asertar.
    const total = screen.getByText(/85\.000/);
    expect(total.textContent?.replace(/\u00a0/g, " ")).toBe("$ 85.000");
    expect(screen.getByRole("link", { name: /ver detalle/i })).toHaveAttribute(
      "href",
      "/orders/o1",
    );
  });

  it("muestra el estado vacío sin pedidos", async () => {
    setTokens("a1", "r1");
    vi.mocked(listOrders).mockResolvedValue([]);
    renderWithQueryClient(<OrdersPage />);

    expect(await screen.findByText("Aún no tienes pedidos.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /ver catálogo/i })).toHaveAttribute(
      "href",
      "/coffees",
    );
  });
});

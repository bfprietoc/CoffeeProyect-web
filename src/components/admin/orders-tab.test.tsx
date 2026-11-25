import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { adminListOrders, adminUpdateOrderStatus } from "@/lib/api/endpoints";
import { clearAdminKey, setAdminKey } from "@/lib/auth/admin-session";
import type { Order } from "@/lib/types";
import { renderWithQueryClient } from "@/test/utils";
import { OrdersTab } from "./orders-tab";

vi.mock("@/lib/api/endpoints", () => ({
  adminListOrders: vi.fn(),
  adminUpdateOrderStatus: vi.fn(),
}));

const order: Order = {
  id: "o1234567-aaaa-bbbb-cccc-ddddeeee0001",
  user_id: "u1",
  items: [
    {
      id: "oi1",
      coffee_id: "c1",
      coffee_name: "El Paraíso 92",
      quantity: 2,
      unit_price_cents: 8500000,
      subtotal_cents: 17000000,
    },
  ],
  shipping_street: "Cra 1 #2-3",
  shipping_city: "Medellín",
  shipping_department: "Antioquia",
  shipping_country: "CO",
  total_cents: 17000000,
  currency: "COP",
  status: "confirmed",
  payment_status: "paid",
  created_at: "2026-11-19T12:00:00Z",
  updated_at: "2026-11-19T12:00:00Z",
};

describe("OrdersTab", () => {
  beforeEach(() => setAdminKey("k1"));
  afterEach(() => {
    vi.clearAllMocks();
    clearAdminKey();
  });

  it("lista órdenes con estado, total y destino", async () => {
    vi.mocked(adminListOrders).mockResolvedValue([order]);
    renderWithQueryClient(<OrdersTab />);

    expect(await screen.findByText("#o1234567")).toBeInTheDocument();
    expect(screen.getByText("Medellín, Antioquia")).toBeInTheDocument();
    // "Confirmado" también está en el <option> del filtro: solo el badge.
    expect(screen.getByText("Confirmado", { selector: "span" })).toBeInTheDocument();
    // Total formateado: 17.000.000 centavos = $ 170.000 COP (2 × $85.000).
    expect(screen.getByText((t) => t.includes("170.000"))).toBeInTheDocument();
  });

  it("muestra el estado vacío", async () => {
    vi.mocked(adminListOrders).mockResolvedValue([]);
    renderWithQueryClient(<OrdersTab />);

    expect(await screen.findByText(/aún no hay órdenes/i)).toBeInTheDocument();
  });

  it("filtra por estado llamando al endpoint con el parámetro", async () => {
    vi.mocked(adminListOrders).mockResolvedValue([]);
    const u = userEvent.setup();
    renderWithQueryClient(<OrdersTab />);

    await screen.findByText(/aún no hay órdenes/i);
    await u.selectOptions(screen.getByLabelText(/filtrar por estado/i), "shipped");

    await waitFor(() =>
      expect(adminListOrders).toHaveBeenLastCalledWith(
        "k1",
        { limit: 50, status: "shipped" },
      ),
    );
  });

  it("expande el detalle con ítems y dirección completa", async () => {
    vi.mocked(adminListOrders).mockResolvedValue([order]);
    const u = userEvent.setup();
    renderWithQueryClient(<OrdersTab />);

    await u.click(await screen.findByRole("button", { name: /gestionar/i }));

    expect(await screen.findByText("2 × El Paraíso 92")).toBeInTheDocument();
    expect(screen.getByText(/Cra 1 #2-3, Medellín, Antioquia, CO/)).toBeInTheDocument();
  });

  it("cambia el estado con tracking number y muestra feedback", async () => {
    vi.mocked(adminListOrders).mockResolvedValue([order]);
    vi.mocked(adminUpdateOrderStatus).mockResolvedValue({
      ...order,
      status: "shipped",
      tracking_number: "SEI-987654",
    });
    const u = userEvent.setup();
    renderWithQueryClient(<OrdersTab />);

    await u.click(await screen.findByRole("button", { name: /gestionar/i }));
    const statusSelect = await screen.findByLabelText(/^nuevo estado$/i);
    // Sin cambio de estado el botón queda deshabilitado.
    expect(screen.getByRole("button", { name: /guardar estado/i })).toBeDisabled();

    await u.selectOptions(statusSelect, "shipped");
    await u.type(
      screen.getByLabelText(/tracking number/i),
      "SEI-987654",
    );
    await u.click(screen.getByRole("button", { name: /guardar estado/i }));

    expect(adminUpdateOrderStatus).toHaveBeenCalledWith(
      "k1",
      order.id,
      { status: "shipped", tracking_number: "SEI-987654" },
    );
    expect(await screen.findByText(/estado actualizado a «enviado»/i)).toBeInTheDocument();
  });

  it("muestra el error del backend al fallar el cambio de estado", async () => {
    vi.mocked(adminListOrders).mockResolvedValue([order]);
    vi.mocked(adminUpdateOrderStatus).mockRejectedValue(
      new Error("order not found"),
    );
    const u = userEvent.setup();
    renderWithQueryClient(<OrdersTab />);

    await u.click(await screen.findByRole("button", { name: /gestionar/i }));
    await u.selectOptions(
      await screen.findByLabelText(/^nuevo estado$/i),
      "delivered",
    );
    await u.click(screen.getByRole("button", { name: /guardar estado/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/no se pudo actualizar/i);
  });
});

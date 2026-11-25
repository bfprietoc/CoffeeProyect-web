import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/client";
import { cancelOrder, getOrder } from "@/lib/api/endpoints";
import { clearSession, setTokens } from "@/lib/auth/session";
import type { Order } from "@/lib/types";
import { renderWithQueryClient, resolvedParams } from "@/test/utils";
import OrderDetailPage from "./page";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/lib/api/endpoints", () => ({
  getOrder: vi.fn(),
  cancelOrder: vi.fn(),
}));

const order: Order = {
  id: "o1",
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

function renderDetail(id = "o1") {
  return renderWithQueryClient(<OrderDetailPage params={resolvedParams({ id })} />);
}

describe("OrderDetailPage", () => {
  afterEach(() => {
    vi.clearAllMocks();
    clearSession();
  });

  it("muestra ítems, total, dirección y estado", async () => {
    setTokens("a1", "r1");
    vi.mocked(getOrder).mockResolvedValue(order);
    renderDetail();

    expect(await screen.findByText("Pedido o1")).toBeInTheDocument();
    expect(screen.getByText("El Paraíso 92")).toBeInTheDocument();
    expect(screen.getByText(/2 ×/)).toBeInTheDocument();
    expect(screen.getByText("Confirmado")).toBeInTheDocument();
    expect(
      screen.getByText(/cra 1 #2-3, medellín, antioquia/i),
    ).toBeInTheDocument();
    // Subtotal del ítem y total coinciden (1 solo ítem): ambos deben verse.
    const totals = screen.getAllByText(/170\.000/);
    expect(totals).toHaveLength(2);
    for (const el of totals) {
      expect(el.textContent?.replace(/\u00a0/g, " ")).toBe("$ 170.000");
    }
  });

  it("muestra la guía de envío si existe", async () => {
    setTokens("a1", "r1");
    vi.mocked(getOrder).mockResolvedValue({ ...order, tracking_number: "GUIA123" });
    renderDetail();

    expect(await screen.findByText(/guía: guia123/i)).toBeInTheDocument();
  });

  it("muestra 'no encontrado' ante el 404", async () => {
    setTokens("a1", "r1");
    vi.mocked(getOrder).mockRejectedValue(
      new ApiError(404, "order not found", "NOT_FOUND"),
    );
    renderDetail("inexistente");

    expect(await screen.findByText("Pedido no encontrado.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /ver mis pedidos/i })).toHaveAttribute(
      "href",
      "/orders",
    );
  });

  it("cancela el pedido y actualiza el estado a Cancelado", async () => {
    setTokens("a1", "r1");
    vi.mocked(getOrder)
      .mockResolvedValueOnce(order)
      .mockResolvedValue({ ...order, status: "cancelled" });
    vi.mocked(cancelOrder).mockResolvedValue({ ...order, status: "cancelled" });
    const user = userEvent.setup();
    renderDetail();

    await user.click(await screen.findByRole("button", { name: /cancelar pedido/i }));
    await user.click(await screen.findByRole("button", { name: /sí, cancelar/i }));

    expect(cancelOrder).toHaveBeenCalledWith("o1", expect.anything());
    // La invalidación refetchea el detalle: el badge cambia y el botón
    // de cancelar desaparece (cancelled no es cancelable).
    expect(await screen.findByText("Cancelado")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /cancelar pedido/i })).not.toBeInTheDocument();
  });
});

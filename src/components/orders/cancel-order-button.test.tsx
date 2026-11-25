import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/client";
import { cancelOrder } from "@/lib/api/endpoints";
import type { Order } from "@/lib/types";
import { renderWithQueryClient } from "@/test/utils";
import { CancelOrderButton } from "./cancel-order-button";

vi.mock("@/lib/api/endpoints", () => ({
  cancelOrder: vi.fn(),
}));

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

describe("CancelOrderButton", () => {
  afterEach(() => vi.clearAllMocks());

  it.each(["shipped", "delivered", "cancelled"] as const)(
    "no se muestra en estado %s",
    (status) => {
      renderWithQueryClient(
        <CancelOrderButton orderId={order.id} status={status} />,
      );
      expect(screen.queryByRole("button", { name: /cancelar pedido/i })).not.toBeInTheDocument();
    },
  );

  it("cancela en dos pasos y llama al endpoint", async () => {
    vi.mocked(cancelOrder).mockResolvedValue({ ...order, status: "cancelled" });
    const user = userEvent.setup();
    renderWithQueryClient(<CancelOrderButton orderId={order.id} status="confirmed" />);

    await user.click(screen.getByRole("button", { name: /cancelar pedido/i }));
    expect(await screen.findByText(/¿cancelar este pedido\?/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /sí, cancelar/i }));
    expect(cancelOrder).toHaveBeenCalledWith(order.id, expect.anything());
  });

  it("permite volver sin cancelar", async () => {
    const user = userEvent.setup();
    renderWithQueryClient(<CancelOrderButton orderId={order.id} status="processing" />);

    await user.click(screen.getByRole("button", { name: /cancelar pedido/i }));
    await user.click(screen.getByRole("button", { name: /volver/i }));

    expect(screen.getByRole("button", { name: /cancelar pedido/i })).toBeInTheDocument();
    expect(cancelOrder).not.toHaveBeenCalled();
  });

  it("muestra mensaje específico ante el 422 del backend", async () => {
    vi.mocked(cancelOrder).mockRejectedValue(
      new ApiError(422, "order cannot be cancelled", "UNAVAILABLE"),
    );
    const user = userEvent.setup();
    renderWithQueryClient(<CancelOrderButton orderId={order.id} status="confirmed" />);

    await user.click(screen.getByRole("button", { name: /cancelar pedido/i }));
    await user.click(await screen.findByRole("button", { name: /sí, cancelar/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /ya no se puede cancelar/i,
    );
  });
});

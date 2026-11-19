import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/client";
import { addCartItem } from "@/lib/api/endpoints";
import type { Cart } from "@/lib/types";
import { renderWithQueryClient } from "@/test/utils";
import { AddToCart } from "./add-to-cart";

vi.mock("@/lib/api/endpoints", () => ({
  addCartItem: vi.fn(),
}));

const emptyCart: Cart = { id: "g1", items: [], total_cents: 0, currency: "COP" };

describe("AddToCart", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("agrega con la cantidad elegida y muestra confirmación", async () => {
    vi.mocked(addCartItem).mockResolvedValue(emptyCart);
    const user = userEvent.setup();
    renderWithQueryClient(
      <AddToCart coffeeId="c1" coffeeName="Gesho Test" />,
    );

    await user.click(screen.getByRole("button", { name: /aumentar cantidad/i }));
    await user.click(
      screen.getByRole("button", { name: /agregar al carrito/i }),
    );

    // useMutation invoca mutationFn(variables, options): se aserta el 1er arg.
    expect(addCartItem).toHaveBeenCalledWith(
      { coffee_id: "c1", quantity: 2 },
      expect.anything(),
    );
    expect(await screen.findByText("Agregado ✓")).toBeInTheDocument();
  });

  it("muestra mensaje amigable si el café dejó de estar disponible", async () => {
    vi.mocked(addCartItem).mockRejectedValue(
      new ApiError(422, "coffee is not available", "UNAVAILABLE"),
    );
    const user = userEvent.setup();
    renderWithQueryClient(<AddToCart coffeeId="c1" coffeeName="Gesho Test" />);

    await user.click(screen.getByRole("button", { name: /agregar al carrito/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Este café ya no está disponible.",
    );
  });

  it("muestra el mensaje del error genérico", async () => {
    vi.mocked(addCartItem).mockRejectedValue(new ApiError(0, "Sin conexión"));
    const user = userEvent.setup();
    renderWithQueryClient(<AddToCart coffeeId="c1" coffeeName="Gesho Test" />);

    await user.click(screen.getByRole("button", { name: /agregar al carrito/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Sin conexión");
  });
});

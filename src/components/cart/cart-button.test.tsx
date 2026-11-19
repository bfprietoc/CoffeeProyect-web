import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { getCart } from "@/lib/api/endpoints";
import type { Cart } from "@/lib/types";
import { renderWithQueryClient } from "@/test/utils";
import { CartButton } from "./cart-button";

vi.mock("@/lib/api/endpoints", () => ({
  getCart: vi.fn(),
}));

const cart: Cart = {
  id: "g1",
  items: [
    {
      coffee_id: "c1",
      coffee_name: "Gesho Test",
      quantity: 2,
      unit_price_cents: 92000,
      bag_size_grams: 250,
      subtotal_cents: 184000,
    },
    {
      coffee_id: "c2",
      coffee_name: "Huila Test",
      quantity: 1,
      unit_price_cents: 80000,
      bag_size_grams: 250,
      subtotal_cents: 80000,
    },
  ],
  total_cents: 264000,
  currency: "COP",
};

describe("CartButton", () => {
  it("muestra el total de unidades del carrito", async () => {
    vi.mocked(getCart).mockResolvedValue(cart);
    renderWithQueryClient(<CartButton />);

    const link = await screen.findByRole("link", { name: /carrito, 3 artículos/i });
    expect(link).toHaveAttribute("href", "/cart");
    expect(link).toHaveTextContent("3");
  });

  it("no muestra contador con carrito vacío", async () => {
    vi.mocked(getCart).mockResolvedValue({ ...cart, items: [], total_cents: 0 });
    renderWithQueryClient(<CartButton />);

    const link = await screen.findByRole("link", { name: /carrito, 0 artículos/i });
    expect(link).not.toHaveTextContent("0");
  });
});

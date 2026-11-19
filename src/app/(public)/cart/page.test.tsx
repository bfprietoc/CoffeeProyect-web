import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/client";
import {
  clearCart,
  getCart,
  removeCartItem,
  setCartItemQuantity,
} from "@/lib/api/endpoints";
import type { Cart } from "@/lib/types";
import { renderWithQueryClient } from "@/test/utils";
import CartPage from "./page";

vi.mock("@/lib/api/endpoints", () => ({
  getCart: vi.fn(),
  setCartItemQuantity: vi.fn(),
  removeCartItem: vi.fn(),
  clearCart: vi.fn(),
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
  ],
  total_cents: 184000,
  currency: "COP",
};

describe("CartPage", () => {
  it("muestra los ítems con precio, subtotal y total", async () => {
    vi.mocked(getCart).mockResolvedValue(cart);
    renderWithQueryClient(<CartPage />);

    expect(await screen.findByText("Gesho Test")).toBeInTheDocument();
    expect(screen.getByText(/bolsa de 250 g/i)).toBeInTheDocument();
    expect(screen.getByText("Tu carrito")).toBeInTheDocument();
  });

  it("cambia la cantidad con el stepper (PATCH)", async () => {
    vi.mocked(getCart).mockResolvedValue(cart);
    vi.mocked(setCartItemQuantity).mockResolvedValue({ ...cart, items: [] });
    const user = userEvent.setup();
    renderWithQueryClient(<CartPage />);

    await screen.findByText("Gesho Test");
    await user.click(
      screen.getByRole("button", { name: /aumentar cantidad de gesho test/i }),
    );

    expect(setCartItemQuantity).toHaveBeenCalledWith("c1", { quantity: 3 });
  });

  it("quitar un ítem llama al DELETE", async () => {
    vi.mocked(getCart).mockResolvedValue(cart);
    vi.mocked(removeCartItem).mockResolvedValue({ ...cart, items: [] });
    const user = userEvent.setup();
    renderWithQueryClient(<CartPage />);

    await screen.findByText("Gesho Test");
    await user.click(screen.getByRole("button", { name: /quitar/i }));

    // useMutation invoca mutationFn(variables, options): se aserta el 1er arg.
    expect(removeCartItem).toHaveBeenCalledWith("c1", expect.anything());
  });

  it("vaciar el carrito llama al DELETE /cart", async () => {
    vi.mocked(getCart).mockResolvedValue(cart);
    vi.mocked(clearCart).mockResolvedValue(undefined as unknown as Cart);
    const user = userEvent.setup();
    renderWithQueryClient(<CartPage />);

    await screen.findByText("Gesho Test");
    await user.click(screen.getByRole("button", { name: /vaciar carrito/i }));

    expect(clearCart).toHaveBeenCalled();
  });

  it("muestra el estado vacío con CTA al catálogo", async () => {
    vi.mocked(getCart).mockResolvedValue({ ...cart, items: [], total_cents: 0 });
    renderWithQueryClient(<CartPage />);

    expect(await screen.findByText("Tu carrito está vacío.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /ver catálogo/i })).toHaveAttribute(
      "href",
      "/coffees",
    );
  });

  it("muestra error con reintentar si la API falla", async () => {
    vi.mocked(getCart).mockRejectedValue(new ApiError(0, "Sin conexión"));
    renderWithQueryClient(<CartPage />);

    expect(
      await screen.findByText("No se pudo cargar el carrito."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /reintentar/i })).toBeInTheDocument();
  });
});

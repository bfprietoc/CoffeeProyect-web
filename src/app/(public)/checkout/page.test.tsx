import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/client";
import { getCart, listAddresses, placeOrder, validateCheckout } from "@/lib/api/endpoints";
import { clearSession, setTokens } from "@/lib/auth/session";
import type { Address, Cart, Order, ValidationResult } from "@/lib/types";
import { renderWithQueryClient } from "@/test/utils";
import CheckoutPage from "./page";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

vi.mock("@/lib/api/endpoints", () => ({
  getCart: vi.fn(),
  listAddresses: vi.fn(),
  validateCheckout: vi.fn(),
  placeOrder: vi.fn(),
}));

const cart: Cart = {
  id: "u1",
  items: [
    {
      coffee_id: "c1",
      coffee_name: "El Paraíso 92",
      quantity: 1,
      unit_price_cents: 8500000,
      bag_size_grams: 250,
      subtotal_cents: 8500000,
    },
  ],
  total_cents: 8500000,
  currency: "COP",
};

const emptyCart: Cart = { ...cart, items: [], total_cents: 0 };

const addresses: Address[] = [
  {
    id: "a1",
    user_id: "u1",
    label: "Casa",
    street: "Cra 1 #2-3",
    city: "Medellín",
    department: "Antioquia",
    country: "CO",
    is_default: true,
  },
];

const validation: ValidationResult = {
  items: [
    { coffee_id: "c1", coffee_name: "El Paraíso 92", quantity: 1, stock_bags: 12, available: true },
  ],
  total_cents: 8500000,
  currency: "COP",
  can_checkout: true,
};

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
  payment_status: "paid",
  created_at: "2026-11-19T12:00:00Z",
  updated_at: "2026-11-19T12:00:00Z",
};

describe("CheckoutPage", () => {
  afterEach(() => {
    vi.clearAllMocks();
    clearSession();
  });

  it("invita a ingresar si no hay sesión", async () => {
    vi.mocked(getCart).mockResolvedValue(emptyCart);
    renderWithQueryClient(<CheckoutPage />);

    expect(await screen.findByText(/inicia sesión para continuar/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /ingresar/i })).toHaveAttribute(
      "href",
      "/login?next=%2Fcheckout",
    );
  });

  it("muestra el estado vacío si el carrito no tiene ítems", async () => {
    setTokens("a1", "r1");
    vi.mocked(getCart).mockResolvedValue(emptyCart);
    renderWithQueryClient(<CheckoutPage />);

    expect(await screen.findByText("Tu carrito está vacío.")).toBeInTheDocument();
  });

  it("muestra dirección, validación y confirma el pedido", async () => {
    setTokens("a1", "r1");
    vi.mocked(getCart).mockResolvedValue(cart);
    vi.mocked(listAddresses).mockResolvedValue(addresses);
    vi.mocked(validateCheckout).mockResolvedValue(validation);
    vi.mocked(placeOrder).mockResolvedValue(order);
    const user = userEvent.setup();
    renderWithQueryClient(<CheckoutPage />);

    // Dirección guardada aparece seleccionada (es la predeterminada).
    const radio = await screen.findByRole("radio", { name: /casa/i });
    expect(radio).toBeChecked();

    // Validación: stock por ítem y total.
    expect(await screen.findByText("El Paraíso 92")).toBeInTheDocument();
    expect(screen.getByText(/stock disponible: 12/i)).toBeInTheDocument();
    expect(screen.getByText(/disponible ✓/i)).toBeInTheDocument();

    const confirm = screen.getByRole("button", { name: /confirmar pedido/i });
    expect(confirm).toBeEnabled();

    await user.click(confirm);
    // usePlaceOrder envuelve: mutationFn = (body) => placeOrder(body).
    expect(placeOrder).toHaveBeenCalledWith({ address_id: "a1" });
    await vi.waitFor(() => expect(push).toHaveBeenCalledWith("/orders/o1"));
  });

  it("deshabilita la confirmación cuando un ítem no tiene stock", async () => {
    setTokens("a1", "r1");
    vi.mocked(getCart).mockResolvedValue(cart);
    vi.mocked(listAddresses).mockResolvedValue(addresses);
    vi.mocked(validateCheckout).mockResolvedValue({
      ...validation,
      items: [{ ...validation.items[0], stock_bags: 0, available: false }],
      can_checkout: false,
    });
    renderWithQueryClient(<CheckoutPage />);

    await screen.findByText(/sin stock suficiente/i);
    expect(screen.getByRole("button", { name: /confirmar pedido/i })).toBeDisabled();
  });

  it("muestra el error de stock insuficiente (422) al confirmar", async () => {
    setTokens("a1", "r1");
    vi.mocked(getCart).mockResolvedValue(cart);
    vi.mocked(listAddresses).mockResolvedValue(addresses);
    vi.mocked(validateCheckout).mockResolvedValue(validation);
    vi.mocked(placeOrder).mockRejectedValue(
      new ApiError(422, "one or more items are out of stock", "UNAVAILABLE"),
    );
    const user = userEvent.setup();
    renderWithQueryClient(<CheckoutPage />);

    await screen.findByRole("radio", { name: /casa/i });
    await user.click(screen.getByRole("button", { name: /confirmar pedido/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /no tienen stock suficiente/i,
    );
  });
});

import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/client";
import type { Order } from "@/lib/types";
import { renderWithQueryClient } from "@/test/utils";
import { PaymentSection } from "./payment-section";

vi.mock("@/lib/api/endpoints", () => ({
  createPayment: vi.fn(),
}));

import { createPayment } from "@/lib/api/endpoints";
const mockedCreatePayment = vi.mocked(createPayment);

const paidOrder: Order = {
  id: "o1",
  user_id: "u1",
  items: [],
  shipping_street: "Cra 1",
  shipping_city: "Medellín",
  shipping_department: "Antioquia",
  shipping_country: "CO",
  total_cents: 8500000,
  currency: "COP",
  status: "confirmed",
  payment_status: "pending",
  created_at: "2026-11-19T12:00:00Z",
  updated_at: "2026-11-19T12:00:00Z",
};

describe("PaymentSection", () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  it("no renderiza nada con la feature desactivada (sin la env var)", () => {
    vi.stubEnv("NEXT_PUBLIC_PAYMENTS_ENABLED", "");
    const { container } = renderWithQueryClient(<PaymentSection order={paidOrder} />);
    expect(container.textContent).toBe("");
  });

  it("muestra badge y botón de pago para pedido pendiente", () => {
    vi.stubEnv("NEXT_PUBLIC_PAYMENTS_ENABLED", "true");
    renderWithQueryClient(<PaymentSection order={paidOrder} />);
    expect(screen.getByText("Pendiente")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Pagar con tarjeta o PSE" }),
    ).toBeInTheDocument();
  });

  it("solo muestra badge + fecha de pago para pedido pagado (sin botón)", () => {
    vi.stubEnv("NEXT_PUBLIC_PAYMENTS_ENABLED", "true");
    const paid: Order = {
      ...paidOrder,
      payment_status: "paid",
      paid_at: "2026-11-19T12:00:00Z",
    };
    renderWithQueryClient(<PaymentSection order={paid} />);
    expect(screen.getByText("Pagado")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Pagar con tarjeta o PSE" })).not.toBeInTheDocument();
    expect(screen.getByText(/Pagado el/)).toBeInTheDocument();
  });

  it("muestra «repetir intento» para pedido fallido", () => {
    vi.stubEnv("NEXT_PUBLIC_PAYMENTS_ENABLED", "true");
    const failed: Order = { ...paidOrder, payment_status: "failed" };
    renderWithQueryClient(<PaymentSection order={failed} />);
    expect(screen.getByText("Fallido")).toBeInTheDocument();
    expect(
      screen.getByText("El pago anterior falló — puedes intentarlo de nuevo."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Pagar con tarjeta o PSE" })).toBeInTheDocument();
  });

  it("tras click, crea el pago y muestra el formulario Wompi", async () => {
    vi.stubEnv("NEXT_PUBLIC_PAYMENTS_ENABLED", "true");
    mockedCreatePayment.mockResolvedValue({
      publicKey: "pub_test_xxx",
      reference: "o1-1705330245",
      amountInCents: 8500000,
      currency: "COP",
      signature: "deadbeef",
      redirectUrl: "http://localhost:3001/orders/o1?payment=1",
      customerEmail: "user@example.com",
    });

    const user = userEvent.setup();
    renderWithQueryClient(<PaymentSection order={paidOrder} />);
    await user.click(screen.getByRole("button", { name: "Pagar con tarjeta o PSE" }));

    expect(await screen.findByTestId("wompi-checkout-form")).toBeInTheDocument();
    // el formulario oculto lleva la firma y la referencia del backend
    expect(screen.getByTestId("wompi-checkout-submit")).toBeInTheDocument();
  });

  it("muestra mensaje claro cuando los pagos están deshabilitados (503)", async () => {
    vi.stubEnv("NEXT_PUBLIC_PAYMENTS_ENABLED", "true");
    mockedCreatePayment.mockRejectedValue(
      new ApiError(503, "payments are not available", "PAYMENTS_DISABLED"),
    );

    const user = userEvent.setup();
    renderWithQueryClient(<PaymentSection order={paidOrder} />);
    await user.click(screen.getByRole("button", { name: "Pagar con tarjeta o PSE" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Los pagos no están disponibles en este momento.",
    );
  });
});

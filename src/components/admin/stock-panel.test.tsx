import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/client";
import { adminAdjustStock, adminGetStock } from "@/lib/api/endpoints";
import { clearAdminKey, setAdminKey } from "@/lib/auth/admin-session";
import type { StockInfo } from "@/lib/types";
import { renderWithQueryClient } from "@/test/utils";
import { StockPanel } from "./stock-panel";

vi.mock("@/lib/api/endpoints", () => ({
  adminGetStock: vi.fn(),
  adminAdjustStock: vi.fn(),
}));

const stockInfo: StockInfo = {
  coffee_id: "c1",
  stock_bags: 12,
  movements: [
    {
      id: "m1",
      coffee_id: "c1",
      delta: -2,
      result_stock: 12,
      note: "Pedido o1",
      created_at: "2026-11-19T12:30:00Z",
    },
    {
      id: "m2",
      coffee_id: "c1",
      delta: 5,
      result_stock: 14,
      note: "Recepción de lote",
      created_at: "2026-11-18T09:00:00Z",
    },
  ],
};

describe("StockPanel", () => {
  beforeEach(() => setAdminKey("k1"));
  afterEach(() => {
    vi.clearAllMocks();
    clearAdminKey();
  });

  it("muestra el stock actual y los movimientos con signo", async () => {
    vi.mocked(adminGetStock).mockResolvedValue(stockInfo);
    renderWithQueryClient(
      <StockPanel coffeeId="c1" coffeeName="El Paraíso 92" onBack={vi.fn()} />,
    );

    // String exacto: el counter de stock ("12 bolsas" en un <p>) y no el
    // movimiento "→ 12".
    expect(await screen.findByText("12")).toBeInTheDocument();
    expect(screen.getByText("Recepción de lote")).toBeInTheDocument();
    expect(screen.getByText("+5")).toBeInTheDocument();
    expect(screen.getByText("-2")).toBeInTheDocument();
  });

  it("muestra el estado vacío de movimientos", async () => {
    vi.mocked(adminGetStock).mockResolvedValue({ ...stockInfo, movements: [] });
    renderWithQueryClient(
      <StockPanel coffeeId="c1" coffeeName="El Paraíso 92" onBack={vi.fn()} />,
    );

    expect(
      await screen.findByText(/sin movimientos todavía/i),
    ).toBeInTheDocument();
  });

  it("aplica un ajuste de suma con feedback old → new", async () => {
    vi.mocked(adminGetStock).mockResolvedValue(stockInfo);
    vi.mocked(adminAdjustStock).mockResolvedValue({
      coffee_id: "c1",
      old_stock: 12,
      result_stock: 17,
    });
    const u = userEvent.setup();
    renderWithQueryClient(
      <StockPanel coffeeId="c1" coffeeName="El Paraíso 92" onBack={vi.fn()} />,
    );

    await screen.findByText("Recepción de lote");
    await u.type(screen.getByLabelText(/cantidad \(bolsas\)/i), "5");
    await u.type(screen.getByLabelText(/nota/i), "lote nuevo");
    await u.click(screen.getByRole("button", { name: /aplicar ajuste/i }));

    expect(adminAdjustStock).toHaveBeenCalledWith(
      "k1",
      "c1",
      { operation: "add", quantity: 5, note: "lote nuevo" },
    );
    expect(await screen.findByText(/12 → 17 bolsas/i)).toBeInTheDocument();
  });

  it("deshabilita el ajuste con cantidad inválida", async () => {
    vi.mocked(adminGetStock).mockResolvedValue(stockInfo);
    renderWithQueryClient(
      <StockPanel coffeeId="c1" coffeeName="El Paraíso 92" onBack={vi.fn()} />,
    );

    await screen.findByText("Recepción de lote");
    expect(screen.getByRole("button", { name: /aplicar ajuste/i })).toBeDisabled();
  });

  it("muestra el error 422 cuando no hay stock suficiente para restar", async () => {
    vi.mocked(adminGetStock).mockResolvedValue(stockInfo);
    vi.mocked(adminAdjustStock).mockRejectedValue(
      new ApiError(422, "not enough stock to subtract", "UNAVAILABLE"),
    );
    const u = userEvent.setup();
    renderWithQueryClient(
      <StockPanel coffeeId="c1" coffeeName="El Paraíso 92" onBack={vi.fn()} />,
    );

    await screen.findByText("Recepción de lote");
    await u.selectOptions(screen.getByLabelText(/operación/i), "subtract");
    await u.type(screen.getByLabelText(/cantidad \(bolsas\)/i), "99");
    await u.click(screen.getByRole("button", { name: /aplicar ajuste/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /not enough stock/i,
    );
  });

  it("el botón volver llama a onBack", async () => {
    vi.mocked(adminGetStock).mockResolvedValue(stockInfo);
    const onBack = vi.fn();
    const u = userEvent.setup();
    renderWithQueryClient(
      <StockPanel coffeeId="c1" coffeeName="El Paraíso 92" onBack={onBack} />,
    );

    await screen.findByText("Recepción de lote");
    await u.click(screen.getByRole("button", { name: /volver a cafés/i }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});

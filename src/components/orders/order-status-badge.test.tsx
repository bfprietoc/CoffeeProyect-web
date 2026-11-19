import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { OrderStatus } from "@/lib/types";
import { OrderStatusBadge } from "./order-status-badge";

const CASES: Array<[OrderStatus, string]> = [
  ["confirmed", "Confirmado"],
  ["processing", "En preparación"],
  ["shipped", "Enviado"],
  ["delivered", "Entregado"],
  ["cancelled", "Cancelado"],
];

describe("OrderStatusBadge", () => {
  it.each(CASES)("%s → %s", (status, label) => {
    render(<OrderStatusBadge status={status} />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });
});

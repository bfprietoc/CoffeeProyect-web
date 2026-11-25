import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PaymentBadge } from "./payment-badge";

describe("PaymentBadge", () => {
  it("muestra «Pendiente»", () => {
    render(<PaymentBadge status="pending" />);
    expect(screen.getByText("Pendiente")).toBeInTheDocument();
  });

  it("muestra «Pagado»", () => {
    render(<PaymentBadge status="paid" />);
    expect(screen.getByText("Pagado")).toBeInTheDocument();
  });

  it("muestra «Fallido»", () => {
    render(<PaymentBadge status="failed" />);
    expect(screen.getByText("Fallido")).toBeInTheDocument();
  });
});

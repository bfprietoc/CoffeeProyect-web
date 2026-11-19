import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { QuantityStepper } from "./quantity-stepper";

describe("QuantityStepper", () => {
  it("aumenta y disminuye la cantidad", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<QuantityStepper value={2} onChange={onChange} label="Café Test" />);

    await user.click(screen.getByRole("button", { name: /aumentar cantidad/i }));
    expect(onChange).toHaveBeenCalledWith(3);

    await user.click(screen.getByRole("button", { name: /disminuir cantidad/i }));
    expect(onChange).toHaveBeenCalledWith(1);
  });

  it("desabilita el menos en el mínimo", () => {
    render(<QuantityStepper value={1} onChange={() => {}} label="Café Test" />);
    expect(
      screen.getByRole("button", { name: /disminuir cantidad/i }),
    ).toBeDisabled();
  });

  it("desabilita el más en el máximo", () => {
    render(
      <QuantityStepper value={20} onChange={() => {}} label="Café Test" max={20} />,
    );
    expect(screen.getByRole("button", { name: /aumentar cantidad/i })).toBeDisabled();
  });
});

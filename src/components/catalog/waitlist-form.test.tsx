import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/client";
import { subscribeWaitlist } from "@/lib/api/endpoints";
import type { WaitlistEntry } from "@/lib/types";
import { WaitlistForm } from "./waitlist-form";

vi.mock("@/lib/api/endpoints", () => ({
  subscribeWaitlist: vi.fn(),
}));

const entry: WaitlistEntry = {
  id: "w1",
  coffee_id: "c1",
  email: "a@b.com",
  notified: false,
  created_at: "2026-11-17T00:00:00Z",
};

describe("WaitlistForm", () => {
  it("suscribe con el correo ingresado y muestra confirmación", async () => {
    vi.mocked(subscribeWaitlist).mockResolvedValue(entry);
    const user = userEvent.setup();
    render(<WaitlistForm coffeeId="c1" coffeeName="Gesho Test" />);

    await user.type(screen.getByLabelText(/correo electrónico/i), "a@b.com");
    await user.click(screen.getByRole("button", { name: /avísame cuando vuelva/i }));

    expect(
      await screen.findByText(/¡Listo! Te avisaremos cuando Gesho Test vuelva/),
    ).toBeInTheDocument();
    expect(subscribeWaitlist).toHaveBeenCalledWith({
      coffee_id: "c1",
      email: "a@b.com",
    });
  });

  it("valida el correo en el cliente sin llamar a la API", async () => {
    const user = userEvent.setup();
    render(<WaitlistForm coffeeId="c1" coffeeName="Gesho Test" />);

    await user.type(screen.getByLabelText(/correo electrónico/i), "no-es-correo");
    await user.click(screen.getByRole("button", { name: /avísame cuando vuelva/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Ingresa un correo válido.",
    );
    expect(subscribeWaitlist).not.toHaveBeenCalled();
  });

  it("muestra el error devuelto por la API", async () => {
    vi.mocked(subscribeWaitlist).mockRejectedValue(
      new ApiError(422, "email inválido", "INVALID_INPUT"),
    );
    const user = userEvent.setup();
    render(<WaitlistForm coffeeId="c1" coffeeName="Gesho Test" />);

    await user.type(screen.getByLabelText(/correo electrónico/i), "a@b.com");
    await user.click(screen.getByRole("button", { name: /avísame cuando vuelva/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("email inválido");
  });
});

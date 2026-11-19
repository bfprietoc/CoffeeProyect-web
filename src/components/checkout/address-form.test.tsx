import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/client";
import { addAddress } from "@/lib/api/endpoints";
import type { Address } from "@/lib/types";
import { renderWithQueryClient } from "@/test/utils";
import { AddressForm } from "./address-form";

vi.mock("@/lib/api/endpoints", () => ({
  addAddress: vi.fn(),
}));

const newAddress: Address = {
  id: "a1",
  user_id: "u1",
  label: "Casa",
  street: "Cra 1 #2-3",
  city: "Medellín",
  department: "Antioquia",
  country: "CO",
  is_default: true,
};

async function fillRequired(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/etiqueta/i), "Casa");
  await user.type(screen.getByLabelText(/calle y número/i), "Cra 1 #2-3");
  await user.type(screen.getByLabelText(/ciudad/i), "Medellín");
  await user.type(screen.getByLabelText(/departamento/i), "Antioquia");
}

describe("AddressForm", () => {
  afterEach(() => vi.clearAllMocks());

  it("muestra los campos del formulario", () => {
    renderWithQueryClient(<AddressForm />);
    expect(screen.getByLabelText(/etiqueta/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/calle y número/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/ciudad/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/departamento/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/país/i)).toBeInTheDocument();
  });

  it("bloquea el submit si faltan campos requeridos", async () => {
    const user = userEvent.setup();
    renderWithQueryClient(<AddressForm />);

    await user.click(screen.getByRole("button", { name: /guardar dirección/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/obligatorios/i);
    expect(addAddress).not.toHaveBeenCalled();
  });

  it("crea la dirección con el body correcto y llama a onCreated", async () => {
    vi.mocked(addAddress).mockResolvedValue(newAddress);
    const onCreated = vi.fn();
    const user = userEvent.setup();
    renderWithQueryClient(<AddressForm onCreated={onCreated} />);

    await fillRequired(user);
    await user.click(screen.getByRole("button", { name: /guardar dirección/i }));

    expect(addAddress).toHaveBeenCalledWith(
      expect.objectContaining({
        label: "Casa",
        street: "Cra 1 #2-3",
        city: "Medellín",
        department: "Antioquia",
        country: "CO",
      }),
      expect.anything(),
    );
    await vi.waitFor(() => expect(onCreated).toHaveBeenCalledWith(newAddress));
  });

  it("manda is_default=true cuando defaultIsDefault", async () => {
    vi.mocked(addAddress).mockResolvedValue(newAddress);
    const user = userEvent.setup();
    renderWithQueryClient(<AddressForm defaultIsDefault />);

    await fillRequired(user);
    await user.click(screen.getByRole("button", { name: /guardar dirección/i }));

    expect(addAddress).toHaveBeenCalledWith(
      expect.objectContaining({ is_default: true }),
      expect.anything(),
    );
  });

  it("muestra el error de la API al fallar", async () => {
    vi.mocked(addAddress).mockRejectedValue(
      new ApiError(400, "label is required", "BAD_REQUEST"),
    );
    const user = userEvent.setup();
    renderWithQueryClient(<AddressForm />);

    await fillRequired(user);
    await user.click(screen.getByRole("button", { name: /guardar dirección/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/label is required/i);
  });
});

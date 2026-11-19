import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { addAddress, deleteAddress, listAddresses } from "@/lib/api/endpoints";
import { clearSession, setTokens } from "@/lib/auth/session";
import type { Address } from "@/lib/types";
import { renderWithQueryClient } from "@/test/utils";
import { AddressList } from "./address-list";

vi.mock("@/lib/api/endpoints", () => ({
  listAddresses: vi.fn(),
  deleteAddress: vi.fn(),
  addAddress: vi.fn(),
}));

const casa: Address = {
  id: "a1",
  user_id: "u1",
  label: "Casa",
  street: "Cra 1 #2-3",
  city: "Medellín",
  department: "Antioquia",
  country: "CO",
  is_default: true,
};

const oficina: Address = {
  ...casa,
  id: "a2",
  label: "Oficina",
  street: "Cll 10 #45-67",
  is_default: false,
};

describe("AddressList", () => {
  beforeEach(() => setTokens("a1", "r1")); // useAddresses requiere sesión
  afterEach(() => {
    vi.clearAllMocks();
    clearSession();
  });

  it("lista direcciones con badge de predeterminada", async () => {
    vi.mocked(listAddresses).mockResolvedValue([casa, oficina]);
    renderWithQueryClient(<AddressList />);

    expect(await screen.findByText("Casa")).toBeInTheDocument();
    expect(screen.getByText("Oficina")).toBeInTheDocument();
    // Solo la predeterminada lleva el badge.
    expect(screen.getByText("Predeterminada")).toBeInTheDocument();
    expect(
      screen.getByText(/Cra 1 #2-3, Medellín, Antioquia · CO/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Cll 10 #45-67, Medellín, Antioquia · CO/),
    ).toBeInTheDocument();
  });

  it("elimina en dos pasos y llama al endpoint", async () => {
    vi.mocked(listAddresses).mockResolvedValue([casa]);
    vi.mocked(deleteAddress).mockResolvedValue(undefined);
    const u = userEvent.setup();
    renderWithQueryClient(<AddressList />);

    await u.click(await screen.findByRole("button", { name: /eliminar/i }));
    expect(await screen.findByText(/¿eliminar esta dirección\?/i)).toBeInTheDocument();

    await u.click(screen.getByRole("button", { name: /sí, eliminar/i }));
    expect(deleteAddress).toHaveBeenCalledWith(casa.id, expect.anything());
  });

  it("permite volver sin eliminar", async () => {
    vi.mocked(listAddresses).mockResolvedValue([casa]);
    const u = userEvent.setup();
    renderWithQueryClient(<AddressList />);

    await u.click(await screen.findByRole("button", { name: /eliminar/i }));
    await u.click(screen.getByRole("button", { name: /volver/i }));

    expect(screen.getByRole("button", { name: /eliminar/i })).toBeInTheDocument();
    expect(deleteAddress).not.toHaveBeenCalled();
  });

  it("muestra estado vacío y abre el formulario para agregar", async () => {
    vi.mocked(listAddresses).mockResolvedValue([]);
    const u = userEvent.setup();
    renderWithQueryClient(<AddressList />);

    expect(
      await screen.findByText(/aún no tienes direcciones guardadas/i),
    ).toBeInTheDocument();

    await u.click(screen.getByRole("button", { name: /agregar dirección/i }));
    expect(
      await screen.findByRole("button", { name: /guardar dirección/i }),
    ).toBeInTheDocument();
  });

  it("crea la dirección con el formulario y lo cierra al guardar", async () => {
    vi.mocked(listAddresses).mockResolvedValue([]);
    vi.mocked(addAddress).mockResolvedValue(casa);
    const u = userEvent.setup();
    renderWithQueryClient(<AddressList />);

    await u.click(await screen.findByRole("button", { name: /agregar dirección/i }));
    await u.type(screen.getByLabelText(/etiqueta/i), "Casa");
    await u.type(screen.getByLabelText(/calle y número/i), "Cra 1 #2-3");
    await u.type(screen.getByLabelText(/ciudad/i), "Medellín");
    await u.type(screen.getByLabelText(/departamento/i), "Antioquia");
    await u.click(screen.getByRole("button", { name: /guardar dirección/i }));

    expect(addAddress).toHaveBeenCalledWith(
      expect.objectContaining({ label: "Casa", is_default: false }),
      expect.anything(),
    );

    // onCreated cierra el formulario.
    await waitFor(() =>
      expect(
        screen.queryByRole("button", { name: /guardar dirección/i }),
      ).not.toBeInTheDocument(),
    );
  });

  it("muestra el error y permite reintentar al fallar la eliminación", async () => {
    vi.mocked(listAddresses).mockResolvedValue([casa]);
    vi.mocked(deleteAddress).mockRejectedValue(new Error("boom"));
    const u = userEvent.setup();
    renderWithQueryClient(<AddressList />);

    await u.click(await screen.findByRole("button", { name: /eliminar/i }));
    await u.click(await screen.findByRole("button", { name: /sí, eliminar/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /no se pudo eliminar/i,
    );
  });
});

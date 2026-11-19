import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { Address } from "@/lib/types";
import { renderWithQueryClient } from "@/test/utils";
import { AddressSelector } from "./address-selector";

vi.mock("@/lib/api/endpoints", () => ({
  addAddress: vi.fn(),
}));

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
  {
    id: "a2",
    user_id: "u1",
    label: "Oficina",
    street: "Cl 50 #6-33",
    city: "Bogotá",
    department: "Cundinamarca",
    country: "CO",
    is_default: false,
  },
];

describe("AddressSelector", () => {
  it("lista las direcciones como radios y notifica la selección", async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    renderWithQueryClient(
      <AddressSelector addresses={addresses} selectedId="a1" onSelect={onSelect} />,
    );

    expect(screen.getByRole("radio", { name: /casa/i })).toBeChecked();
    await user.click(screen.getByRole("radio", { name: /oficina/i }));
    expect(onSelect).toHaveBeenCalledWith("a2");
  });

  it("marca la dirección predeterminada", () => {
    renderWithQueryClient(
      <AddressSelector addresses={addresses} selectedId="a1" onSelect={() => {}} />,
    );
    expect(screen.getByText("Predeterminada")).toBeInTheDocument();
  });

  it("muestra el hint cuando no hay direcciones", () => {
    renderWithQueryClient(
      <AddressSelector addresses={[]} selectedId={null} onSelect={() => {}} />,
    );
    expect(
      screen.getByText(/aún no tienes direcciones guardadas/i),
    ).toBeInTheDocument();
  });

  it("abre el formulario con 'Agregar nueva dirección'", async () => {
    const user = userEvent.setup();
    renderWithQueryClient(
      <AddressSelector addresses={addresses} selectedId="a1" onSelect={() => {}} />,
    );

    await user.click(screen.getByRole("button", { name: /agregar nueva dirección/i }));
    expect(await screen.findByLabelText(/etiqueta/i)).toBeInTheDocument();
  });
});

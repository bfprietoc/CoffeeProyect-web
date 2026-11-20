import { screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getMe, listAddresses } from "@/lib/api/endpoints";
import { clearSession, setTokens } from "@/lib/auth/session";
import type { UserProfile } from "@/lib/types";
import { renderWithQueryClient } from "@/test/utils";
import AccountPage from "./page";

vi.mock("@/lib/api/endpoints", () => ({
  getMe: vi.fn(),
  listAddresses: vi.fn(),
  updateMe: vi.fn(),
  deleteAddress: vi.fn(),
  addAddress: vi.fn(),
}));

const profile: UserProfile = {
  id: "u1",
  name: "E2E Fase 4",
  email: "fase4@test.com",
  created_at: "2026-11-19T12:00:00Z",
  addresses: [],
};

describe("AccountPage", () => {
  afterEach(() => {
    vi.clearAllMocks();
    clearSession();
  });

  it("invita a ingresar si no hay sesión", async () => {
    renderWithQueryClient(<AccountPage />);

    expect(await screen.findByText(/inicia sesión para continuar/i)).toBeInTheDocument();
    expect(screen.getByText(/gestionar tu cuenta/i)).toBeInTheDocument();
  });

  it("muestra perfil y direcciones con sesión activa", async () => {
    setTokens("a1", "r1");
    vi.mocked(getMe).mockResolvedValue(profile);
    vi.mocked(listAddresses).mockResolvedValue([]);
    renderWithQueryClient(<AccountPage />);

    // Esperar un elemento que solo existe en el render final (el h1 "Mi
    // cuenta" también está en el skeleton, no sirve como señal de carga).
    expect(
      await screen.findByRole("textbox", { name: "Nombre" }),
    ).toHaveValue("E2E Fase 4");

    expect(screen.getByRole("heading", { name: "Mi cuenta" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Perfil" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Correo" })).toHaveValue(
      "fase4@test.com",
    );
    expect(screen.getByRole("heading", { name: "Direcciones" })).toBeInTheDocument();
    expect(
      await screen.findByText(/aún no tienes direcciones guardadas/i),
    ).toBeInTheDocument();

    // Sección "Pedidos": enlace a la lista (descubribilidad, FEATURES_PLAN #1).
    expect(screen.getByRole("heading", { name: "Pedidos" })).toBeInTheDocument();
    const link = screen.getByRole("link", { name: /ver mis pedidos/i });
    expect(link).toHaveAttribute("href", "/orders");
  });

  it("muestra error con reintentar si el perfil no carga", async () => {
    setTokens("a1", "r1");
    vi.mocked(getMe).mockRejectedValue(new Error("boom"));
    renderWithQueryClient(<AccountPage />);

    expect(await screen.findByText(/no se pudo cargar tu cuenta/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /reintentar/i })).toBeInTheDocument();
  });
});

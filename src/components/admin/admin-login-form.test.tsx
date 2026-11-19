import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/client";
import { adminListOrders } from "@/lib/api/endpoints";
import { clearAdminKey, getAdminKey } from "@/lib/auth/admin-session";
import { renderWithQueryClient } from "@/test/utils";
import { AdminLoginForm } from "./admin-login-form";

vi.mock("@/lib/api/endpoints", () => ({
  adminListOrders: vi.fn(),
}));

describe("AdminLoginForm", () => {
  afterEach(() => {
    vi.clearAllMocks();
    clearAdminKey();
  });

  it("deshabilita el botón sin clave", () => {
    renderWithQueryClient(<AdminLoginForm />);
    expect(screen.getByRole("button", { name: /entrar al panel/i })).toBeDisabled();
  });

  it("muestra error de clave inválida con 401 y no setea la sesión", async () => {
    vi.mocked(adminListOrders).mockRejectedValue(
      new ApiError(401, "unauthorized", "UNAUTHORIZED"),
    );
    const u = userEvent.setup();
    renderWithQueryClient(<AdminLoginForm />);

    await u.type(screen.getByLabelText(/api key/i), "clave-mala");
    await u.click(screen.getByRole("button", { name: /entrar al panel/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/clave inválida/i);
    expect(getAdminKey()).toBeNull();
  });

  it("verifica la clave y setea la sesión con una clave válida", async () => {
    vi.mocked(adminListOrders).mockResolvedValue([]);
    const u = userEvent.setup();
    renderWithQueryClient(<AdminLoginForm />);

    await u.type(screen.getByLabelText(/api key/i), "secret123");
    await u.click(screen.getByRole("button", { name: /entrar al panel/i }));

    expect(adminListOrders).toHaveBeenCalledWith("secret123", { limit: 1 });
    await waitFor(() => expect(getAdminKey()).toBe("secret123"));
  });

  it("muestra error genérico ante fallas de red", async () => {
    vi.mocked(adminListOrders).mockRejectedValue(new Error("boom"));
    const u = userEvent.setup();
    renderWithQueryClient(<AdminLoginForm />);

    await u.type(screen.getByLabelText(/api key/i), "secret123");
    await u.click(screen.getByRole("button", { name: /entrar al panel/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /no se pudo verificar/i,
    );
    expect(getAdminKey()).toBeNull();
  });
});

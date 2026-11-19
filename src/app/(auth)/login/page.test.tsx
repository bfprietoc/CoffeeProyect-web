import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/client";
import { login } from "@/lib/api/endpoints";
import { clearSession, getAccessToken, setTokens } from "@/lib/auth/session";
import type { AuthResponse } from "@/lib/types";
import LoginPage from "./page";

const push = vi.fn();
const replace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/lib/api/endpoints", () => ({
  login: vi.fn(),
}));

const authResponse: AuthResponse = {
  user: { id: "u1", name: "Ana", email: "ana@b.com", created_at: "2026-11-18T00:00:00Z" },
  tokens: { access_token: "a1", refresh_token: "r1", expires_in: 900 },
};

describe("LoginPage", () => {
  afterEach(() => {
    vi.clearAllMocks();
    clearSession();
  });

  it("valida en el cliente sin llamar a la API", async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.type(screen.getByLabelText(/correo electrónico/i), "no-es-correo");
    await user.click(screen.getByRole("button", { name: /ingresar/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Ingresa un correo válido.",
    );
    expect(login).not.toHaveBeenCalled();
  });

  it("muestra mensaje amigable ante credenciales inválidas", async () => {
    vi.mocked(login).mockRejectedValue(
      new ApiError(401, "invalid credentials", "UNAUTHORIZED"),
    );
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.type(screen.getByLabelText(/correo electrónico/i), "ana@b.com");
    await user.type(screen.getByLabelText(/contraseña/i), "clave1234");
    await user.click(screen.getByRole("button", { name: /ingresar/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Correo o contraseña incorrectos.",
    );
    expect(getAccessToken()).toBeNull();
  });

  it("guarda los tokens y navega al destino", async () => {
    vi.mocked(login).mockResolvedValue(authResponse);
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.type(screen.getByLabelText(/correo electrónico/i), "ana@b.com");
    await user.type(screen.getByLabelText(/contraseña/i), "clave1234");
    await user.click(screen.getByRole("button", { name: /ingresar/i }));

    expect(login).toHaveBeenCalledWith({ email: "ana@b.com", password: "clave1234" });
    expect(getAccessToken()).toBe("a1");
    expect(push).toHaveBeenCalledWith("/");
  });

  it("redirige a / si ya hay sesión activa al montar", () => {
    setTokens("a1", "r1");
    render(<LoginPage />);
    expect(replace).toHaveBeenCalledWith("/");
  });

  it("resetea el form tras un submit exitoso (la ruta se preserva con su estado)", async () => {
    vi.mocked(login).mockResolvedValue(authResponse);
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.type(screen.getByLabelText(/correo electrónico/i), "ana@b.com");
    await user.type(screen.getByLabelText(/contraseña/i), "clave1234");
    await user.click(screen.getByRole("button", { name: "Ingresar" }));

    // Next 16 (Cache Components) preserva la ruta con <Activity> sin
    // desmontarla: al volver a /login el form debe estar limpio, no
    // atorado en "Ingresando…" (status "submitting" del submit anterior).
    const button = await screen.findByRole("button", { name: "Ingresar" });
    expect(button).toBeEnabled();
    expect(screen.getByLabelText(/correo electrónico/i)).toHaveValue("");
    expect(screen.getByLabelText(/contraseña/i)).toHaveValue("");
  });
});

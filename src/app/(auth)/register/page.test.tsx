import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/client";
import { register } from "@/lib/api/endpoints";
import { clearSession, getAccessToken, setTokens } from "@/lib/auth/session";
import type { AuthResponse } from "@/lib/types";
import RegisterPage from "./page";

const push = vi.fn();
const replace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/lib/api/endpoints", () => ({
  register: vi.fn(),
}));

const authResponse: AuthResponse = {
  user: { id: "u1", name: "Ana", email: "ana@b.com", created_at: "2026-11-18T00:00:00Z" },
  tokens: { access_token: "a1", refresh_token: "r1", expires_in: 900 },
};

describe("RegisterPage", () => {
  afterEach(() => {
    vi.clearAllMocks();
    clearSession();
  });

  it("valida contraseña corta en el cliente sin llamar a la API", async () => {
    const user = userEvent.setup();
    render(<RegisterPage />);

    await user.type(screen.getByLabelText(/^nombre/i), "Ana");
    await user.type(screen.getByLabelText(/correo electrónico/i), "ana@b.com");
    await user.type(screen.getByLabelText(/contraseña/i), "corta");
    await user.click(screen.getByRole("button", { name: /crear cuenta/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "La contraseña debe tener al menos 8 caracteres.",
    );
    expect(register).not.toHaveBeenCalled();
  });

  it("muestra mensaje amigable si el correo ya está registrado", async () => {
    vi.mocked(register).mockRejectedValue(
      new ApiError(409, "email already registered", "EMAIL_CONFLICT"),
    );
    const user = userEvent.setup();
    render(<RegisterPage />);

    await user.type(screen.getByLabelText(/^nombre/i), "Ana");
    await user.type(screen.getByLabelText(/correo electrónico/i), "ana@b.com");
    await user.type(screen.getByLabelText(/contraseña/i), "clave1234");
    await user.click(screen.getByRole("button", { name: /crear cuenta/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Ese correo ya está registrado.",
    );
    expect(getAccessToken()).toBeNull();
  });

  it("registra, guarda los tokens y navega", async () => {
    vi.mocked(register).mockResolvedValue(authResponse);
    const user = userEvent.setup();
    render(<RegisterPage />);

    await user.type(screen.getByLabelText(/^nombre/i), "Ana");
    await user.type(screen.getByLabelText(/correo electrónico/i), "ana@b.com");
    await user.type(screen.getByLabelText(/contraseña/i), "clave1234");
    await user.click(screen.getByRole("button", { name: /crear cuenta/i }));

    expect(register).toHaveBeenCalledWith({
      name: "Ana",
      email: "ana@b.com",
      password: "clave1234",
    });
    expect(getAccessToken()).toBe("a1");
    expect(push).toHaveBeenCalledWith("/");
  });

  it("redirige a / si ya hay sesión activa al montar", () => {
    setTokens("a1", "r1");
    render(<RegisterPage />);
    expect(replace).toHaveBeenCalledWith("/");
  });

  it("resetea el form tras un submit exitoso (la ruta se preserva con su estado)", async () => {
    vi.mocked(register).mockResolvedValue(authResponse);
    const user = userEvent.setup();
    render(<RegisterPage />);

    await user.type(screen.getByLabelText(/^nombre/i), "Ana");
    await user.type(screen.getByLabelText(/correo electrónico/i), "ana@b.com");
    await user.type(screen.getByLabelText(/contraseña/i), "clave1234");
    await user.click(screen.getByRole("button", { name: "Crear cuenta" }));

    // Next 16 (Cache Components) preserva la ruta con <Activity> sin
    // desmontarla: al volver a /register el form debe estar limpio, no
    // atorado en "Creando cuenta…" (status "submitting" del submit anterior).
    const button = await screen.findByRole("button", { name: "Crear cuenta" });
    expect(button).toBeEnabled();
    expect(screen.getByLabelText(/^nombre/i)).toHaveValue("");
    expect(screen.getByLabelText(/correo electrónico/i)).toHaveValue("");
    expect(screen.getByLabelText(/contraseña/i)).toHaveValue("");
  });
});

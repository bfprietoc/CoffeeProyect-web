import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/client";
import { updateMe } from "@/lib/api/endpoints";
import type { User } from "@/lib/types";
import { renderWithQueryClient } from "@/test/utils";
import { ProfileForm } from "./profile-form";

vi.mock("@/lib/api/endpoints", () => ({
  updateMe: vi.fn(),
}));

const user: User = {
  id: "u1",
  name: "E2E Fase 4",
  email: "fase4@test.com",
  created_at: "2026-11-19T12:00:00Z",
};

describe("ProfileForm", () => {
  afterEach(() => vi.clearAllMocks());

  it("muestra nombre y correo (correo de solo lectura)", () => {
    renderWithQueryClient(<ProfileForm user={user} />);

    expect(screen.getByRole("textbox", { name: "Nombre" })).toHaveValue(
      "E2E Fase 4",
    );
    const email = screen.getByRole("textbox", { name: "Correo" });
    expect(email).toHaveValue("fase4@test.com");
    expect(email).toBeDisabled();
  });

  it("deshabilita guardar sin cambios", () => {
    renderWithQueryClient(<ProfileForm user={user} />);

    expect(screen.getByRole("button", { name: /guardar cambios/i })).toBeDisabled();
  });

  it("guarda el nombre con los espacios recortados", async () => {
    vi.mocked(updateMe).mockResolvedValue({ ...user, name: "Nuevo Nombre" });
    const u = userEvent.setup();
    renderWithQueryClient(<ProfileForm user={user} />);

    const input = screen.getByRole("textbox", { name: "Nombre" });
    await u.clear(input);
    await u.type(input, "  Nuevo Nombre ");

    const save = screen.getByRole("button", { name: /guardar cambios/i });
    expect(save).toBeEnabled();
    await u.click(save);

    expect(updateMe).toHaveBeenCalledWith(
      { name: "Nuevo Nombre" },
      expect.anything(),
    );
    expect(await screen.findByText(/perfil guardado/i)).toBeInTheDocument();
  });

  it("muestra el error del backend al fallar", async () => {
    vi.mocked(updateMe).mockRejectedValue(
      new ApiError(400, "name is required", "BAD_REQUEST"),
    );
    const u = userEvent.setup();
    renderWithQueryClient(<ProfileForm user={user} />);

    const input = screen.getByRole("textbox", { name: "Nombre" });
    await u.clear(input);
    await u.type(input, "X");
    await u.click(screen.getByRole("button", { name: /guardar cambios/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/name is required/i);
  });
});

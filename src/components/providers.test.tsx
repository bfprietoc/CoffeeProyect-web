import { render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getAccessToken, getRefreshToken, refreshTokens } from "@/lib/auth/session";
import { Providers } from "./providers";

vi.mock("@/lib/auth/session", () => ({
  getAccessToken: vi.fn(),
  getRefreshToken: vi.fn(),
  refreshTokens: vi.fn(() => Promise.resolve(true)),
}));

describe("Providers — bootstrap de sesión tras recarga", () => {
  afterEach(() => vi.clearAllMocks());

  it("restaura la sesión si no hay access token pero sí refresh", () => {
    vi.mocked(getAccessToken).mockReturnValue(null);
    vi.mocked(getRefreshToken).mockReturnValue("refresh-123");

    render(
      <Providers>
        <p>contenido</p>
      </Providers>,
    );

    expect(refreshTokens).toHaveBeenCalledTimes(1);
  });

  it("no hace refresh si ya hay access token en memoria", () => {
    vi.mocked(getAccessToken).mockReturnValue("access-123");
    vi.mocked(getRefreshToken).mockReturnValue("refresh-123");

    render(
      <Providers>
        <p>contenido</p>
      </Providers>,
    );

    expect(refreshTokens).not.toHaveBeenCalled();
  });

  it("no hace refresh si no hay refresh token (invitado)", () => {
    vi.mocked(getAccessToken).mockReturnValue(null);
    vi.mocked(getRefreshToken).mockReturnValue(null);

    render(
      <Providers>
        <p>contenido</p>
      </Providers>,
    );

    expect(refreshTokens).not.toHaveBeenCalled();
  });
});

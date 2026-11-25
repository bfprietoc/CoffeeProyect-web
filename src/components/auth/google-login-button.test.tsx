import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GoogleLoginButton } from "./google-login-button";

type InitializeArgs = {
  client_id: string;
  callback: (res: { credential: string }) => void;
};

type RenderArgs = [HTMLElement, Record<string, unknown>];

function mockGis() {
  const initCalls: InitializeArgs[] = [];
  const renderCalls: RenderArgs[] = [];
  // vi.fn(impl) da al mock la firma concreta, asignable a window.google
  // (declarado en el componente vía declare global).
  const id = {
    initialize: vi.fn((options: InitializeArgs) => {
      initCalls.push(options);
    }),
    renderButton: vi.fn((el: HTMLElement, options: Record<string, unknown>) => {
      renderCalls.push([el, options]);
    }),
  };
  window.google = { accounts: { id } };
  return { id, initCalls, renderCalls };
}

describe("GoogleLoginButton", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    window.google = undefined;
    vi.clearAllMocks();
  });

  it("no renderiza nada sin NEXT_PUBLIC_GOOGLE_CLIENT_ID", () => {
    vi.stubEnv("NEXT_PUBLIC_GOOGLE_CLIENT_ID", "");
    const { container } = render(<GoogleLoginButton onCredential={vi.fn()} />);
    expect(container.innerHTML).toBe("");
  });

  it("renderiza el contenedor y configura GIS con client ID", async () => {
    vi.stubEnv("NEXT_PUBLIC_GOOGLE_CLIENT_ID", "test-client-id");
    const { initCalls, renderCalls } = mockGis();
    render(<GoogleLoginButton onCredential={vi.fn()} />);

    expect(screen.getByTestId("google-login-button")).toBeInTheDocument();
    // el efecto corre async (loadGis resuelve en microtask)
    await vi.waitFor(() => expect(initCalls.length).toBe(1));
    expect(initCalls[0].client_id).toBe("test-client-id");
    expect(renderCalls.length).toBe(1);
  });

  it("transmite el credential del callback de Google a onCredential", async () => {
    vi.stubEnv("NEXT_PUBLIC_GOOGLE_CLIENT_ID", "test-client-id");
    const { initCalls } = mockGis();
    const onCredential = vi.fn();
    render(<GoogleLoginButton onCredential={onCredential} />);

    await vi.waitFor(() => expect(initCalls.length).toBe(1));

    // simula que Google devolvió un ID token
    initCalls[0].callback({ credential: "fake-id-token" });
    expect(onCredential).toHaveBeenCalledWith("fake-id-token");
  });

  it("no rompe si el script de GIS no carga", async () => {
    vi.stubEnv("NEXT_PUBLIC_GOOGLE_CLIENT_ID", "test-client-id");
    // sin window.google: loadGis inyecta un <script> que en jsdom nunca
    // dispara onload → el promise queda pendiente; no debe romper nada.
    render(<GoogleLoginButton onCredential={vi.fn()} />);
    expect(screen.getByTestId("google-login-button")).toBeInTheDocument();
    const script = document.querySelector(`script[src*="accounts.google.com"]`);
    expect(script).not.toBeNull();
  });
});

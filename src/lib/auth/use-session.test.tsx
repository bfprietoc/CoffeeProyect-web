import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { clearSession, setTokens } from "./session";
import { useSession } from "./use-session";

afterEach(() => {
  clearSession();
});

describe("useSession", () => {
  it("empieza deslogueado y refleja setTokens", () => {
    const { result } = renderHook(() => useSession());
    expect(result.current.isAuthenticated).toBe(false);

    act(() => {
      setTokens("access-1", "refresh-1");
    });
    expect(result.current.isAuthenticated).toBe(true);
  });

  it("logout descarta la sesión", () => {
    const { result } = renderHook(() => useSession());
    act(() => {
      setTokens("access-1", "refresh-1");
    });
    expect(result.current.isAuthenticated).toBe(true);

    act(() => {
      result.current.logout();
    });
    expect(result.current.isAuthenticated).toBe(false);
  });
});

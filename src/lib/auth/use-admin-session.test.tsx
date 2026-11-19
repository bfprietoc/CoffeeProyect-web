import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { clearAdminKey, setAdminKey } from "./admin-session";
import { useAdminSession } from "./use-admin-session";

afterEach(() => clearAdminKey());

describe("useAdminSession", () => {
  it("empieza sin admin y refleja setAdminKey", () => {
    const { result } = renderHook(() => useAdminSession());
    expect(result.current.isAdmin).toBe(false);

    act(() => {
      setAdminKey("secret123");
    });
    expect(result.current.isAdmin).toBe(true);
  });

  it("logout descarta la sesión de admin", () => {
    const { result } = renderHook(() => useAdminSession());
    act(() => {
      setAdminKey("secret123");
    });
    expect(result.current.isAdmin).toBe(true);

    act(() => {
      result.current.logout();
    });
    expect(result.current.isAdmin).toBe(false);
  });
});

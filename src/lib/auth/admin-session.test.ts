import { afterEach, describe, expect, it, vi } from "vitest";
import {
  clearAdminKey,
  getAdminKey,
  onAdminSessionChange,
  setAdminKey,
} from "./admin-session";

afterEach(() => clearAdminKey());

describe("admin session (clave en memoria)", () => {
  it("empieza sin clave y refleja setAdminKey", () => {
    expect(getAdminKey()).toBeNull();

    setAdminKey("secret123");
    expect(getAdminKey()).toBe("secret123");
  });

  it("clearAdminKey descarta la clave", () => {
    setAdminKey("secret123");
    clearAdminKey();
    expect(getAdminKey()).toBeNull();
  });

  it("notifica a los suscriptores y la suscripción se puede retirar", () => {
    const listener = vi.fn();
    const unsubscribe = onAdminSessionChange(listener);

    setAdminKey("a");
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    clearAdminKey();
    expect(listener).toHaveBeenCalledTimes(1); // ya no se notifica
  });

  it("no toca localStorage (solo memoria)", () => {
    setAdminKey("secret123");
    expect(localStorage.length).toBe(0);
  });
});

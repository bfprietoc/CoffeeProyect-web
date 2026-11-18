import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Sin `globals: true` en Vitest, RTL no detecta el framework y no limpia solo.
afterEach(() => {
  cleanup();
});

import { describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/client";
import { getCoffee } from "@/lib/api/endpoints";
import type { Coffee } from "@/lib/types";
import { getCoffeeByIdOrNull } from "./coffees";

vi.mock("next/cache", () => ({ cacheLife: vi.fn() }));
vi.mock("@/lib/api/endpoints", () => ({
  getCoffee: vi.fn(),
  listCoffees: vi.fn(),
}));

const coffee: Coffee = {
  id: "c1",
  name: "El Paraíso 92",
  process: "anaerobic",
  roast_level: "light",
  tasting_notes: ["maracuyá", "uva"],
  description: "Café de proceso anaeróbico de la finca El Paraíso en el Cauca.",
  producer: { id: "p1", name: "Diego Samuel Bermúdez" },
  farm: { id: "f1", name: "El Paraíso", country: "Colombia", region: "Cauca" },
  bag_size_grams: 250,
  price_cents: 8500000,
  currency: "COP",
  available: true,
  stock_bags: 12,
};

describe("getCoffeeByIdOrNull", () => {
  it("resuelve el café cuando la API responde", async () => {
    vi.mocked(getCoffee).mockResolvedValue(coffee);

    await expect(getCoffeeByIdOrNull("c1")).resolves.toEqual(coffee);
  });

  it("devuelve null ante 404 (café inexistente → notFound() en la página)", async () => {
    vi.mocked(getCoffee).mockRejectedValue(
      new ApiError(404, "coffee not found", "NOT_FOUND"),
    );

    await expect(getCoffeeByIdOrNull("inexistente")).resolves.toBeNull();
  });

  it("re-lanza otros errores (API caída → error boundary de la ruta)", async () => {
    vi.mocked(getCoffee).mockRejectedValue(new Error("boom"));

    await expect(getCoffeeByIdOrNull("c1")).rejects.toThrow("boom");
  });
});

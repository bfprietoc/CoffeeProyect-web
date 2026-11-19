import { describe, expect, it, vi } from "vitest";
import { getCoffeeByIdOrNull } from "@/lib/server/coffees";
import type { Coffee } from "@/lib/types";
import { resolvedParams } from "@/test/utils";
import { generateMetadata } from "./page";

vi.mock("@/lib/server/coffees", () => ({
  getCoffeeByIdOrNull: vi.fn(),
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

function props(id: string) {
  return {
    params: resolvedParams({ id }),
    searchParams: resolvedParams<Record<string, string | string[] | undefined>>({}),
  };
}

describe("generateMetadata (ficha de café)", () => {
  it("devuelve título, descripción y openGraph con el origen", async () => {
    vi.mocked(getCoffeeByIdOrNull).mockResolvedValue(coffee);

    const meta = await generateMetadata(props("c1"));

    expect(meta.title).toBe("El Paraíso 92");
    expect(meta.description).toBe(coffee.description);
    expect(meta.openGraph).toEqual({
      title: "El Paraíso 92 — El Paraíso, Colombia",
      description: coffee.description,
      type: "website",
    });
  });

  it("devuelve {} si el café no existe (null → metadata del layout)", async () => {
    vi.mocked(getCoffeeByIdOrNull).mockResolvedValue(null);

    const meta = await generateMetadata(props("inexistente"));

    expect(meta).toEqual({});
  });

  it("devuelve {} si la API falla (no tumba el build)", async () => {
    vi.mocked(getCoffeeByIdOrNull).mockRejectedValue(new Error("boom"));

    const meta = await generateMetadata(props("c1"));

    expect(meta).toEqual({});
  });
});

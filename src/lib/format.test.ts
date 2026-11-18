import { describe, expect, it } from "vitest";
import { formatPrice, processLabel, roastLabel } from "@/lib/format";

describe("formatPrice", () => {
  // El separador de es-CO es NBSP (U+00A0), no un espacio normal.
  it("formatea COP sin decimales con separador de miles", () => {
    expect(formatPrice(9200000, "COP")).toBe("$\u00A092.000");
  });

  it("soporta otras monedas (USD)", () => {
    expect(formatPrice(123456, "USD")).toBe("US$\u00A01.235");
  });

  it("cae a un formato simple si la moneda es inválida", () => {
    expect(formatPrice(1050, "NOTREAL")).toBe("10.50 NOTREAL");
  });
});

describe("labels del catálogo", () => {
  it("traduce procesos conocidos", () => {
    expect(processLabel("washed")).toBe("Lavado");
    expect(processLabel("natural")).toBe("Natural");
    expect(processLabel("anaerobic")).toBe("Anaeróbico");
  });

  it("traduce tostados conocidos", () => {
    expect(roastLabel("light")).toBe("Tostado claro");
    expect(roastLabel("medium")).toBe("Tostado medio");
    expect(roastLabel("dark")).toBe("Tostado oscuro");
  });

  it("capitaliza valores desconocidos", () => {
    expect(processLabel("fermented")).toBe("Fermented");
    expect(roastLabel("medium-dark")).toBe("Medium-dark");
  });
});

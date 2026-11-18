import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { CatalogQuery } from "@/lib/server/coffees";
import { CoffeeFilters } from "./coffee-filters";

const { replace } = vi.hoisted(() => ({ replace: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  usePathname: () => "/coffees",
}));

const facets = {
  countries: ["Colombia"],
  processes: ["washed", "natural"],
  roastLevels: ["light", "dark"],
};

describe("CoffeeFilters", () => {
  it("aplica un filtro y reinicia la paginación a la página 1", async () => {
    const current: CatalogQuery = { page: 3, process: "washed" };
    render(<CoffeeFilters current={current} {...facets} />);
    const user = userEvent.setup();

    await user.selectOptions(screen.getByLabelText(/país/i), "Colombia");

    expect(replace).toHaveBeenCalledWith(
      "/coffees?process=washed&country=Colombia",
      { scroll: false },
    );
  });

  it("no muestra 'Limpiar filtros' sin filtros activos", () => {
    render(<CoffeeFilters current={{}} {...facets} />);
    expect(
      screen.queryByRole("button", { name: /limpiar filtros/i }),
    ).not.toBeInTheDocument();
  });

  it("limpia todos los filtros al pulsar 'Limpiar filtros'", async () => {
    const current: CatalogQuery = { process: "washed", country: "Colombia" };
    render(<CoffeeFilters current={current} {...facets} />);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: /limpiar filtros/i }));

    expect(replace).toHaveBeenCalledWith("/coffees", { scroll: false });
  });

  it("el checkbox 'Solo disponibles' agrega y quita el parámetro", async () => {
    const { rerender } = render(<CoffeeFilters current={{}} {...facets} />);
    const user = userEvent.setup();

    await user.click(screen.getByRole("checkbox"));
    expect(replace).toHaveBeenLastCalledWith("/coffees?available=true", {
      scroll: false,
    });

    // En la app real el server re-renderiza con los nuevos searchParams;
    // aquí se simula ese round-trip actualizando la prop `current`.
    rerender(<CoffeeFilters current={{ available: true }} {...facets} />);
    expect(screen.getByRole("checkbox")).toBeChecked();

    await user.click(screen.getByRole("checkbox"));
    expect(replace).toHaveBeenLastCalledWith("/coffees", { scroll: false });
  });
});

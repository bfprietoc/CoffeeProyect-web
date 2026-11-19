import { expect, test } from "@playwright/test";
import { COFFEE, getTestCoffee } from "./helpers";

/** Fase 1: catálogo público (read-only) contra el backend real. */

test.describe("Catálogo público", () => {
  test("home muestra los cafés destacados disponibles", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /Cafés de especialidad/ })).toBeVisible();
    await expect(page.getByRole("link", { name: COFFEE.name })).toBeVisible();
  });

  test("listado muestra los cafés seedeados", async ({ page }) => {
    await page.goto("/coffees");
    for (const name of [
      "El Paraíso 92",
      "Finca La Esperanza Wush Wush",
      "Huila Natural Caturra",
      "Nariño Honey Gesha",
    ]) {
      await expect(page.getByRole("link", { name })).toBeVisible();
    }
  });

  test("filtro por proceso reduce el listado", async ({ page }) => {
    await page.goto("/coffees");
    await page.getByLabel("Proceso").selectOption("washed");
    await expect(page.getByRole("link", { name: "Finca La Esperanza Wush Wush" })).toBeVisible();
    // El anaeróbico no aparece con process=washed.
    await expect(page.getByRole("link", { name: "El Paraíso 92" })).toBeHidden();
    // El filtro queda en la URL (compartible).
    await expect(page).toHaveURL(/process=washed/);
  });

  test("ficha de detalle muestra origen, notas y precio", async ({ page }) => {
    // Navegación directa (no desde el listado): con Next 16/PPR el árbol de
    // la ruta anterior queda preservado oculto (<Activity>) y los textos de
    // las tarjetas violan strict mode en los asserts.
    const { id } = await getTestCoffee(page);
    await page.goto(`/coffees/${id}`);

    await expect(page.getByRole("heading", { name: COFFEE.name })).toBeVisible();
    await expect(page.getByText("El Paraíso · Cauca, Colombia")).toBeVisible();
    for (const note of ["maracuyá", "uva", "chocolate negro"]) {
      await expect(page.getByText(note)).toBeVisible();
    }
    await expect(page.getByText(COFFEE.priceRe)).toBeVisible();
  });

  test("café inexistente muestra el estado de no encontrado", async ({ page }) => {
    await page.goto("/coffees/00000000-0000-4000-8000-000000000000");
    // La ruta tiene su propio not-found.tsx ("Café no encontrado"); con PPR
    // se streaméa tras el shell (soft 404, HTTP 200).
    await expect(
      page.getByText("Café no encontrado", { exact: true }),
    ).toBeVisible();
    // El botón es un <a> (Button render={<Link>}) → role link.
    await expect(page.getByRole("link", { name: "Ver catálogo" })).toBeVisible();
  });
});

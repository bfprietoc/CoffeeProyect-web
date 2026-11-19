import { expect, test } from "@playwright/test";
import { COFFEE, addToCart } from "./helpers";

/** Fase 2: carrito de invitado (sin login, X-Session-ID en Redis). */

test.describe("Carrito invitado", () => {
  test("agregar desde la ficha actualiza el contador del header", async ({ page }) => {
    await addToCart(page);
    await expect(
      page.getByRole("link", { name: /Carrito, 1 artículo/ }),
    ).toBeVisible();
  });

  test("página /cart: precio unitario, stepper y total", async ({ page }) => {
    await addToCart(page);
    await page.goto("/cart");

    await expect(page.getByRole("link", { name: COFFEE.name })).toBeVisible();
    await expect(page.getByText(/Bolsa de 250 g ·/)).toBeVisible();

    // Total con cantidad 1 = precio unitario.
    await expect(page.locator("p.text-xl.font-bold")).toHaveText(COFFEE.priceRe);

    // "+" sube a 2 → el total se duplica ($ 170.000).
    await page.getByRole("button", { name: /Aumentar cantidad/ }).click();
    await expect(page.locator("p.text-xl.font-bold")).toHaveText(/\$\s170\.000/);

    // "−" vuelve a 1.
    await page.getByRole("button", { name: /Disminuir cantidad/ }).click();
    await expect(page.locator("p.text-xl.font-bold")).toHaveText(COFFEE.priceRe);
  });

  test("quitar el ítem deja el carrito vacío", async ({ page }) => {
    await addToCart(page);
    await page.goto("/cart");

    await page.getByRole("button", { name: "Quitar" }).click();
    await expect(page.getByText("Tu carrito está vacío.")).toBeVisible();
    await expect(page.getByRole("link", { name: /Carrito, 0 artículos/ })).toBeVisible();
  });
});

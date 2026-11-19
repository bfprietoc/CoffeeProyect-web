import { expect, test } from "@playwright/test";
import { COFFEE, getStock, placeOrder } from "./helpers";

/** Fase 3: checkout completo (dirección → validación → pedido) y cancelación. */

test.describe("Checkout", () => {
  test("flujo completo: dirección nueva, validación y pedido confirmado", async ({
    page,
  }) => {
    const { id } = await placeOrder(page);

    // Detalle: estado, ítem, dirección y total.
    await expect(page).toHaveURL(new RegExp(`/orders/${id}$`));
    await expect(page.getByText("Confirmado")).toBeVisible();
    await expect(page.getByText(COFFEE.name)).toBeVisible();
    await expect(page.getByText(/Cra 1 #2-3, Medellín, Antioquia/i)).toBeVisible();
    // El precio también aparece en la línea del ítem; el total es el <p> grande.
    await expect(page.locator("p.text-xl.font-bold")).toHaveText(COFFEE.priceRe);

    // Historial lista la orden.
    await page.goto("/orders");
    await expect(page.getByRole("link", { name: /Ver detalle/ })).toBeVisible();
  });

  test("invitado ve el gate de login en /checkout", async ({ page }) => {
    await page.goto("/checkout");
    await expect(page.getByText(/Inicia sesión para continuar/i)).toBeVisible();
  });

  test("cancelación en dos pasos deja la orden en Cancelado", async ({ page }) => {
    const { stockBefore } = await placeOrder(page);

    await page.getByRole("button", { name: "Cancelar pedido" }).click();
    await expect(page.getByText("¿Cancelar este pedido?")).toBeVisible();
    await page.getByRole("button", { name: "Sí, cancelar" }).click();

    await expect(page.getByText("Cancelado")).toBeVisible();
    // Cancelada → ya no es cancelable: el botón desaparece.
    await expect(page.getByRole("button", { name: "Cancelar pedido" })).toBeHidden();

    // El stock se restituye al cancelar (el badge de la ficha no muestra el
    // número con stock > 5; se verifica por API contra el backend).
    expect(await getStock(page)).toBe(stockBefore);
  });
});

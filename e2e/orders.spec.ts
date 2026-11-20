import { expect, test } from "@playwright/test";
import { placeOrder, register } from "./helpers";

/** Ronda 1 (FEATURES_PLAN #1): descubribilidad de "Mis pedidos".
 *  Las páginas /orders y /orders/{id} ya existían; lo que faltaba era una
 *  entrada permanente (header + cuenta) para volver a ver los pedidos. */

test.describe("Mis pedidos (descubribilidad)", () => {
  test("el header muestra 'Mis pedidos' con sesión y enlaza a la lista", async ({
    page,
  }) => {
    await register(page);

    // El header (role banner): en /orders/{id} también existe un link
    // "← Mis pedidos" de volver, así que se acota al header.
    const link = page
      .getByRole("banner")
      .getByRole("link", { name: "Mis pedidos" });
    await expect(link).toBeVisible();
    await link.click();

    await expect(page).toHaveURL(/\/orders$/);
    await expect(page.getByRole("heading", { name: "Mis pedidos" })).toBeVisible();
  });

  test("tras un pedido, 'Mis pedidos' del header muestra el listado", async ({
    page,
  }) => {
    // placeOrder deja la página en /orders/{id} (redirección del checkout).
    await placeOrder(page);

    // Acotado al header: la ficha del pedido tiene su propio "← Mis pedidos".
    await page
      .getByRole("banner")
      .getByRole("link", { name: "Mis pedidos" })
      .click();
    await expect(page).toHaveURL(/\/orders$/);

    // El pedido recién creado aparece en la lista (id corto de 8 hex).
    await expect(
      page.getByRole("link", { name: /pedido [0-9a-f]{8}/i }),
    ).toBeVisible();
  });

  test("la página de cuenta enlaza a los pedidos", async ({ page }) => {
    await register(page);
    await page.goto("/account");

    await expect(page.getByRole("heading", { name: "Pedidos" })).toBeVisible();
    await page.getByRole("link", { name: /ver mis pedidos/i }).click();
    await expect(page).toHaveURL(/\/orders$/);
  });
});

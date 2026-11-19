import { expect, test } from "@playwright/test";
import { addToCart, register } from "./helpers";

/**
 * Fase 2: merge del carrito invitado. El backend SOLO fusiona en LOGIN
 * (POST /auth/login con X-Session-ID); register no mergea — el flujo real es
 * registrar → logout → login (ver auth_handler.go del backend).
 */

test.describe("Auth + merge del carrito invitado", () => {
  test("el carrito de invitado se fusiona al loguearse", async ({ page }) => {
    // 1 unidad en el carrito como invitado (X-Session-ID en localStorage).
    await addToCart(page);
    await expect(page.getByRole("link", { name: /Carrito, 1 artículo/ })).toBeVisible();

    // Registro: crea la cuenta (sin merge todavía).
    const { email } = await register(page, "E2E Merge");

    // Logout → estado invitado; el X-Session-ID persiste en localStorage.
    await page.getByRole("button", { name: "Salir" }).click();
    await expect(page.getByRole("link", { name: "Ingresar" })).toBeVisible();

    // Login con la cuenta recién creada → el backend fusiona el carrito.
    await page.goto("/login");
    await page.getByLabel("Correo electrónico").fill(email);
    await page.getByLabel("Contraseña").fill("Passw0rd!");
    await page.getByRole("button", { name: "Ingresar" }).click();
    await expect(page.getByText("Hola, E2E Merge")).toBeVisible();

    // El ítem invitado quedó en el carrito del usuario.
    await page.goto("/cart");
    await expect(page.getByText("El Paraíso 92")).toBeVisible();
    await expect(page.getByRole("link", { name: /Carrito, 1 artículo/ })).toBeVisible();
  });

  test("login con contraseña incorrecta no crea sesión", async ({ page }) => {
    const { email } = await register(page, "E2E Login");
    // Logout: volver al estado invitado.
    await page.getByRole("button", { name: "Salir" }).click();
    await expect(page.getByRole("link", { name: "Ingresar" })).toBeVisible();

    await page.goto("/login");
    await page.getByLabel("Correo electrónico").fill(email);
    await page.getByLabel("Contraseña").fill("clave-mal-123");
    await page.getByRole("button", { name: "Ingresar" }).click();
    await expect(page.getByText(/Correo o contraseña incorrectos/)).toBeVisible();
  });
});

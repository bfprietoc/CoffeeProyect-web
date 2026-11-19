import { expect, type Page } from "@playwright/test";

/** El Paraíso 92: café seedeado (migrations/seed.sql del backend). */
export const COFFEE = {
  name: "El Paraíso 92",
  price: "$\u00a085.000", // es-CO usa NBSP como separador de miles
  priceRe: /\$\s85\.000/,
};

/** Datos del café de prueba desde la API del backend (:8080). */
export async function getTestCoffee(
  page: Page,
): Promise<{ id: string; stockBags: number }> {
  const res = await page.request.get("http://localhost:8080/coffees?limit=50");
  const coffees: { id: string; name: string; stock_bags: number }[] =
    await res.json();
  const coffee = coffees.find((c) => c.name === COFFEE.name);
  if (!coffee) throw new Error("café de prueba no encontrado en la API");
  return { id: coffee.id, stockBags: coffee.stock_bags };
}

/** Stock actual del café de prueba (el badge no lo muestra con stock > 5). */
export async function getStock(page: Page): Promise<number> {
  return (await getTestCoffee(page)).stockBags;
}

/** Correo único por run para no chocar con EMAIL_CONFLICT entre specs. */
export function uniqueEmail(prefix = "e2e-pw") {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e4)}@test.com`;
}

/** Registro por UI. Devuelve el nombre con el que queda logueado. */
export async function register(page: Page, name = "E2E Playwright") {
  const email = uniqueEmail();
  await page.goto("/register");
  await page.getByLabel("Nombre").fill(name);
  await page.getByLabel("Correo electrónico").fill(email);
  await page.getByLabel("Contraseña").fill("Passw0rd!");
  await page.getByRole("button", { name: "Crear cuenta" }).click();
  await expect(page.getByText(`Hola, ${name}`)).toBeVisible();
  return { name, email };
}

/** Agrega el café seedeado al carrito desde la ficha (vía catálogo). */
export async function addToCart(page: Page) {
  await page.goto("/coffees");
  await page.getByRole("link", { name: COFFEE.name }).click();
  await expect(page.getByRole("heading", { name: COFFEE.name })).toBeVisible();
  await page.getByRole("button", { name: "Agregar al carrito" }).click();
  await expect(page.getByRole("button", { name: "Agregado ✓" })).toBeVisible();
}

/** Crea una dirección en el checkout (la primera queda predeterminada). */
export async function createAddress(page: Page) {
  await page.getByRole("button", { name: "Agregar nueva dirección" }).click();
  await page.getByLabel("Etiqueta").fill("Casa E2E");
  await page.getByLabel("Calle y número").fill("Cra 1 #2-3");
  await page.getByLabel("Ciudad").fill("Medellín");
  await page.getByLabel("Departamento").fill("Antioquia");
  await page.getByLabel(/País/).fill("CO");
  await page.getByRole("button", { name: "Guardar dirección" }).click();
  await expect(page.getByText("Casa E2E")).toBeVisible();
}

/**
 * Flujo completo: registro → carrito → checkout → pedido confirmado.
 * Deja la página en /orders/{id} y devuelve el id de la orden + el stock
 * del café ANTES del pedido (para verificar la restitución al cancelar).
 */
export async function placeOrder(page: Page) {
  const stockBefore = await getStock(page);

  await register(page);
  await addToCart(page);

  await page.goto("/checkout");
  await createAddress(page);

  // Validación: stock disponible por ítem + total.
  await expect(page.getByText(new RegExp(`Stock disponible: ${stockBefore}`))).toBeVisible();
  await expect(page.getByText(COFFEE.priceRe)).toBeVisible();

  await page.getByRole("button", { name: "Confirmar pedido" }).click();

  // waitForURL resuelve a void en esta versión: se lee el URL con page.url().
  await page.waitForURL(/\/orders\/[0-9a-f-]{36}/);
  await expect(page.getByText("Confirmado")).toBeVisible();
  const id = new URL(page.url()).pathname.split("/").pop();
  if (!id) throw new Error("no se pudo extraer el id de la orden");
  return { id, stockBefore };
}

/** Formatea `price_cents` + ISO currency como moneda local (ej. COP → "$ 920.000"). */
export function formatPrice(priceCents: number, currency: string): string {
  try {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(priceCents / 100);
  } catch {
    // Currency inválida: fallback simple
    return `${(priceCents / 100).toFixed(2)} ${currency}`;
  }
}

/** Etiquetas en español para los valores del backend (espejo de internal/domain). */

const ROAST_LABELS: Record<string, string> = {
  light: "Tostado claro",
  medium: "Tostado medio",
  dark: "Tostado oscuro",
};

const PROCESS_LABELS: Record<string, string> = {
  washed: "Lavado",
  natural: "Natural",
  honey: "Honey",
  anaerobic: "Anaeróbico",
};

/** Capitaliza un valor desconocido para no mostrarlo en minúsculas. */
function fallbackLabel(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function roastLabel(roastLevel: string): string {
  return ROAST_LABELS[roastLevel] ?? fallbackLabel(roastLevel);
}

export function processLabel(process: string): string {
  return PROCESS_LABELS[process] ?? fallbackLabel(process);
}

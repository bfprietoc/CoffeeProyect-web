"use client";

import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";

/**
 * Render con un QueryClient fresco por test (retry desactivado para que los
 * errores fallen de una vez).
 */
export function renderWithQueryClient(ui: ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}

/**
 * Promise "ya resuelta" para params de rutas dinámicas en client pages
 * (Next 16 pasa `params` como Promise y la página la lee con `use()`).
 *
 * React lee `thenable.status === "fulfilled"` de forma síncrona
 * (resolveThenable) y devuelve `thenable.value` sin suspender — es el mismo
 * mecanismo por el que Next pre-marca la Promise en producción. En este
 * entorno jsdom el retry de suspensión no se flusha (verificado con probes),
 * así que pre-marcar es la única forma de probar estas páginas.
 */
export function resolvedParams<T>(value: T): Promise<T> {
  const p = Promise.resolve(value) as Promise<T> & { status?: string; value?: T };
  p.status = "fulfilled";
  p.value = value;
  return p;
}

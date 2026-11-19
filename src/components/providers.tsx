"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { getAccessToken, getRefreshToken, refreshTokens } from "@/lib/auth/session";

let browserQueryClient: QueryClient | undefined;

function getQueryClient() {
  // Cada render en el servidor tiene su client (aislado); en el browser se
  // reutiliza uno solo para conservar la cache entre renders.
  if (typeof window === "undefined") return new QueryClient();
  browserQueryClient ??= new QueryClient();
  return browserQueryClient;
}

export function Providers({ children }: { children: ReactNode }) {
  // Tras una recarga completa el access token (en memoria) se pierde. Si
  // queda refresh en localStorage, restaura la sesión para que un usuario
  // logueado no se trate como invitado (header, carrito, órdenes). El
  // setTokens() del refresh notifica a todos los suscriptores.
  useEffect(() => {
    if (getAccessToken() === null && getRefreshToken()) {
      void refreshTokens();
    }
  }, []);

  return (
    <QueryClientProvider client={getQueryClient()}>
      {children}
    </QueryClientProvider>
  );
}

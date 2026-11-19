"use client";

import { useState } from "react";
import { ApiError } from "@/lib/api/client";
import { adminListOrders } from "@/lib/api/endpoints";
import { setAdminKey } from "@/lib/auth/admin-session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * "Login" del panel admin: pide la API key (X-Api-Key) y la verifica contra
 * la API antes de aceptarla. La clave vive SOLO en memoria (admin-session.ts):
 * al recargar la pestaña se pierde y hay que volver a ingresarla.
 */
export function AdminLoginForm() {
  const [apiKey, setApiKey] = useState("");
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const key = apiKey.trim();
    if (!key || checking) return;
    setChecking(true);
    setError("");
    try {
      // Llamada ligera solo para validar la clave (401 si es inválida).
      await adminListOrders(key, { limit: 1 });
      setAdminKey(key);
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 401
          ? "Clave inválida. Verifica con quien administra el backend."
          : "No se pudo verificar la clave. Intenta de nuevo.",
      );
    } finally {
      setChecking(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Panel admin</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Ingresa la API key de administración (ADMIN_API_KEY del backend).
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="admin-api-key">API key</Label>
        <Input
          id="admin-api-key"
          type="password"
          autoComplete="off"
          value={apiKey}
          onChange={(e) => {
            setApiKey(e.target.value);
            setError("");
          }}
          placeholder="••••••••"
        />
      </div>

      {error && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {error}
        </p>
      )}

      <Button type="submit" disabled={!apiKey.trim() || checking}>
        {checking ? "Verificando…" : "Entrar al panel"}
      </Button>

      <p className="text-xs text-muted-foreground">
        La clave no se guarda en el navegador: solo vive en memoria mientras
        la pestaña esté abierta. Al recargar, vuelve a pedirla.
      </p>
    </form>
  );
}

"use client";

import { useState } from "react";
import { ApiError } from "@/lib/api/client";
import { subscribeWaitlist } from "@/lib/api/endpoints";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface WaitlistFormProps {
  coffeeId: string;
  coffeeName: string;
}

type Status = "idle" | "submitting" | "success" | "error";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * "Avísame cuando vuelva" (Fase 1): suscribe al waitlist de un café agotado.
 * POST /waitlist con { coffee_id, email }; si hay sesión, el backend asocia
 * la suscripción al usuario (X-Session-ID/Authorization los inyecta el client).
 */
export function WaitlistForm({ coffeeId, coffeeName }: WaitlistFormProps) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!EMAIL_RE.test(trimmed)) {
      setStatus("error");
      setErrorMessage("Ingresa un correo válido.");
      return;
    }
    setStatus("submitting");
    setErrorMessage("");
    try {
      await subscribeWaitlist({ coffee_id: coffeeId, email: trimmed });
      setStatus("success");
    } catch (err) {
      setStatus("error");
      setErrorMessage(
        err instanceof ApiError
          ? err.message
          : "No se pudo completar la suscripción. Intenta de nuevo.",
      );
    }
  }

  if (status === "success") {
    return (
      <p className="rounded-lg bg-secondary px-4 py-3 text-sm font-medium">
        ✅ ¡Listo! Te avisaremos cuando {coffeeName} vuelva a estar disponible.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-2">
      <Label htmlFor={`waitlist-email-${coffeeId}`}>Correo electrónico</Label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          id={`waitlist-email-${coffeeId}`}
          type="email"
          placeholder="tu@correo.com"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (status === "error") setStatus("idle");
          }}
          disabled={status === "submitting"}
          required
          className="sm:max-w-xs"
        />
        <Button type="submit" disabled={status === "submitting"}>
          {status === "submitting" ? "Suscribiendo…" : "Avísame cuando vuelva"}
        </Button>
      </div>
      {status === "error" && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {errorMessage}
        </p>
      )}
    </form>
  );
}

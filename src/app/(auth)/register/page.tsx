"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { ApiError } from "@/lib/api/client";
import { googleLogin, register } from "@/lib/api/endpoints";
import { GoogleLoginButton } from "@/components/auth/google-login-button";
import { setTokens } from "@/lib/auth/session";
import { useSession } from "@/lib/auth/use-session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Solo acepta rutas internas (evita open redirect). */
function safeNext(next: string | null): string {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated } = useSession();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  // Guard one-shot al montar: si ya hay sesión, redirige. No reactivivo,
  // para no pelear con el router.push(next) del propio submit.
  const guardChecked = useRef(false);

  useEffect(() => {
    if (guardChecked.current) return;
    guardChecked.current = true;
    if (isAuthenticated) router.replace("/");
  }, [isAuthenticated, router]);

  // Next 16 (Cache Components) preserva esta ruta con <Activity> sin
  // desmontarla: al volver a /register el árbol se re-muestra con su estado.
  // Por eso el submit exitoso resetea explícitamente antes de navegar
  // (sin esto el botón quedaría atorado en "Creando cuenta…").
  function resetForm() {
    setName("");
    setEmail("");
    setPassword("");
    setStatus("idle");
    setErrorMessage("");
  }

  // Registro con Google: el backend crea la cuenta en el primer ingreso
  // (sin contraseña) o entra con la existente si el email ya estaba.
  async function handleGoogleCredential(credential: string) {
    setErrorMessage("");
    try {
      const res = await googleLogin(credential);
      setTokens(res.tokens.access_token, res.tokens.refresh_token);
      resetForm();
      router.push(safeNext(searchParams.get("next")));
    } catch (err) {
      setErrorMessage(
        err instanceof ApiError && err.code === "INVALID_GOOGLE_TOKEN"
          ? "No se pudo validar tu cuenta de Google. Intenta de nuevo."
          : err instanceof ApiError && err.code === "GOOGLE_AUTH_DISABLED"
            ? "El registro con Google no está disponible."
            : "No se pudo crear la cuenta con Google.",
      );
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    if (!trimmedName) {
      setErrorMessage("Ingresa tu nombre.");
      return;
    }
    if (!EMAIL_RE.test(trimmedEmail)) {
      setErrorMessage("Ingresa un correo válido.");
      return;
    }
    if (password.length < 8) {
      setErrorMessage("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    setStatus("submitting");
    setErrorMessage("");
    try {
      const res = await register({ name: trimmedName, email: trimmedEmail, password });
      setTokens(res.tokens.access_token, res.tokens.refresh_token);
      // Reset antes de navegar: la ruta se preserva con su estado, y sin
      // esto el botón quedaría atorado en "Creando cuenta…" al volver.
      resetForm();
      router.push(safeNext(searchParams.get("next")));
    } catch (err) {
      setStatus("idle");
      setErrorMessage(
        err instanceof ApiError && err.code === "EMAIL_CONFLICT"
          ? "Ese correo ya está registrado. ¿Inicias sesión?"
          : err instanceof ApiError
            ? err.message
            : "No se pudo conectar con la API. Intenta de nuevo.",
      );
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Crear cuenta</h1>
      <p className="text-sm text-muted-foreground">
        Haz seguimiento de tus pedidos y guarda tus direcciones.
      </p>

      {process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ? (
        <>
          <GoogleLoginButton onCredential={handleGoogleCredential} buttonText="signup_with" />
          <div className="flex items-center gap-3" aria-hidden>
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">o</span>
            <div className="h-px flex-1 bg-border" />
          </div>
        </>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="register-name">Nombre</Label>
        <Input
          id="register-name"
          placeholder="Tu nombre"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setErrorMessage("");
          }}
          disabled={status === "submitting"}
          autoComplete="name"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="register-email">Correo electrónico</Label>
        <Input
          id="register-email"
          type="email"
          placeholder="tu@correo.com"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setErrorMessage("");
          }}
          disabled={status === "submitting"}
          autoComplete="email"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="register-password">Contraseña</Label>
        <Input
          id="register-password"
          type="password"
          placeholder="Mínimo 8 caracteres"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setErrorMessage("");
          }}
          disabled={status === "submitting"}
          autoComplete="new-password"
        />
      </div>

      {errorMessage && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {errorMessage}
        </p>
      )}

      <Button type="submit" disabled={status === "submitting"}>
        {status === "submitting" ? "Creando cuenta…" : "Crear cuenta"}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        ¿Ya tienes cuenta?{" "}
        <Link
          href="/login"
          className="font-medium text-foreground transition-colors hover:text-primary"
        >
          Inicia sesión
        </Link>
      </p>
    </form>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterForm />
    </Suspense>
  );
}

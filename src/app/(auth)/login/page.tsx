"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { ApiError } from "@/lib/api/client";
import { googleLogin, login } from "@/lib/api/endpoints";
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

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated } = useSession();

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
  // desmontarla: al volver a /login el árbol se re-muestra con su estado.
  // Por eso el submit exitoso resetea explícitamente antes de navegar
  // (sin esto el botón quedaría atorado en "Ingresando…").
  function resetForm() {
    setEmail("");
    setPassword("");
    setStatus("idle");
    setErrorMessage("");
  }

  // Login con Google: el botón oficial entrega un ID token (credential) que
  // el backend valida contra Google. Mismo post-proceso que el login por
  // email: tokens en sesión + merge del carrito invitado (X-Session-ID).
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
            ? "El inicio de sesión con Google no está disponible."
            : "No se pudo iniciar sesión con Google.",
      );
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedEmail = email.trim();
    if (!EMAIL_RE.test(trimmedEmail)) {
      setErrorMessage("Ingresa un correo válido.");
      return;
    }
    if (!password) {
      setErrorMessage("Ingresa tu contraseña.");
      return;
    }
    setStatus("submitting");
    setErrorMessage("");
    try {
      // El client inyecta X-Session-ID: el backend fusiona el carrito invitado.
      const res = await login({ email: trimmedEmail, password });
      setTokens(res.tokens.access_token, res.tokens.refresh_token);
      // Reset antes de navegar: la ruta se preserva con su estado, y sin
      // esto el botón quedaría atorado en "Ingresando…" al volver.
      resetForm();
      router.push(safeNext(searchParams.get("next")));
    } catch (err) {
      setStatus("idle");
      setErrorMessage(
        err instanceof ApiError && err.code === "UNAUTHORIZED"
          ? "Correo o contraseña incorrectos."
          : err instanceof ApiError
            ? err.message
            : "No se pudo conectar con la API. Intenta de nuevo.",
      );
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Iniciar sesión</h1>
      <p className="text-sm text-muted-foreground">
        Tu carrito de invitado se fusiona al entrar.
      </p>

      {process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ? (
        <>
          <GoogleLoginButton onCredential={handleGoogleCredential} />
          <div className="flex items-center gap-3" aria-hidden>
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">o</span>
            <div className="h-px flex-1 bg-border" />
          </div>
        </>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="login-email">Correo electrónico</Label>
        <Input
          id="login-email"
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
        <Label htmlFor="login-password">Contraseña</Label>
        <Input
          id="login-password"
          type="password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setErrorMessage("");
          }}
          disabled={status === "submitting"}
          autoComplete="current-password"
        />
      </div>

      {errorMessage && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {errorMessage}
        </p>
      )}

      <Button type="submit" disabled={status === "submitting"}>
        {status === "submitting" ? "Ingresando…" : "Ingresar"}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        ¿No tienes cuenta?{" "}
        <Link
          href="/register"
          className="font-medium text-foreground transition-colors hover:text-primary"
        >
          Regístrate
        </Link>
      </p>
    </form>
  );
}

export default function LoginPage() {
  return (
    // Suspense: useSearchParams requiere un boundary durante el prerender.
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

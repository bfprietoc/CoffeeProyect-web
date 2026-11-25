"use client";

import { useEffect, useRef } from "react";

const GIS_SRC = "https://accounts.google.com/gsi/client";

type GisClient = {
  accounts: {
    id: {
      initialize: (options: {
        client_id: string;
        callback: (res: { credential: string }) => void;
      }) => void;
      renderButton: (el: HTMLElement, options: Record<string, unknown>) => void;
    };
  };
};

declare global {
  interface Window {
    google?: GisClient;
    __coffeeGisLoading?: Promise<void>;
  }
}

// Carga el script de Google Identity Services una sola vez (la SPA puede
// montar el botón en varias rutas). Si window.google ya existe, resuelve
// de inmediato (también facilita los tests).
function loadGis(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("window no disponible"));
  }
  if (window.google?.accounts?.id) return Promise.resolve();
  if (window.__coffeeGisLoading) return window.__coffeeGisLoading;
  window.__coffeeGisLoading = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = GIS_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      window.__coffeeGisLoading = undefined; // permite reintentar
      reject(new Error("no se pudo cargar Google Identity Services"));
    };
    document.head.appendChild(script);
  });
  return window.__coffeeGisLoading;
}

type GoogleButtonText = "continue_with" | "sign_in_with" | "signup_with";

type Props = {
  onCredential: (credential: string) => void;
  /** Texto del botón oficial. Default: "continue_with". */
  buttonText?: GoogleButtonText;
};

/**
 * Botón oficial de Google Identity Services (login con Google).
 *
 * Solo se renderiza si `NEXT_PUBLIC_GOOGLE_CLIENT_ID` está definido; sin la
 * variable (dev sin configurar, CI) no aparece y el resto de la página
 * funciona igual. Si el script de Google no carga (sin red, bloqueado), el
 * botón simplemente no se pinta: nunca rompe la página.
 */
export function GoogleLoginButton({ onCredential, buttonText = "continue_with" }: Props) {
  const clientID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const containerRef = useRef<HTMLDivElement>(null);
  // El callback vive en un ref (sincronizado en efecto): el efecto principal
  // no debe re-ejecutarse por la identidad de la prop (re-renders del
  // formulario padre).
  const callbackRef = useRef(onCredential);
  useEffect(() => {
    callbackRef.current = onCredential;
  }, [onCredential]);

  useEffect(() => {
    if (!clientID) return;
    let cancelled = false;
    loadGis()
      .then(() => {
        if (cancelled || !containerRef.current || !window.google) return;
        window.google.accounts.id.initialize({
          client_id: clientID,
          callback: (res) => callbackRef.current(res.credential),
        });
        window.google.accounts.id.renderButton(containerRef.current, {
          theme: "outline",
          size: "medium",
          shape: "pill",
          text: buttonText,
          width: 320,
        });
      })
      .catch(() => {
        // sin red / script bloqueado: el botón no aparece, nada más
      });
    return () => {
      cancelled = true;
    };
  }, [clientID, buttonText]);

  if (!clientID) return null;
  return (
    <div
      ref={containerRef}
      data-testid="google-login-button"
      className="flex min-h-10 justify-center"
    />
  );
}

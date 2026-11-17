import { getAccessToken, getGuestSessionId, refreshTokens } from "@/lib/auth/session";
import type { ApiErrorBody, ApiErrorCode } from "@/lib/types";
import { API_URL } from "./config";

/** Error de la API con el status HTTP y el `code` del body `{ error, code }`. */
export class ApiError extends Error {
  readonly status: number;
  readonly code?: ApiErrorCode;

  constructor(status: number, message: string, code?: ApiErrorCode) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

export interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
  /** Inyectar Authorization si hay access token (default true). */
  withAuth?: boolean;
  /** Inyectar X-Session-ID del carrito invitado (default true). */
  withSessionId?: boolean;
  /** Interno: marca el reintento post-refresh para no buclar. */
  retried?: boolean;
}

async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const withAuth = opts.withAuth ?? true;
  const withSessionId = opts.withSessionId ?? true;

  const headers: Record<string, string> = { ...opts.headers };
  if (withAuth) {
    const token = getAccessToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  if (withSessionId) {
    const sessionId = getGuestSessionId();
    if (sessionId) headers["X-Session-ID"] = sessionId;
  }
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method: opts.method ?? "GET",
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      cache: "no-store",
    });
  } catch {
    throw new ApiError(0, "No se pudo conectar con la API");
  }

  // 401 → intentar refresh una sola vez y reintentar la request original
  if (res.status === 401 && withAuth && !opts.retried) {
    const refreshed = await refreshTokens();
    if (refreshed) {
      return request<T>(path, { ...opts, retried: true });
    }
  }

  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    let code: ApiErrorCode | undefined;
    try {
      const data = (await res.json()) as ApiErrorBody;
      if (typeof data.error === "string" && data.error) message = data.error;
      if (typeof data.code === "string") code = data.code as ApiErrorCode;
    } catch {
      // body no JSON: se queda el mensaje genérico
    }
    throw new ApiError(res.status, message, code);
  }

  // Algunos endpoints responden 204 o body vacío
  const text = await res.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

export const api = {
  get: <T>(path: string, opts?: Omit<RequestOptions, "method" | "body">) =>
    request<T>(path, { ...opts, method: "GET" }),
  post: <T>(path: string, body?: unknown, opts?: Omit<RequestOptions, "method" | "body">) =>
    request<T>(path, { ...opts, method: "POST", body }),
  put: <T>(path: string, body?: unknown, opts?: Omit<RequestOptions, "method" | "body">) =>
    request<T>(path, { ...opts, method: "PUT", body }),
  patch: <T>(path: string, body?: unknown, opts?: Omit<RequestOptions, "method" | "body">) =>
    request<T>(path, { ...opts, method: "PATCH", body }),
  delete: <T>(path: string, opts?: Omit<RequestOptions, "method" | "body">) =>
    request<T>(path, { ...opts, method: "DELETE" }),
};

/** Construye una query string; omite valores undefined. */
export function toQueryString(
  params: Record<string, string | number | boolean | undefined>,
): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue;
    search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

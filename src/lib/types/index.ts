export * from "./auth";
export * from "./cart";
export * from "./checkout";
export * from "./coffee";
export * from "./order";
export * from "./payment";
export * from "./stock";
export * from "./user";
export * from "./waitlist";

/** Códigos de error que devuelve el backend en `{ "error": ..., "code": ... }`. */
export type ApiErrorCode =
  | "NOT_FOUND"
  | "UNAUTHORIZED"
  | "EMAIL_CONFLICT"
  | "CONFLICT"
  | "BAD_REQUEST"
  | "INVALID_INPUT"
  | "UNAVAILABLE"
  | "INTERNAL_ERROR"
  | "PAYMENTS_DISABLED"
  | "PAYMENT_ALREADY_PAID"
  | "PAYMENT_UNAVAILABLE"
  | "PAYMENT_REQUIRED"
  | "BAD_SIGNATURE"
  | "INVALID_GOOGLE_TOKEN"
  | "GOOGLE_AUTH_DISABLED";

export interface ApiErrorBody {
  error: string;
  code?: ApiErrorCode;
}

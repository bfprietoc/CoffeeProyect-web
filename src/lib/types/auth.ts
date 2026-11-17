// Espejo de internal/auth/jwt.go (TokenPair) y respuestas del handler de auth

import type { User } from "./user";

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  expires_in: number; // segundos
}

/** Respuesta de POST /auth/register y POST /auth/login. */
export interface AuthResponse {
  user: User;
  tokens: TokenPair;
}

/** Body de POST /auth/register. */
export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

/** Body de POST /auth/login. */
export interface LoginRequest {
  email: string;
  password: string;
}

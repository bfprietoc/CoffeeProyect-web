// Espejo de internal/domain/user.go (backend CoffeeProyect)

export interface User {
  id: string;
  name: string;
  email: string;
  created_at: string; // RFC3339 (time.Time)
}

export interface Address {
  id: string;
  user_id: string;
  label: string;
  street: string;
  city: string;
  department: string;
  country: string;
  is_default: boolean;
}

/** Body de POST /users/me/addresses. */
export interface CreateAddressRequest {
  label: string;
  street: string;
  city: string;
  department: string;
  country: string;
  is_default?: boolean;
}

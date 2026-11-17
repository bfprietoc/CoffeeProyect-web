// Espejo de internal/domain/waitlist.go (backend CoffeeProyect)

export interface WaitlistEntry {
  id: string;
  coffee_id: string;
  user_id?: string; // ausente si es invitado (omitempty)
  email: string;
  notified: boolean;
  created_at: string;
}

/** Body de POST /waitlist. */
export interface SubscribeWaitlistRequest {
  coffee_id: string;
  email: string;
}

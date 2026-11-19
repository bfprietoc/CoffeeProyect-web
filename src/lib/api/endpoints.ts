import type {
  Address,
  AdjustStockRequest,
  AddCartItemRequest,
  AuthResponse,
  Cart,
  Coffee,
  CoffeeFilters,
  CoffeePagination,
  CreateAddressRequest,
  CreateCoffeeRequest,
  LoginRequest,
  Order,
  PlaceOrderRequest,
  RegisterRequest,
  SetQuantityRequest,
  StockMovement,
  SubscribeWaitlistRequest,
  UpdateCoffeeRequest,
  UpdateOrderStatusRequest,
  User,
  UserProfile,
  ValidationResult,
  WaitlistEntry,
} from "@/lib/types";
import { api, toQueryString } from "./client";

// ---------- health ----------

export const getHealth = () => api.get<{ status: string }>("/health");

// ---------- coffees (público) ----------

export const listCoffees = (filters?: CoffeeFilters & CoffeePagination) =>
  api.get<Coffee[]>(
    `/coffees${toQueryString(filters as Record<string, string | number | boolean | undefined>)}`,
  );

export const getCoffee = (id: string) => api.get<Coffee>(`/coffees/${id}`);

// ---------- auth ----------

export const register = (body: RegisterRequest) =>
  api.post<AuthResponse>("/auth/register", body, { withAuth: false });

// X-Session-ID se inyecta igual: el backend fusiona el carrito invitado al login
export const login = (body: LoginRequest) =>
  api.post<AuthResponse>("/auth/login", body, { withAuth: false });

// ---------- cart (invitado o usuario) ----------

export const getCart = () => api.get<Cart>("/cart");

export const addCartItem = (body: AddCartItemRequest) =>
  api.post<Cart>("/cart/items", body);

export const setCartItemQuantity = (coffeeId: string, body: SetQuantityRequest) =>
  api.patch<Cart>(`/cart/items/${coffeeId}`, body);

export const removeCartItem = (coffeeId: string) =>
  api.delete<Cart>(`/cart/items/${coffeeId}`);

export const clearCart = () => api.delete<Cart>("/cart");

// ---------- user (JWT) ----------

export const getMe = () => api.get<UserProfile>("/users/me");

export const updateMe = (body: { name: string }) => api.put<User>("/users/me", body);

export const listAddresses = () => api.get<Address[]>("/users/me/addresses");

export const addAddress = (body: CreateAddressRequest) =>
  api.post<Address>("/users/me/addresses", body);

export const deleteAddress = (id: string) => api.delete<void>(`/users/me/addresses/${id}`);

// ---------- checkout y orders (JWT) ----------

export const validateCheckout = () => api.get<ValidationResult>("/checkout/validate");

export const placeOrder = (body: PlaceOrderRequest) => api.post<Order>("/orders", body);

export const listOrders = () => api.get<Order[]>("/orders");

export const getOrder = (id: string) => api.get<Order>(`/orders/${id}`);

export const cancelOrder = (id: string) => api.post<Order>(`/orders/${id}/cancel`);

// ---------- waitlist (invitado o usuario) ----------

export const subscribeWaitlist = (body: SubscribeWaitlistRequest) =>
  api.post<WaitlistEntry>("/waitlist", body);

// ---------- admin (X-Api-Key en memoria, nunca en localStorage) ----------

export const adminCreateCoffee = (apiKey: string, body: CreateCoffeeRequest) =>
  api.post<Coffee>("/admin/coffees", body, { headers: { "X-Api-Key": apiKey } });

export const adminUpdateCoffee = (apiKey: string, id: string, body: UpdateCoffeeRequest) =>
  api.put<Coffee>(`/admin/coffees/${id}`, body, { headers: { "X-Api-Key": apiKey } });

export const adminDeleteCoffee = (apiKey: string, id: string) =>
  api.delete<void>(`/admin/coffees/${id}`, { headers: { "X-Api-Key": apiKey } });

export const adminGetStock = (apiKey: string, id: string) =>
  api.get<StockMovement[]>(`/admin/coffees/${id}/stock`, {
    headers: { "X-Api-Key": apiKey },
  });

export const adminAdjustStock = (apiKey: string, id: string, body: AdjustStockRequest) =>
  api.patch<StockMovement>(`/admin/coffees/${id}/stock`, body, {
    headers: { "X-Api-Key": apiKey },
  });

export const adminListOrders = (apiKey: string) =>
  api.get<Order[]>("/admin/orders", { headers: { "X-Api-Key": apiKey } });

export const adminUpdateOrderStatus = (
  apiKey: string,
  id: string,
  body: UpdateOrderStatusRequest,
) => api.patch<Order>(`/admin/orders/${id}/status`, body, { headers: { "X-Api-Key": apiKey } });

import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { act, render, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  adminAdjustStock,
  adminListOrders,
  adminUpdateOrderStatus,
} from "@/lib/api/endpoints";
import { clearAdminKey, setAdminKey } from "@/lib/auth/admin-session";
import type { AdjustStockResult, Coffee, Order } from "@/lib/types";
import {
  adminCoffeesKey,
  adminOrdersKey,
  adminStockKey,
  useAdminAdjustStock,
  useAdminUpdateOrderStatus,
} from "./admin";

vi.mock("@/lib/api/endpoints", () => ({
  adminAdjustStock: vi.fn(),
  adminListOrders: vi.fn(),
  adminUpdateOrderStatus: vi.fn(),
}));

const coffee: Coffee = {
  id: "c1",
  name: "El Paraíso 92",
  process: "washed",
  roast_level: "medium",
  tasting_notes: [],
  description: "",
  producer: { id: "p1", name: "Pedro" },
  farm: { id: "f1", name: "El Paraíso", country: "CO", region: "Urabá" },
  bag_size_grams: 250,
  price_cents: 8500000,
  currency: "COP",
  available: true,
  stock_bags: 12,
};

const order: Order = {
  id: "o1",
  user_id: "u1",
  items: [],
  shipping_street: "Cra 1 #2-3",
  shipping_city: "Medellín",
  shipping_department: "Antioquia",
  shipping_country: "CO",
  total_cents: 8500000,
  currency: "COP",
  status: "confirmed",
  payment_status: "paid",
  created_at: "2026-11-19T12:00:00Z",
  updated_at: "2026-11-19T12:00:00Z",
};

const adjustResult: AdjustStockResult = {
  coffee_id: "c1",
  old_stock: 12,
  result_stock: 17,
};

function makeClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function wrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

describe("useAdminAdjustStock", () => {
  afterEach(() => {
    vi.clearAllMocks();
    clearAdminKey();
  });

  it("llama a PATCH de stock e invalida lista de cafés + stock del café", async () => {
    setAdminKey("k1");
    vi.mocked(adminAdjustStock).mockResolvedValue(adjustResult);
    const client = makeClient();

    // Probes con las mismas claves que consumen CoffeesTab/StockPanel:
    // si la invalidación no funciona, el stock visible nunca se actualizaría.
    const fetchCoffees = vi.fn().mockResolvedValue([coffee]);
    const fetchStock = vi.fn().mockResolvedValue({
      coffee_id: "c1",
      stock_bags: 12,
      movements: [],
    });
    function Probes() {
      const a = useQuery({ queryKey: adminCoffeesKey, queryFn: fetchCoffees });
      const b = useQuery({ queryKey: adminStockKey("c1"), queryFn: fetchStock });
      return <p>{a.data?.length}-{b.data?.stock_bags}</p>;
    }

    const { result, unmount } = renderHook(() => useAdminAdjustStock(), {
      wrapper: wrapper(client),
    });
    render(<Probes />, { wrapper: wrapper(client) });
    await waitFor(() => expect(fetchCoffees).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(fetchStock).toHaveBeenCalledTimes(1));

    await act(async () => {
      await result.current.mutateAsync({
        coffeeId: "c1",
        body: { operation: "add", quantity: 5, note: "lote nuevo" },
      });
    });

    expect(adminAdjustStock).toHaveBeenCalledWith(
      "k1",
      "c1",
      { operation: "add", quantity: 5, note: "lote nuevo" },
    );
    await waitFor(() => expect(fetchCoffees).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(fetchStock).toHaveBeenCalledTimes(2));

    unmount();
  });
});

describe("useAdminUpdateOrderStatus", () => {
  afterEach(() => {
    vi.clearAllMocks();
    clearAdminKey();
  });

  it("llama a PATCH de estado e invalida todos los filtros de órdenes", async () => {
    setAdminKey("k1");
    vi.mocked(adminUpdateOrderStatus).mockResolvedValue({ ...order, status: "shipped" });
    vi.mocked(adminListOrders).mockResolvedValue([order]);
    const client = makeClient();

    // Probes con dos filtros distintos: la invalidación por prefijo debe
    // refetchearlos a ambos.
    const fetchAll = vi.fn().mockResolvedValue([order]);
    const fetchShipped = vi.fn().mockResolvedValue([]);
    function Probes() {
      const a = useQuery({ queryKey: adminOrdersKey(undefined), queryFn: fetchAll });
      const b = useQuery({ queryKey: adminOrdersKey("shipped"), queryFn: fetchShipped });
      return <p>{a.data?.length}-{b.data?.length}</p>;
    }

    const { result, unmount } = renderHook(() => useAdminUpdateOrderStatus(), {
      wrapper: wrapper(client),
    });
    render(<Probes />, { wrapper: wrapper(client) });
    await waitFor(() => expect(fetchAll).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(fetchShipped).toHaveBeenCalledTimes(1));

    await act(async () => {
      await result.current.mutateAsync({
        id: "o1",
        body: { status: "shipped", tracking_number: "SEI-123" },
      });
    });

    expect(adminUpdateOrderStatus).toHaveBeenCalledWith(
      "k1",
      "o1",
      { status: "shipped", tracking_number: "SEI-123" },
    );
    await waitFor(() => expect(fetchAll).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(fetchShipped).toHaveBeenCalledTimes(2));

    unmount();
  });
});

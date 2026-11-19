import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { act, render, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { deleteAddress, updateMe } from "@/lib/api/endpoints";
import type { Address, UserProfile } from "@/lib/types";
import { useDeleteAddress, useUpdateProfile } from "./account";
import { meKey } from "./cart";
import { addressesKey } from "./orders";

vi.mock("@/lib/api/endpoints", () => ({
  updateMe: vi.fn(),
  deleteAddress: vi.fn(),
  listAddresses: vi.fn(),
}));

const profile: UserProfile = {
  id: "u1",
  name: "E2E Fase 4",
  email: "fase4@test.com",
  created_at: "2026-11-19T12:00:00Z",
  addresses: [],
};

const address: Address = {
  id: "a1",
  user_id: "u1",
  label: "Casa",
  street: "Cra 1 #2-3",
  city: "Medellín",
  department: "Antioquia",
  country: "CO",
  is_default: true,
};

function makeClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function wrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

describe("useUpdateProfile", () => {
  afterEach(() => vi.clearAllMocks());

  it("llama a PUT /users/me e invalida el perfil (refetch del header)", async () => {
    vi.mocked(updateMe).mockResolvedValue({ ...profile, name: "Nuevo Nombre" });
    const client = makeClient();

    // Probe con la misma clave que useMe (cart.ts): si la invalidación no
    // funciona, el header nunca vería el rename.
    const fetchMe = vi.fn().mockResolvedValue(profile);
    function MeProbe() {
      const q = useQuery({ queryKey: meKey, queryFn: fetchMe });
      return <p>{q.data?.name ?? "…"}</p>;
    }

    const { result, unmount } = renderHook(() => useUpdateProfile(), {
      wrapper: wrapper(client),
    });
    render(<MeProbe />, { wrapper: wrapper(client) });
    await waitFor(() => expect(fetchMe).toHaveBeenCalledTimes(1));

    await act(async () => {
      await result.current.mutateAsync({ name: "Nuevo Nombre" });
    });

    expect(updateMe).toHaveBeenCalledWith({ name: "Nuevo Nombre" }, expect.anything());
    await waitFor(() => expect(fetchMe).toHaveBeenCalledTimes(2));

    unmount();
  });
});

describe("useDeleteAddress", () => {
  afterEach(() => vi.clearAllMocks());

  it("llama a DELETE /users/me/addresses/{id} e invalida la lista", async () => {
    vi.mocked(deleteAddress).mockResolvedValue(undefined);
    const client = makeClient();

    const fetchAddresses = vi.fn().mockResolvedValue([address]);
    function AddressesProbe() {
      const q = useQuery({ queryKey: addressesKey, queryFn: fetchAddresses });
      return <p>{q.data?.length ?? 0}</p>;
    }

    const { result, unmount } = renderHook(() => useDeleteAddress(), {
      wrapper: wrapper(client),
    });
    render(<AddressesProbe />, { wrapper: wrapper(client) });
    await waitFor(() => expect(fetchAddresses).toHaveBeenCalledTimes(1));

    await act(async () => {
      await result.current.mutateAsync(address.id);
    });

    expect(deleteAddress).toHaveBeenCalledWith(address.id, expect.anything());
    await waitFor(() => expect(fetchAddresses).toHaveBeenCalledTimes(2));

    unmount();
  });
});

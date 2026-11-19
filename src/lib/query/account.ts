"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteAddress, updateMe } from "@/lib/api/endpoints";
import { meKey } from "./cart";
import { addressesKey } from "./orders";

/**
 * PUT /users/me (cambia el nombre). Invalida el perfil para que el header
 * ("Hola, …") y la página de cuenta reflejen el cambio sin recarga.
 */
export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateMe,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: meKey });
    },
  });
}

/** DELETE /users/me/addresses/{id}. Invalida la lista de direcciones. */
export function useDeleteAddress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteAddress,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: addressesKey });
    },
  });
}

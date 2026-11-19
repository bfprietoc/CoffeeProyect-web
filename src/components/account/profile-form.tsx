"use client";

import { useState } from "react";
import { ApiError } from "@/lib/api/client";
import type { User } from "@/lib/types";
import { useUpdateProfile } from "@/lib/query/account";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ProfileFormProps {
  user: User;
}

/**
 * Perfil del usuario (PUT /users/me): solo el nombre es editable; el correo
 * se muestra de solo lectura (el backend no expone cambio de email/clave).
 */
export function ProfileForm({ user }: ProfileFormProps) {
  const updateProfile = useUpdateProfile();
  const [name, setName] = useState(user.name);
  const [saved, setSaved] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Sincroniza el input si el perfil llega con otro nombre (rename desde
  // otra vista o refetch): patrón de "ajustar state cuando cambian props"
  // (setState durante el render, antes del commit — sin efecto).
  const [lastNameSeen, setLastNameSeen] = useState(user.name);
  if (user.name !== lastNameSeen) {
    setLastNameSeen(user.name);
    setName(user.name);
  }

  const dirty = name.trim() !== user.name;

  function handleNameChange(value: string) {
    setName(value);
    setSaved(false);
    setErrorMessage("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!dirty || !name.trim()) return;
    setSaved(false);
    setErrorMessage("");
    try {
      await updateProfile.mutateAsync({ name: name.trim() });
      setSaved(true);
    } catch (err) {
      setErrorMessage(
        err instanceof ApiError
          ? err.message
          : "No se pudo guardar el perfil. Intenta de nuevo.",
      );
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="profile-name">Nombre</Label>
          <Input
            id="profile-name"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="profile-email">Correo</Label>
          <Input id="profile-email" value={user.email} disabled readOnly />
        </div>
      </div>

      {errorMessage && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {errorMessage}
        </p>
      )}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={!dirty || updateProfile.isPending}>
          {updateProfile.isPending ? "Guardando…" : "Guardar cambios"}
        </Button>
        {saved && (
          <span aria-live="polite" className="text-sm font-medium text-muted-foreground">
            Perfil guardado ✓
          </span>
        )}
      </div>
    </form>
  );
}

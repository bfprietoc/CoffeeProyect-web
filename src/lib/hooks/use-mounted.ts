"use client";

import { useSyncExternalStore } from "react";

/**
 * true solo en el cliente (snapshot de servidor = false). Usar para gates
 * que dependen de localStorage/estado del browser sin flash en SSR.
 */
const noopSubscribe = () => () => {};

export function useMounted(): boolean {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}

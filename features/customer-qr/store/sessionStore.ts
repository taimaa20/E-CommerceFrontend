"use client";

import { create, type StoreApi, type UseBoundStore } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { CustomerSession } from "../types";
import { STORAGE_KEYS } from "../constants";

export interface SessionState {
  session: CustomerSession | null;
  start: (tableId: string, guestName?: string) => void;
  end: () => void;
}

const registry = new Map<string, UseBoundStore<StoreApi<SessionState>>>();

function getSessionStore(tableId: string): UseBoundStore<StoreApi<SessionState>> {
  const cached = registry.get(tableId);
  if (cached) return cached;

  const store = create<SessionState>()(
    persist(
      (set) => ({
        session: null,
        start: (id, guestName) =>
          set({
            session: {
              tableId: id,
              startedAtIso: new Date().toISOString(),
              guestName,
            },
          }),
        end: () => set({ session: null }),
      }),
      {
        name: STORAGE_KEYS.session(tableId),
        storage: createJSONStorage(() => localStorage),
      },
    ),
  );

  registry.set(tableId, store);
  return store;
}

/** See cartStore.ts for the naming rationale (React Compiler hook detection). */
export function useSession<U>(tableId: string, selector: (s: SessionState) => U): U {
  return getSessionStore(tableId)(selector);
}

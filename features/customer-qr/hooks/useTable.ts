"use client";

import { tableService } from "../services";
import { useAsyncResource } from "./useAsyncResource";

export function useTables() {
  return useAsyncResource(() => tableService.list(), []);
}

export function useTable(id: string) {
  return useAsyncResource(() => tableService.get(id), [id]);
}

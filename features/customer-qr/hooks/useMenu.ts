"use client";

import { menuService } from "../services";
import { useAsyncResource } from "./useAsyncResource";

export function useMenu() {
  return useAsyncResource(() => menuService.snapshot(), []);
}

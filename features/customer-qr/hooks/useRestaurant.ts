"use client";

import { restaurantService } from "../services";
import { useAsyncResource } from "./useAsyncResource";

export function useRestaurant() {
  return useAsyncResource(() => restaurantService.get(), []);
}

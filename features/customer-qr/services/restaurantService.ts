import type { RestaurantInfo } from "../types";
import { mockRestaurant } from "../mock/restaurant";
import { SOURCE, simulateLatency } from "./source";

async function getMock(): Promise<RestaurantInfo> {
  await simulateLatency(80);
  return mockRestaurant;
}

export const restaurantService = {
  get: (): Promise<RestaurantInfo> =>
    SOURCE === "mock" ? getMock() : Promise.reject(new Error("api adapter not wired")),
};

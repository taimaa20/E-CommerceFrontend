// Abstraction over restaurant data.
// Today: returns local JSON. Tomorrow: replace bodies with fetch() calls —
// the return shapes and method signatures are the API contract and MUST NOT change.

import restaurantData from "@/app/website/data/restaurant.json";
import type { RestaurantInfo, ContactInfo, GalleryImage } from "@/app/website/types";

// Simulate an async boundary so UI code is already structured for real calls.
const resolve = <T,>(value: T): Promise<T> => Promise.resolve(value);

export const restaurantService = {
  getRestaurantInfo(): Promise<RestaurantInfo> {
    return resolve(restaurantData as RestaurantInfo);
  },

  getContactInfo(): Promise<ContactInfo> {
    return resolve((restaurantData as RestaurantInfo).contact);
  },

  getGallery(): Promise<GalleryImage[]> {
    return resolve((restaurantData as RestaurantInfo).gallery);
  },
};

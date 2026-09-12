import type { RestaurantInfo } from "../types";

export const mockRestaurant: RestaurantInfo = {
  name: { en: "Sando Box", ar: "ساندو بوكس" },
  tagline: {
    en: "Fresh, local, made with love",
    ar: "طازج ومحلي ومصنوع بحب",
  },
  logoUrl: "/website/brand/logo-wordmark.png",
  heroImageUrl: "/website/brand/strategy-premium-spread.jpg",
  currency: "JOD",
  currencySymbol: { en: "JOD", ar: "د.أ" },
  taxPct: 16,
  servicePct: 10,
  orderMode: "pay_later",
  // No rating / counts / prep time here — those are real business metrics, not
  // something to fabricate. A tenant can populate them from real data later and
  // the hero chips will appear automatically.
  social: {
    instagram: "https://instagram.com/sando.kitchen",
    tiktok: "https://tiktok.com/@sando.kitchen",
    website: "https://sando.kitchen/",
  },
};

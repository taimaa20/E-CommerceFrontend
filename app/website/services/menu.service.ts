// Abstraction over menu & offers data.
// Reads live data from the public Menu API (/api/menu/public) so the
// informative website always reflects what admins publish from the POS,
// including promotional CustomPrice. Falls back to bundled JSON if the
// menu API is unreachable, so the marketing page never crashes during demos.

import menuData from "@/app/website/data/menu.json";
import { config } from "@/lib/config";
import type { MenuData, MenuCategory, MenuItem, Offer } from "@/app/website/types";

// Shape returned by GET /api/menu/public (subset we consume).
interface ApiPublicCategory {
  id: string;
  name: string;
  nameAr?: string | null;
  description?: string | null;
  isActive?: boolean;
  subcategories?: ApiPublicSubcategory[];
}

interface ApiPublicSubcategory {
  id: string;
  categoryId: string;
  name: string;
  nameAr?: string | null;
  displayOrder: number;
  isActive?: boolean;
}

interface ApiPublicProduct {
  id: string;
  name: string;
  nameAr?: string | null;
  description?: string | null;
  descriptionAr?: string | null;
  /** Server-computed: respects UseCustomPrice → CustomPrice when active. */
  displayPrice: number;
  basePrice: number;
  originalPrice?: number | null;
  discountPercentage?: number | null;
  imageUrl?: string | null;
  categoryId?: string | null;
  categoryName?: string | null;
  subcategoryId?: string | null;
  subcategoryName?: string | null;
  subcategoryNameAr?: string | null;
  isAvailable?: boolean;
  isSoon?: boolean;
}

interface ApiPublicMenu {
  categories: ApiPublicCategory[];
  products: ApiPublicProduct[];
}

interface ApiPublicOffer {
  id: number;
  name: string;
  nameAr?: string | null;
  description?: string | null;
  descriptionAr?: string | null;
  price: number;
  originalPrice: number;
  imageUrl?: string | null;
  badge?: string | null;
  badgeAr?: string | null;
}

function adaptCategory(c: ApiPublicCategory): MenuCategory {
  return {
    id: c.id,
    name: c.name,
    nameAr: c.nameAr ?? c.name,
    description: c.description ?? "",
    descriptionAr: c.description ?? "",
    subcategories: (c.subcategories ?? [])
      .filter((s) => s.isActive !== false)
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .map((s) => ({
        id: s.id,
        categoryId: s.categoryId,
        name: s.name,
        nameAr: s.nameAr ?? s.name,
        displayOrder: s.displayOrder,
      })),
  };
}

function adaptProduct(p: ApiPublicProduct): MenuItem {
  return {
    id: p.id,
    categoryId: p.categoryId ?? "",
    subcategoryId: p.subcategoryId ?? null,
    subcategoryName: p.subcategoryName ?? null,
    subcategoryNameAr: p.subcategoryNameAr ?? null,
    name: p.name,
    nameAr: p.nameAr ?? p.name,
    description: p.description ?? "",
    descriptionAr: p.descriptionAr ?? p.description ?? "",
    // Pricing values are server-computed; the website only decides how to
    // present the final, original, and percentage values it receives.
    price: p.displayPrice ?? p.basePrice,
    originalPrice: p.originalPrice ?? undefined,
    discountPercentage: p.discountPercentage ?? undefined,
    image: p.imageUrl ?? null,
    // Server side already filters by IsActive; carrying it through lets the
    // website re-assert the filter (defense-in-depth + safe with cached data).
    isAvailable: p.isAvailable ?? true,
    isSoon: p.isSoon ?? false,
  };
}

function adaptOffer(offer: ApiPublicOffer, index: number): Offer {
  return {
    id: String(offer.id),
    name: offer.name,
    nameAr: offer.nameAr ?? offer.name,
    tagline: "",
    taglineAr: "",
    description: offer.description ?? "",
    descriptionAr: offer.descriptionAr ?? offer.description ?? "",
    price: offer.price,
    originalPrice: offer.originalPrice,
    image: offer.imageUrl ?? "",
    badge: offer.badge ?? "Box Deal",
    badgeAr: offer.badgeAr ?? "عرض",
    color: index % 2 === 0 ? "red" : "black",
  };
}

// Coalesce concurrent callers (different sections mounting in the same tick)
// onto a single in-flight request — without this, multiple sections each fire
// their own /menu/public roundtrip on first paint. Cleared as soon as the
// promise settles so subsequent navigations can still hit the browser cache.
let inFlight: Promise<ApiPublicMenu | null> | null = null;
let inFlightOffers: Promise<Offer[]> | null = null;
let offersSnapshot: Offer[] | null = null;

async function fetchPublicMenu(): Promise<ApiPublicMenu | null> {
  if (inFlight) return inFlight;
  inFlight = (async () => {
    try {
      // Honor upstream Cache-Control (max-age=30, stale-while-revalidate=120)
      // set by the backend MenuController. Removing the previous "no-store"
      // override is what actually lets repeat visits hit the browser cache
      // instead of round-tripping every navigation.
      const res = await fetch(`${config.apiBaseUrl}/menu/public`, {
        headers: { Accept: "application/json" },
      });
      if (!res.ok) return null;
      return (await res.json()) as ApiPublicMenu;
    } catch {
      return null;
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
}

async function fetchPublicOffers(): Promise<Offer[]> {
  if (offersSnapshot) return offersSnapshot;
  if (inFlightOffers) return inFlightOffers;

  inFlightOffers = (async () => {
    try {
      const res = await fetch(`${config.apiBaseUrl}/offers/public?mode=summary`, {
        headers: { Accept: "application/json" },
      });
      if (!res.ok) return [];
      const data = (await res.json()) as ApiPublicOffer[];
      offersSnapshot = (data ?? []).map(adaptOffer);
      return offersSnapshot;
    } catch {
      return [];
    } finally {
      inFlightOffers = null;
    }
  })();

  return inFlightOffers;
}

const fallback = menuData as MenuData;

export const menuService = {
  async getMenu(): Promise<MenuData> {
    const live = await fetchPublicMenu();
    if (!live) return fallback;
    return {
      categories: (live.categories ?? []).map(adaptCategory),
      items: (live.products ?? []).map(adaptProduct),
    };
  },

  async getCategories(): Promise<MenuCategory[]> {
    const live = await fetchPublicMenu();
    if (!live) return fallback.categories;
    return (live.categories ?? []).map(adaptCategory);
  },

  async getItemsByCategory(categoryId: string): Promise<MenuItem[]> {
    const live = await fetchPublicMenu();
    const items = live
      ? (live.products ?? []).map(adaptProduct)
      : fallback.items;
    return items.filter((i) => i.categoryId === categoryId);
  },

  /**
   * Website preview: returns up to `perCategory` items for EACH category
   * (default 3), pulled live from the Menu API. Mirrors what /menu shows
   * but capped per-bucket so the marketing section stays compact while
   * still giving every category a visible sample.
   */
  async getPreview(perCategory = 3): Promise<MenuData> {
    const live = await fetchPublicMenu();
    const allCategories = live ? (live.categories ?? []).map(adaptCategory) : fallback.categories;
    const allItems = live ? (live.products ?? []).map(adaptProduct) : fallback.items;

    // Drop inactive items before bucketing so each category's "first 3"
    // matches what /menu actually shows, not what's dormant in the table.
    const activeItems = allItems.filter((i) => i.isAvailable !== false);

    const counts: Record<string, number> = {};
    const items: MenuItem[] = [];
    for (const it of activeItems) {
      const key = it.categoryId || "__uncat__";
      const taken = counts[key] ?? 0;
      if (taken >= perCategory) continue;
      counts[key] = taken + 1;
      items.push(it);
    }
    return { categories: allCategories, items };
  },

  getOffers(): Promise<Offer[]> {
    return fetchPublicOffers();
  },
};

import { getCategories, getTables, getOffers, getActiveTakeawayOrders, getCashierProducts } from "@/lib/api";
import { getActiveDeliveryZones } from "@/lib/api-delivery";
import { getActiveDeliveryPartners } from "@/lib/api-delivery-partners";
import { getSelectedBranchCacheKey } from "@/lib/branch-selection";
import { getReferenceCacheEntry } from "@/lib/offline/db";
import { useSettingsStore } from "@/store/settingsStore";

/**
 * Reference cache keys the cashier bootstrap depends on. Must match the keys
 * written by `cachedReferenceList` in each fetcher below — keep in sync.
 */
// FIX(bug-5,bug-6): Added "system-settings" so currency/tax survive offline.
// All branch-owned datasets (products, tables, categories, offers, takeaway)
// use branch-scoped keys — must match the real keys written by api.ts.
const CASHIER_REFERENCE_STATIC_KEYS = [
    "system-settings",
] as const;

export function getCashierReferenceKeys(): string[] {
    const branchKey = getSelectedBranchCacheKey();
    return [
        `products:cashier:${branchKey}:pos`,
        `takeaway:active:${branchKey}`,
        `categories:${branchKey}`,
        `tables:${branchKey}`,
        `offers:active:${branchKey}`,
        ...CASHIER_REFERENCE_STATIC_KEYS,
    ];
}

export const CASHIER_REFERENCE_KEYS = getCashierReferenceKeys();

/**
 * Warm the offline reference cache after a successful login.
 *
 * The promise only settles once every fetcher has finished (success or failure).
 * Callers that want to block the UI until the cache is usable (e.g. the cashier
 * bootstrap) should `await` this; legacy fire-and-forget callers can still
 * ignore the return value.
 */
export async function warmOfflineCache(): Promise<void> {
    // FIX(bug-5,bug-6): Trigger settings load so the store writes system-settings
    // into IDB alongside the other reference caches. fetchSettings is guarded
    // against double-loads internally.
    const settingsTask = useSettingsStore.getState().fetchSettings().catch(() => undefined);
    const tasks: Array<Promise<unknown>> = [
        getCashierProducts().catch(() => undefined),
        getCategories().catch(() => undefined),
        getTables().catch(() => undefined),
        getOffers().catch(() => undefined),
        getActiveTakeawayOrders().catch(() => undefined),
        // Delivery reference data — cached so zone selection (issue-2) and the
        // partner-order dialog (issue-1) keep working offline. Deliberately NOT
        // added to CASHIER_REFERENCE_KEYS: tenants with no zones/partners cache
        // an empty list (skipped by cachedReferenceList), which would otherwise
        // make isCacheWarmed() block offline entry forever.
        getActiveDeliveryZones().catch(() => undefined),
        warmPartnerProductCaches().catch(() => undefined),
        settingsTask,
    ];
    await Promise.allSettled(tasks);
}

/**
 * True when every reference cache key required by the cashier is present in
 * IDB. Used to gate offline entry — if a key is missing we still need the
 * network for the first session.
 */
export async function isCacheWarmed(): Promise<boolean> {
    for (const key of getCashierReferenceKeys()) {
        const entry = await getReferenceCacheEntry(key).catch(() => undefined);
        if (!entry) return false;
    }
    return true;
}

/**
 * Milliseconds since the reference cache entry was last written. Returns
 * `null` when the key was never cached — callers decide between "stale" vs
 * "empty" from that signal.
 */
export async function getCacheAge(key: string): Promise<number | null> {
    const entry = await getReferenceCacheEntry(key).catch(() => undefined);
    if (!entry) return null;
    return Date.now() - entry.cachedAt;
}

const STALE_THRESHOLD_MS = 12 * 60 * 60 * 1000;

export type CacheStatus = "warming" | "ready" | "stale" | "empty";

async function warmPartnerProductCaches(): Promise<void> {
    const partners = await getActiveDeliveryPartners();
    for (const partner of partners) {
        await getCashierProducts(partner.id).catch(() => undefined);
    }
}

export async function getCacheStatus(): Promise<CacheStatus> {
    let oldest = 0;
    for (const key of getCashierReferenceKeys()) {
        const age = await getCacheAge(key);
        if (age === null) return "empty";
        if (age > oldest) oldest = age;
    }
    return oldest > STALE_THRESHOLD_MS ? "stale" : "ready";
}

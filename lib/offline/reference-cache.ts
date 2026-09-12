import { getReferenceCache, putReferenceCache } from "./db";
import { getConnectivityState } from "./connectivity";

/**
 * Fetch-or-fallback for read-mostly reference data.
 *
 * Flow:
 *  1. If online, call the fetcher.
 *  2. If it returns a non-empty payload, cache it and return.
 *  3. If the fetcher throws or returns an empty payload, fall through to
 *     the IDB cache. Return `[]`/`undefined` shape if neither has data.
 *
 * Why "non-empty"? The API wrappers swallow network errors to `[]`,
 * so we treat an empty response while offline/degraded as a miss and
 * prefer the cached snapshot. When truly empty (e.g. new tenant, no
 * products yet), the cache is also empty and we still return `[]`.
 */
// Coalesce concurrent callers for the same key onto a single in-flight
// fetcher. Without this, multiple admin pages or dialogs mounting at the
// same tick each fire their own `/categories`, `/tables`, `/rawmaterials`
// request — same bytes returned, paid for N times. Cleared on settle so
// the next fresh call after the request resolves can revalidate.
const inFlight = new Map<string, Promise<unknown>>();

export async function cachedReferenceFetch<T>(
    key: string,
    fetcher: () => Promise<T>,
    isEmpty: (value: T) => boolean,
    fallback: T
): Promise<T> {
    const connectivity = getConnectivityState();
    if (connectivity === "online") {
        const existing = inFlight.get(key) as Promise<T> | undefined;
        if (existing) {
            try {
                const shared = await existing;
                if (!isEmpty(shared)) return shared;
            } catch {
                // fall through to cache
            }
        } else {
            const pending = (async () => {
                try {
                    return await fetcher();
                } finally {
                    inFlight.delete(key);
                }
            })();
            inFlight.set(key, pending);
            try {
                const fresh = await pending;
                if (!isEmpty(fresh)) {
                    void putReferenceCache(key, fresh).catch(() => {});
                    return fresh;
                }
            } catch {
                // fall through to cache
            }
        }
    }
    const cached = await getReferenceCache<T>(key).catch(() => undefined);
    return cached ?? fallback;
}

/** Convenience wrapper for list payloads. */
export function cachedReferenceList<T>(
    key: string,
    fetcher: () => Promise<T[]>
): Promise<T[]> {
    return cachedReferenceFetch<T[]>(
        key,
        fetcher,
        (list) => !Array.isArray(list) || list.length === 0,
        []
    );
}

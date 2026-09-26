import { toast } from "sonner";
import { customerAccountApi } from "@/lib/api-customer-account";
import { useCustomerSessionStore } from "@/store/customerSessionStore";

/**
 * The shopper's favourites, behind one small interface.
 *
 * A guest's favourites are remembered on the device that made them. A signed-in customer's live
 * on their account, so the website and the mobile app see the same list. Every component talks
 * to `favoritesRepository`, which routes to the right store for the current session; nothing
 * outside this file knows where a favourite is kept.
 *
 * On sign-in the device list is merged into the account (the server skips duplicates and ids that
 * no longer exist) and then cleared, so a favourite tapped as a guest is never lost.
 *
 * What is stored is deliberately only the product id. Price, discount, stock, name and imagery
 * are re-read from the storefront API every time the favourites page renders, so a favourite
 * can never show a price the store has stopped charging.
 *
 * No customer detail of any kind is written to the device.
 */

/**
 * Namespaced to the DOHA LUXE storefront capability that owns this data, and versioned so a
 * future shape change can ignore old entries instead of trying to migrate them.
 */
const FAVORITES_KEY = "doha-luxe:storefront:favorites:v1";

/** A shortlist, not a second catalogue. Oldest entries fall off once this is exceeded. */
const FAVORITES_LIMIT = 200;

/**
 * Where favourites live. Implemented today by the browser; implementable tomorrow by the
 * customer API without any caller noticing.
 */
export interface FavoritesRepository {
    /** Product ids, most recently added first. */
    list(): string[];
    has(productId: string): boolean;
    /** Returns the state after the change: true when the product is now a favourite. */
    toggle(productId: string): boolean;
    add(productId: string): void;
    remove(productId: string): void;
    clear(): void;
    /** Fires whenever the list changes — in this tab or in another one. */
    subscribe(listener: () => void): () => void;
}

const EMPTY: string[] = [];
const listeners = new Set<() => void>();

// The snapshot is memoised against the raw stored string so useSyncExternalStore receives a
// stable reference and does not re-render on every read.
let snapshotSource: string | null = null;
let snapshotValue: string[] = EMPTY;

function readRaw(): string {
    try {
        return window.localStorage.getItem(FAVORITES_KEY) ?? "";
    } catch {
        // Private mode, disabled storage, or a quota error. Favourites are a convenience:
        // the store keeps working without them.
        return "";
    }
}

/**
 * Parses defensively. Anything that is not an array of non-empty strings — a corrupted value,
 * a hand-edited one, an older shape — resolves to an empty list rather than throwing, because
 * a bad entry in browser storage must never be able to take the storefront down.
 */
function parse(raw: string): string[] {
    if (!raw) return EMPTY;
    try {
        const parsed = JSON.parse(raw) as unknown;
        if (!Array.isArray(parsed)) return EMPTY;
        const ids = parsed.filter((value): value is string => typeof value === "string" && value.length > 0);
        return ids.length > 0 ? [...new Set(ids)].slice(0, FAVORITES_LIMIT) : EMPTY;
    } catch {
        return EMPTY;
    }
}

function read(): string[] {
    const raw = readRaw();
    if (raw !== snapshotSource) {
        snapshotSource = raw;
        snapshotValue = parse(raw);
    }
    return snapshotValue;
}

function write(ids: string[]): void {
    try {
        window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(ids.slice(0, FAVORITES_LIMIT)));
    } catch {
        // Nothing persisted, but the in-memory snapshot below still updates so the current
        // page stays responsive for this session.
    }
    snapshotSource = null;
    for (const listener of listeners) listener();
}

const localStorageFavoritesRepository: FavoritesRepository = {
    list: () => read(),

    has: (productId) => read().includes(productId),

    toggle: (productId) => {
        const next = !localStorageFavoritesRepository.has(productId);
        if (next) localStorageFavoritesRepository.add(productId);
        else localStorageFavoritesRepository.remove(productId);
        return next;
    },

    add: (productId) => {
        if (!productId) return;
        const current = read();
        if (current.includes(productId)) return;
        // Newest first, so the favourites page opens on what the shopper just saved.
        write([productId, ...current]);
    },

    remove: (productId) => {
        const current = read();
        if (!current.includes(productId)) return;
        write(current.filter(id => id !== productId));
    },

    clear: () => write([]),

    subscribe: (listener) => {
        listeners.add(listener);
        // A second tab writing the same key must reach this one too.
        window.addEventListener("storage", listener);
        return () => {
            listeners.delete(listener);
            window.removeEventListener("storage", listener);
        };
    },
};

// ─── Account-backed favourites (signed-in customer) ─────────────────────────────────────────

let accountActive = false;
let accountIds: string[] = EMPTY;

function setAccountIds(ids: string[]) {
    accountIds = ids.length > 0 ? ids : EMPTY;
    for (const listener of listeners) listener();
}

function reportSyncFailure() {
    toast.error("Could not update your favourites · تعذر تحديث المفضلة");
}

/**
 * Optimistic: the heart changes at once, the server answer replaces the list, and a failure
 * restores what was there before.
 */
function mutateAccount(next: string[], call: () => Promise<{ productIds: string[] }>) {
    const previous = accountIds;
    setAccountIds(next);
    call()
        .then(result => { if (accountActive) setAccountIds(result.productIds); })
        .catch(() => {
            if (!accountActive) return;
            setAccountIds(previous);
            reportSyncFailure();
        });
}

const accountFavoritesRepository: FavoritesRepository = {
    list: () => accountIds,
    has: (productId) => accountIds.includes(productId),
    toggle: (productId) => {
        const next = !accountFavoritesRepository.has(productId);
        if (next) accountFavoritesRepository.add(productId);
        else accountFavoritesRepository.remove(productId);
        return next;
    },
    add: (productId) => {
        if (!productId || accountIds.includes(productId)) return;
        mutateAccount([productId, ...accountIds], () => customerAccountApi.addFavorite(productId));
    },
    remove: (productId) => {
        if (!accountIds.includes(productId)) return;
        mutateAccount(accountIds.filter(id => id !== productId), () => customerAccountApi.removeFavorite(productId));
    },
    clear: () => setAccountIds(EMPTY),
    subscribe: (listener) => {
        listeners.add(listener);
        return () => { listeners.delete(listener); };
    },
};

/** Loads the account list, folding in (then clearing) whatever this device saved as a guest. */
async function activateAccountFavorites() {
    accountActive = true;
    const deviceIds = localStorageFavoritesRepository.list();
    try {
        const result = deviceIds.length > 0
            ? await customerAccountApi.mergeFavorites(deviceIds)
            : await customerAccountApi.getFavorites();
        if (!accountActive) return;
        if (deviceIds.length > 0) localStorageFavoritesRepository.clear();
        setAccountIds(result.productIds);
    } catch {
        // The device list is left untouched, so nothing is lost; the next sign-in retries.
        if (accountActive) setAccountIds(deviceIds);
    }
}

function deactivateAccountFavorites() {
    accountActive = false;
    setAccountIds(EMPTY);
}

if (typeof window !== "undefined") {
    useCustomerSessionStore.subscribe((state, previous) => {
        if (state.status === previous.status) return;
        if (state.status === "authenticated") void activateAccountFavorites();
        else if (previous.status === "authenticated") deactivateAccountFavorites();
    });
}

/**
 * The favourites store the storefront uses: the account while a customer is signed in, the
 * device otherwise. Components depend only on the interface above.
 */
export const favoritesRepository: FavoritesRepository = {
    list: () => (accountActive ? accountFavoritesRepository : localStorageFavoritesRepository).list(),
    has: (productId) => (accountActive ? accountFavoritesRepository : localStorageFavoritesRepository).has(productId),
    toggle: (productId) => (accountActive ? accountFavoritesRepository : localStorageFavoritesRepository).toggle(productId),
    add: (productId) => (accountActive ? accountFavoritesRepository : localStorageFavoritesRepository).add(productId),
    remove: (productId) => (accountActive ? accountFavoritesRepository : localStorageFavoritesRepository).remove(productId),
    clear: () => (accountActive ? accountFavoritesRepository : localStorageFavoritesRepository).clear(),
    // Both stores notify through the same listener set, so one subscription covers a switch.
    subscribe: (listener) => localStorageFavoritesRepository.subscribe(listener),
};

/** Server render has no device storage, so it always starts from an empty list. */
export function favoritesServerSnapshot(): string[] {
    return EMPTY;
}

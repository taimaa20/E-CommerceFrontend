/**
 * The shopper's favourites, behind one small interface.
 *
 * The storefront has no login, so today a favourite is remembered on the device that made it.
 * That is an implementation detail of ONE object in this file: every component talks to
 * `favoritesRepository`, never to `localStorage`. When customer accounts arrive, an
 * `accountFavoritesRepository` implementing the same interface replaces the export (or is
 * selected beside it once a customer is signed in) and no card, page or header changes.
 *
 * What is stored is deliberately only the product id. Price, discount, stock, name and imagery
 * are re-read from the storefront API every time the favourites page renders, so a favourite
 * can never show a price the store has stopped charging, and nothing about the catalogue can
 * go stale in a browser that was left open for a month.
 *
 * No customer detail of any kind is written here.
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

/**
 * The favourites store the storefront uses. Swap this binding to move persistence somewhere
 * else — the interface above is the contract every component is written against.
 */
export const favoritesRepository: FavoritesRepository = localStorageFavoritesRepository;

/** Server render has no device storage, so it always starts from an empty list. */
export function favoritesServerSnapshot(): string[] {
    return EMPTY;
}

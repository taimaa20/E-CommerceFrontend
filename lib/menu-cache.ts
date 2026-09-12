import type { CategoryDto, ProductDto } from "@/types/pos";
import {
    deleteReferenceCache,
    getReferenceCacheEntry,
    putReferenceCache,
} from "@/lib/offline/db";

export type MenuLanguage = "en" | "ar";

export interface MenuCachePayload {
    language: MenuLanguage;
    products: ProductDto[];
    categories: CategoryDto[];
    lastUpdated: number;
}

export interface MenuCacheInvalidationEvent {
    keys: string[];
    occurredAt: number;
}

const MENU_CACHE_PREFIX = "menu:";
const MENU_CACHE_CHANNEL = "menu-cache";
const MENU_INVALIDATION_EVENT = "menu-cache-invalidated";
const MENU_CACHE_TTL_MS = 5 * 60 * 1000;

let menuCacheChannel: BroadcastChannel | null = null;

function normalizeLanguage(language: string): MenuLanguage {
    return language === "ar" ? "ar" : "en";
}

function getMenuCacheChannel(): BroadcastChannel | null {
    if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") {
        return null;
    }

    if (!menuCacheChannel) {
        menuCacheChannel = new BroadcastChannel(MENU_CACHE_CHANNEL);
    }

    return menuCacheChannel;
}

function emitMenuInvalidation(event: MenuCacheInvalidationEvent) {
    if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent<MenuCacheInvalidationEvent>(MENU_INVALIDATION_EVENT, { detail: event }));
    }

    try {
        getMenuCacheChannel()?.postMessage(event);
    } catch {
        /* no-op */
    }
}

export function getMenuCacheKey(language: string): string {
    return `${MENU_CACHE_PREFIX}${normalizeLanguage(language)}`;
}

export function isMenuCacheStale(lastUpdated: number, maxAgeMs: number = MENU_CACHE_TTL_MS): boolean {
    return Date.now() - lastUpdated > maxAgeMs;
}

export async function readMenuCache(language: string): Promise<MenuCachePayload | null> {
    const entry = await getReferenceCacheEntry<MenuCachePayload>(getMenuCacheKey(language)).catch(() => undefined);
    if (!entry?.data) {
        return null;
    }

    return {
        ...entry.data,
        lastUpdated: entry.data.lastUpdated || entry.cachedAt,
        language: normalizeLanguage(entry.data.language),
    };
}

export async function writeMenuCache(
    language: string,
    payload: Pick<MenuCachePayload, "products" | "categories">,
): Promise<MenuCachePayload> {
    const snapshot: MenuCachePayload = {
        language: normalizeLanguage(language),
        products: payload.products,
        categories: payload.categories,
        lastUpdated: Date.now(),
    };

    await putReferenceCache(getMenuCacheKey(language), snapshot);
    return snapshot;
}

export async function invalidateMenuCache(language: string): Promise<void> {
    const key = getMenuCacheKey(language);
    await deleteReferenceCache(key);
    emitMenuInvalidation({ keys: [key], occurredAt: Date.now() });
}

export async function invalidateAllMenuCaches(): Promise<void> {
    const keys = [getMenuCacheKey("en"), getMenuCacheKey("ar")];
    await Promise.all(keys.map((key) => deleteReferenceCache(key)));
    emitMenuInvalidation({ keys, occurredAt: Date.now() });
}

export function subscribeMenuCacheInvalidation(
    listener: (event: MenuCacheInvalidationEvent) => void,
): () => void {
    if (typeof window === "undefined") {
        return () => {};
    }

    const handleWindowEvent = (event: Event) => {
        const customEvent = event as CustomEvent<MenuCacheInvalidationEvent>;
        if (customEvent.detail) {
            listener(customEvent.detail);
        }
    };

    const channel = getMenuCacheChannel();
    const handleChannelMessage = (message: MessageEvent<MenuCacheInvalidationEvent>) => {
        if (message.data) {
            listener(message.data);
        }
    };

    window.addEventListener(MENU_INVALIDATION_EVENT, handleWindowEvent);
    channel?.addEventListener("message", handleChannelMessage);

    return () => {
        window.removeEventListener(MENU_INVALIDATION_EVENT, handleWindowEvent);
        channel?.removeEventListener("message", handleChannelMessage);
    };
}

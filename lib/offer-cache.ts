import type { OfferResponseDto } from "@/types/offer";

const OFFER_CACHE_DB = "pos-offer-cache";
const OFFER_CACHE_STORE = "offers";
const OFFER_CACHE_VERSION = 1;

type OfferCacheRecord = {
    key: string;
    offers: OfferResponseDto[];
    updatedAt: number;
};

function isIndexedDbAvailable() {
    return typeof window !== "undefined" && "indexedDB" in window;
}

function openOfferCacheDb(): Promise<IDBDatabase | null> {
    if (!isIndexedDbAvailable()) {
        return Promise.resolve(null);
    }

    return new Promise((resolve) => {
        const request = window.indexedDB.open(OFFER_CACHE_DB, OFFER_CACHE_VERSION);

        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(OFFER_CACHE_STORE)) {
                db.createObjectStore(OFFER_CACHE_STORE, { keyPath: "key" });
            }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => {
            console.error("Failed to open offer cache DB:", request.error);
            resolve(null);
        };
    });
}

export async function readOfferCache(key: string): Promise<OfferResponseDto[]> {
    const db = await openOfferCacheDb();
    if (!db) {
        return [];
    }

    return await new Promise((resolve) => {
        const transaction = db.transaction(OFFER_CACHE_STORE, "readonly");
        const store = transaction.objectStore(OFFER_CACHE_STORE);
        const request = store.get(key);

        request.onsuccess = () => {
            const record = request.result as OfferCacheRecord | undefined;
            resolve(record?.offers ?? []);
        };
        request.onerror = () => {
            console.error("Failed to read offer cache:", request.error);
            resolve([]);
        };
    });
}

export async function writeOfferCache(key: string, offers: OfferResponseDto[]): Promise<void> {
    const db = await openOfferCacheDb();
    if (!db) {
        return;
    }

    await new Promise<void>((resolve) => {
        const transaction = db.transaction(OFFER_CACHE_STORE, "readwrite");
        const store = transaction.objectStore(OFFER_CACHE_STORE);
        const record: OfferCacheRecord = {
            key,
            offers,
            updatedAt: Date.now(),
        };

        const request = store.put(record);
        request.onsuccess = () => resolve();
        request.onerror = () => {
            console.error("Failed to write offer cache:", request.error);
            resolve();
        };
    });
}

export async function deleteOfferCache(key: string): Promise<void> {
    const db = await openOfferCacheDb();
    if (!db) {
        return;
    }

    await new Promise<void>((resolve) => {
        const transaction = db.transaction(OFFER_CACHE_STORE, "readwrite");
        const store = transaction.objectStore(OFFER_CACHE_STORE);
        const request = store.delete(key);

        request.onsuccess = () => resolve();
        request.onerror = () => {
            console.error("Failed to delete offer cache:", request.error);
            resolve();
        };
    });
}

export async function warmOfferImageCache(offers: OfferResponseDto[]): Promise<void> {
    if (typeof window === "undefined") {
        return;
    }

    const uniqueUrls = Array.from(
        new Set(
            offers
                .map((offer) => offer.imageUrl?.trim())
                .filter((url): url is string => !!url && !url.startsWith("data:")),
        ),
    );

    await Promise.allSettled(
        uniqueUrls.map(async (url) => {
            try {
                await fetch(url, { cache: "force-cache" });
            } catch {
                // Ignore cache warm failures; the regular image request can still try later.
            }
        }),
    );
}

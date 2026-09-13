"use client";

import { useSyncExternalStore } from "react";
import { favoritesRepository, favoritesServerSnapshot } from "@/lib/store-favorites";

export interface StoreFavorites {
    /** Product ids, most recently added first. */
    ids: string[];
    count: number;
    isFavorite: (productId: string) => boolean;
    /** Returns true when the product is now a favourite. */
    toggle: (productId: string) => boolean;
    remove: (productId: string) => void;
}

/**
 * Every surface that shows or changes a favourite subscribes here, so a heart tapped on a card
 * and the count in the header are the same value rather than two copies that can drift. The
 * subscription is the repository's own — nothing in the UI knows where favourites are kept.
 */
export function useStoreFavorites(): StoreFavorites {
    const ids = useSyncExternalStore(
        favoritesRepository.subscribe,
        favoritesRepository.list,
        favoritesServerSnapshot,
    );

    return {
        ids,
        count: ids.length,
        isFavorite: (productId) => ids.includes(productId),
        toggle: (productId) => favoritesRepository.toggle(productId),
        remove: (productId) => favoritesRepository.remove(productId),
    };
}

/// <reference lib="webworker" />
/**
 * Retail POS — Serwist service worker source.
 * ----------------------------------------------------------------
 * Compiled by @serwist/next at build time into /public/sw.js.
 *
 * What's in the precache:
 *   1. The injected precache manifest — every content-hashed Next.js chunk/asset
 *      emitted by the build. Injected by Serwist automatically.
 *   2. Explicit route-shell warmup on install (see ROUTE_SHELLS) —
 *      fetches every canonical station URL once so the user can open
 *      any of them offline without a prior visit. Next.js rewrites
 *      (`/ntxdineinpos` → `/`, etc.) mean those URLs aren't emitted
 *      as files at build time; the only way to cache them is a real
 *      runtime fetch.
 *
 * Runtime strategies:
 *   - /api/* → NetworkOnly. IndexedDB + the offline queue are the
 *     source of truth for data offline. Caching money/stock/orders
 *     would be catastrophic.
 *   - Route navigations → NetworkFirst against the shell cache.
 *   - Static images/fonts/chunks → Serwist performance caches stay enabled.
 */

import { defaultCache } from "@serwist/next/worker";
import type {
    PrecacheEntry,
    RuntimeCaching,
    SerwistGlobalConfig,
} from "serwist";
import { CacheFirst, NetworkFirst, NetworkOnly, Serwist } from "serwist";

// Augment the service-worker global with Serwist's build-time manifest.
declare global {
    interface WorkerGlobalScope extends SerwistGlobalConfig {
        __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
    }
}

declare const self: ServiceWorkerGlobalScope;

// -----------------------------------------------------------------
// Route-shell warmup
// -----------------------------------------------------------------
// These URLs must be reachable offline from a cold install. Because
// Next.js rewrites them at request time (see next.config.mjs), the
// HTML documents don't exist as static files in `.next/` — Serwist's
// build-time precache can't include them. We fetch them once during
// `install` and store them in a dedicated cache.
// Bump the version any time the SW logic or precache warmup changes so that
// the `activate` listener below deletes every older `pos-route-shells-*`
// cache. Clients inheriting a corrupted v1 shell (post-deploy chunk drift,
// failed warmup, etc.) recover automatically on the next SW update.
const SHELL_CACHE = "pos-route-shells-v3";
const ROUTE_SHELLS: readonly string[] = [
    "/ntxcashierpos",
    "/ntxtakeawaypos",
    "/ntxkitchenpos",
    "/ntxdineinpos",
    "/ntxadminpos",
    "/login",
];

const DEPLOY_SENSITIVE_CACHE_NAMES: readonly string[] = [
    "apis",
    "next-data",
    "others",
    "pages",
    "pages-rsc",
    "pages-rsc-prefetch",
];

const getRuntimeCacheName = (route: RuntimeCaching) => {
    const handler = route.handler as { cacheName?: unknown };
    return typeof handler.cacheName === "string" ? handler.cacheName : "";
};

const safeDefaultCache = defaultCache.filter(
    (route) => !DEPLOY_SENSITIVE_CACHE_NAMES.includes(getRuntimeCacheName(route))
);

self.addEventListener("install", (event) => {
    event.waitUntil(
        (async () => {
            const cache = await caches.open(SHELL_CACHE);
            // `Promise.allSettled` — never let one slow/failed route fail
            // the install. A single 500 during deploy would otherwise leave
            // the user with no SW at all.
            await Promise.allSettled(
                ROUTE_SHELLS.map(async (url) => {
                    try {
                        const response = await fetch(url, {
                            credentials: "same-origin",
                            // Bypass HTTP cache so we always store the freshest
                            // shell at install time (matches the chunks Serwist
                            // just injected into __SW_MANIFEST).
                            cache: "reload",
                        });
                        if (response && response.ok) {
                            await cache.put(url, response.clone());
                        }
                    } catch {
                        /* best-effort: a flaky route warmup must never brick install */
                    }
                })
            );
        })()
    );
});

// -----------------------------------------------------------------
// Clean up stale shell caches when version bumps
// -----------------------------------------------------------------
self.addEventListener("activate", (event) => {
    event.waitUntil(
        (async () => {
            const keys = await caches.keys();
            await Promise.all(
                keys
                    .filter(
                        (k) =>
                            (k.startsWith("pos-route-shells-") &&
                                k !== SHELL_CACHE) ||
                            DEPLOY_SENSITIVE_CACHE_NAMES.includes(k)
                    )
                    .map((k) => caches.delete(k))
            );
        })()
    );
});

const serwist = new Serwist({
    precacheEntries: self.__SW_MANIFEST,
    skipWaiting: true,
    clientsClaim: true,
    navigationPreload: true,
    runtimeCaching: [
        // 1) Never cache the backend BFF — IndexedDB is the offline source of
        //    truth. Stale money/stock/order responses from a cached /api hit
        //    would be catastrophic.
        {
            matcher: ({ url, sameOrigin }) =>
                sameOrigin && url.pathname.startsWith("/api/"),
            handler: new NetworkOnly(),
        },
        // 2) Product images uploaded through /uploads/images/* —
        //    CacheFirst, never revalidated. Filenames are `{timestamp}_{guid}.{ext}`
        //    (see UploadsController), so the URL is effectively immutable: admins
        //    replacing an image generate a new filename, and the old URL simply
        //    stops being referenced. Once a 637 KB hero is downloaded, every
        //    subsequent visit serves it from disk in <20 ms.
        //
        //    Matches both same-origin (/uploads/images/…) and cross-origin
        //    (https://wa-pos-be-*.azurewebsites.net/uploads/images/…) by
        //    pattern-matching the pathname only, since the backend URL varies
        //    by environment.
        {
            matcher: ({ url, request }) =>
                request.method === "GET" &&
                url.pathname.includes("/uploads/images/"),
            handler: new CacheFirst({
                cacheName: "pos-uploads-images-v1",
                matchOptions: { ignoreVary: true },
            }),
        },
        // 3) Station route navigations: NetworkFirst with a cache fallback.
        //    Prior version used CacheFirst, which was correct for "offline
        //    first" but catastrophic across deploys: the cached HTML shell
        //    references content-hashed /_next/static/chunks/*.js. When the
        //    backend redeploys, those chunk hashes change. The stale cached
        //    shell keeps pointing at the old hashes, they 404, and the
        //    navigation aborts with ERR_FAILED (user saw this post-login on
        //    /ntxcashierpos — clearing cache cured it, which proves the shell
        //    was the source).
        //
        //    NetworkFirst fixes it properly:
        //      • Online → always fetch fresh HTML (= current chunk hashes),
        //        refresh the cache for offline use.
        //      • Slow network → fall back to cache after 3 s instead of
        //        blocking the user on a hung navigation.
        //      • Offline → cache fallback, identical behavior to before.
        //
        //    `matchOptions.ignoreSearch` is still critical: the cashier links
        //    pass `?from=cashier` etc., and without it the cache fallback
        //    would miss on those variants.
        {
            matcher: ({ request, url, sameOrigin }) =>
                sameOrigin &&
                request.mode === "navigate" &&
                ROUTE_SHELLS.some(
                    (shell) =>
                        url.pathname === shell ||
                        url.pathname.startsWith(`${shell}/`)
                ),
            handler: new NetworkFirst({
                cacheName: SHELL_CACHE,
                networkTimeoutSeconds: 3,
                matchOptions: { ignoreSearch: true },
            }),
        },
        // 4) Keep Serwist's asset/image/font performance routes, but exclude
        //    page/RSC/data/API caches that can outlive an Azure zip deploy and
        //    keep old action manifests alive.
        ...safeDefaultCache,
    ],
    // Intentionally no document fallback: pointing every unhandled navigation
    // at /ntxcashierpos turned into a trap when the cashier shell itself was
    // missing/stale (ERR_FAILED loop). Better to show the real network error
    // once than to mask it with an infinitely-retried broken shell.
});

serwist.addEventListeners();

// Honor an explicit SKIP_WAITING message from the page. Serwist already sets
// `skipWaiting: true` at install time, but when a new SW is in the "waiting"
// state (existing tab still controlled by the old SW), this lets the page
// force the swap without the user closing every tab — we post this from
// components/service-worker-register.tsx on `updatefound`.
self.addEventListener("message", (event) => {
    if (event.data && (event.data as { type?: string }).type === "SKIP_WAITING") {
        void self.skipWaiting();
    }
});

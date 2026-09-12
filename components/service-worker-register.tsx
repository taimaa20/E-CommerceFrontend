"use client";

import { useEffect } from "react";

const SW_REFRESH_PENDING_KEY = "pos-sw-refresh-pending";

/**
 * Registers the offline app-shell service worker and requests persistent
 * storage so the browser can't evict the cache + IndexedDB under memory
 * pressure.
 *
 * Responsibilities:
 *  - Prod-only registration (dev HMR + cached SW = debugging nightmare).
 *  - Run ASAP on mount — no `load`-event wait. Install races are rare in
 *    practice but every millisecond shaved off the install race closes
 *    the first-visit "click Takeaway before SW is controlling" window.
 *  - Request `navigator.storage.persist()` — without this, long-lived
 *    cashier stations can lose their offline queue to eviction after a
 *    week of uptime. Chrome/Edge grant it automatically for installed
 *    PWAs; Firefox grants after engagement.
 *  - Swap to a new SW on redeploy via `SKIP_WAITING` (handled by
 *    `app/sw.ts` message listener).
 *  - Silent on failure: SW registration should never break the app.
 */
export function ServiceWorkerRegister() {
    useEffect(() => {
        if (typeof window === "undefined") return;
        if (!("serviceWorker" in navigator)) return;

        // Skip in dev: stale chunks + HMR = impossible debugging.
        if (process.env.NODE_ENV !== "production") return;

        let cancelled = false;
        let shouldReloadOnControllerChange = false;

        try {
            window.sessionStorage.removeItem(SW_REFRESH_PENDING_KEY);
        } catch {
            /* sessionStorage may be unavailable */
        }

        const reloadForActivatedWorker = () => {
            if (cancelled || !shouldReloadOnControllerChange) return;

            try {
                if (window.sessionStorage.getItem(SW_REFRESH_PENDING_KEY) === "1") {
                    return;
                }
                window.sessionStorage.setItem(SW_REFRESH_PENDING_KEY, "1");
            } catch {
                /* continue with reload */
            }

            window.location.reload();
        };

        navigator.serviceWorker.addEventListener(
            "controllerchange",
            reloadForActivatedWorker
        );

        const requestPersistentStorage = async () => {
            if (!("storage" in navigator) || !("persist" in navigator.storage)) return;
            try {
                const alreadyPersisted = await navigator.storage.persisted();
                if (alreadyPersisted) return;
                await navigator.storage.persist();
            } catch {
                /* best-effort — storage API is optional */
            }
        };

        const register = async () => {
            try {
                const registration = await navigator.serviceWorker.register(
                    "/sw.js",
                    { scope: "/" }
                );

                if (cancelled) return;

                // If an update is already waiting on mount, activate it now.
                if (registration.waiting) {
                    shouldReloadOnControllerChange =
                        !!navigator.serviceWorker.controller;
                    registration.waiting.postMessage({ type: "SKIP_WAITING" });
                }

                // New update found while the page is open — swap in without
                // forcing the user to reload every tab.
                registration.addEventListener("updatefound", () => {
                    const installing = registration.installing;
                    if (!installing) return;
                    installing.addEventListener("statechange", () => {
                        if (
                            installing.state === "installed" &&
                            navigator.serviceWorker.controller
                        ) {
                            shouldReloadOnControllerChange = true;
                            installing.postMessage({ type: "SKIP_WAITING" });
                        }
                    });
                });

                void registration.update();

                // Request persistence AFTER SW registration — installed PWAs
                // are auto-granted on Chromium, so deferring until after the
                // SW is active maximizes the chance of approval.
                void requestPersistentStorage();
            } catch {
                /* SW registration is best-effort */
            }
        };

        // Register immediately — useEffect already fires post-hydration, so
        // we're guaranteed the DOM exists. Waiting for the `load` event just
        // widens the first-visit race window for no benefit.
        void register();

        return () => {
            cancelled = true;
            navigator.serviceWorker.removeEventListener(
                "controllerchange",
                reloadForActivatedWorker
            );
        };
    }, []);

    return null;
}

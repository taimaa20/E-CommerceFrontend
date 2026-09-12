import { config } from "@/lib/config";

/**
 * Connectivity singleton.
 *
 * Three states:
 *  - "online"    : navigator.onLine && backend reachable
 *  - "degraded"  : navigator.onLine but recent health pings failed (server slow / unreachable)
 *  - "offline"   : navigator.onLine === false
 *
 * Stability rules (P0 production fix):
 *  1. A single slow/failed health ping never transitions us out of "online".
 *     We require {@link DEGRADED_FAILURE_THRESHOLD} consecutive failures
 *     before flipping to "degraded". This absorbs ordinary latency spikes
 *     and a single dropped ping.
 *  2. Actual API traffic is the truth-source. Callers report success via
 *     {@link reportApiSuccess} and that immediately restores "online" and
 *     resets the failure counter — a working POST is stronger evidence than
 *     a failed health ping.
 *  3. {@link reportApiFailure} only nudges the next ping forward; it does
 *     NOT flip state on its own, because a single 5xx or timeout could
 *     just be transient.
 *  4. Health ping timeout raised from 4s → 8s so a slow backend isn't
 *     misclassified as down.
 *
 * Consumers subscribe once and receive updates. Cashier hot-path code
 * reads `getConnectivityState()` synchronously and never awaits us.
 */

export type ConnectivityState = "online" | "degraded" | "offline";

type Listener = (state: ConnectivityState) => void;

const listeners = new Set<Listener>();
let state: ConnectivityState = typeof navigator !== "undefined" && navigator.onLine ? "online" : "offline";
let pingTimer: ReturnType<typeof setTimeout> | null = null;
let started = false;
let pingInFlight = false;

const HEALTH_PING_INTERVAL_MS = 10_000;
const HEALTH_PING_TIMEOUT_MS = 8_000;
/**
 * How many health pings must fail back-to-back before we leave "online".
 * Two consecutive failures over the 10 s cadence ≈ 20 s of unreachability,
 * which is the floor for a real outage versus a transient blip.
 */
const DEGRADED_FAILURE_THRESHOLD = 2;
let consecutiveHealthFailures = 0;

function setState(next: ConnectivityState) {
    if (next === state) return;
    state = next;
    for (const l of listeners) {
        try {
            l(state);
        } catch {
            /* listener errors must never break connectivity */
        }
    }
}

async function healthPing(): Promise<boolean> {
    if (typeof fetch === "undefined") return false;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), HEALTH_PING_TIMEOUT_MS);
    try {
        const res = await fetch(`${config.apiBaseUrl}/health`, {
            method: "GET",
            signal: controller.signal,
            cache: "no-store",
        });
        return res.ok;
    } catch {
        return false;
    } finally {
        clearTimeout(timer);
    }
}

function schedulePing(delayMs: number) {
    if (pingTimer) clearTimeout(pingTimer);
    pingTimer = setTimeout(runPing, delayMs);
}

async function runPing() {
    if (pingInFlight) {
        schedulePing(HEALTH_PING_INTERVAL_MS);
        return;
    }

    if (typeof navigator !== "undefined" && !navigator.onLine) {
        setState("offline");
        // navigator.onLine being false is authoritative for hard offline,
        // but we don't touch consecutiveHealthFailures because the next
        // online event will trigger a probe immediately.
        schedulePing(HEALTH_PING_INTERVAL_MS);
        return;
    }

    pingInFlight = true;
    try {
        const ok = await healthPing();
        if (ok) {
            consecutiveHealthFailures = 0;
            setState("online");
        } else {
            consecutiveHealthFailures++;
            if (consecutiveHealthFailures >= DEGRADED_FAILURE_THRESHOLD) {
                setState("degraded");
            }
            // Below threshold: keep current state. A single slow/dropped
            // ping is not enough to flap us out of "online".
        }
    } finally {
        pingInFlight = false;
        // Faster cadence while degraded so recovery is detected within seconds.
        schedulePing(state === "degraded" ? 5_000 : HEALTH_PING_INTERVAL_MS);
    }
}

export function startConnectivity() {
    if (started || typeof window === "undefined") return;
    started = true;
    const goOnline = () => {
        // navigator says we're back — probe immediately. consecutiveHealthFailures
        // stays as-is; a successful probe will reset it.
        schedulePing(500);
    };
    const goOffline = () => setState("offline");
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    document.addEventListener("visibilitychange", () => {
        if (!document.hidden) schedulePing(300);
    });
    schedulePing(1_000);
}

export function getConnectivityState(): ConnectivityState {
    return state;
}

export function isOnline(): boolean {
    return state === "online";
}

/**
 * Called by API helpers whenever a real request succeeds. A successful
 * write is stronger evidence than a health ping, so we immediately reset
 * to "online" and clear the failure counter. Prevents the badge from
 * flapping to "Server unreachable" while we're actively processing
 * mutations against the same server.
 */
export function reportApiSuccess(): void {
    consecutiveHealthFailures = 0;
    if (state !== "online" && (typeof navigator === "undefined" || navigator.onLine)) {
        setState("online");
    }
}

/**
 * Called by API helpers on a network-level failure (fetch reject / abort).
 * We do NOT flip state from a single failure — it could be transient. We
 * schedule an earlier health ping so confirmation happens quickly. HTTP
 * status errors (4xx/5xx) do NOT count as connectivity failures.
 */
export function reportApiFailure(): void {
    schedulePing(1_000);
}

export function subscribeConnectivity(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

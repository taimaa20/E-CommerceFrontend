import { config } from "@/lib/config";

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);

function isLoopback(hostname: string): boolean {
    return LOOPBACK_HOSTS.has(hostname);
}

/**
 * Stored image URLs are absolute — the backend persists
 * `{scheme}://{host}/uploads/...` as seen at upload time
 * (UploadsController). Rows uploaded against a dev backend therefore
 * point at `localhost:7142`, which is unreachable from any other
 * machine (ERR_CONNECTION_REFUSED on IIS/Azure clients).
 *
 * When the stored host is loopback but the browser is NOT on loopback,
 * fall back to the same path on the current origin: IIS rewrites
 * /uploads/* to the backend, and a relative 404 on other hosts is no
 * worse than a refused connection. Local dev (browser on localhost)
 * keeps the stored URL untouched.
 *
 * Additionally, builds with NEXT_PUBLIC_RELATIVE_UPLOADS=true (IIS)
 * relativize EVERY absolute /uploads URL — including ones pointing at
 * the backend's own host/port — so image traffic always flows through
 * the frontend origin's reverse-proxy rewrite and clients never need
 * direct network reach to the backend.
 */
export function relocateLoopbackImageUrl(src: string): string {
    if (typeof window === "undefined" || isLoopback(window.location.hostname)) return src;
    try {
        const parsed = new URL(src);
        if (isLoopback(parsed.hostname)) {
            return parsed.pathname + parsed.search;
        }
        if (config.relativeUploads && parsed.pathname.startsWith("/uploads/")) {
            return parsed.pathname + parsed.search;
        }
        return src;
    } catch {
        return src; // relative or malformed — leave as-is
    }
}

export function normalizeImageSrc(src?: string | null): string | undefined {
    const normalized = src?.trim();
    return normalized ? relocateLoopbackImageUrl(normalized) : undefined;
}

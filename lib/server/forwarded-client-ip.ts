import { createHmac } from "node:crypto";
import { isIP } from "node:net";

/**
 * The browser's IP, for BFF routes that call the backend on the shopper's behalf.
 *
 * `trustUpstream` must be true ONLY when this Next.js server is reachable exclusively through a
 * reverse proxy that appends the real client address to X-Forwarded-For (IIS/ARR with Node bound
 * to 127.0.0.1, Azure App Service front end). Deployments opt in with
 * BFF_TRUST_UPSTREAM_FORWARDED_FOR=true. Otherwise — local `next dev`, or Next exposed directly —
 * the header is whatever the browser sent, so nothing is forwarded and the backend falls back to
 * this server's own address rather than to a client-chosen identity.
 *
 * Even when trusted, only the RIGHT-MOST entry is used: that is the one the proxy appended; every
 * entry to its left was supplied by the client and is ignored.
 *
 * Loopback values are never forwarded: the backend treats loopback callers specially (local
 * print endpoints), and a forged "127.0.0.1" must not be able to reach it through this hop.
 *
 * Dependency-free on purpose (only node built-ins) so it runs under `node --test`.
 */
export function forwardedClientIp(forwardedFor: string | null | undefined, trustUpstream: boolean): string | undefined {
    if (!trustUpstream) return undefined;

    const rightMost = forwardedFor?.split(",").map(entry => entry.trim()).filter(Boolean).at(-1);
    if (!rightMost) return undefined;

    const address = stripPort(rightMost);
    if (!isIP(address) || isLoopback(address)) return undefined;
    return address;
}

/** Deployment switch, read from the server environment (never exposed to the browser). */
export const TRUST_UPSTREAM_FORWARDED_FOR_ENV = "BFF_TRUST_UPSTREAM_FORWARDED_FOR";

export function isUpstreamForwardedForTrusted(env: Record<string, string | undefined>): boolean {
    return env[TRUST_UPSTREAM_FORWARDED_FOR_ENV]?.trim().toLowerCase() === "true";
}

/**
 * Server-to-server proof that the shopper IP below came from this BFF.
 *
 * Between two App Services the backend only ever sees platform infrastructure as its peer, so it
 * cannot trust X-Forwarded-For by address. Instead the BFF sends the shopper IP it resolved above
 * in a dedicated header, plus an HMAC-SHA256 of that exact value keyed with BFF_TRUST_SECRET — a
 * server-only setting shared with the backend (never NEXT_PUBLIC_*, never sent to the browser).
 * The backend (BffClientIpResolver) accepts the IP only when the proof verifies, and uses it for
 * rate limiting only.
 *
 * Both headers are generated here from scratch. The BFF routes build their upstream headers from
 * an explicit allow-list, so browser-supplied X-BFF-* headers are never forwarded.
 */
export const BFF_CLIENT_IP_HEADER = "X-BFF-Client-IP";
export const BFF_TRUST_HEADER = "X-BFF-Trust";
export const BFF_TRUST_SECRET_ENV = "BFF_TRUST_SECRET";
const BFF_PROOF_CONTEXT = "bff-client-ip:v1:";

/** Lower-case hex HMAC-SHA256; must match BffClientIpResolver.ComputeProof on the backend. */
export function bffTrustProof(clientIp: string, secret: string): string {
    return createHmac("sha256", secret.trim()).update(BFF_PROOF_CONTEXT + clientIp).digest("hex");
}

/**
 * Upstream headers carrying the verified shopper IP, or none. Emitted only when the deployment
 * both trusts its fronting proxy (BFF_TRUST_UPSTREAM_FORWARDED_FOR=true) and holds the shared
 * secret; locally neither is set and the backend falls back to the connection address.
 */
export function bffTrustHeaders(
    forwardedFor: string | null | undefined,
    env: Record<string, string | undefined>,
): Record<string, string> {
    const secret = env[BFF_TRUST_SECRET_ENV]?.trim();
    const clientIp = forwardedClientIp(forwardedFor, isUpstreamForwardedForTrusted(env));
    if (!secret || !clientIp) return {};
    return {
        [BFF_CLIENT_IP_HEADER]: clientIp,
        [BFF_TRUST_HEADER]: bffTrustProof(clientIp, secret),
    };
}

/** IIS/ARR and App Service append "ip:port" or "[v6]:port". */
function stripPort(value: string): string {
    const bracketed = /^\[([^\]]+)\](?::\d+)?$/.exec(value);
    if (bracketed) return bracketed[1];
    const ipv4WithPort = /^(\d{1,3}(?:\.\d{1,3}){3}):\d+$/.exec(value);
    return ipv4WithPort ? ipv4WithPort[1] : value;
}

function isLoopback(address: string): boolean {
    const normalized = address.toLowerCase().replace(/^::ffff:/, "");
    return normalized === "::1" || normalized.startsWith("127.");
}

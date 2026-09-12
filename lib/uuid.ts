/**
 * Centralized UUID v4 generation.
 *
 * `crypto.randomUUID()` only exists in secure contexts (HTTPS / localhost)
 * on Chromium 92+. External access through IIS over HTTP, or older
 * Chromium/Edge, throws "crypto.randomUUID is not a function". The fallback
 * builds an RFC 4122 v4 UUID from `crypto.getRandomValues`, which is NOT
 * gated on secure context and is therefore available over plain HTTP.
 *
 * There is deliberately no Math.random path: these values are used as order
 * idempotency keys and as the guest order-tracking token, so a guessable
 * identifier is a correctness and disclosure risk. Without a CSPRNG this
 * throws instead of minting a weak one.
 *
 * Output format is identical in every path, so persisted IDs are unaffected.
 */
export function generateUUID(): string {
    if (typeof crypto !== "undefined") {
        if (typeof crypto.randomUUID === "function") {
            return crypto.randomUUID();
        }
        if (typeof crypto.getRandomValues === "function") {
            const bytes = new Uint8Array(16);
            crypto.getRandomValues(bytes);
            return formatV4(bytes);
        }
    }
    throw new Error(
        "Secure random generation is unavailable: neither crypto.randomUUID nor " +
        "crypto.getRandomValues is present in this environment."
    );
}

function formatV4(bytes: Uint8Array): string {
    // Per RFC 4122 §4.4: version nibble = 4, variant bits = 10xx.
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

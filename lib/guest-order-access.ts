const GUEST_ACCESS_TOKEN_BYTES = 32;

/**
 * The secret that owns a guest order: 256 random bits, unpadded base64url. The server keeps only
 * its hash, so this device (and the order link) is the only place it exists. Like generateUUID,
 * there is no Math.random fallback — without a CSPRNG this throws rather than mint a weak token.
 */
export function generateGuestAccessToken(): string {
    if (typeof crypto === "undefined" || typeof crypto.getRandomValues !== "function") {
        throw new Error("Secure random generation is unavailable in this environment.");
    }
    const bytes = new Uint8Array(GUEST_ACCESS_TOKEN_BYTES);
    crypto.getRandomValues(bytes);
    const base64 = btoa(String.fromCharCode(...bytes));
    return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** A first check only; the server validates the address again and owns the decision. */
export function isPlausibleEmail(value: string): boolean {
    return EMAIL_PATTERN.test(value.trim());
}

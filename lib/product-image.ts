/**
 * Product image resolver — bridges the legacy single-URL field (`imageUrl`)
 * and the new variant pipeline (`imageKey`).
 *
 * Why this helper exists
 * ----------------------
 * The backend now writes three WebP variants on upload (thumb/medium/full)
 * alongside the original file. Rows produced before the pipeline shipped only
 * have `imageUrl`. Every consumer — POS grids, detail panels, admin, public
 * menu — must render both cleanly:
 *
 *   - `imageKey` present → use the optimized variant for the current slot.
 *   - `imageKey` absent  → fall back to `imageUrl` (legacy path, unchanged).
 *
 * Consumers NEVER touch the URL convention directly. If we ever move variants
 * to a CDN or rename the size suffix, it's a single-file change here.
 */
import { relocateLoopbackImageUrl } from "@/lib/normalize-image-src";

export type ImageSize = "thumb" | "medium" | "full";

/**
 * Long-edge pixel budgets that match `Services/ImageProcessingService.cs`.
 * Documentation only — the backend is the source of truth. Kept here so
 * callers can reason about which variant to pick for a given CSS slot.
 */
export const IMAGE_VARIANT_WIDTHS: Record<ImageSize, number> = {
    thumb: 200,
    medium: 600,
    full: 1600,
};

function isLoopbackHost(hostname: string): boolean {
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

function shouldUpgradeToHttps(hostname: string): boolean {
    return typeof window !== "undefined" &&
        window.location.protocol === "https:" &&
        !isLoopbackHost(hostname);
}

function normalizeImageUrl(imageUrl: string): string {
    // Dev-machine origins (localhost:7142) persisted in the DB are unreachable
    // from other machines — re-anchor to the current origin first.
    const relocated = relocateLoopbackImageUrl(imageUrl);
    try {
        const parsed = new URL(relocated);
        if (parsed.protocol === "http:" && shouldUpgradeToHttps(parsed.hostname)) {
            parsed.protocol = "https:";
        }
        return parsed.toString();
    } catch {
        return relocated;
    }
}

function imagesDirectoryFromUrl(imageUrl: string | null | undefined): string | null {
    const value = imageUrl?.trim();
    if (!value) return null;

    const relocated = relocateLoopbackImageUrl(value);
    try {
        const parsed = new URL(relocated);
        if (parsed.protocol === "http:" && shouldUpgradeToHttps(parsed.hostname)) {
            parsed.protocol = "https:";
        }
        return `${parsed.origin}${parsed.pathname.slice(0, parsed.pathname.lastIndexOf("/"))}`;
    } catch {
        // Relative (possibly relocated) path — keep it origin-relative.
        const lastSlash = relocated.lastIndexOf("/");
        return lastSlash > 0 ? relocated.slice(0, lastSlash) : null;
    }
}

function imageVariantBaseUrl(imageUrl: string | null | undefined): string {
    // Relative: /uploads is served same-origin in every environment (Next
    // route handler; IIS answers it earlier via its reverse-proxy rewrite).
    return imagesDirectoryFromUrl(imageUrl) ?? "/uploads/images";
}

/**
 * Pick a single URL appropriate for the rendering slot.
 *
 *   - Grid cards → "medium" (≤600 px long edge, ~30–60 KB).
 *   - List-row thumbnails / admin table → "thumb" (≤200 px, ~10 KB).
 *   - Hero / detail sheet → "full" (≤1600 px).
 *
 * Returns `null` when neither input yields a renderable URL so callers can
 * branch to their placeholder — identical shape to the pre-pipeline code path.
 */
export function productImage(
    imageKey: string | null | undefined,
    imageUrl: string | null | undefined,
    size: ImageSize = "medium"
): string | null {
    if (imageKey && imageKey.length > 0) {
        return `${imageVariantBaseUrl(imageUrl)}/${imageKey}-${size}.webp`;
    }
    if (imageUrl && imageUrl.length > 0) {
        return normalizeImageUrl(imageUrl);
    }
    return null;
}

/**
 * Responsive srcSet. Only produced when `imageKey` is present — legacy
 * originals don't have size variants, so there's nothing meaningful to
 * serve at multiple widths.
 *
 * Pair with a `sizes` attribute at the call site to let the browser
 * pick the smallest file that fills the slot (400w on a phone, 600w
 * on a tablet grid, 1600w on a detail hero).
 */
export function productImageSrcSet(
    imageKey: string | null | undefined,
    imageUrl?: string | null | undefined
): string | undefined {
    if (!imageKey || imageKey.length === 0) return undefined;
    const base = `${imageVariantBaseUrl(imageUrl)}/${imageKey}`;
    return (
        `${base}-thumb.webp ${IMAGE_VARIANT_WIDTHS.thumb}w, ` +
        `${base}-medium.webp ${IMAGE_VARIANT_WIDTHS.medium}w, ` +
        `${base}-full.webp ${IMAGE_VARIANT_WIDTHS.full}w`
    );
}

/**
 * Convenience wrapper for the most common case: a responsive product image
 * that should degrade cleanly to the legacy URL. Returns `null` when no
 * image exists — caller renders its placeholder.
 */
export function productImageProps(
    imageKey: string | null | undefined,
    imageUrl: string | null | undefined,
    fallbackSize: ImageSize = "medium"
): { src: string; srcSet?: string } | null {
    const src = productImage(imageKey, imageUrl, fallbackSize);
    if (!src) return null;
    return { src, srcSet: productImageSrcSet(imageKey, imageUrl) };
}

/**
 * Client-side color extraction utilities using the Canvas API.
 * Generates a complete UI theme from a single brand color.
 * No external dependencies required.
 */

/** Minimal 3-color brand palette (legacy compat) */
export interface BrandPalette {
    primary: string;
    primaryForeground: string;
    accent: string;
}

/** Full UI theme — every CSS variable the system uses */
export interface FullTheme {
    // Brand
    primary: string;
    primaryForeground: string;
    // Surfaces
    background: string;
    foreground: string;
    card: string;
    cardForeground: string;
    popover: string;
    popoverForeground: string;
    // Secondary / muted
    secondary: string;
    secondaryForeground: string;
    muted: string;
    mutedForeground: string;
    accent: string;
    accentForeground: string;
    // Chrome
    border: string;
    input: string;
    ring: string;
    // Semantic (fixed — NOT brand-derived)
    destructive: string;
    success: string;
    successForeground: string;
    warning: string;
    warningForeground: string;
    info: string;
    infoForeground: string;
    // Sidebar
    sidebar: string;
    sidebarForeground: string;
    sidebarPrimary: string;
    sidebarPrimaryForeground: string;
    sidebarAccent: string;
    sidebarAccentForeground: string;
    sidebarBorder: string;
    sidebarRing: string;
    // Charts
    chart1: string;
    chart2: string;
    chart3: string;
    chart4: string;
    chart5: string;
}

// ─── Extraction ─────────────────────────────────────────────────────────────

/**
 * Extracts the dominant non-background color from an image URL.
 * Uses Canvas API to sample pixels and find the most frequent saturated color.
 */
export function extractDominantColor(imageUrl: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";

        img.onload = () => {
            try {
                const canvas = document.createElement("canvas");
                const size = 64;
                canvas.width = size;
                canvas.height = size;

                const ctx = canvas.getContext("2d");
                if (!ctx) { resolve("#f97316"); return; }

                ctx.drawImage(img, 0, 0, size, size);
                const { data } = ctx.getImageData(0, 0, size, size);

                const buckets: Record<string, number> = {};

                for (let i = 0; i < data.length; i += 4) {
                    const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
                    if (a < 128) continue;
                    if (r > 240 && g > 240 && b > 240) continue;
                    if (r < 20 && g < 20 && b < 20) continue;
                    const max = Math.max(r, g, b), min = Math.min(r, g, b);
                    if (max === 0 || (max - min) / max < 0.2) continue;
                    const qr = Math.round(r / 32) * 32;
                    const qg = Math.round(g / 32) * 32;
                    const qb = Math.round(b / 32) * 32;
                    const key = `${qr},${qg},${qb}`;
                    buckets[key] = (buckets[key] || 0) + 1;
                }

                const sorted = Object.entries(buckets).sort((a, b) => b[1] - a[1]);
                if (sorted.length === 0) { resolve("#f97316"); return; }

                const [topKey] = sorted[0];
                const [r, g, b] = topKey.split(",").map(Number);
                resolve(rgbToHex(r, g, b));
            } catch {
                resolve("#f97316");
            }
        };

        img.onerror = () => reject(new Error("Failed to load image for color extraction"));
        img.src = imageUrl;
    });
}

// ─── Contrast ───────────────────────────────────────────────────────────────

/** Returns '#000000' or '#ffffff' for WCAG-compliant contrast. */
export function getContrastColor(hex: string): "#000000" | "#ffffff" {
    return getRelativeLuminance(hex) < 0.179 ? "#ffffff" : "#000000";
}

// ─── Palette Generators ─────────────────────────────────────────────────────

/** Legacy 3-color palette for backward compat. */
export function generateBrandPalette(primaryHex: string): BrandPalette {
    const foreground = getContrastColor(primaryHex);
    const accent = adjustBrightness(primaryHex, foreground === "#ffffff" ? 30 : -30);
    return { primary: primaryHex, primaryForeground: foreground, accent };
}

/**
 * Generates a COMPLETE UI theme from a single primary hex color.
 *
 * Logic:
 * - Brand surfaces (background, card, secondary, muted) get a very subtle hue tint
 * - Text colors use the primary hue at very low saturation
 * - Borders/inputs use the primary hue at low saturation
 * - Semantic colors (destructive, success, warning, info) are FIXED
 * - Sidebar mirrors the main theme with slightly stronger tint
 * - Charts derive 5 colors by rotating the hue
 */
export function generateFullTheme(primaryHex: string): FullTheme {
    const [h, s, l] = hexToHsl(primaryHex);
    const fg = getContrastColor(primaryHex);

    return {
        // Brand
        primary: primaryHex,
        primaryForeground: fg,

        // Surfaces — very subtle hue tint
        background: hslToHex(h, Math.min(s, 8), 99),
        foreground: hslToHex(h, 5, 10),
        card: hslToHex(h, Math.min(s, 5), 100),
        cardForeground: hslToHex(h, 5, 10),
        popover: hslToHex(h, Math.min(s, 5), 100),
        popoverForeground: hslToHex(h, 5, 10),

        // Secondary / muted — desaturated primary
        secondary: hslToHex(h, Math.min(s, 12), 96),
        secondaryForeground: hslToHex(h, 5, 18),
        muted: hslToHex(h, Math.min(s, 12), 96),
        mutedForeground: hslToHex(h, 5, 45),
        accent: hslToHex(h, Math.min(s, 15), 95),
        accentForeground: hslToHex(h, 5, 18),

        // Chrome
        border: hslToHex(h, Math.min(s, 10), 90),
        input: hslToHex(h, Math.min(s, 10), 90),
        ring: hslToHex(h, Math.min(s, 40), 50),

        // Semantic (FIXED — never change with brand)
        destructive: "#ef4444",  // red-500
        success: "#16a34a",      // green-600
        successForeground: "#ffffff",
        warning: "#f59e0b",      // amber-500
        warningForeground: "#ffffff",
        info: "#3b82f6",         // blue-500
        infoForeground: "#ffffff",

        // Sidebar — slightly stronger brand tint
        sidebar: hslToHex(h, Math.min(s, 8), 98),
        sidebarForeground: hslToHex(h, 5, 10),
        sidebarPrimary: primaryHex,
        sidebarPrimaryForeground: fg,
        sidebarAccent: hslToHex(h, Math.min(s, 15), 95),
        sidebarAccentForeground: hslToHex(h, 5, 18),
        sidebarBorder: hslToHex(h, Math.min(s, 10), 90),
        sidebarRing: hslToHex(h, Math.min(s, 40), 50),

        // Charts — rotate hue in 72° steps
        chart1: primaryHex,
        chart2: hslToHex((h + 72) % 360, Math.min(s, 60), 50),
        chart3: hslToHex((h + 144) % 360, Math.min(s, 55), 55),
        chart4: hslToHex((h + 216) % 360, Math.min(s, 65), 50),
        chart5: hslToHex((h + 288) % 360, Math.min(s, 60), 55),
    };
}

// ─── Color Space Helpers ────────────────────────────────────────────────────

export function rgbToHex(r: number, g: number, b: number): string {
    return "#" + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");
}

export function hexToRgb(hex: string): [number, number, number] {
    const clean = hex.replace("#", "");
    const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
    const num = parseInt(full, 16);
    return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

export function hexToHsl(hex: string): [number, number, number] {
    const [r, g, b] = hexToRgb(hex).map((v) => v / 255);
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const l = (max + min) / 2;
    if (max === min) return [0, 0, l * 100];
    const d = max - min;
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    let h = 0;
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
    return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

export function hslToHex(h: number, s: number, l: number): string {
    const sn = s / 100, ln = l / 100;
    const a = sn * Math.min(ln, 1 - ln);
    const f = (n: number) => {
        const k = (n + h / 30) % 12;
        const color = ln - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        return Math.round(color * 255);
    };
    return rgbToHex(f(0), f(8), f(4));
}

export function getRelativeLuminance(hex: string): number {
    const [r, g, b] = hexToRgb(hex).map((c) => {
        const sRGB = c / 255;
        return sRGB <= 0.03928 ? sRGB / 12.92 : Math.pow((sRGB + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function adjustBrightness(hex: string, amount: number): string {
    const [r, g, b] = hexToRgb(hex);
    return rgbToHex(r + amount, g + amount, b + amount);
}

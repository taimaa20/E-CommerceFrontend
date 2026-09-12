import { cache } from "react";
import { headers } from "next/headers";
import type { PublicPageSettings } from "@/types/public-pages";

type PublicLanguage = "en" | "ar";

interface PublicBrandingSettings {
    logoUrl?: string | null;
    businessName?: string | null;
    siteName?: string | null;
    bannerUrl?: string | null;
    primaryColor?: string | null;
    primaryForeground?: string | null;
    accentColor?: string | null;
}

const DEFAULT_PUBLIC_SETTINGS: PublicPageSettings = {
    restaurantName: "Retail POS",
    restaurantTagline: null,
    logoUrl: null,
    coverImageUrl: null,
    restaurantAddress: null,
    restaurantPhone: null,
    whatsAppNumber: null,
    websiteUrl: null,
    facebookUrl: null,
    instagramUrl: null,
    tikTokUrl: null,
    googleMapsLocationUrl: null,
    googleReviewUrl: null,
    qrMenuUrl: null,
    primaryColor: "#f97316",
    primaryForeground: "#ffffff",
    accentColor: "#ea6b0f",
    language: "en",
    updatedAt: null,
};

const TENANT_HEADER = "X-Tenant-ID";

export const getPublicPageSettings = cache(async (language?: string | null): Promise<PublicPageSettings> => {
    const requestHeaders = await headers();
    const host = requestHeaders.get("x-forwarded-host") || requestHeaders.get("host");
    if (!host) return DEFAULT_PUBLIC_SETTINGS;

    const protocol = requestHeaders.get("x-forwarded-proto") || "http";
    const originUrl = `${protocol}://${host}`;
    const preferredLanguage = normalizePublicLanguage(language) || getPreferredLanguage(requestHeaders.get("accept-language"));
    const tenantId =
        requestHeaders.get(TENANT_HEADER) ||
        process.env.NEXT_PUBLIC_TENANT_ID ||
        process.env.TENANT_ID ||
        "";
    const fetchHeaders = {
        ...(tenantId ? { [TENANT_HEADER]: tenantId } : {}),
        "Accept-Language": preferredLanguage,
    };

    const [settingsData, tenantBrandingData, menuBrandingData] = await Promise.all([
        fetchPublicJson<Partial<PublicPageSettings>>(`${originUrl}/api/api-proxy/settings`, fetchHeaders),
        fetchPublicJson<PublicBrandingSettings>(`${originUrl}/api/api-proxy/tenants/branding`, fetchHeaders),
        fetchPublicJson<PublicBrandingSettings>(`${originUrl}/api/api-proxy/menu/public/branding`, fetchHeaders),
    ]);

    const settings = settingsData
        ? normalizePublicSettings(settingsData, originUrl, preferredLanguage)
        : withRequestFallbacks(DEFAULT_PUBLIC_SETTINGS, originUrl, preferredLanguage);

    return applyBranding(settings, tenantBrandingData, menuBrandingData, originUrl);
});

export function normalizePublicLanguage(value: string | null | undefined): PublicLanguage | null {
    return value === "ar" || value === "en" ? value : null;
}

function normalizePublicSettings(
    data: Partial<PublicPageSettings>,
    originUrl: string,
    preferredLanguage: PublicLanguage
): PublicPageSettings {
    return {
        restaurantName: cleanText(data.restaurantName) || DEFAULT_PUBLIC_SETTINGS.restaurantName,
        restaurantTagline: cleanText(data.restaurantTagline),
        logoUrl: cleanImageSource(data.logoUrl, originUrl),
        coverImageUrl: cleanImageSource(data.coverImageUrl, originUrl),
        restaurantAddress: cleanText(data.restaurantAddress),
        restaurantPhone: cleanPhone(data.restaurantPhone),
        whatsAppNumber: cleanPhone(data.whatsAppNumber),
        websiteUrl: cleanHttpUrl(data.websiteUrl) || cleanHttpUrl(originUrl),
        facebookUrl: cleanHttpUrl(data.facebookUrl),
        instagramUrl: cleanHttpUrl(data.instagramUrl),
        tikTokUrl: cleanHttpUrl(data.tikTokUrl),
        googleMapsLocationUrl: cleanHttpUrl(data.googleMapsLocationUrl),
        googleReviewUrl: cleanHttpUrl(data.googleReviewUrl),
        qrMenuUrl: cleanHttpUrl(data.qrMenuUrl),
        primaryColor: cleanHexColor(data.primaryColor) || DEFAULT_PUBLIC_SETTINGS.primaryColor,
        primaryForeground: cleanHexColor(data.primaryForeground) || DEFAULT_PUBLIC_SETTINGS.primaryForeground,
        accentColor: cleanHexColor(data.accentColor) || DEFAULT_PUBLIC_SETTINGS.accentColor,
        language: preferredLanguage,
        updatedAt: cleanText(data.updatedAt),
    };
}

function withRequestFallbacks(
    settings: PublicPageSettings,
    originUrl: string,
    preferredLanguage: PublicLanguage
): PublicPageSettings {
    return {
        ...settings,
        websiteUrl: settings.websiteUrl || cleanHttpUrl(originUrl),
        primaryColor: settings.primaryColor || DEFAULT_PUBLIC_SETTINGS.primaryColor,
        primaryForeground: settings.primaryForeground || DEFAULT_PUBLIC_SETTINGS.primaryForeground,
        accentColor: settings.accentColor || DEFAULT_PUBLIC_SETTINGS.accentColor,
        language: preferredLanguage,
    };
}

async function fetchPublicJson<T>(url: string, headers: Record<string, string>): Promise<T | null> {
    try {
        const response = await fetch(url, {
            headers,
            cache: "no-store",
        });

        return response.ok ? await response.json() as T : null;
    } catch {
        return null;
    }
}

function applyBranding(
    settings: PublicPageSettings,
    tenantBranding: PublicBrandingSettings | null,
    menuBranding: PublicBrandingSettings | null,
    originUrl: string
): PublicPageSettings {
    const logoUrl =
        cleanImageSource(tenantBranding?.logoUrl, originUrl) ||
        cleanImageSource(menuBranding?.logoUrl, originUrl) ||
        settings.logoUrl;
    const coverImageUrl =
        settings.coverImageUrl ||
        cleanImageSource(menuBranding?.bannerUrl || tenantBranding?.bannerUrl, originUrl);
    const primaryColor =
        cleanHexColor(tenantBranding?.primaryColor) ||
        cleanHexColor(menuBranding?.primaryColor) ||
        settings.primaryColor;
    const primaryForeground =
        cleanHexColor(tenantBranding?.primaryForeground) ||
        settings.primaryForeground ||
        DEFAULT_PUBLIC_SETTINGS.primaryForeground;
    const accentColor =
        cleanHexColor(tenantBranding?.accentColor) ||
        settings.accentColor ||
        DEFAULT_PUBLIC_SETTINGS.accentColor;

    return {
        ...settings,
        restaurantName: cleanText(tenantBranding?.businessName) || cleanText(menuBranding?.siteName) || settings.restaurantName,
        logoUrl,
        coverImageUrl,
        primaryColor,
        primaryForeground,
        accentColor,
    };
}

export function getPublicMetadataImageUrl(settings: PublicPageSettings): string | undefined {
    return [settings.coverImageUrl, settings.logoUrl].find((url) => url?.startsWith("http://") || url?.startsWith("https://")) ?? undefined;
}

export function buildWhatsAppUrl(phone: string | null): string | null {
    const digits = phone?.replace(/\D/g, "");
    return digits ? `https://wa.me/${digits}` : null;
}

export function buildTelUrl(phone: string | null): string | null {
    const normalized = cleanPhone(phone);
    return normalized ? `tel:${normalized.replace(/[^\d+]/g, "")}` : null;
}

function cleanHttpUrl(value: string | null | undefined, baseUrl?: string): string | null {
    const trimmed = cleanText(value);
    if (!trimmed || !URL.canParse(trimmed, baseUrl)) return null;

    const url = new URL(trimmed, baseUrl);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url.toString();
}

function cleanImageSource(value: string | null | undefined, baseUrl?: string): string | null {
    const trimmed = cleanText(value);
    if (!trimmed) return null;
    return isSafeDataImage(trimmed) ? trimmed : cleanHttpUrl(trimmed, baseUrl);
}

function cleanHexColor(value: string | null | undefined): string | null {
    const trimmed = cleanText(value);
    return trimmed && /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(trimmed) ? trimmed : null;
}

function isSafeDataImage(value: string): boolean {
    const commaIndex = value.indexOf(",");
    if (commaIndex < 0) return false;

    const header = value.slice(0, commaIndex).toLowerCase();
    if (!/^data:image\/(?:png|jpe?g|gif|webp|svg\+xml);base64$/.test(header)) return false;

    return /^[a-z0-9+/=\r\n]+$/i.test(value.slice(commaIndex + 1));
}

function cleanPhone(value: string | null | undefined): string | null {
    const trimmed = cleanText(value);
    if (!trimmed) return null;

    const normalized = trimmed.replace(/[^\d+()\-\s]/g, "");
    return normalized.length >= 5 ? normalized : null;
}

function cleanText(value: string | null | undefined): string | null {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
}

function getPreferredLanguage(acceptLanguage: string | null): PublicLanguage {
    return acceptLanguage?.toLowerCase().startsWith("ar") ? "ar" : "en";
}

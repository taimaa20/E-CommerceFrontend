import type { Metadata } from "next";
import type { CSSProperties } from "react";
import {
    ArrowUpRight,
    Facebook,
    Globe,
    Instagram,
    MapPin,
    MessageCircle,
    Music2,
    Phone,
    Star,
    Utensils,
} from "lucide-react";
import { TrackedLink } from "@/components/public-pages/TrackedLink";
import {
    buildTelUrl,
    buildWhatsAppUrl,
    getPublicMetadataImageUrl,
    getPublicPageSettings,
    normalizePublicLanguage,
} from "@/lib/public-page-settings";
import type { FollowUsLink, PublicPageSettings } from "@/types/public-pages";

export const dynamic = "force-dynamic";

const COPY = {
    en: {
        titlePrefix: "Follow Us",
        taglineFallback: "Fresh flavors, fast service, and a table worth sharing.",
        socialLabel: "Social links",
        whatsApp: "WhatsApp",
        callNow: "Call Now",
        openWhatsApp: "Open WhatsApp",
        viewMenu: "View Menu",
        instagram: "Instagram",
        tikTok: "TikTok",
        facebook: "Facebook",
        website: "Website",
        googleMaps: "Google Maps",
        googleReviews: "Google Reviews",
        callRestaurant: "Call Restaurant",
        languageToggle: "العربية",
        changeLanguage: "Change language",
        meta: "Find our menu, location, reviews, and social channels in one place.",
    },
    ar: {
        titlePrefix: "تابعنا",
        taglineFallback: "نكهات طازجة وخدمة سريعة وتجربة تستحق المشاركة.",
        socialLabel: "روابط التواصل",
        whatsApp: "واتساب",
        callNow: "اتصل الآن",
        openWhatsApp: "افتح واتساب",
        viewMenu: "عرض القائمة",
        instagram: "إنستغرام",
        tikTok: "تيك توك",
        facebook: "فيسبوك",
        website: "الموقع",
        googleMaps: "خرائط Google",
        googleReviews: "تقييمات Google",
        callRestaurant: "اتصل بالمطعم",
        languageToggle: "English",
        changeLanguage: "تغيير اللغة",
        meta: "القائمة والموقع والتقييمات وروابط التواصل في مكان واحد.",
    },
} as const;

type FollowUsCopy = { [Key in keyof typeof COPY.en]: string };
type LanguageSearchParams = { lang?: string | string[] };
type FollowUsPageProps = { searchParams: Promise<LanguageSearchParams> };

export async function generateMetadata({ searchParams }: FollowUsPageProps): Promise<Metadata> {
    const settings = await getPublicPageSettings(await getRequestedLanguage(searchParams));
    const copy = settings.language === "ar" ? COPY.ar : COPY.en;
    const title = `${copy.titlePrefix} | ${settings.restaurantName}`;
    const description = settings.restaurantTagline || copy.meta;
    const image = getPublicMetadataImageUrl(settings);

    return {
        title,
        description,
        openGraph: {
            title,
            description,
            type: "website",
            images: image ? [{ url: image }] : undefined,
        },
        twitter: {
            card: image ? "summary_large_image" : "summary",
            title,
            description,
            images: image ? [image] : undefined,
        },
    };
}

export default async function FollowUsPage({ searchParams }: FollowUsPageProps) {
    const settings = await getPublicPageSettings(await getRequestedLanguage(searchParams));
    const isArabic = settings.language === "ar";
    const copy = isArabic ? COPY.ar : COPY.en;
    const links = buildLinks(settings, copy);
    const socialLinks = links.filter((link) => link.platform !== "Menu");
    const languageHref = `/followus?lang=${isArabic ? "en" : "ar"}`;
    const brandStyle = getBrandStyle(settings, isArabic);
    const backgroundStyle = getBackgroundStyle(Boolean(settings.coverImageUrl));

    return (
        <main
            className="public-page-font min-h-screen bg-[#f7f3ec] text-slate-950 dark:bg-[#101113] dark:text-white"
            dir={isArabic ? "rtl" : "ltr"}
            style={brandStyle}
        >
            <style>{getPublicPageFontCss(isArabic)}</style>
            <section className="relative isolate overflow-hidden">
                {settings.coverImageUrl ? (
                    <img
                        src={settings.coverImageUrl}
                        alt=""
                        className="absolute inset-0 -z-20 h-full w-full object-cover"
                        loading="eager"
                        decoding="async"
                        fetchPriority="high"
                    />
                ) : null}
                <div className="absolute inset-0 -z-10" style={backgroundStyle} />
                <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col px-4 pb-10 pt-5 sm:px-6 sm:pt-8">
                    <div className="mb-5 flex justify-end">
                        <a
                            href={languageHref}
                            aria-label={copy.changeLanguage}
                            className="inline-flex h-10 items-center justify-center rounded-lg border border-white/70 bg-white/80 px-4 text-sm font-black text-[color:var(--public-primary)] shadow-lg shadow-black/5 backdrop-blur-xl transition hover:-translate-y-0.5 hover:bg-white dark:border-white/15 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
                        >
                            {copy.languageToggle}
                        </a>
                    </div>

                    <header className="flex flex-col items-center text-center">
                        <div
                            className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-lg border bg-white/80 shadow-2xl backdrop-blur-xl dark:bg-white/10"
                            style={getBrandBorderStyle()}
                        >
                            {settings.logoUrl ? (
                                <img
                                    src={settings.logoUrl}
                                    alt={settings.restaurantName}
                                    className="h-full w-full object-contain p-2"
                                    loading="eager"
                                    decoding="async"
                                />
                            ) : (
                                <span className="flex h-full w-full items-center justify-center bg-[var(--public-primary)] text-4xl font-black text-[color:var(--public-primary-foreground)]">
                                    {settings.restaurantName.charAt(0).toUpperCase()}
                                </span>
                            )}
                        </div>
                        <h1 className="mt-5 max-w-full text-balance text-4xl font-black leading-tight tracking-normal sm:text-5xl">
                            {settings.restaurantName}
                        </h1>
                        <p className="mt-3 max-w-md text-balance text-base font-semibold text-slate-700 dark:text-slate-200">
                            {settings.restaurantTagline || copy.taglineFallback}
                        </p>
                    </header>

                    {socialLinks.length > 0 ? (
                        <nav className="mt-7" aria-label={copy.socialLabel}>
                            <div className="flex flex-wrap justify-center gap-2">
                                {socialLinks.map((link) => (
                                    <TrackedLink
                                        key={link.platform}
                                        platform={link.platform}
                                        href={link.href}
                                        target={link.external ? "_blank" : undefined}
                                        rel={link.external ? "noopener noreferrer" : undefined}
                                        aria-label={link.label}
                                        title={link.label}
                                        className="group flex h-12 w-12 items-center justify-center rounded-lg border border-white/65 bg-white/75 shadow-lg shadow-black/5 backdrop-blur-xl transition hover:-translate-y-0.5 hover:border-[color:var(--public-primary)] hover:bg-white dark:border-white/15 dark:bg-white/10 dark:hover:bg-white/15"
                                    >
                                        <PlatformIcon platform={link.platform} className="h-5 w-5 text-[color:var(--public-primary)] transition group-hover:scale-110 dark:text-white" />
                                    </TrackedLink>
                                ))}
                            </div>
                        </nav>
                    ) : null}

                    <section className="mt-7 grid gap-3 pb-4">
                        {links.map((link) => (
                            <TrackedLink
                                key={link.platform}
                                platform={link.platform}
                                href={link.href}
                                target={link.external ? "_blank" : undefined}
                                rel={link.external ? "noopener noreferrer" : undefined}
                                className="group grid min-h-20 grid-cols-[3rem_1fr_auto] items-center gap-3 rounded-lg border border-white/70 bg-white/85 p-3 text-start shadow-xl shadow-black/[0.04] backdrop-blur-xl transition hover:-translate-y-0.5 hover:border-[color:var(--public-primary)] hover:bg-white dark:border-white/10 dark:bg-white/10 dark:hover:border-white/25 dark:hover:bg-white/15"
                            >
                                <span className={`flex h-12 w-12 items-center justify-center rounded-lg ${link.tone}`}>
                                    <PlatformIcon platform={link.platform} className="h-5 w-5" />
                                </span>
                                <span className="min-w-0">
                                    <span className="block truncate text-base font-black tracking-normal">{link.label}</span>
                                    <span className="mt-0.5 block truncate text-sm font-medium text-slate-500 dark:text-slate-300">
                                        {link.description}
                                    </span>
                                </span>
                                <ArrowUpRight className="h-5 w-5 text-slate-400 transition group-hover:text-slate-900 rtl:-scale-x-100 dark:text-slate-500 dark:group-hover:text-white" />
                            </TrackedLink>
                        ))}
                    </section>
                </div>
            </section>
        </main>
    );
}

function buildLinks(settings: PublicPageSettings, copy: FollowUsCopy): FollowUsLink[] {
    const whatsAppUrl = buildWhatsAppUrl(settings.whatsAppNumber || settings.restaurantPhone);
    const callUrl = buildTelUrl(settings.restaurantPhone);
    const links: Array<FollowUsLink | null> = [
        settings.qrMenuUrl ? link("Menu", copy.viewMenu, settings.qrMenuUrl, copy.viewMenu, "bg-[var(--public-primary)] text-[color:var(--public-primary-foreground)]", true) : null,
        settings.instagramUrl ? link("Instagram", copy.instagram, settings.instagramUrl, "@Instagram", "bg-pink-600 text-white", true) : null,
        settings.tikTokUrl ? link("TikTok", copy.tikTok, settings.tikTokUrl, "@TikTok", "bg-slate-950 text-white", true) : null,
        settings.facebookUrl ? link("Facebook", copy.facebook, settings.facebookUrl, "Facebook", "bg-blue-600 text-white", true) : null,
        settings.websiteUrl ? link("Website", copy.website, settings.websiteUrl, copy.website, "bg-[var(--public-accent)] text-white", true) : null,
        settings.googleMapsLocationUrl ? link("GoogleMaps", copy.googleMaps, settings.googleMapsLocationUrl, settings.restaurantAddress || copy.googleMaps, "bg-sky-600 text-white", true) : null,
        settings.googleReviewUrl ? link("GoogleReviews", copy.googleReviews, settings.googleReviewUrl, copy.googleReviews, "bg-yellow-500 text-slate-950", true) : null,
        whatsAppUrl ? link("WhatsApp", copy.whatsApp, whatsAppUrl, copy.openWhatsApp, "bg-emerald-600 text-white", true) : null,
        callUrl ? link("Call", copy.callRestaurant, callUrl, settings.restaurantPhone || copy.callNow, "bg-[var(--public-primary)] text-[color:var(--public-primary-foreground)]", false) : null,
    ];

    return links.filter((item): item is FollowUsLink => item !== null);
}

function link(platform: string, label: string, href: string, description: string, tone: string, external: boolean): FollowUsLink {
    return { platform, label, href, description, tone, external };
}

function PlatformIcon({ platform, className }: { platform: string; className?: string }) {
    switch (platform) {
        case "Menu":
            return <Utensils className={className} />;
        case "Instagram":
            return <Instagram className={className} />;
        case "TikTok":
            return <Music2 className={className} />;
        case "Facebook":
            return <Facebook className={className} />;
        case "Website":
            return <Globe className={className} />;
        case "GoogleMaps":
            return <MapPin className={className} />;
        case "GoogleReviews":
            return <Star className={className} />;
        case "WhatsApp":
            return <MessageCircle className={className} />;
        case "Call":
            return <Phone className={className} />;
        default:
            return <ArrowUpRight className={className} />;
    }
}

async function getRequestedLanguage(searchParams: Promise<LanguageSearchParams>) {
    const params = await searchParams;
    const language = Array.isArray(params.lang) ? params.lang[0] : params.lang;
    return normalizePublicLanguage(language);
}

function getBrandStyle(settings: PublicPageSettings, isArabic: boolean): CSSProperties {
    return {
        "--public-primary": settings.primaryColor,
        "--public-primary-foreground": settings.primaryForeground,
        "--public-accent": settings.accentColor,
    } as CSSProperties;
}

function getPublicPageFontCss(isArabic: boolean): string {
    const fontFamily = isArabic
        ? "'NotoArabic', sans-serif"
        : "'Biscuit', var(--font-geist-sans), system-ui, -apple-system, \"Segoe UI\", Roboto, sans-serif";

    return `
        .public-page-font,
        .public-page-font * {
            font-family: ${fontFamily} !important;
            letter-spacing: 0 !important;
        }
    `;
}

function getBackgroundStyle(hasCoverImage: boolean): CSSProperties {
    return {
        backgroundImage: hasCoverImage
            ? "linear-gradient(90deg, var(--public-primary), var(--public-accent)), linear-gradient(180deg, rgba(15,23,42,0.28), rgba(247,243,236,0.96) 46%, #f7f3ec 100%)"
            : "linear-gradient(90deg, var(--public-primary), var(--public-accent)), linear-gradient(180deg, #f3efe8 0%, #f7f3ec 56%, #ffffff 100%)",
        backgroundRepeat: "no-repeat",
        backgroundSize: "100% 5px, 100% 100%",
    };
}

function getBrandBorderStyle(): CSSProperties {
    return {
        borderColor: "rgba(255, 255, 255, 0.88)",
        boxShadow: "0 18px 44px rgba(15, 23, 42, 0.12)",
    };
}

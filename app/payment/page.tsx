import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { ArrowLeft, CreditCard, LockKeyhole } from "lucide-react";
import { FUTURE_PAYMENT_PROVIDERS } from "@/lib/payment-provider-extension-points";
import { getPublicMetadataImageUrl, getPublicPageSettings, normalizePublicLanguage } from "@/lib/public-page-settings";
import type { PublicPageSettings } from "@/types/public-pages";

export const dynamic = "force-dynamic";

const COPY = {
    en: {
        title: "Online Payments",
        comingSoon: "Coming Soon",
        body: "We're preparing a secure online payment experience for our customers.",
        checkBack: "Please check back soon.",
        backToMenu: "Back To Store",
        languageToggle: "العربية",
        changeLanguage: "Change language",
        meta: "A secure online payment experience is coming soon.",
    },
    ar: {
        title: "الدفع الإلكتروني",
        comingSoon: "قريباً",
        body: "نجهز تجربة دفع إلكتروني آمنة لعملائنا.",
        checkBack: "يرجى العودة قريباً.",
        backToMenu: "العودة إلى القائمة",
        languageToggle: "English",
        changeLanguage: "تغيير اللغة",
        meta: "تجربة دفع إلكتروني آمنة قادمة قريباً.",
    },
} as const;

type LanguageSearchParams = { lang?: string | string[] };
type PaymentPageProps = { searchParams: Promise<LanguageSearchParams> };

export async function generateMetadata({ searchParams }: PaymentPageProps): Promise<Metadata> {
    const settings = await getPublicPageSettings(await getRequestedLanguage(searchParams));
    const copy = settings.language === "ar" ? COPY.ar : COPY.en;
    const title = `${copy.title} | ${settings.restaurantName}`;
    const image = getPublicMetadataImageUrl(settings);

    return {
        title,
        description: copy.meta,
        openGraph: {
            title,
            description: copy.meta,
            type: "website",
            images: image ? [{ url: image }] : undefined,
        },
        twitter: {
            card: image ? "summary_large_image" : "summary",
            title,
            description: copy.meta,
            images: image ? [image] : undefined,
        },
    };
}

export default async function PaymentPage({ searchParams }: PaymentPageProps) {
    const settings = await getPublicPageSettings(await getRequestedLanguage(searchParams));
    const isArabic = settings.language === "ar";
    const copy = isArabic ? COPY.ar : COPY.en;
    const languageHref = `/payment?lang=${isArabic ? "en" : "ar"}`;
    const brandStyle = getBrandStyle(settings, isArabic);
    const backgroundStyle = getBackgroundStyle(Boolean(settings.coverImageUrl));

    return (
        <main
            className="public-page-font min-h-screen bg-[#f7f3ec] text-slate-950 dark:bg-[#101113] dark:text-white"
            dir={isArabic ? "rtl" : "ltr"}
            style={brandStyle}
        >
            <style>{getPublicPageFontCss(isArabic)}</style>
            <section className="relative isolate flex min-h-screen items-center overflow-hidden px-4 py-8">
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

                <div
                    className="mx-auto w-full max-w-2xl"
                    data-future-payment-provider-count={FUTURE_PAYMENT_PROVIDERS.length}
                >
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
                            className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-lg border bg-white/80 shadow-2xl backdrop-blur-xl dark:bg-white/10"
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
                                <span className="flex h-full w-full items-center justify-center bg-[var(--public-primary)] text-3xl font-black text-[color:var(--public-primary-foreground)]">
                                    {settings.restaurantName.charAt(0).toUpperCase()}
                                </span>
                            )}
                        </div>
                        <p className="mt-4 text-sm font-black uppercase text-slate-500 dark:text-slate-300">
                            {settings.restaurantName}
                        </p>
                    </header>

                    <section
                        className="mt-7 rounded-lg border border-white/70 bg-white/85 p-6 text-center shadow-2xl shadow-black/[0.06] backdrop-blur-xl dark:border-white/10 dark:bg-white/10 sm:p-8"
                        style={getPanelStyle()}
                    >
                        <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-lg bg-[var(--public-primary)] text-[color:var(--public-primary-foreground)] shadow-xl shadow-black/15">
                            <div className="relative">
                                <CreditCard className="h-11 w-11 animate-pulse" />
                                <span className="absolute -end-2 -top-2 flex h-6 w-6 items-center justify-center rounded-lg bg-[var(--public-accent)] text-white">
                                    <LockKeyhole className="h-3.5 w-3.5" />
                                </span>
                            </div>
                        </div>

                        <h1 className="mt-6 text-balance text-4xl font-black leading-tight tracking-normal sm:text-5xl">
                            {copy.title}
                        </h1>
                        <p className="mt-3 text-xl font-black text-[color:var(--public-primary)]">{copy.comingSoon}</p>
                        <p className="mx-auto mt-4 max-w-md text-balance text-base font-semibold text-slate-600 dark:text-slate-200">
                            {copy.body}
                        </p>
                        <p className="mt-2 text-sm font-semibold text-slate-500 dark:text-slate-300">{copy.checkBack}</p>

                        {settings.qrMenuUrl ? (
                            <a
                                href={settings.qrMenuUrl}
                                className="mt-7 inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-[var(--public-primary)] px-5 text-sm font-black text-[color:var(--public-primary-foreground)] shadow-lg shadow-black/10 transition hover:-translate-y-0.5"
                            >
                                <ArrowLeft className="h-4 w-4 rtl:-scale-x-100" />
                                {copy.backToMenu}
                            </a>
                        ) : null}
                    </section>
                </div>
            </section>
        </main>
    );
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

function getPanelStyle(): CSSProperties {
    return {
        borderColor: "color-mix(in srgb, var(--public-primary) 20%, white)",
    };
}

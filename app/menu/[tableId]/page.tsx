
"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import { getTablePublic } from '@/lib/api';
import { useMenu } from '@/store/menuStore';
import { useLocale } from '@/components/locale-provider';
import { toast } from "sonner";
import { Search, X, Globe, QrCode, Share2, Copy, Check, MapPin } from "lucide-react";
import HeroBanner from '@/components/qrmenu/HeroBanner';
import CategoryAccordion from '@/components/qrmenu/CategoryAccordion';
import { cn } from '@/lib/utils';
import { useMenuData } from '@/lib/hooks/useMenuData';

export default function CustomerMenuPage() {
    const { t, locale, setLocale } = useLocale();
    const params = useParams();
    const tableId = params.tableId as string;
    const { settings } = useMenu();

    const [table, setTable] = useState<any>(null);
    const { products, categories, loading } = useMenuData(locale);
    const [searchQuery, setSearchQuery] = useState("");
    const [activeCategory, setActiveCategory] = useState<string | null>(null);
    const [showQr, setShowQr] = useState(false);
    const [copied, setCopied] = useState(false);
    const [logoError, setLogoError] = useState(false);
    const [searchFocused, setSearchFocused] = useState(false);

    const isAr = locale === 'ar';
    const categoryTabsRef = useRef<HTMLDivElement>(null);
    const isManualScrollRef = useRef(false);
    const menuUrl = typeof window !== 'undefined' ? window.location.href : '';
    const activeCategories = useMemo(
        () => categories.filter(c => c.isActive).sort((a, b) => a.sortOrder - b.sortOrder),
        [categories],
    );
    const currentActiveCategory = activeCategory ?? activeCategories[0]?.id ?? null;

    // ─── Data Loading ──────────────────────────────────────
    const loadData = useCallback(async () => {
        try {
            if (tableId !== 'demo') {
                try { const td = await getTablePublic(tableId); setTable(td); }
                catch { setTable({ id: tableId, tableNumber: tableId.slice(0, 4).toUpperCase(), status: 0 }); }
            } else { setTable({ id: 'demo', tableNumber: 'DEMO', status: 0 }); }

        } catch (error) {
            console.error("Failed to load menu data", error);
            toast.error(t("failedToLoadMenu") || "Failed to load menu");
        }
    }, [tableId, t]);

    useEffect(() => {
        if (!tableId) return;
        void Promise.resolve().then(() => loadData());
    }, [tableId, loadData]);

    // ─── Scroll spy ─────────────────────────────────────────
    useEffect(() => {
        if (categories.length === 0) return;
        const observer = new IntersectionObserver(
            (entries) => {
                if (isManualScrollRef.current) return;
                for (const entry of entries) {
                    if (entry.isIntersecting) {
                        const id = entry.target.id.replace('category-', '');
                        setActiveCategory(id);
                        document.getElementById(`tab-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                    }
                }
            },
            { rootMargin: '-20% 0px -60% 0px', threshold: 0 }
        );
        const timer = setTimeout(() => {
            categories.forEach(cat => { const el = document.getElementById(`category-${cat.id}`); if (el) observer.observe(el); });
        }, 100);
        return () => { clearTimeout(timer); observer.disconnect(); };
    }, [categories]);

    // ─── Search ─────────────────────────────────────────────
    const filteredProducts = useMemo(() => {
        if (!searchQuery.trim()) return products;
        const q = searchQuery.toLowerCase();
        return products.filter(p =>
            p.name.toLowerCase().includes(q) || (p.nameAr && p.nameAr.includes(searchQuery)) ||
            (p.displayName && p.displayName.toLowerCase().includes(q)) || (p.description && p.description.toLowerCase().includes(q))
        );
    }, [products, searchQuery]);

    const categoryProductCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        for (const cat of categories) counts[cat.id] = filteredProducts.filter(p => p.categoryId === cat.id).length;
        return counts;
    }, [categories, filteredProducts]);

    const scrollToCategory = useCallback((categoryId: string) => {
        setActiveCategory(categoryId);
        isManualScrollRef.current = true;
        const el = document.getElementById(`category-${categoryId}`);
        if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 150, behavior: 'smooth' });
        setTimeout(() => { isManualScrollRef.current = false; }, 800);
    }, []);

    const toggleLanguage = useCallback(() => setLocale(isAr ? 'en' : 'ar', { reload: false }), [isAr, setLocale]);
    const handleCopyLink = useCallback(async () => {
        try { await navigator.clipboard.writeText(menuUrl); } catch {
            const i = document.createElement('input'); i.value = menuUrl; document.body.appendChild(i); i.select(); document.execCommand('copy'); document.body.removeChild(i);
        }
        setCopied(true); setTimeout(() => setCopied(false), 2000);
    }, [menuUrl]);
    const handleShare = useCallback(async () => {
        if (navigator.share) { try { await navigator.share({ title: settings.siteName || 'Menu', url: menuUrl }); } catch {} }
        else handleCopyLink();
    }, [menuUrl, settings.siteName, handleCopyLink]);

    const fontToUrl = (f: string) => `https://fonts.googleapis.com/css2?family=${f.replace(' ', '+')}:wght@300;400;500;600;700;900&display=swap`;

    if (loading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-white">
                <div className="flex flex-col items-center gap-5">
                    <div className="relative h-12 w-12">
                        <div className="absolute inset-0 rounded-full border-[3px] border-gray-100" />
                        <div className="absolute inset-0 rounded-full border-[3px] border-transparent animate-spin" style={{ borderTopColor: 'var(--primary)' }} />
                    </div>
                    <div className="text-center">
                        <p className="text-sm font-semibold text-gray-900">{settings.siteName || "Menu"}</p>
                        <p className="text-xs text-gray-400 mt-1 animate-pulse">{t("loadingMenu") || "Loading menu..."}</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <>
            {settings.fontFamily && <style jsx global>{`@import url('${fontToUrl(settings.fontFamily)}'); body { font-family: '${settings.fontFamily}', system-ui, sans-serif; }`}</style>}

            <div className="min-h-screen bg-[#f5f5f7]" dir={isAr ? 'rtl' : 'ltr'}>
                {/* Header */}
                <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-black/[0.04]">
                    <div className="w-full max-w-2xl mx-auto px-3 sm:px-5">
                        <div className="flex h-12 sm:h-14 items-center justify-between">
                            {/* Logo */}
                            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                                {settings.logoUrl && !logoError ? (
                                    <img src={settings.logoUrl} alt="" className="h-8 sm:h-10 w-auto object-contain shrink-0"
                                        style={{ maxWidth: settings.logoWidth || 120 }} onError={() => setLogoError(true)} />
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg sm:rounded-xl flex items-center justify-center text-xs sm:text-sm font-black text-white shadow-sm" style={{ backgroundColor: 'var(--primary)' }}>
                                            {(settings.siteName || "M").charAt(0).toUpperCase()}
                                        </div>
                                        <span className="text-[15px] sm:text-[17px] font-bold text-gray-900 tracking-tight truncate">{settings.siteName || "Menu"}</span>
                                    </div>
                                )}
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-1.5 shrink-0">
                                {table && tableId !== 'demo' && (
                                    <div className="flex items-center gap-1 rounded-full px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs font-semibold"
                                         style={{ backgroundColor: 'color-mix(in srgb, var(--primary) 8%, transparent)', color: 'var(--primary)' }}>
                                        <MapPin size={10} className="sm:w-3 sm:h-3" /><span>{table.tableNumber}</span>
                                    </div>
                                )}
                                <button onClick={() => setShowQr(true)}
                                    className="flex items-center justify-center h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-black/[0.04] text-gray-600 hover:bg-black/[0.07] active:scale-95 transition-all">
                                    <QrCode size={15} />
                                </button>
                                <button onClick={toggleLanguage}
                                    className="flex items-center gap-1 rounded-full bg-black/[0.04] px-2.5 sm:px-3 h-8 sm:h-9 text-[12px] sm:text-[13px] font-semibold text-gray-600 hover:bg-black/[0.07] active:scale-95 transition-all">
                                    <Globe size={13} /><span>{isAr ? 'EN' : 'عربي'}</span>
                                </button>
                            </div>
                        </div>
                    </div>
                    {categories.length > 1 && !searchQuery.trim() && (
                        <div className="border-t border-black/[0.03]">
                            <div className="w-full max-w-2xl mx-auto overflow-x-auto scrollbar-hide" ref={categoryTabsRef}>
                                <div className="flex w-max px-3 sm:px-5 py-3 gap-2">
                                    {categories.map(cat => {
                                        const catName = (isAr && cat.nameAr) ? cat.nameAr : (cat.displayName || cat.name);
                                        const isActive = currentActiveCategory === cat.id;
                                        const count = categoryProductCounts[cat.id] || 0;
                                        return (
                                            <button key={cat.id} id={`tab-${cat.id}`} onClick={() => scrollToCategory(cat.id)}
                                                className={cn("flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-semibold whitespace-nowrap transition-all duration-200 active:scale-[0.96]",
                                                    isActive ? "text-white shadow-lg" : "bg-black/[0.04] text-gray-500 hover:bg-black/[0.07] hover:text-gray-700"
                                                )}
                                                style={isActive ? { backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)', boxShadow: '0 4px 14px color-mix(in srgb, var(--primary) 35%, transparent)' } : undefined}>
                                                <span>{catName}</span>
                                                <span className={cn("text-[11px] font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5", isActive ? "bg-white/20" : "bg-black/[0.05]")}>{count}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}
                </header>

                {/* QR Modal */}
                {showQr && (
                    <div className="fixed inset-0 z-[70] flex items-center justify-center px-4">
                        <div className="absolute inset-0 bg-black/40 backdrop-blur-md" onClick={() => setShowQr(false)} />
                        <div className="relative w-full max-w-[360px] bg-white rounded-3xl shadow-2xl p-8 space-y-6">
                            <button onClick={() => setShowQr(false)} className="absolute top-5 end-5 h-8 w-8 flex items-center justify-center rounded-full bg-black/[0.05] text-gray-500 hover:bg-black/[0.08]"><X size={15} /></button>
                            <div className="text-center pt-2"><h3 className="text-xl font-bold text-gray-900 tracking-tight">{t("scanQrCode")}</h3>
                                {table && tableId !== 'demo' && <p className="text-sm text-gray-400 mt-1">{t("tableCol")} {table.tableNumber}</p>}
                            </div>
                            <div className="flex justify-center">
                                <div className="rounded-2xl bg-white p-4 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06),0_2px_8px_rgba(0,0,0,0.04)]">
                                    <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(menuUrl)}`} alt="QR" className="rounded-xl" width={200} height={200} />
                                </div>
                            </div>
                            <p className="text-[11px] text-gray-400 text-center break-all px-4 leading-relaxed">{menuUrl}</p>
                            <div className="flex gap-3">
                                <button onClick={handleCopyLink} className="flex-1 flex items-center justify-center gap-2 rounded-2xl border border-black/[0.08] h-12 text-sm font-semibold text-gray-700 hover:bg-gray-50 active:scale-[0.97] transition-all">
                                    {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}<span>{copied ? t("copied") : t("copyLink")}</span>
                                </button>
                                <button onClick={handleShare} className="flex-1 flex items-center justify-center gap-2 rounded-2xl h-12 text-sm font-semibold text-white active:scale-[0.97] transition-all shadow-lg"
                                    style={{ backgroundColor: 'var(--primary)', boxShadow: '0 4px 14px color-mix(in srgb, var(--primary) 30%, transparent)' }}>
                                    <Share2 size={16} /><span>{t("share")}</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Content */}
                <main className="mx-auto w-full max-w-2xl mx-auto px-3 sm:px-5 py-6 space-y-6">
                    {settings.bannerActive && settings.bannerUrls.length > 0 && <HeroBanner bannerUrls={settings.bannerUrls} mobileBannerUrls={settings.mobileBannerUrls} />}

                    {/* Search */}
                    <div className="relative">
                        <div className={cn("absolute inset-y-0 flex items-center pointer-events-none z-10", "start-0 ps-4", searchFocused ? "text-gray-900" : "text-gray-400")}>
                            <Search size={18} />
                        </div>
                        <input type="text" placeholder={t("searchProducts")} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                            onFocus={() => setSearchFocused(true)} onBlur={() => setSearchFocused(false)}
                            className={cn("w-full rounded-2xl bg-white py-3.5 text-[15px] text-gray-900 placeholder:text-gray-400 focus:outline-none transition-all duration-300",
                                "ps-12 pe-12",
                                searchFocused ? "shadow-[0_0_0_2px_var(--primary),0_4px_20px_rgba(0,0,0,0.06)]" : "shadow-[0_1px_4px_rgba(0,0,0,0.06),0_0_1px_rgba(0,0,0,0.08)] hover:shadow-[0_2px_8px_rgba(0,0,0,0.08)]"
                            )} />
                        {searchQuery && (
                            <button onClick={() => setSearchQuery("")} className={cn("absolute inset-y-0 flex items-center z-10", "end-0 pe-4")}>
                                <div className="flex items-center justify-center h-7 w-7 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200"><X size={13} /></div>
                            </button>
                        )}
                    </div>

                    {searchQuery.trim() && filteredProducts.length === 0 && (
                        <div className="flex flex-col items-center py-24 text-center">
                            <div className="h-20 w-20 rounded-3xl bg-gray-100 flex items-center justify-center mb-5"><Search size={32} className="text-gray-300" /></div>
                            <p className="text-lg font-semibold text-gray-900 mb-1">{t("noSearchResults")}</p>
                            <p className="text-sm text-gray-400 mb-5">{t("tryDifferentSearch")}</p>
                            <button onClick={() => setSearchQuery("")} className="text-sm font-semibold px-5 py-2.5 rounded-full hover:bg-primary/5 active:scale-95" style={{ color: 'var(--primary)' }}>{t("clearSearch")}</button>
                        </div>
                    )}

                    {(!searchQuery.trim() || filteredProducts.length > 0) && (
                        categories.length > 0 ? <CategoryAccordion categories={categories} products={filteredProducts} language={isAr ? "ar" : "en"} />
                        : <div className="flex flex-col items-center py-28 text-center">
                            <div className="h-20 w-20 rounded-3xl bg-gray-100 flex items-center justify-center mb-5"><Search size={32} className="text-gray-300" /></div>
                            <p className="text-lg font-semibold text-gray-900 mb-1">{t("menuNotFound")}</p><p className="text-sm text-gray-400">{t("checkBackSoon")}</p>
                        </div>
                    )}

                    <footer className="pt-12 pb-10">
                        {(settings.socialInstagram || settings.socialFacebook || settings.socialWhatsapp || settings.socialTwitter) && (
                            <div className="flex items-center justify-center gap-2.5 mb-8">
                                {[
                                    { url: settings.socialInstagram, d: "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" },
                                    { url: settings.socialFacebook, d: "M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" },
                                    { url: settings.socialTwitter, d: "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" },
                                    { url: settings.socialWhatsapp ? `https://wa.me/${settings.socialWhatsapp.replace(/\D/g, '')}` : undefined, d: "M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" },
                                ].filter(s => s.url).map((s, i) => (
                                    <a key={i} href={s.url} target="_blank" rel="noopener noreferrer"
                                       className="flex h-11 w-11 items-center justify-center rounded-full bg-black/[0.04] text-gray-500 hover:bg-black/[0.07] hover:text-gray-700 transition-all active:scale-95">
                                        <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="currentColor"><path d={s.d}/></svg>
                                    </a>
                                ))}
                            </div>
                        )}
                        <div className="flex flex-col items-center gap-3">
                            <div className="h-px w-12 bg-gray-200" />
                            <p className="text-[13px] text-gray-400 font-medium">
                                {settings.footerText || settings.footerCopyright || (<>Powered by <span className="font-bold" style={{ color: 'var(--primary)' }}>Sando box</span></>)}
                            </p>
                        </div>
                    </footer>
                </main>
            </div>
        </>
    );
}

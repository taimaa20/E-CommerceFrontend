"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Heart, Menu, Package, ShoppingBag, Store } from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import StoreImage from "@/components/showcase/StoreImage";
import StoreSearchField from "@/components/showcase/StoreSearchField";
import { useLocale } from "@/components/locale-provider";
import { formatCurrency } from "@/lib/currencies";
import { createStoreText } from "@/lib/store-copy";
import { useStoreFavorites } from "@/lib/use-store-favorites";
import { useCartStore } from "@/store/cartStore";
import { useSettingsStore } from "@/store/settingsStore";
import { activeStorefrontBranchId, storefrontLogoUrl, useStorefrontStore } from "@/store/storefrontStore";

const NAV_LINKS = [
    { href: "/shop", key: "shop" as const, exact: true },
    { href: "/shop/categories", key: "categories" as const, exact: false },
    { href: "/shop/offers", key: "offers" as const, exact: false },
    { href: "/shop/favorites", key: "favorites" as const, exact: false },
    { href: "/shop/orders", key: "myOrders" as const, exact: false },
];

export default function StoreHeader() {
    const { locale, setLocale } = useLocale();
    const isAr = locale === "ar";
    const text = createStoreText(isAr);
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const settings = useSettingsStore(state => state.settings);
    const settingsLoaded = useSettingsStore(state => state.isLoaded);
    const itemCount = useCartStore(state => state.items.reduce((total, item) => total + item.quantity, 0));
    const setCartOpen = useStorefrontStore(state => state.setCartOpen);
    const context = useStorefrontStore(state => state.context);
    const branding = useStorefrontStore(state => state.branding);
    const branchId = useStorefrontStore(state => state.branchId);
    const setBranchId = useStorefrontStore(state => state.setBranchId);
    const activeBranch = activeStorefrontBranchId({ context, branchId });
    const logoUrl = storefrontLogoUrl(branding, settings.logoUrl);
    // Server-rendered as zero and filled in on the client, so a shared page never ships one
    // shopper's saved count to another.
    const favoriteCount = useStoreFavorites().count;
    const [menuOpen, setMenuOpen] = useState(false);

    // Keyed by the URL query, so a shared /shop?q=… link, a browser back navigation
    // and the input never disagree.
    const urlQuery = searchParams.get("q") ?? "";
    const searchBase = pathname.startsWith("/shop/category/") ? pathname : "/shop";
    const format = (value: number) =>
        settingsLoaded && settings.currency ? formatCurrency(value, settings.currency) : "";

    const isActive = (href: string, exact: boolean) =>
        exact ? pathname === href : pathname.startsWith(href);

    const searchField = (autoFocus = false) => (
        <StoreSearchField
            key={urlQuery}
            isAr={isAr}
            defaultValue={urlQuery}
            basePath={searchBase}
            format={format}
            autoFocus={autoFocus}
            onNavigate={() => setMenuOpen(false)}
        />
    );

    return (
        <header className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85">
            {/* Row 1 — brand, product search (desktop) and utilities. On a phone the two
                rows read as one compact block, so the hairline between them is dropped. */}
            <div className="border-b max-md:border-b-0">
                <div className="sf-container flex h-[52px] items-center gap-2 sm:h-16 sm:gap-4">
                    <button
                        type="button"
                        onClick={() => setMenuOpen(true)}
                        aria-label={text("menu")}
                        className="sf-icon-btn -ms-2 shrink-0 md:hidden"
                    >
                        <Menu className="size-5" />
                    </button>

                    <Link href="/shop" className="flex min-w-0 shrink-0 items-center gap-2.5 md:w-52">
                        {logoUrl
                            ? <StoreImage src={logoUrl} alt={settings.restaurantName} fit="contain" sizes="40px" className="size-9 shrink-0 rounded-[10px] border" />
                            : <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] border text-muted-foreground"><Package className="size-[18px]" /></span>}
                        <span className="min-w-0">
                            <span className="block truncate text-[15px] font-semibold leading-tight">
                                {settingsLoaded ? settings.restaurantName : ""}
                            </span>
                            <span className="hidden text-[11px] leading-tight text-muted-foreground md:block">{text("onlineStore")}</span>
                        </span>
                    </Link>

                    <div className="hidden min-w-0 flex-1 justify-center md:flex">
                        <div className="w-full max-w-2xl">{searchField()}</div>
                    </div>

                    <div className="ms-auto flex shrink-0 items-center gap-0.5 md:ms-0 md:w-52 md:justify-end">
                        <button
                            type="button"
                            onClick={() => setLocale(isAr ? "en" : "ar", { reload: false })}
                            className="sf-btn sf-btn--quiet sf-btn--sm"
                        >
                            {isAr ? "EN" : "العربية"}
                        </button>
                        <Link href="/shop/orders" className="sf-btn sf-btn--quiet sf-btn--sm hidden lg:inline-flex">
                            {text("trackOrder")}
                        </Link>
                        {/* Below `md` these two live in the tab bar instead, which is what
                            buys the phone header its single compact row. */}
                        <Link
                            href="/shop/favorites"
                            aria-label={`${text("favorites")} (${favoriteCount})`}
                            className="sf-icon-btn relative hidden md:inline-flex"
                        >
                            <Heart className="size-[21px]" />
                            {favoriteCount > 0 && (
                                <span className="absolute end-1 top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[var(--sf-accent)] px-1 text-[10px] font-bold leading-none text-white">
                                    {favoriteCount > 99 ? "99+" : favoriteCount}
                                </span>
                            )}
                        </Link>
                        <button
                            type="button"
                            onClick={() => setCartOpen(true)}
                            aria-label={`${text("cart")} (${itemCount})`}
                            className="sf-icon-btn relative -me-2 hidden md:inline-flex"
                        >
                            <ShoppingBag className="size-[21px]" />
                            {itemCount > 0 && (
                                <span className="absolute end-1 top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[var(--sf-accent)] px-1 text-[10px] font-bold leading-none text-white">
                                    {itemCount > 99 ? "99+" : itemCount}
                                </span>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Row 2 (mobile) — search stays reachable while browsing. */}
            <div className="border-b md:hidden">
                <div className="sf-container pb-2.5">{searchField()}</div>
            </div>

            {/* Row 2 (desktop) — browse navigation, kept visually quieter than search. */}
            <div className="hidden border-b bg-[var(--sf-surface-sunken)] md:block">
                <div className="sf-container flex h-10 items-center gap-1">
                    <nav aria-label={text("shop")} className="flex items-center gap-1">
                        {NAV_LINKS.map(link => (
                            <Link
                                key={link.href}
                                href={link.href}
                                aria-current={isActive(link.href, link.exact) ? "page" : undefined}
                                className={`relative flex h-10 items-center px-3 text-[13px] font-medium transition-colors ${
                                    isActive(link.href, link.exact)
                                        ? "text-foreground after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:rounded-full after:bg-[var(--sf-accent)]"
                                        : "text-muted-foreground hover:text-foreground"
                                }`}
                            >
                                {text(link.key)}
                            </Link>
                        ))}
                    </nav>
                    {(context?.branches.length ?? 0) > 1 && (
                        <label className="ms-auto flex items-center gap-1.5 text-[13px] text-muted-foreground">
                            <Store className="size-3.5 shrink-0" />
                            <span className="sr-only">{text("store")}</span>
                            <select
                                value={activeBranch ?? ""}
                                onChange={event => setBranchId(event.target.value)}
                                className="max-w-44 min-w-0 truncate bg-transparent py-1 font-medium text-foreground outline-none"
                            >
                                {context?.branches.map(branch => (
                                    <option key={branch.id} value={branch.id}>
                                        {isAr ? branch.nameAr || branch.name : branch.name}
                                    </option>
                                ))}
                            </select>
                        </label>
                    )}
                </div>
            </div>

            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
                <SheetContent side="start" aria-describedby={undefined} className="storefront gap-0 p-0">
                    <SheetTitle className="border-b px-5 py-4 text-[15px]">
                        {settingsLoaded ? settings.restaurantName : text("onlineStore")}
                    </SheetTitle>
                    <nav className="flex flex-col p-2">
                        {NAV_LINKS.map(link => (
                            <Link
                                key={link.href}
                                href={link.href}
                                onClick={() => setMenuOpen(false)}
                                className={`flex min-h-12 items-center rounded-[10px] px-3 text-[15px] font-medium ${
                                    isActive(link.href, link.exact) ? "bg-[var(--sf-surface-sunken)] text-foreground" : "text-muted-foreground"
                                }`}
                            >
                                {text(link.key)}
                            </Link>
                        ))}
                    </nav>
                    <div className="mt-auto space-y-3 border-t p-4">
                        {(context?.branches.length ?? 0) > 1 && (
                            <div>
                                <span className="sf-label">{text("store")}</span>
                                <select
                                    aria-label={text("store")}
                                    value={activeBranch ?? ""}
                                    onChange={event => setBranchId(event.target.value)}
                                    className="sf-field"
                                >
                                    {context?.branches.map(branch => (
                                        <option key={branch.id} value={branch.id}>
                                            {isAr ? branch.nameAr || branch.name : branch.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                        <button
                            type="button"
                            onClick={() => { setLocale(isAr ? "en" : "ar", { reload: false }); setMenuOpen(false); }}
                            className="sf-btn sf-btn--outline w-full"
                        >
                            {isAr ? "English" : "العربية"}
                        </button>
                    </div>
                </SheetContent>
            </Sheet>
        </header>
    );
}

"use client";

import { Suspense, useEffect } from "react";
import Link from "next/link";
import StoreImage from "@/components/showcase/StoreImage";
import MenuOrderFlow from "@/components/showcase/MenuOrderFlow";
import StoreBottomNav from "@/components/showcase/StoreBottomNav";
import StoreHeader from "@/components/showcase/StoreHeader";
import StoreWhatsAppLink from "@/components/showcase/StoreWhatsAppLink";
import { useLocale } from "@/components/locale-provider";
import { createStoreText } from "@/lib/store-copy";
import { resolveWhatsAppContact, whatsAppHref, WHATSAPP_PURPOSE } from "@/lib/whatsapp";
import { useCartStore } from "@/store/cartStore";
import { useSettingsStore } from "@/store/settingsStore";
import { storefrontBrandStyle, storefrontLogoUrl, useStorefrontStore } from "@/store/storefrontStore";
import "@/app/shop/storefront.css";

/**
 * Chrome shared by every public storefront page: header, footer and the cart /
 * checkout flow. Wrapped by each store page rather than by app/shop/layout.tsx
 * so the checkout route can mount the same chrome, and so /menu/[tableId] — the
 * dine-in QR menu, which stays on /menu — keeps its own.
 *
 * This is also where the tenant's configured brand colours enter the store, as the two
 * custom properties storefront.css derives every tint from. A tenant with no configured
 * colours renders exactly the neutral theme it did before.
 */
export default function StoreShell({ children }: { children: React.ReactNode }) {
    const { locale } = useLocale();
    const isAr = locale === "ar";
    const fetchSettings = useSettingsStore(state => state.fetchSettings);
    const loadContext = useStorefrontStore(state => state.loadContext);
    const loadBranding = useStorefrontStore(state => state.loadBranding);
    const loadWhatsAppContacts = useStorefrontStore(state => state.loadWhatsAppContacts);
    const branding = useStorefrontStore(state => state.branding);
    const status = useStorefrontStore(state => state.status);
    const hasCartItems = useCartStore(state => state.items.length > 0);

    useEffect(() => { void fetchSettings(); }, [fetchSettings]);
    useEffect(() => { void loadBranding(); }, [loadBranding]);
    useEffect(() => { void loadWhatsAppContacts(); }, [loadWhatsAppContacts]);
    useEffect(() => {
        if (status === "idle") void loadContext();
    }, [status, loadContext]);

    return (
        <div
            className="storefront flex min-h-dvh flex-col bg-background text-foreground"
            dir={isAr ? "rtl" : "ltr"}
            style={storefrontBrandStyle(branding)}
        >
            <Suspense fallback={<div className="h-[52px] border-b sm:h-16" />}>
                <StoreHeader />
            </Suspense>
            <main className="flex-1 pb-6 pt-4 sm:pb-8 sm:pt-8">{children}</main>
            <StoreFooter isAr={isAr} />
            {/* Keeps the sticky cart bar from covering the last row of content. On a phone
                that bar now sits on top of the tab bar, whose own spacer below already
                accounts for the device safe area. */}
            {hasCartItems && <div aria-hidden className="h-[4.5rem] md:h-[calc(4.5rem+env(safe-area-inset-bottom))]" />}
            {/* Same, for the tab bar itself — nothing in the page may end underneath it,
                including under the centre mark that rises out of it. */}
            <div aria-hidden className="h-[calc(var(--sf-bottom-nav)+var(--sf-tabbar-lift))]" />
            <StoreBottomNav />
            <MenuOrderFlow />
        </div>
    );
}

function StoreFooter({ isAr }: { isAr: boolean }) {
    const text = createStoreText(isAr);
    const settings = useSettingsStore(state => state.settings);
    const isLoaded = useSettingsStore(state => state.isLoaded);
    const branding = useStorefrontStore(state => state.branding);
    const whatsAppContacts = useStorefrontStore(state => state.whatsAppContacts);
    const logoUrl = storefrontLogoUrl(branding, settings.logoUrl);
    if (!isLoaded) return null;

    // Asked of the same resolver the link itself uses, so the block appears exactly when the
    // link inside it will render — never an empty "Contact us" heading.
    const hasWhatsApp = !!whatsAppHref(resolveWhatsAppContact(whatsAppContacts, WHATSAPP_PURPOSE.general), isAr);

    const contact = [
        settings.restaurantAddress && { key: "address", value: settings.restaurantAddress, href: undefined },
        settings.restaurantPhone && { key: "phone", value: settings.restaurantPhone, href: `tel:${settings.restaurantPhone}` },
        settings.restaurantEmail && { key: "email", value: settings.restaurantEmail, href: `mailto:${settings.restaurantEmail}` },
    ].filter(Boolean) as { key: string; value: string; href?: string }[];

    return (
        <footer className="mt-[var(--sf-section)] border-t bg-[var(--sf-surface-sunken)]">
            <div className="sf-container flex flex-col gap-6 py-8 sm:flex-row sm:items-start sm:justify-between sm:gap-10">
                <div className="flex min-w-0 items-center gap-3">
                    {logoUrl && (
                        <StoreImage
                            src={logoUrl}
                            alt={settings.restaurantName}
                            fit="contain"
                            sizes="40px"
                            className="size-10 shrink-0 rounded-[10px] border"
                        />
                    )}
                    <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{settings.restaurantName}</p>
                        {settings.restaurantTagline && (
                            <p className="sf-meta line-clamp-1">{settings.restaurantTagline}</p>
                        )}
                    </div>
                </div>

                <nav aria-label={text("shop")} className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                    <Link href="/shop" className="text-muted-foreground transition-colors hover:text-foreground">{text("shop")}</Link>
                    <Link href="/shop/categories" className="text-muted-foreground transition-colors hover:text-foreground">{text("categories")}</Link>
                    <Link href="/shop/offers" className="text-muted-foreground transition-colors hover:text-foreground">{text("offers")}</Link>
                    <Link href="/shop/favorites" className="text-muted-foreground transition-colors hover:text-foreground">{text("favorites")}</Link>
                    <Link href="/shop/orders" className="text-muted-foreground transition-colors hover:text-foreground">{text("trackOrder")}</Link>
                </nav>

                {(contact.length > 0 || hasWhatsApp) && (
                    <address className="self-start not-italic sm:self-auto sm:text-end">
                        <p className="mb-1.5 text-sm font-semibold">{text("contactUs")}</p>
                        <ul className="space-y-1">
                            {contact.map(row => (
                                <li key={row.key} className="sf-meta break-words">
                                    {row.href
                                        ? <a href={row.href} dir="ltr" className="transition-colors hover:text-foreground">{row.value}</a>
                                        : row.value}
                                </li>
                            ))}
                            {hasWhatsApp && (
                                <li className="flex justify-center pt-1">
                                    <StoreWhatsAppLink isAr={isAr} variant="icon" />
                                </li>
                            )}
                        </ul>
                    </address>
                )}
            </div>
        </footer>
    );
}

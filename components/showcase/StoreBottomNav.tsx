"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Heart, LayoutGrid, Package, ShoppingBag } from "lucide-react";
import StoreImage from "@/components/showcase/StoreImage";
import { useLocale } from "@/components/locale-provider";
import { createStoreText, type StoreCopyKey } from "@/lib/store-copy";
import { useStoreFavorites } from "@/lib/use-store-favorites";
import { useCartStore } from "@/store/cartStore";
import { useSettingsStore } from "@/store/settingsStore";
import { storefrontLogoUrl, useStorefrontStore } from "@/store/storefrontStore";

/**
 * Phone navigation for the storefront.
 *
 * Below `md` the header keeps the brand and the search field only, and everything else a
 * shopper navigates to lives here. Four destinations sit two to a side of the store's own
 * mark, which is raised out of the bar and is the way home — so the middle of the bar,
 * the easiest point on the screen to hit, belongs to the shop front.
 *
 * It owns no state. The counts are read from the cart store and the favourites repository
 * the rest of the store already subscribes to, the cart opens the one drawer MenuOrderFlow
 * renders, and the logo is the same configured one the header and footer draw — so a number
 * or a mark here and the same one elsewhere cannot drift.
 */
const TABS = {
    categories: { key: "categories" as const, href: "/shop/categories", icon: LayoutGrid },
    favorites: { key: "favorites" as const, href: "/shop/favorites", icon: Heart },
    trackOrder: { key: "trackOrder" as const, href: "/shop/orders", icon: Package },
};

const HOME_HREF = "/shop";

export default function StoreBottomNav() {
    const { locale } = useLocale();
    const isAr = locale === "ar";
    const text = createStoreText(isAr);
    const pathname = usePathname();
    const itemCount = useCartStore(state => state.items.reduce((total, item) => total + item.quantity, 0));
    const favoriteCount = useStoreFavorites().count;
    const cartOpen = useStorefrontStore(state => state.cartOpen);
    const setCartOpen = useStorefrontStore(state => state.setCartOpen);
    const branding = useStorefrontStore(state => state.branding);
    const settings = useSettingsStore(state => state.settings);
    const logoUrl = storefrontLogoUrl(branding, settings.logoUrl);

    return (
        <nav aria-label={text("shop")} className="sf-tabbar md:hidden">
            <div className="flex items-stretch">
                <Tab tab={TABS.categories} text={text} active={pathname.startsWith(TABS.categories.href)} count={0} />
                <Tab tab={TABS.favorites} text={text} active={pathname.startsWith(TABS.favorites.href)} count={favoriteCount} />

                <Link
                    href={HOME_HREF}
                    aria-current={pathname === HOME_HREF ? "page" : undefined}
                    aria-label={text("home")}
                    className="sf-tab sf-tab--home"
                >
                    <span className="sf-tab__mark">
                        <StoreImage
                            src={logoUrl}
                            alt=""
                            fit="contain"
                            sizes="52px"
                            fallbackText={settings.restaurantName}
                        />
                    </span>
                </Link>

                <button
                    type="button"
                    onClick={() => setCartOpen(true)}
                    data-active={cartOpen || undefined}
                    aria-label={`${text("cart")} (${itemCount})`}
                    className="sf-tab"
                >
                    <span className="relative flex items-center justify-center">
                        <ShoppingBag className="size-[21px]" strokeWidth={1.9} />
                        <Badge count={itemCount} />
                    </span>
                    <span className="sf-tab__label">{text("cart")}</span>
                </button>

                <Tab tab={TABS.trackOrder} text={text} active={pathname.startsWith(TABS.trackOrder.href)} count={0} />
            </div>
        </nav>
    );
}

function Tab({
    tab,
    text,
    active,
    count,
}: {
    tab: (typeof TABS)[keyof typeof TABS];
    text: (key: StoreCopyKey) => string;
    active: boolean;
    count: number;
}) {
    const Icon = tab.icon;
    return (
        <Link
            href={tab.href}
            aria-current={active ? "page" : undefined}
            aria-label={count > 0 ? `${text(tab.key)} (${count})` : undefined}
            className="sf-tab"
        >
            <span className="relative flex items-center justify-center">
                <Icon className="size-[21px]" strokeWidth={1.9} />
                <Badge count={count} />
            </span>
            <span className="sf-tab__label">{text(tab.key)}</span>
        </Link>
    );
}

function Badge({ count }: { count: number }) {
    if (count <= 0) return null;
    return <span className="sf-tab__badge">{count > 99 ? "99+" : count}</span>;
}

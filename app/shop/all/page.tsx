"use client";

import { Suspense } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import StoreCatalogBrowser from "@/components/showcase/StoreCatalogBrowser";
import StoreShell from "@/components/showcase/StoreShell";
import { useLocale } from "@/components/locale-provider";
import { createStoreText } from "@/lib/store-copy";
import { useOfferProductIds } from "@/lib/use-store-offers";

/**
 * The full catalogue. The home page is for discovery, so the complete product wall lives
 * here, reachable from every "view all", from search and from the footer.
 */
export default function StoreAllProductsPage() {
    return (
        <StoreShell>
            <div className="sf-container">
                <Suspense fallback={<CatalogSkeleton />}>
                    <AllProducts />
                </Suspense>
            </div>
        </StoreShell>
    );
}

function AllProducts() {
    const { locale } = useLocale();
    const isAr = locale === "ar";
    const text = createStoreText(isAr);
    const inOffer = useOfferProductIds();

    return (
        <div>
            <nav aria-label="breadcrumb" className="mb-3 flex items-center gap-1 text-[13px] text-muted-foreground">
                <Link href="/shop" className="transition-colors hover:text-foreground">{text("shop")}</Link>
                <ChevronRight className="size-3.5 rtl:rotate-180" />
                <span className="text-foreground">{text("allProductsSection")}</span>
            </nav>

            <header className="mb-6">
                <h1 className="sf-page-title">{text("allProductsSection")}</h1>
                <p className="sf-meta mt-1">{text("browseEverything")}</p>
            </header>

            <StoreCatalogBrowser
                basePath="/shop/all"
                inOffer={inOffer}
                emptyAction={
                    <Link href="/shop/categories" className="sf-btn sf-btn--outline">{text("shopByCategory")}</Link>
                }
            />
        </div>
    );
}

function CatalogSkeleton() {
    return (
        <div className="space-y-6" aria-hidden>
            <div className="sf-skel h-7 w-48" />
            <div className="grid grid-cols-2 gap-[var(--sf-gap)] md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {Array.from({ length: 10 }).map((_, index) => (
                    <div key={index} className="sf-skel aspect-[3/4] w-full rounded-[var(--sf-radius)]" />
                ))}
            </div>
        </div>
    );
}

"use client";

import Link from "next/link";
import { ChevronRight, RefreshCw } from "lucide-react";
import StoreCategoryCard from "@/components/showcase/StoreCategoryCard";
import StoreShell from "@/components/showcase/StoreShell";
import { useLocale } from "@/components/locale-provider";
import { createStoreText } from "@/lib/store-copy";
import { summariseOffersByCategory } from "@/lib/store-pricing";
import { useStoreCatalog } from "@/lib/use-store-catalog";
import { useSellableOffers } from "@/lib/use-store-offers";

export default function StoreCategoriesPage() {
    const { locale } = useLocale();
    const isAr = locale === "ar";
    const text = createStoreText(isAr);
    // Only the department list is rendered here, so a single product is fetched.
    const { catalog, loading, error, reload } = useStoreCatalog({ search: "", page: 1, pageSize: 1 });
    const offers = useSellableOffers();
    const categories = catalog?.categories ?? [];
    // The same offer summary the home page uses, so a department is marked identically
    // wherever its tile appears.
    const categoryOffers = summariseOffersByCategory(offers);

    return (
        <StoreShell>
            <div className="sf-container">
            <nav aria-label="breadcrumb" className="mb-3 flex items-center gap-1 text-[13px] text-muted-foreground">
                <Link href="/shop" className="hover:text-foreground">{text("shop")}</Link>
                <ChevronRight className="size-3.5 rtl:rotate-180" />
                <span className="text-foreground">{text("categories")}</span>
            </nav>

            <header className="mb-6 border-b pb-4">
                <h1 className="sf-page-title">{text("categories")}</h1>
                <p className="sf-meta mt-1">
                    {loading
                        ? text("browseCollections")
                        : `${categories.length} ${text(categories.length === 1 ? "categoryOne" : "categoryMany")}`}
                </p>
            </header>

            {loading ? (
                <div role="status" className="grid grid-cols-2 gap-[var(--sf-gap)] sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
                    <span className="sr-only">{text("loading")}</span>
                    {Array.from({ length: 12 }).map((_, index) => (
                        <div key={index} className="sf-skel aspect-[4/5] w-full rounded-[var(--sf-radius)]" />
                    ))}
                </div>
            ) : error ? (
                <div role="alert" className="sf-empty">
                    <p className="font-semibold">{text("couldNotLoad")}</p>
                    <p className="sf-meta mx-auto mt-1 max-w-sm">{text("networkError")}</p>
                    <button type="button" onClick={reload} className="sf-btn sf-btn--outline mt-5">
                        <RefreshCw className="size-4" />
                        {text("tryAgain")}
                    </button>
                </div>
            ) : categories.length === 0 ? (
                <div className="sf-empty">
                    <p className="font-semibold">{text("noProducts")}</p>
                    <Link href="/shop" className="sf-btn sf-btn--outline mt-5">{text("backToShop")}</Link>
                </div>
            ) : (
                <div className="grid grid-cols-2 gap-[var(--sf-gap)] sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
                    {categories.map(category => (
                        <StoreCategoryCard
                            key={category.id}
                            category={category}
                            isAr={isAr}
                            offers={categoryOffers.get(category.id)}
                        />
                    ))}
                </div>
            )}
            </div>
        </StoreShell>
    );
}

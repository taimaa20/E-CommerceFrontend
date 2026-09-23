"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PackageSearch, RefreshCw, SearchX } from "lucide-react";
import StorePagination from "@/components/showcase/StorePagination";
import StoreProductCard from "@/components/showcase/StoreProductCard";
import StoreSubcategoryFilter from "@/components/showcase/StoreSubcategoryFilter";
import { useLocale } from "@/components/locale-provider";
import type { OnlineStoreCategory, OnlineStoreSort } from "@/lib/api-online-shopping";
import { formatCurrency } from "@/lib/currencies";
import { createStoreText } from "@/lib/store-copy";
import { useStoreCart } from "@/lib/use-store-cart";
import { useStoreCatalog } from "@/lib/use-store-catalog";
import { useSettingsStore } from "@/store/settingsStore";

const SORT_OPTIONS: { value: OnlineStoreSort; key: "sortRelevance" | "sortPriceLow" | "sortPriceHigh" | "sortNameAz" }[] = [
    { value: "Featured", key: "sortRelevance" },
    { value: "PriceAscending", key: "sortPriceLow" },
    { value: "PriceDescending", key: "sortPriceHigh" },
    { value: "NameAscending", key: "sortNameAz" },
];

/**
 * The catalogue browsing screen: result count, sort, product grid and pagination.
 *
 * It owns its own URL state (`q`, `sort`, `page`, and `subcategory` inside a department) so every surface that browses products —
 * the whole catalogue, a search result, a department — behaves identically and a link can be
 * shared. `basePath` is the route those query strings hang off.
 */
export default function StoreCatalogBrowser({
    basePath,
    categoryId,
    header,
    footer,
    emptyAction,
    inOffer,
}: {
    basePath: string;
    categoryId?: string;
    /**
     * Optional page header rendered above the toolbar. It receives the department this
     * browser resolved, so a department page never has to fetch the catalogue a second
     * time just to learn its own name.
     */
    header?: (state: { category?: OnlineStoreCategory; loading: boolean }) => React.ReactNode;
    /**
     * Optional block closing the page, below the grid and pagination. It receives the same
     * resolved department as `header`, so a department-scoped action can name the department
     * without a second request.
     */
    footer?: (state: { category?: OnlineStoreCategory; loading: boolean }) => React.ReactNode;
    emptyAction?: React.ReactNode;
    /**
     * Products a live bundle contains, so a tile in the grid can point at the offer. The
     * calling page supplies it from the offers payload it already loaded — this component
     * neither fetches offers nor decides what counts as one.
     */
    inOffer?: ReadonlySet<string>;
}) {
    const { locale } = useLocale();
    const isAr = locale === "ar";
    const text = createStoreText(isAr);
    const router = useRouter();
    const searchParams = useSearchParams();
    const settings = useSettingsStore(state => state.settings);
    const settingsLoaded = useSettingsStore(state => state.isLoaded);

    const search = searchParams.get("q") ?? "";
    const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
    const sort = (searchParams.get("sort") ?? "Featured") as OnlineStoreSort;
    // A subcategory only narrows a department; outside one the parameter is ignored.
    const subcategoryId = categoryId ? searchParams.get("subcategory") || undefined : undefined;

    const { catalog, loading, error, reload } = useStoreCatalog({ categoryId, subcategoryId, search, page, sort });
    const cart = useStoreCart(catalog?.productAvailability ?? [], isAr);
    const details = new Map((catalog?.productDetails ?? []).map(row => [row.productId, row]));
    const format = (value: number) =>
        settingsLoaded && settings.currency ? formatCurrency(value, settings.currency) : "—";

    const anchor = useRef<HTMLDivElement>(null);
    const lastPage = useRef(page);

    // Moving to another page must land the shopper back at the top of the
    // results rather than mid-grid at their previous scroll offset.
    useEffect(() => {
        if (lastPage.current !== page) {
            lastPage.current = page;
            anchor.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }
    }, [page]);

    const buildUrl = (nextSearch: string, nextPage: number, nextSort: OnlineStoreSort, nextSubcategory = subcategoryId) => {
        const query = new URLSearchParams();
        if (nextSubcategory) query.set("subcategory", nextSubcategory);
        if (nextSearch) query.set("q", nextSearch);
        if (nextSort !== "Featured") query.set("sort", nextSort);
        if (nextPage > 1) query.set("page", String(nextPage));
        const suffix = query.toString();
        return suffix ? `${basePath}?${suffix}` : basePath;
    };

    const products = catalog?.products ?? [];
    const total = catalog?.totalCount ?? 0;
    const showToolbar = !error && (loading || total > 0);
    const category = categoryId ? catalog?.categories.find(row => row.id === categoryId) : undefined;
    const subcategories = category?.subcategories ?? [];
    const subcategory = subcategories.find(row => row.id === subcategoryId);
    const contextRow = subcategory ?? category;
    const context = contextRow ? (isAr ? contextRow.nameAr || contextRow.name : contextRow.name) : undefined;

    return (
        <section>
            {header?.({ category, loading })}
            <StoreSubcategoryFilter
                subcategories={subcategories}
                selectedId={subcategoryId}
                // Picking a subcategory keeps the shopper's search and sort, and starts at page one.
                hrefFor={next => buildUrl(search, 1, sort, next ?? "")}
                isAr={isAr}
            />
            <div ref={anchor} className="scroll-mt-[8.5rem] md:scroll-mt-32" />

            {showToolbar && (
                <div className="mb-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b pb-3">
                    <p className="min-w-0 text-sm">
                        {loading ? (
                            <span className="sf-skel inline-block h-4 w-28 align-middle" />
                        ) : (
                            <>
                                <span className="font-semibold">{total}</span>{" "}
                                <span className="text-muted-foreground">{text(total === 1 ? "product" : "products")}</span>
                                {(search || context) && (
                                    <span className="text-muted-foreground">
                                        {" · "}
                                        <span className="sf-bidi text-foreground">{search ? `“${search}”` : context}</span>
                                    </span>
                                )}
                            </>
                        )}
                    </p>
                    <label className="flex shrink-0 items-center gap-2 text-[13px] text-muted-foreground">
                        {text("sortLabel")}
                        <select
                            value={sort}
                            onChange={event => router.push(buildUrl(search, 1, event.target.value as OnlineStoreSort))}
                            className="sf-field h-9 min-h-9 max-w-[11rem] py-0 text-[13px] font-medium"
                        >
                            {SORT_OPTIONS.map(option => (
                                <option key={option.value} value={option.value}>{text(option.key)}</option>
                            ))}
                        </select>
                    </label>
                </div>
            )}

            {loading ? (
                <div role="status" aria-live="polite" className="grid grid-cols-2 gap-[var(--sf-gap)] md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                    <span className="sr-only">{text("loadingProducts")}</span>
                    {Array.from({ length: 10 }).map((_, index) => (
                        <div key={index} className="sf-card overflow-hidden">
                            <div className="sf-skel aspect-square w-full rounded-none" />
                            <div className="space-y-2 p-3">
                                <div className="sf-skel h-3.5 w-4/5" />
                                <div className="sf-skel h-3.5 w-1/2" />
                                <div className="sf-skel mt-3 h-[38px] w-full rounded-[10px]" />
                            </div>
                        </div>
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
            ) : products.length === 0 ? (
                <div className="sf-empty">
                    {search
                        ? <SearchX className="mx-auto size-7 text-muted-foreground/60" strokeWidth={1.5} />
                        : <PackageSearch className="mx-auto size-7 text-muted-foreground/60" strokeWidth={1.5} />}
                    <p className="mt-3 font-semibold">{search ? text("noResults") : text("noProducts")}</p>
                    <p className="sf-meta mx-auto mt-1 max-w-sm">{search ? text("noResultsHint") : text("noProductsHint")}</p>
                    <div className="mt-5 flex flex-wrap justify-center gap-2">
                        {search && (
                            <button
                                type="button"
                                onClick={() => router.push(buildUrl("", 1, sort))}
                                className="sf-btn sf-btn--outline"
                            >
                                {text("clearSearch")}
                            </button>
                        )}
                        {emptyAction}
                    </div>
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-2 gap-[var(--sf-gap)] md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                        {products.map((product, index) => (
                            <StoreProductCard
                                key={product.id}
                                product={product}
                                details={details.get(product.id)}
                                available={cart.isSellable(product)}
                                remaining={cart.remainingFor(product)}
                                isAr={isAr}
                                format={format}
                                priority={index < 5}
                                justAdded={cart.justAddedId === product.id}
                                onQuickAdd={cart.quickAdd}
                                inOffer={inOffer?.has(product.id)}
                            />
                        ))}
                    </div>
                    <StorePagination
                        page={catalog?.page ?? page}
                        totalPages={catalog?.totalPages ?? 1}
                        isAr={isAr}
                        onChange={next => router.push(buildUrl(search, next, sort))}
                    />
                </>
            )}

            {!error && footer?.({ category, loading })}
        </section>
    );
}

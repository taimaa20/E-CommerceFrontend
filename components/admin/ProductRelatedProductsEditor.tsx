"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Loader2, Plus, RefreshCw, Search, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getProductsPaginated, type PaginatedResult } from "@/lib/api";
import { productImage } from "@/lib/product-image";
import type { ProductDto, ProductRelatedProductDto } from "@/types/pos";

/** Mirrors ProductRelatedProduct.MaxPerProduct on the API. */
export const MAX_RELATED_PRODUCTS = 12;
const SEARCH_DEBOUNCE_MS = 300;
/** One request fills the visible list about three times over, so scrolling rarely waits. */
const PICKER_PAGE_SIZE = 20;
/** About seven result rows; the rest is reached by scrolling. */
const PICKER_MAX_HEIGHT_PX = 352;
/** Start fetching the next page this close to the bottom of the list. */
const LOAD_MORE_THRESHOLD_PX = 96;

/**
 * Hand-picked storefront "you may also like" products for one product.
 *
 * The parent owns the list and sends it with the product save. `selected` is null until the
 * stored links have loaded, so a failed load can never be saved back as "no related products".
 */
export default function ProductRelatedProductsEditor({
    productId,
    selected,
    loadFailed,
    onRetryLoad,
    onChange,
    isAr,
}: {
    /** Undefined while creating — a new product cannot be picked yet, so nothing to exclude. */
    productId?: string;
    selected: ProductRelatedProductDto[] | null;
    loadFailed: boolean;
    onRetryLoad: () => void;
    onChange: (selected: ProductRelatedProductDto[]) => void;
    isAr: boolean;
}) {
    const label = (row: { name: string; nameAr?: string | null }) => (isAr && row.nameAr) || row.name;

    if (selected === null) {
        return (
            <RelatedProductsCard isAr={isAr}>
                {loadFailed ? (
                    <div role="alert" className="flex items-center justify-between gap-3 rounded-md border border-destructive/40 p-3 text-sm">
                        <span className="text-destructive">
                            {isAr ? "تعذّر تحميل المنتجات ذات الصلة." : "Could not load the related products."}
                        </span>
                        <Button type="button" variant="outline" size="sm" onClick={onRetryLoad}>
                            <RefreshCw className="me-1 h-4 w-4" />
                            {isAr ? "إعادة المحاولة" : "Retry"}
                        </Button>
                    </div>
                ) : (
                    <p className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {isAr ? "جارٍ التحميل…" : "Loading…"}
                    </p>
                )}
            </RelatedProductsCard>
        );
    }

    const selectedIds = new Set(selected.map((row) => row.productId));
    const isFull = selected.length >= MAX_RELATED_PRODUCTS;

    const add = (product: ProductDto) => {
        if (isFull || selectedIds.has(product.id) || product.id === productId) return;
        onChange([
            ...selected,
            {
                productId: product.id,
                name: product.name,
                nameAr: product.nameAr,
                imageUrl: product.imageUrl,
                imageKey: product.imageKey,
                isActive: product.isActive,
                sortOrder: selected.length,
            },
        ]);
    };

    const move = (from: number, to: number) => {
        if (to < 0 || to >= selected.length) return;
        const next = [...selected];
        const [row] = next.splice(from, 1);
        next.splice(to, 0, row);
        onChange(next);
    };

    return (
        <RelatedProductsCard isAr={isAr}>
            <RelatedProductPicker
                excludedIds={new Set([...selectedIds, ...(productId ? [productId] : [])])}
                disabled={isFull}
                onPick={add}
                label={label}
                isAr={isAr}
            />

            {isFull && (
                <p className="text-xs text-muted-foreground">
                    {isAr
                        ? `الحد الأقصى ${MAX_RELATED_PRODUCTS} منتجًا. احذف منتجًا لإضافة آخر.`
                        : `Up to ${MAX_RELATED_PRODUCTS} products. Remove one to add another.`}
                </p>
            )}

            <div className="space-y-2">
                <p className="text-sm font-medium">
                    {isAr ? "المنتجات المختارة" : "Selected products"} ({selected.length})
                </p>
                {selected.length === 0 ? (
                    <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
                        {isAr
                            ? "لا توجد منتجات مختارة. سيعرض المتجر منتجات من القسم نفسه تلقائيًا."
                            : "None selected. The store shows products from the same department automatically."}
                    </p>
                ) : (
                    <ol className="divide-y rounded-md border">
                        {selected.map((row, index) => (
                            <li key={row.productId} className="flex items-center gap-3 p-2">
                                <span className="w-5 shrink-0 text-center text-xs tabular-nums text-muted-foreground">{index + 1}</span>
                                <Thumb imageKey={row.imageKey} imageUrl={row.imageUrl} />
                                <span className="min-w-0 flex-1 truncate text-sm font-medium">{label(row)}</span>
                                {!row.isActive && <InactiveBadge isAr={isAr} />}
                                <div className="flex shrink-0 items-center">
                                    <Button
                                        type="button"
                                        size="icon"
                                        variant="ghost"
                                        className="size-7"
                                        disabled={index === 0}
                                        aria-label={isAr ? "تحريك للأعلى" : "Move up"}
                                        onClick={() => move(index, index - 1)}
                                    >
                                        <ArrowUp className="size-3.5" />
                                    </Button>
                                    <Button
                                        type="button"
                                        size="icon"
                                        variant="ghost"
                                        className="size-7"
                                        disabled={index === selected.length - 1}
                                        aria-label={isAr ? "تحريك للأسفل" : "Move down"}
                                        onClick={() => move(index, index + 1)}
                                    >
                                        <ArrowDown className="size-3.5" />
                                    </Button>
                                    <Button
                                        type="button"
                                        size="icon"
                                        variant="ghost"
                                        className="size-7 text-destructive"
                                        aria-label={isAr ? "إزالة" : "Remove"}
                                        onClick={() => onChange(selected.filter((other) => other.productId !== row.productId))}
                                    >
                                        <Trash2 className="size-3.5" />
                                    </Button>
                                </div>
                            </li>
                        ))}
                    </ol>
                )}
            </div>
        </RelatedProductsCard>
    );
}

interface PickerResults {
    /** The request these rows answer — a mismatch means that request is still in flight. */
    key: string;
    items: ProductDto[];
    totalCount: number;
    pagesLoaded: number;
    failed: boolean;
    moreFailed: boolean;
}

const NO_RESULTS: PickerResults = { key: "", items: [], totalCount: 0, pagesLoaded: 0, failed: false, moreFailed: false };

/** Only active products can appear on the online store, so nothing else is offered. */
const fetchPickerPage = (search: string, page: number): Promise<PaginatedResult<ProductDto>> =>
    getProductsPaginated(page, PICKER_PAGE_SIZE, search, undefined, "active");

/**
 * Searchable, scrollable product dropdown.
 *
 * Focus opens it on the first page of the catalogue, typing narrows it (name, Arabic name,
 * SKU or barcode — server-side, debounced) and scrolling pages in the rest, so a large
 * catalogue is never loaded whole. Already-picked products and the product itself are
 * filtered out; the parent still re-checks both on add.
 */
function RelatedProductPicker({
    excludedIds,
    disabled,
    onPick,
    label,
    isAr,
}: {
    excludedIds: Set<string>;
    disabled: boolean;
    onPick: (product: ProductDto) => void;
    label: (row: { name: string; nameAr?: string | null }) => string;
    isAr: boolean;
}) {
    const listboxId = useId();
    const container = useRef<HTMLDivElement>(null);
    const input = useRef<HTMLInputElement>(null);
    const list = useRef<HTMLUListElement>(null);
    const loadingMore = useRef(false);
    const [open, setOpen] = useState(false);
    const [dropUp, setDropUp] = useState(false);
    const [searchInput, setSearchInput] = useState("");
    const [search, setSearch] = useState("");
    const [attempt, setAttempt] = useState(0);
    const [activeIndex, setActiveIndex] = useState(0);
    const [results, setResults] = useState<PickerResults>(NO_RESULTS);
    const [isLoadingMore, setIsLoadingMore] = useState(false);

    useEffect(() => {
        const timeoutId = window.setTimeout(() => setSearch(searchInput.trim()), SEARCH_DEBOUNCE_MS);
        return () => window.clearTimeout(timeoutId);
    }, [searchInput]);

    const requestKey = `${attempt}:${search}`;
    const isOpen = open && !disabled;

    // First page for the current search. Fetched only while open, and kept across
    // close/reopen, so browsing back to the same list costs no request.
    useEffect(() => {
        if (!isOpen || results.key === requestKey) return;
        let cancelled = false;
        fetchPickerPage(search, 1)
            .then((page) => {
                if (cancelled) return;
                setResults({ ...NO_RESULTS, key: requestKey, items: page.items, totalCount: page.totalCount, pagesLoaded: 1 });
            })
            .catch(() => {
                if (!cancelled) setResults({ ...NO_RESULTS, key: requestKey, failed: true });
            });
        return () => {
            cancelled = true;
        };
    }, [isOpen, requestKey, search, results.key]);

    const isLoading = results.key !== requestKey;
    const hasMore = !isLoading && !results.failed && results.items.length < results.totalCount;
    const candidates = isLoading ? [] : results.items.filter((product) => !excludedIds.has(product.id));
    const active = Math.min(activeIndex, candidates.length - 1);

    const loadMore = async () => {
        if (loadingMore.current || !hasMore || results.moreFailed) return;
        const key = results.key;
        const nextPage = results.pagesLoaded + 1;
        loadingMore.current = true;
        setIsLoadingMore(true);
        try {
            const page = await fetchPickerPage(search, nextPage);
            setResults((current) => {
                if (current.key !== key) return current;
                const known = new Set(current.items.map((product) => product.id));
                const items = [...current.items, ...page.items.filter((product) => !known.has(product.id))];
                // An empty page means the catalogue shrank under us — stop paging.
                const totalCount = page.items.length === 0 ? items.length : page.totalCount;
                return { ...current, items, totalCount, pagesLoaded: nextPage };
            });
        } catch {
            setResults((current) => (current.key === key ? { ...current, moreFailed: true } : current));
        } finally {
            loadingMore.current = false;
            setIsLoadingMore(false);
        }
    };

    const nearBottom = (element: HTMLElement) =>
        element.scrollHeight - element.scrollTop - element.clientHeight < LOAD_MORE_THRESHOLD_PX;

    // Keeps paging while the list is too short to scroll — e.g. when most of a page was
    // filtered out as already selected — so continuing never depends on a scroll event.
    useEffect(() => {
        const element = list.current;
        if (isOpen && element && hasMore && nearBottom(element)) void loadMore();
    });

    // Outside click closes. Escape is caught on window in the capture phase so it closes
    // only this dropdown, not the product sheet's dialog, which listens on document.
    useEffect(() => {
        if (!isOpen) return;
        const onPointerDown = (event: PointerEvent) => {
            if (!container.current?.contains(event.target as Node)) setOpen(false);
        };
        const onEscape = (event: KeyboardEvent) => {
            if (event.key !== "Escape" || !container.current?.contains(document.activeElement)) return;
            event.stopPropagation();
            event.preventDefault();
            setOpen(false);
        };
        document.addEventListener("pointerdown", onPointerDown);
        window.addEventListener("keydown", onEscape, true);
        return () => {
            document.removeEventListener("pointerdown", onPointerDown);
            window.removeEventListener("keydown", onEscape, true);
        };
    }, [isOpen]);

    const openDropdown = () => {
        if (disabled || open) return;
        // Opens upward only when the space below would clip it and there is more room above.
        const box = input.current?.getBoundingClientRect();
        if (box) {
            const below = window.innerHeight - box.bottom;
            setDropUp(below < PICKER_MAX_HEIGHT_PX && box.top > below);
        }
        setOpen(true);
    };

    const highlight = (index: number) => {
        setActiveIndex(index);
        list.current?.querySelector(`[data-index="${index}"]`)?.scrollIntoView({ block: "nearest" });
    };

    const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            if (!isOpen) { openDropdown(); return; }
            if (candidates.length === 0) return;
            const delta = event.key === "ArrowDown" ? 1 : -1;
            highlight(Math.min(candidates.length - 1, Math.max(0, active + delta)));
            return;
        }
        // Enter must never submit the surrounding product form from here.
        if (event.key === "Enter" && isOpen) {
            event.preventDefault();
            if (candidates[active]) onPick(candidates[active]);
        }
    };

    const optionId = (index: number) => `${listboxId}-option-${index}`;
    const searchLabel = isAr ? "ابحث بالاسم أو رمز المنتج" : "Search by name or SKU";

    return (
        <div ref={container} className="relative">
            <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
                ref={input}
                role="combobox"
                aria-label={searchLabel}
                aria-expanded={isOpen}
                aria-controls={listboxId}
                aria-autocomplete="list"
                aria-activedescendant={isOpen && candidates[active] ? optionId(active) : undefined}
                autoComplete="off"
                value={searchInput}
                onChange={(event) => {
                    setSearchInput(event.target.value);
                    setActiveIndex(0);
                    list.current?.scrollTo({ top: 0 });
                    openDropdown();
                }}
                onFocus={openDropdown}
                onClick={openDropdown}
                onKeyDown={onKeyDown}
                placeholder={isAr ? "تصفح المنتجات أو ابحث بالاسم أو رمز المنتج…" : "Browse or search by name or SKU…"}
                className="ps-9"
                disabled={disabled}
            />

            {isOpen && (
                <div
                    className={`absolute inset-x-0 z-30 overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-lg ${
                        dropUp ? "bottom-full mb-1" : "top-full mt-1"
                    }`}
                >
                    <ul
                        ref={list}
                        id={listboxId}
                        role="listbox"
                        aria-label={searchLabel}
                        aria-busy={isLoading || isLoadingMore}
                        className="overflow-y-auto overscroll-contain py-1"
                        style={{ maxHeight: PICKER_MAX_HEIGHT_PX }}
                        onScroll={(event) => { if (nearBottom(event.currentTarget)) void loadMore(); }}
                    >
                        {candidates.map((product, index) => {
                            const sku = product.retail?.sku || product.retail?.barcode;
                            return (
                                <li
                                    key={product.id}
                                    id={optionId(index)}
                                    data-index={index}
                                    role="option"
                                    aria-selected={index === active}
                                    // Keeps focus in the input, so typing can continue after a pick.
                                    onMouseDown={(event) => event.preventDefault()}
                                    onMouseEnter={() => setActiveIndex(index)}
                                    onClick={() => onPick(product)}
                                    className={`flex cursor-pointer items-center gap-3 px-3 py-2 ${index === active ? "bg-accent text-accent-foreground" : ""}`}
                                >
                                    <Thumb imageKey={product.imageKey} imageUrl={product.imageUrl} />
                                    <span className="min-w-0 flex-1">
                                        <span className="block truncate text-sm font-medium">{label(product)}</span>
                                        <span className="flex min-w-0 gap-2 text-xs text-muted-foreground">
                                            {product.categoryName && <span className="truncate">{product.categoryName}</span>}
                                            {sku && <span className="shrink-0 font-mono" dir="ltr">{sku}</span>}
                                        </span>
                                    </span>
                                    <span className="flex size-7 shrink-0 items-center justify-center rounded-md border text-muted-foreground">
                                        <Plus className="h-4 w-4" />
                                        <span className="sr-only">{isAr ? "إضافة" : "Add"}</span>
                                    </span>
                                </li>
                            );
                        })}

                        {(isLoading || isLoadingMore || (hasMore && candidates.length === 0)) && (
                            <li role="presentation" className="flex items-center gap-2 px-3 py-3 text-sm text-muted-foreground">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                {isAr ? "جارٍ التحميل…" : "Loading…"}
                            </li>
                        )}

                        {!isLoading && results.failed && (
                            <PickerRetry
                                message={isAr ? "تعذّر تحميل المنتجات." : "Could not load products."}
                                onRetry={() => setAttempt((count) => count + 1)}
                                isAr={isAr}
                            />
                        )}

                        {!isLoading && results.moreFailed && (
                            <PickerRetry
                                message={isAr ? "تعذّر تحميل المزيد." : "Could not load more."}
                                onRetry={() => setResults((current) => ({ ...current, moreFailed: false }))}
                                isAr={isAr}
                            />
                        )}

                        {!isLoading && !results.failed && !hasMore && candidates.length === 0 && (
                            <li role="presentation" className="px-3 py-3 text-sm text-muted-foreground">
                                {isAr ? "لا توجد منتجات." : "No products found."}
                            </li>
                        )}
                    </ul>
                </div>
            )}
        </div>
    );
}

function PickerRetry({ message, onRetry, isAr }: { message: string; onRetry: () => void; isAr: boolean }) {
    return (
        <li role="presentation" className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
            <span className="text-destructive">{message}</span>
            <Button
                type="button"
                variant="outline"
                size="sm"
                onMouseDown={(event) => event.preventDefault()}
                onClick={onRetry}
            >
                <RefreshCw className="me-1 h-4 w-4" />
                {isAr ? "إعادة المحاولة" : "Retry"}
            </Button>
        </li>
    );
}

function RelatedProductsCard({ isAr, children }: { isAr: boolean; children: React.ReactNode }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-lg">{isAr ? "منتجات ذات صلة" : "Related Products"}</CardTitle>
                <p className="text-sm text-muted-foreground">
                    {isAr
                        ? "تظهر أولًا في قسم \"قد يعجبك أيضًا\" بالمتجر الإلكتروني وبهذا الترتيب. تُكمل منتجات القسم نفسه الأماكن المتبقية، ولا يظهر المنتج غير المتاح للعملاء."
                        : "Shown first under \"You may also like\" on the online store, in this order. Products from the same department fill any remaining places; a product customers cannot see is skipped."}
                </p>
            </CardHeader>
            <CardContent className="space-y-3">{children}</CardContent>
        </Card>
    );
}

function Thumb({ imageKey, imageUrl }: { imageKey?: string | null; imageUrl?: string | null }) {
    const src = productImage(imageKey, imageUrl, "thumb");
    return src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="size-9 shrink-0 rounded border object-cover" />
    ) : (
        <span className="size-9 shrink-0 rounded border bg-muted/40" />
    );
}

function InactiveBadge({ isAr }: { isAr: boolean }) {
    return <Badge variant="secondary" className="shrink-0">{isAr ? "غير نشط" : "Inactive"}</Badge>;
}

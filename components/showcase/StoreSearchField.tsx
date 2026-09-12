"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LayoutGrid, Search } from "lucide-react";
import StoreImage from "@/components/showcase/StoreImage";
import { onlineShoppingApi, type OnlineStoreSuggestions } from "@/lib/api-online-shopping";
import { productImage } from "@/lib/product-image";
import { createStoreText } from "@/lib/store-copy";
import { useStorefrontStore } from "@/store/storefrontStore";

const MIN_QUERY = 2;
const DEBOUNCE_MS = 220;

/**
 * Storefront search with a live suggestion panel.
 *
 * Suggestions come from a dedicated bounded endpoint (six products, four departments), so
 * typing never pulls a catalogue page. Submitting still performs the ordinary search, which
 * means the field keeps working exactly as before if suggestions fail or are switched off.
 */
export default function StoreSearchField({
    isAr,
    defaultValue,
    basePath,
    format,
    autoFocus = false,
    onNavigate,
}: {
    isAr: boolean;
    defaultValue: string;
    /** Where a plain submit searches: the shop, or the category being browsed. */
    basePath: string;
    format: (value: number) => string;
    autoFocus?: boolean;
    onNavigate?: () => void;
}) {
    const text = createStoreText(isAr);
    const router = useRouter();
    const branchId = useStorefrontStore(state => state.branchId);
    const [query, setQuery] = useState(defaultValue);
    const [open, setOpen] = useState(false);
    // The result carries the term it answers, so a stale response for a previous term is
    // simply not rendered — no state has to be cleared as the shopper keeps typing.
    const [result, setResult] = useState<{ term: string; data: OnlineStoreSuggestions } | null>(null);
    const container = useRef<HTMLDivElement>(null);

    const term = query.trim();
    const suggestions = result?.term === term ? result.data : null;

    useEffect(() => {
        if (term.length < MIN_QUERY) return;
        let cancelled = false;
        const timer = setTimeout(() => {
            onlineShoppingApi
                .getSuggestions(term, branchId)
                .then(data => { if (!cancelled) setResult({ term, data }); })
                .catch(() => { /* keep the field usable; submitting still searches */ });
        }, DEBOUNCE_MS);
        return () => { cancelled = true; clearTimeout(timer); };
    }, [term, branchId]);

    // A click anywhere else dismisses the panel without stealing the click itself.
    useEffect(() => {
        if (!open) return;
        const onPointerDown = (event: PointerEvent) => {
            if (!container.current?.contains(event.target as Node)) setOpen(false);
        };
        document.addEventListener("pointerdown", onPointerDown);
        return () => document.removeEventListener("pointerdown", onPointerDown);
    }, [open]);

    const leave = () => { setOpen(false); onNavigate?.(); };

    const submit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        router.push(term ? `${basePath}?q=${encodeURIComponent(term)}` : basePath);
        leave();
    };

    const goTo = (href: string) => { router.push(href); leave(); };

    const products = suggestions?.products ?? [];
    const categories = suggestions?.categories ?? [];
    const hasPanel = open && term.length >= MIN_QUERY && !!suggestions;

    return (
        <div ref={container} className="relative w-full">
            <form onSubmit={submit} role="search">
                <label className="sf-search w-full">
                    <Search className="size-[18px] shrink-0 text-muted-foreground" />
                    <span className="sr-only">{text("searchProducts")}</span>
                    <input
                        name="q"
                        type="search"
                        value={query}
                        autoFocus={autoFocus}
                        enterKeyHint="search"
                        placeholder={text("searchProducts")}
                        role="combobox"
                        aria-expanded={hasPanel}
                        aria-controls="sf-suggestions"
                        aria-autocomplete="list"
                        onChange={event => { setQuery(event.target.value); setOpen(true); }}
                        onFocus={() => setOpen(true)}
                        onKeyDown={event => { if (event.key === "Escape") setOpen(false); }}
                    />
                </label>
            </form>

            {hasPanel && (
                <div id="sf-suggestions" role="listbox" aria-label={text("suggestions")} className="sf-suggest">
                    {products.length === 0 && categories.length === 0 ? (
                        <p className="px-3 py-4 text-center text-sm text-muted-foreground">{text("noSuggestions")}</p>
                    ) : (
                        <>
                            {categories.length > 0 && (
                                <div className="border-b py-1">
                                    {categories.map(category => (
                                        <button
                                            key={category.id}
                                            type="button"
                                            role="option"
                                            aria-selected={false}
                                            onClick={() => goTo(`/shop/category/${category.id}`)}
                                            className="sf-suggest-row"
                                        >
                                            <span className="grid size-9 shrink-0 place-items-center rounded-[8px] bg-[var(--sf-accent-softer)] text-[var(--sf-accent-ink)]">
                                                <LayoutGrid className="size-4" />
                                            </span>
                                            <span className="sf-bidi min-w-0 flex-1 truncate text-sm font-medium">
                                                {isAr ? category.nameAr || category.name : category.name}
                                            </span>
                                            <span className="sf-meta shrink-0">{category.productCount}</span>
                                        </button>
                                    ))}
                                </div>
                            )}

                            <div className="py-1">
                                {products.map(product => (
                                    <button
                                        key={product.id}
                                        type="button"
                                        role="option"
                                        aria-selected={false}
                                        onClick={() => goTo(`/shop/product/${product.id}`)}
                                        className="sf-suggest-row"
                                    >
                                        <StoreImage
                                            src={productImage(product.imageKey, product.imageUrl, "thumb")}
                                            alt=""
                                            fit="contain"
                                            fallbackText={product.name}
                                            sizes="40px"
                                            className="size-10 shrink-0 rounded-[8px]"
                                        />
                                        <span className="min-w-0 flex-1">
                                            {product.brand && (
                                                <span className="sf-bidi block truncate text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">
                                                    {product.brand}
                                                </span>
                                            )}
                                            <span className="sf-bidi block truncate text-[13px] font-medium">
                                                {isAr ? product.nameAr || product.name : product.name}
                                            </span>
                                        </span>
                                        <span className="shrink-0 text-[13px] font-semibold tabular-nums">
                                            {format(product.price)}
                                        </span>
                                    </button>
                                ))}
                            </div>

                            <button
                                type="button"
                                onClick={() => goTo(`${basePath}?q=${encodeURIComponent(term)}`)}
                                className="w-full border-t px-3 py-2.5 text-center text-[13px] font-medium text-[var(--sf-accent-ink)] transition-colors hover:bg-[var(--sf-accent-softer)]"
                            >
                                {text("seeAllResults")}
                            </button>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}

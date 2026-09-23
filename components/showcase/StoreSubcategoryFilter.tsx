"use client";

import Link from "next/link";
import { LayoutGrid } from "lucide-react";
import StoreImage from "@/components/showcase/StoreImage";
import type { OnlineStoreSubcategory } from "@/lib/api-online-shopping";
import { createStoreText } from "@/lib/store-copy";

/**
 * Compact image rail narrowing a department's product grid to one subcategory. "All" is the
 * default so the whole department is listed before anything is picked. Each tile is a link
 * built by the catalogue browser, so the selection lives in the URL like search, sort and page.
 */
export default function StoreSubcategoryFilter({
    subcategories,
    selectedId,
    hrefFor,
    isAr,
}: {
    subcategories: OnlineStoreSubcategory[];
    selectedId?: string;
    hrefFor: (subcategoryId?: string) => string;
    isAr: boolean;
}) {
    const text = createStoreText(isAr);
    if (subcategories.length === 0) return null;

    return (
        <nav aria-label={text("subcategories")} className="mb-5">
            <ul className="sf-rail gap-3 pb-1 sm:gap-4">
                <li className="shrink-0">
                    <SubcategoryTile
                        href={hrefFor(undefined)}
                        label={text("allInCategory")}
                        selected={!selectedId}
                    />
                </li>
                {subcategories.map(subcategory => {
                    const name = isAr ? subcategory.nameAr || subcategory.name : subcategory.name;
                    return (
                        <li key={subcategory.id} className="shrink-0">
                            <SubcategoryTile
                                href={hrefFor(subcategory.id)}
                                label={name}
                                imageUrl={subcategory.imageUrl}
                                selected={selectedId === subcategory.id}
                                withImage
                            />
                        </li>
                    );
                })}
            </ul>
        </nav>
    );
}

function SubcategoryTile({
    href,
    label,
    imageUrl,
    selected,
    withImage = false,
}: {
    href: string;
    label: string;
    imageUrl?: string;
    selected: boolean;
    withImage?: boolean;
}) {
    const ring = selected
        ? "ring-2 ring-[var(--sf-brand)] ring-offset-2 ring-offset-background"
        : "ring-1 ring-[var(--sf-line)] group-hover:ring-[var(--sf-line-strong)]";

    return (
        <Link
            href={href}
            scroll={false}
            aria-current={selected ? "true" : undefined}
            className="group flex w-[72px] flex-col items-center gap-1.5 rounded-[var(--sf-radius-sm)] py-1 outline-none focus-visible:ring-2 focus-visible:ring-[var(--sf-brand)] sm:w-20"
        >
            {withImage ? (
                <StoreImage
                    src={imageUrl}
                    alt=""
                    fallbackText={label}
                    sizes="64px"
                    className={`size-14 rounded-full transition-shadow sm:size-16 ${ring}`}
                />
            ) : (
                <span className={`sf-media flex size-14 items-center justify-center rounded-full transition-shadow sm:size-16 ${ring}`}>
                    <LayoutGrid className="size-5 text-muted-foreground" strokeWidth={1.75} />
                </span>
            )}
            <span
                className={`sf-bidi line-clamp-2 w-full text-center text-[12px] leading-tight ${
                    selected ? "font-semibold text-foreground" : "text-muted-foreground group-hover:text-foreground"
                }`}
            >
                {label}
            </span>
        </Link>
    );
}

"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { createStoreText } from "@/lib/store-copy";

const MAX_NUMBERED_LINKS = 5;

/**
 * Pagination is deliberately secondary to the grid: hairline controls, no fill
 * except the current page. Narrow screens collapse to first / neighbours / last
 * so the row never wraps at 320px.
 */
export default function StorePagination({
    page,
    totalPages,
    isAr,
    onChange,
}: {
    page: number;
    totalPages: number;
    isAr: boolean;
    onChange: (page: number) => void;
}) {
    if (totalPages <= 1) return null;
    const text = createStoreText(isAr);
    const pages = buildWindow(page, totalPages);
    const edge = (value: number) => value === 1 || value === totalPages;

    return (
        <nav aria-label={text("page")} className="mt-8 flex items-center justify-center gap-1">
            <button
                type="button"
                disabled={page <= 1}
                onClick={() => onChange(page - 1)}
                aria-label={text("previous")}
                className="inline-flex h-9 items-center gap-1 rounded-[10px] border px-2.5 text-[13px] font-medium transition-colors hover:bg-[var(--sf-surface-sunken)] disabled:pointer-events-none disabled:opacity-40 sm:px-3"
            >
                <ChevronLeft className="size-4 rtl:rotate-180" />
                <span className="hidden sm:inline">{text("previous")}</span>
            </button>

            {pages.map((value, index) =>
                value === null ? (
                    <span key={`gap-${index}`} aria-hidden className="px-1 text-sm text-muted-foreground">…</span>
                ) : (
                    <button
                        key={value}
                        type="button"
                        aria-current={value === page ? "page" : undefined}
                        aria-label={`${text("page")} ${value}`}
                        onClick={() => onChange(value)}
                        className={`h-9 min-w-9 rounded-[10px] px-2 text-[13px] font-medium tabular-nums transition-colors ${
                            value === page
                                ? "bg-primary text-primary-foreground"
                                : "text-muted-foreground hover:bg-[var(--sf-surface-sunken)] hover:text-foreground"
                        } ${Math.abs(value - page) > 1 && !edge(value) ? "hidden sm:inline-flex sm:items-center sm:justify-center" : "inline-flex items-center justify-center"}`}
                    >
                        {value}
                    </button>
                ),
            )}

            <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => onChange(page + 1)}
                aria-label={text("next")}
                className="inline-flex h-9 items-center gap-1 rounded-[10px] border px-2.5 text-[13px] font-medium transition-colors hover:bg-[var(--sf-surface-sunken)] disabled:pointer-events-none disabled:opacity-40 sm:px-3"
            >
                <span className="hidden sm:inline">{text("next")}</span>
                <ChevronRight className="size-4 rtl:rotate-180" />
            </button>
        </nav>
    );
}

function buildWindow(page: number, totalPages: number): (number | null)[] {
    if (totalPages <= MAX_NUMBERED_LINKS + 2)
        return Array.from({ length: totalPages }, (_, index) => index + 1);

    const span = Math.floor(MAX_NUMBERED_LINKS / 2);
    const start = Math.max(2, Math.min(page - span, totalPages - MAX_NUMBERED_LINKS));
    const end = Math.min(totalPages - 1, start + MAX_NUMBERED_LINKS - 1);
    const window: (number | null)[] = [1];
    if (start > 2) window.push(null);
    for (let value = start; value <= end; value += 1) window.push(value);
    if (end < totalPages - 1) window.push(null);
    window.push(totalPages);
    return window;
}

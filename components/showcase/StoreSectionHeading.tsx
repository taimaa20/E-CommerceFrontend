"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";

/**
 * The one heading used by every merchandising row, so the home page reads as one
 * rhythm rather than as a stack of differently-styled blocks.
 */
export default function StoreSectionHeading({
    eyebrow,
    title,
    hint,
    href,
    linkLabel,
}: {
    eyebrow?: string;
    title: string;
    hint?: string;
    href?: string;
    linkLabel?: string;
}) {
    return (
        <div className="mb-3 flex items-end justify-between gap-4 sm:mb-4">
            <div className="min-w-0">
                {eyebrow && <p className="sf-eyebrow mb-1">{eyebrow}</p>}
                <h2 className="sf-section-title sf-bidi break-words">{title}</h2>
                {hint && <p className="sf-meta mt-0.5 line-clamp-1">{hint}</p>}
            </div>
            {href && linkLabel && (
                <Link
                    href={href}
                    className="group inline-flex shrink-0 items-center gap-0.5 text-[13px] font-medium text-[var(--sf-accent-ink)] transition-colors hover:text-foreground"
                >
                    {linkLabel}
                    <ChevronRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5" />
                </Link>
            )}
        </div>
    );
}

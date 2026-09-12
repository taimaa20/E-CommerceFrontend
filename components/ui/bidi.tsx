"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface BidiProps extends React.HTMLAttributes<HTMLSpanElement> {
    /**
     * Force a specific direction for this fragment. Defaults to `"ltr"` —
     * use for prices, totals, currency codes, phone numbers, IDs, dates,
     * times, and any glyphs that must read left-to-right even inside an
     * Arabic paragraph. The `unicode-bidi: isolate` rule prevents the
     * surrounding RTL context from reordering the inner runs.
     */
    dir?: "ltr" | "rtl";
    as?: keyof React.JSX.IntrinsicElements;
}

/**
 * Bidi-isolated text fragment.
 *
 *   <Bidi>EGP 150.00</Bidi>
 *   <Bidi>+20 100 123 4567</Bidi>
 *
 * Wraps content in a span (or chosen element) with `dir` set and CSS
 * `unicode-bidi: isolate` so the segment renders independently of the
 * paragraph direction. Use it on every numeric / currency / latin-id
 * value rendered inside RTL screens.
 */
export const Bidi = React.forwardRef<HTMLSpanElement, BidiProps>(function Bidi(
    { dir = "ltr", as: Tag = "span", className, style, children, ...rest },
    ref
) {
    const Comp = Tag as "span";
    return (
        <Comp
            ref={ref}
            dir={dir}
            className={cn("[unicode-bidi:isolate]", className)}
            style={style}
            {...rest}
        >
            {children}
        </Comp>
    );
});

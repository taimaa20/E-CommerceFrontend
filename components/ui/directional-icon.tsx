"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type LucideLike = React.ComponentType<{ className?: string } & React.SVGProps<SVGSVGElement>>;

interface DirectionalIconProps extends React.SVGProps<SVGSVGElement> {
    /**
     * The icon component to render. Auto-mirrors horizontally when the
     * surrounding `[dir="rtl"]` context is active. Use for chevrons,
     * arrows, back/forward, breadcrumbs, pagination, drawer carets, etc.
     *
     * Do NOT use for icons whose meaning is direction-independent
     * (search, settings, user, …) — those should not flip.
     */
    icon: LucideLike;
    className?: string;
}

/**
 * Direction-aware icon wrapper. Replaces inline `ar ? <ChevronLeft/> : <ChevronRight/>`.
 *
 *   <DirectionalIcon icon={ChevronRight} className="h-4 w-4" />
 *
 * Renders the icon and applies `rtl:-scale-x-100` so the glyph mirrors only
 * inside an RTL subtree. No JS, no re-render — pure CSS.
 */
export const DirectionalIcon = React.forwardRef<SVGSVGElement, DirectionalIconProps>(
    function DirectionalIcon({ icon: Icon, className, ...rest }, ref) {
        return (
            <Icon
                ref={ref}
                className={cn("rtl:-scale-x-100", className)}
                {...rest}
            />
        );
    }
);

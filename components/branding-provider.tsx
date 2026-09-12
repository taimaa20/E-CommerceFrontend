"use client";

import { useEffect } from "react";
import { useBrandingStore } from "@/store/brandingStore";

/**
 * BrandingProvider — fetches tenant branding from the API and injects
 * CSS custom properties into :root so the entire UI reflects the client's brand.
 *
 * Anti-FOUC: the inline <script> in layout.tsx applies cached values before
 * hydration. This component then re-applies after mount and syncs with the server.
 */
export function BrandingProvider({ children }: { children: React.ReactNode }) {
    const { applyTheme, loadBranding } = useBrandingStore();

    useEffect(() => {
        // 1. Apply persisted theme immediately — eliminates any remaining flash
        applyTheme();
        // 2. Fetch from server in background — updates cache and re-applies if changed
        loadBranding();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    return <>{children}</>;
}

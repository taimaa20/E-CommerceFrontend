"use client";

import React from "react";

/**
 * @deprecated Direction is owned by `LocaleProvider`. This component is a
 * no-op pass-through kept so existing imports in `app/layout.tsx` and any
 * downstream code continue to work. Remove in a follow-up cleanup pass.
 */
export function RTLProvider({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}

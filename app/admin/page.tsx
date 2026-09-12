"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * The legacy admin landing page (a simple daily-summary dashboard) is
 * superseded by the new Overview at /ntxadminpos/dashboard/home. To avoid two
 * "home dashboards" coexisting in the system, this page now redirects.
 *
 * Anything that previously lived here is preserved in
 * `app/admin/dashboard/home/page.tsx` — the modern Overview composed from the
 * same `/api/dashboards/home` snapshot the other four dashboards share.
 */
export default function AdminLegacyLanding() {
    const router = useRouter();
    useEffect(() => {
        router.replace("/ntxadminpos/dashboard/home");
    }, [router]);
    return null;
}

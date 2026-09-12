"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Retail stock is no longer a separate application — it is a tab inside the one Inventory
 * area, which shows whichever stock model the active branch actually uses. This route stays
 * so existing links and bookmarks keep working.
 */
export default function RetailInventoryRedirectPage() {
    const router = useRouter();

    useEffect(() => {
        router.replace("/ntxadminpos/inventory");
    }, [router]);

    return null;
}

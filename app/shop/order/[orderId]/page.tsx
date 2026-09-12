"use client";

import { Suspense, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";

/**
 * Singular alias for a single order's page. `/shop/orders/:id` is where tracking lives — this
 * exists so `/shop/order/:id` reaches it too, carrying the access token with it, rather than
 * being a second implementation of the same screen.
 */
export default function OrderAliasPage() {
    return (
        <Suspense fallback={null}>
            <OrderRedirect />
        </Suspense>
    );
}

function OrderRedirect() {
    const router = useRouter();
    const params = useParams<{ orderId: string }>();
    const searchParams = useSearchParams();
    const orderId = params?.orderId ?? "";
    const query = searchParams.toString();

    useEffect(() => {
        router.replace(
            orderId
                ? `/shop/orders/${encodeURIComponent(orderId)}${query ? `?${query}` : ""}`
                : "/shop/orders",
        );
    }, [router, orderId, query]);

    return null;
}

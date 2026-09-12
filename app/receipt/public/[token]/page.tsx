import { Suspense } from "react";
import PublicReceiptClient from "./public-receipt-client";

export default async function PublicReceiptPage({
    params,
}: {
    params: Promise<{ token: string }>;
}) {
    const { token } = await params;
    return (
        <Suspense fallback={null}>
            <PublicReceiptClient token={token} />
        </Suspense>
    );
}

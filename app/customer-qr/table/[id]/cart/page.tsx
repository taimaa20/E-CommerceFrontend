"use client";

import { use, useEffect } from "react";
import { useRouter } from "next/navigation";
import { LoadingState } from "@/features/customer-qr/components/LoadingState";
import { MobileShell } from "@/features/customer-qr/components/MobileShell";
import { tableUrl } from "@/features/customer-qr/constants";

/**
 * `/cart` is preserved for backwards compatibility with anything that
 * deep-links to it (printed QR variants, marketing links). The diner-facing
 * concept is now "Your order", served by /order.
 */
export default function CartRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  useEffect(() => {
    router.replace(tableUrl(id, "order"));
  }, [id, router]);

  return (
    <MobileShell>
      <LoadingState />
    </MobileShell>
  );
}

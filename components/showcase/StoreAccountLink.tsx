"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserRound } from "lucide-react";
import { ACCOUNT_PATH, signInHref } from "@/lib/customer-auth-prompt";
import { useCustomerSessionStore } from "@/store/customerSessionStore";

/**
 * The header's account entry. Guests see "Sign in"; a signed-in customer sees their first name
 * and goes to their account. While the session is still being restored nothing is labelled, so
 * a returning customer never sees a "Sign in" flash.
 */
export default function StoreAccountLink({ isAr, variant = "header" }: { isAr: boolean; variant?: "header" | "menu" }) {
    const status = useCustomerSessionStore(state => state.status);
    const firstName = useCustomerSessionStore(state => state.customer?.firstName);
    const pathname = usePathname();

    const signedIn = status === "authenticated";
    const href = signedIn ? ACCOUNT_PATH : signInHref("account", pathname.startsWith("/shop/account") ? ACCOUNT_PATH : pathname);
    const label = status === "unknown"
        ? ""
        : signedIn
            ? firstName || (isAr ? "حسابي" : "My account")
            : isAr ? "تسجيل الدخول" : "Sign in";
    const accessibleLabel = signedIn ? (isAr ? "حسابي" : "My account") : (isAr ? "تسجيل الدخول" : "Sign in");

    if (variant === "menu") {
        return (
            <Link href={href} className="sf-btn sf-btn--outline w-full">
                <UserRound className="size-4" />
                {signedIn ? accessibleLabel : label || accessibleLabel}
            </Link>
        );
    }

    return (
        <Link href={href} aria-label={accessibleLabel} title={accessibleLabel} className="sf-btn sf-btn--quiet sf-btn--sm gap-1.5">
            <UserRound className="size-[19px] shrink-0" />
            <span className="hidden max-w-24 truncate lg:inline">{label}</span>
        </Link>
    );
}

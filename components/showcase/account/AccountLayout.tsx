"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Heart, Loader2, LogOut, MapPin, Package, Star, UserRound } from "lucide-react";
import { toast } from "sonner";
import StoreShell from "@/components/showcase/StoreShell";
import { useLocale } from "@/components/locale-provider";
import { signInHref } from "@/lib/customer-auth-prompt";
import { customerDisplayName, useCustomerSessionStore } from "@/store/customerSessionStore";

const SECTIONS = [
    { href: "/shop/account", en: "Profile", ar: "الملف الشخصي", icon: UserRound, exact: true },
    { href: "/shop/account/orders", en: "My orders", ar: "طلباتي", icon: Package, exact: false },
    { href: "/shop/account/points", en: "Points", ar: "النقاط", icon: Star, exact: false },
    { href: "/shop/account/addresses", en: "Addresses", ar: "العناوين", icon: MapPin, exact: false },
    { href: "/shop/favorites", en: "Favourites", ar: "المفضلة", icon: Heart, exact: false },
];

/**
 * Frame for every "My account" page. Guests are sent to sign-in and brought back afterwards.
 * This is navigation only — the API rejects any account call without a customer token, so the
 * redirect is a courtesy, not the security boundary.
 */
export default function AccountLayout({ children }: { children: (isAr: boolean) => React.ReactNode }) {
    return (
        <StoreShell>
            <AccountFrame>{children}</AccountFrame>
        </StoreShell>
    );
}

function AccountFrame({ children }: { children: (isAr: boolean) => React.ReactNode }) {
    const { locale } = useLocale();
    const isAr = locale === "ar";
    const router = useRouter();
    const pathname = usePathname();
    const status = useCustomerSessionStore(state => state.status);
    const customer = useCustomerSessionStore(state => state.customer);
    const signOut = useCustomerSessionStore(state => state.signOut);
    const [signingOut, setSigningOut] = useState(false);

    useEffect(() => {
        if (status === "guest" && !signingOut) router.replace(signInHref("account", pathname));
    }, [status, signingOut, pathname, router]);

    const handleSignOut = async () => {
        setSigningOut(true);
        // The store clears the local session and the route clears the cookie even when the
        // revocation call fails, so this device is signed out either way.
        await signOut().catch(() => undefined);
        // The cart is deliberately kept: it is device-local, holds no account data, and is
        // re-priced by the server at checkout.
        toast.success(isAr ? "تم تسجيل الخروج" : "Signed out");
        router.replace("/shop");
    };

    if (status !== "authenticated") {
        return (
            <div role="status" aria-live="polite" className="sf-container flex justify-center py-16">
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
                <span className="sr-only">{isAr ? "جارٍ التحميل" : "Loading"}</span>
            </div>
        );
    }

    return (
        <div className="sf-container">
            <div className="mb-5">
                <h1 className="sf-page-title">{isAr ? "حسابي" : "My account"}</h1>
                <p className="sf-meta mt-1">{customerDisplayName(customer)}</p>
            </div>
            <div className="grid gap-6 md:grid-cols-[13rem_1fr]">
                <nav aria-label={isAr ? "حسابي" : "My account"} className="flex gap-1 overflow-x-auto md:flex-col">
                    {SECTIONS.map(section => {
                        const active = section.exact ? pathname === section.href : pathname.startsWith(section.href);
                        const Icon = section.icon;
                        return (
                            <Link
                                key={section.href}
                                href={section.href}
                                aria-current={active ? "page" : undefined}
                                className={`flex min-h-11 shrink-0 items-center gap-2.5 rounded-[10px] px-3 text-sm font-medium transition-colors ${
                                    active ? "bg-[var(--sf-surface-sunken)] text-foreground" : "text-muted-foreground hover:text-foreground"
                                }`}
                            >
                                <Icon className="size-4" />
                                {isAr ? section.ar : section.en}
                            </Link>
                        );
                    })}
                    <button
                        type="button"
                        onClick={handleSignOut}
                        disabled={signingOut}
                        className="flex min-h-11 shrink-0 items-center gap-2.5 rounded-[10px] px-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-60"
                    >
                        {signingOut ? <Loader2 className="size-4 animate-spin" /> : <LogOut className="size-4" />}
                        {isAr ? "تسجيل الخروج" : "Sign out"}
                    </button>
                </nav>
                <section className="min-w-0">{children(isAr)}</section>
            </div>
        </div>
    );
}

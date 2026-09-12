"use client";
import React, { useEffect, useState } from "react";
import AdminSidebar from "@/components/admin/Sidebar";
import { useLocale } from "@/components/locale-provider";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { canAccessArea, getUnauthorizedRedirect } from "@/lib/authorization";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { UserRole } from "@/types/auth";
import { createAdminRailItems, createMarketingMenuItems, isMarketingAllowedPath } from "@/components/navigation/admin-menu";
import { config } from "@/lib/config";
import type { TranslationKey } from "@/lib/translations";
import BranchSelector from "@/components/admin/BranchSelector";

// Maps the backend role name (from the auth token) to its localized label.
const ROLE_LABEL_KEYS: Record<string, TranslationKey> = {
    Admin: "roleAdmin",
    Waiter: "roleWaiter",
    Kitchen: "roleKitchen",
    Cashier: "roleCashier",
    TrackerPickup: "roleTrackerPickup",
    Manager: "roleManager",
    Marketing: "roleMarketing",
};

function localizedRoleLabel(roleName: string | undefined, t: (k: TranslationKey) => string): string {
    if (!roleName) return "";
    const key = ROLE_LABEL_KEYS[roleName];
    return key ? t(key) : roleName;
}

function TabletRail({ onExpand }: { onExpand: () => void }) {
    const pathname = usePathname();
    const role = useAuthStore((s) => s.user?.role);
    const { t, locale } = useLocale();
    const ar = locale === "ar";
    const allRailItems = createAdminRailItems({ ar, t });
    const railItems = role === UserRole.Marketing
        ? createMarketingMenuItems({ ar, t })
        : role === UserRole.Manager
        ? allRailItems.filter((item) =>
            item.href?.includes("waste-log")
            || item.href?.includes("/assets")
            || item.href?.includes("/branches")
            || item.href?.includes("/branch-configurations")
            || item.href?.includes("/customers")
            || item.href?.includes("/delivery-zones")
            || (config.deliveryPartnersEnabled && item.href?.includes("/delivery-partners")))
        : allRailItems;

    return (
        <aside className="hidden h-screen w-14 flex-col items-center border-e border-slate-200 bg-white py-3 shadow-sm md:flex lg:hidden">
            <button
                onClick={onExpand}
                className="mb-4 flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100"
                title="Expand sidebar"
            >
                <Menu className="h-4 w-4" />
            </button>
            <nav className="flex flex-1 flex-col items-center gap-1 overflow-y-auto">
                {railItems.map(({ icon: Icon, label, href }) => {
                    const hrefPath = href.split("?")[0];
                    const isActive = pathname === hrefPath || (hrefPath !== "/ntxadminpos" && pathname.startsWith(hrefPath));
                    return (
                        <Link
                            key={href}
                            href={href}
                            title={label}
                            className={cn(
                                "group relative flex h-10 w-10 items-center justify-center rounded-lg transition-colors",
                                isActive
                                    ? "bg-primary/10 text-primary"
                                    : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                            )}
                        >
                            <Icon className="h-5 w-5" />
                            {/* Tooltip */}
                            <span className="pointer-events-none absolute start-full top-1/2 ms-2 -translate-y-1/2 whitespace-nowrap rounded bg-slate-900 px-2 py-1 text-xs text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 z-50">
                                {label}
                            </span>
                        </Link>
                    );
                })}
            </nav>
        </aside>
    );
}

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { t, locale, setLocale, dir } = useLocale();
    const router = useRouter();
    const pathname = usePathname();
    const { user, isAuthenticated } = useAuthStore();
    const [mounted, setMounted] = useState(false);
    const [mobileNavOpen, setMobileNavOpen] = useState(false);
    const [tabletExpanded, setTabletExpanded] = useState(false);
    const isManagerWasteRoute = user?.role === UserRole.Manager && pathname.includes("/waste-log");
    const isManagerAssetRoute = user?.role === UserRole.Manager && pathname.includes("/assets");
    const isManagerBranchRoute = user?.role === UserRole.Manager && pathname.includes("/branches");
    const isManagerBranchConfigRoute = user?.role === UserRole.Manager && pathname.includes("/branch-configurations");
    const isManagerCustomerRoute = user?.role === UserRole.Manager && pathname.includes("/customers");
    const isManagerDeliveryRoute = user?.role === UserRole.Manager && pathname.includes("/delivery-zones");
    const isManagerPartnerRoute = user?.role === UserRole.Manager && config.deliveryPartnersEnabled && pathname.includes("/delivery-partners");
    const isMarketingRoute = user?.role === UserRole.Marketing && isMarketingAllowedPath(pathname);
    const ar = locale === "ar";
    const displayName = (ar ? user?.fullNameAr : user?.fullName) || user?.fullName || user?.username || t("adminUser");
    const roleLabel = localizedRoleLabel(user?.roleName, t);
    const canAccessCurrentPage = canAccessArea(user?.role, "admin") || isManagerWasteRoute || isManagerAssetRoute || isManagerBranchRoute || isManagerBranchConfigRoute || isManagerCustomerRoute || isManagerDeliveryRoute || isManagerPartnerRoute || isMarketingRoute;
    // Dashboard routes render their own chrome (sticky topbar + filter bar) and
    // need to occupy the full main column — skip the centered max-width and the
    // outer padding so cards span edge-to-edge under the admin sidebar.
    const isDashboardRoute = pathname.startsWith("/ntxadminpos/dashboard") || pathname.startsWith("/admin/dashboard");

    useEffect(() => {
        const frame = requestAnimationFrame(() => setMounted(true));
        return () => cancelAnimationFrame(frame);
    }, []);

    useEffect(() => {
        if (!mounted) return;
        if (!canAccessCurrentPage) {
            router.replace(getUnauthorizedRedirect(isAuthenticated, user?.role));
        }
    }, [canAccessCurrentPage, mounted, isAuthenticated, router, user?.role]);

    useEffect(() => {
        if (mobileNavOpen || tabletExpanded) {
            document.body.classList.add("overlay-open");
        } else {
            document.body.classList.remove("overlay-open");
        }
        return () => document.body.classList.remove("overlay-open");
    }, [mobileNavOpen, tabletExpanded]);

    if (!mounted || !canAccessCurrentPage) {
        return null;
    }

    return (
        <div className="pos-root flex min-h-screen bg-slate-50 font-sans text-slate-900" dir={dir}>
            {/* Desktop Sidebar (≥1024px) */}
            <AdminSidebar />

            {/* Tablet Icon Rail (768-1023px) */}
            <TabletRail onExpand={() => setTabletExpanded(true)} />

            {/* Tablet expanded overlay */}
            <Sheet open={tabletExpanded} onOpenChange={setTabletExpanded}>
                <SheetContent
                    side="start"
                    className="w-64 p-0"
                >
                    <AdminSidebar mobile onNavigate={() => setTabletExpanded(false)} />
                </SheetContent>
            </Sheet>

            {/* Mobile drawer (<768px) */}
            <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
                <SheetContent
                    side="start"
                    className="w-[min(100vw,22rem)] p-0"
                >
                    <AdminSidebar mobile onNavigate={() => setMobileNavOpen(false)} />
                </SheetContent>
            </Sheet>

            {/* Main Content Area */}
            <div className="flex min-h-screen min-w-0 flex-1 flex-col lg:h-screen lg:overflow-hidden">
                {/* Top Header */}
                <header className="z-10 border-b border-slate-200 bg-white px-4 py-3 shadow-sm sm:px-6">
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                            {/* Mobile hamburger */}
                            <Button
                                variant="outline"
                                size="icon"
                                className="md:hidden"
                                onClick={() => setMobileNavOpen(true)}
                            >
                                <Menu className="h-4 w-4" />
                                <span className="sr-only">Open navigation</span>
                            </Button>
                            <div>
                                <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
                                    {t("managementPanel")}
                                </h2>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 sm:gap-3">
                            <BranchSelector />
                            <div className="flex items-center gap-1 rounded-md border border-slate-200 p-1">
                                <button
                                    className={`h-7 rounded px-2 text-xs font-medium ${locale === "en" ? "bg-slate-900 text-white" : "text-slate-600"}`}
                                    onClick={() => setLocale("en")}
                                    type="button"
                                >
                                    EN
                                </button>
                                <button
                                    className={`h-7 rounded px-2 text-xs font-medium ${locale === "ar" ? "bg-slate-900 text-white" : "text-slate-600"}`}
                                    onClick={() => setLocale("ar")}
                                    type="button"
                                >
                                    AR
                                </button>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="hidden flex-col items-end leading-tight sm:flex">
                                    <span className="text-sm font-medium text-slate-700">{displayName}</span>
                                    {roleLabel && <span className="text-xs text-slate-400">{roleLabel}</span>}
                                </div>
                                <div className="h-9 w-9 rounded-full border-2 border-white bg-slate-200 shadow-sm" />
                            </div>
                        </div>
                    </div>
                </header>

                {/* Scrollable Page Content */}
                <main
                    className={cn(
                        "flex-1 overflow-y-auto bg-slate-50/50",
                        isDashboardRoute ? "p-0" : "p-3 sm:p-4 lg:p-6 xl:p-8",
                    )}
                >
                    {isDashboardRoute ? (
                        children
                    ) : (
                        <div className="mx-auto max-w-7xl">{children}</div>
                    )}
                </main>
            </div>
        </div>
    );
}

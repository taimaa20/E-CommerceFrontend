"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
    LogOut,
    ChevronDown,
    ChevronRight,
    BadgePercent,
    BarChart3,
    Building2,
    History,
    MapPinned,
    Trash2,
    Truck,
    Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import { useLocale } from "@/components/locale-provider";
import { useBrandingStore } from "@/store/brandingStore";
import { clearAuthSession } from "@/lib/auth-session";
import { normalizeImageSrc } from "@/lib/normalize-image-src";
import { config } from "@/lib/config";
import { UserRole } from "@/types/auth";
import { isSuperAdminRole } from "@/lib/authorization";
import {
    createAdminMenuItems,
    createMarketingMenuItems,
    createPosMenuItems,
    type AdminMenuItem,
} from "@/components/navigation/admin-menu";

interface AdminSidebarProps {
    mobile?: boolean;
    onNavigate?: () => void;
}

// menuItems are now built dynamically inside the component using translations

export default function AdminSidebar({ mobile = false, onNavigate }: AdminSidebarProps) {
    const pathname = usePathname();
    const router = useRouter();
    const { logout, user } = useAuthStore();
    const { t, locale } = useLocale();
    const { logoUrl, businessName } = useBrandingStore();
    const normalizedLogoUrl = normalizeImageSrc(logoUrl);
    const ar = locale === "ar";

    const handleLogout = () => {
        onNavigate?.();
        clearAuthSession(logout);
        router.push("/login");
    };

    const menuItems = createAdminMenuItems({ ar, t });
    const posMenuItems = createPosMenuItems({ ar, t });
    const assetMenuItems = menuItems.filter((item) =>
        item.href?.includes("/assets") || item.children?.some((child) => child.href?.includes("/assets"))
    );

    const baseMenuItems: AdminMenuItem[] = user?.role === UserRole.Marketing
        ? createMarketingMenuItems({ ar, t })
        : user?.role === UserRole.Manager
        ? [
            { icon: Trash2, label: t("wasteLogPageTitle"), href: "/ntxadminpos/waste-log" },
            { icon: Building2, label: ar ? "الفروع" : "Branches", href: "/ntxadminpos/branches" },
            { icon: Building2, label: ar ? "إعدادات الفروع" : "Branch Configuration", href: "/ntxadminpos/branch-configurations" },
            { icon: MapPinned, label: ar ? "مناطق التوصيل" : "Delivery Zones", href: "/ntxadminpos/delivery-zones" },
            { icon: Users, label: ar ? "إدارة العملاء" : "Customer Management", href: "/ntxadminpos/customers" },
            { icon: BarChart3, label: ar ? "لوحة العملاء" : "Customer Dashboard", href: "/ntxadminpos/customers/dashboard" },
            { icon: BadgePercent, label: ar ? "فئات الخصم" : "Discount Groups", href: "/ntxadminpos/discount-groups" },
            ...(config.deliveryPartnersEnabled
                ? [{ icon: Truck, label: ar ? "شركاء التوصيل" : "Delivery Partners", href: "/ntxadminpos/delivery-partners" }]
                : []),
            ...assetMenuItems,
        ]
        : menuItems;

    // SuperAdmin-only: manual stock/cost adjustment audit trail, nested inside the
    // existing Inventory Management group (only that role sees it).
    const inventoryAuditItem: AdminMenuItem = {
        icon: History,
        label: t("adjustAuditNav"),
        href: "/ntxadminpos/inventory/adjustments",
    };
    const visibleMenuItems: AdminMenuItem[] = isSuperAdminRole(user?.role)
        ? baseMenuItems.map((item) =>
            item.label === t("inventoryManagement") && item.children
                ? { ...item, children: [...item.children, inventoryAuditItem] }
                : item)
        : baseMenuItems;

    const visiblePosMenuItems = user?.role === UserRole.Manager || user?.role === UserRole.Marketing ? [] : posMenuItems;

    const [openMenus, setOpenMenus] = useState<string[]>(() => {
        const activeParent = visibleMenuItems.find(item =>
            item.children?.some(child => pathname === child.href)
        );
        return activeParent ? [activeParent.label] : [visibleMenuItems[0].label];
    });

    const toggleMenu = (label: string) => {
        setOpenMenus(prev =>
            prev.includes(label)
                ? prev.filter(item => item !== label)
                : [...prev, label]
        );
    };

    const isMenuOpen = (label: string) => openMenus.includes(label);

    const renderMenuItem = (item: AdminMenuItem) => {
        if (item.children) {
            const isOpen = isMenuOpen(item.label);
            const hasActiveChild = item.children.some(child => child.href && pathname === child.href.split("?")[0]);

            return (
                <div key={item.label}>
                    <button
                        onClick={() => toggleMenu(item.label)}
                        className={cn(
                            "flex min-h-12 w-full touch-manipulation items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-start text-[0.95rem] font-semibold tracking-tight transition-all duration-200 group",
                            hasActiveChild
                                ? "bg-primary/10 text-primary"
                                : "text-slate-700 hover:text-slate-900 hover:bg-slate-50"
                        )}
                    >
                        <div className="flex min-w-0 flex-1 items-center gap-3">
                            <item.icon className={cn("w-5 h-5 shrink-0", hasActiveChild ? "text-primary" : "text-slate-500 group-hover:text-slate-700")} />
                            <span className="text-start">{item.label}</span>
                        </div>
                        {isOpen ? (
                            <ChevronDown className="w-4 h-4" />
                        ) : (
                            <ChevronRight className="rtl:-scale-x-100 w-4 h-4" />
                        )}
                    </button>

                    {isOpen && (
                        /* Sub-menu: visually distinct from parents — smaller text,
                           lighter weight, smaller icons, indented from start, with
                           a subtle inline-start guide rail for hierarchy. */
                        <div className="ms-3 mt-1 space-y-0.5 border-s border-slate-100 ps-2">
                            {item.children.map(child => {
                                const isActive = child.href ? pathname === child.href.split("?")[0] : false;
                                return (
                                    <Link
                                        key={child.href}
                                        href={child.href!}
                                        target={child.external ? "_blank" : undefined}
                                        onClick={onNavigate}
                                        className={cn(
                                            "relative flex min-h-9 touch-manipulation items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[0.8125rem] font-normal transition-all duration-200 group",
                                            isActive
                                                ? "bg-primary/10 text-primary font-medium"
                                                : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                                        )}
                                    >
                                        <child.icon className={cn("w-3.5 h-3.5 shrink-0", isActive ? "text-primary" : "text-slate-400 group-hover:text-slate-600")} />
                                        <span className="truncate">{child.label}</span>
                                    </Link>
                                );
                            })}
                        </div>
                    )}
                </div>
            );
        }

        const isActive = pathname === item.href;
        return (
            <Link
                key={item.href}
                href={item.href!}
                onClick={onNavigate}
                className={cn(
                    "relative flex min-h-12 touch-manipulation items-center gap-3 rounded-lg px-3 py-2.5 font-medium transition-all duration-200 group",
                    isActive
                        ? "bg-primary/10 text-primary"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                )}
            >
                <item.icon className={cn("w-5 h-5 transition-transform duration-200", isActive ? "text-primary" : "text-slate-400 group-hover:text-slate-600")} />
                <span>{item.label}</span>

                {isActive && (
                    <div className="absolute start-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-e-full" />
                )}
            </Link>
        );
    };

    return (
        <aside
            className={cn(
                "bg-white flex flex-col shadow-sm z-20",
                mobile
                    ? "h-full w-full"
                    : "hidden h-screen border-e border-slate-200 lg:flex lg:w-64"
            )}
        >
            {/* Brand */}
            <div className="flex min-h-16 items-center border-b border-slate-100 px-5 sm:px-6">
                {normalizedLogoUrl ? (
                    <Image
                        src={normalizedLogoUrl}
                        alt={businessName || "logo"}
                        width={32}
                        height={32}
                        unoptimized
                        className="me-3 h-8 w-8 rounded-lg object-contain"
                    />
                ) : (
                    <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center me-3 shadow-md shadow-primary/20">
                        <span className="font-bold text-lg text-primary-foreground">R</span>
                    </div>
                )}
                <span className="font-bold text-xl tracking-tight text-slate-800">
                    {businessName || "Retail POS"}
                </span>
            </div>

            {/* Navigation */}
            <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-6">
                {visibleMenuItems.map(renderMenuItem)}

                {visiblePosMenuItems.length > 0 && <div className="my-6 mx-3 border-t border-slate-100" />}

                {visiblePosMenuItems.map(renderMenuItem)}
            </nav>

            {/* Footer / User Profile */}
            <div className="p-4 border-t border-slate-100">
                <button
                    onClick={handleLogout}
                    className="flex min-h-12 w-full touch-manipulation items-center gap-3 rounded-lg p-2 text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
                >
                    <LogOut className="w-5 h-5 text-slate-400" />
                    <span className="font-medium">{t("signOut")}</span>
                </button>
                <p className="text-xs text-center text-slate-400 mt-4 font-mono">v1.0.0 Admin Panel</p>
            </div>
        </aside>
    );
}

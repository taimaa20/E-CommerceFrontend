"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { useLocale } from "@/components/locale-provider";
import { useBrandingStore } from "@/store/brandingStore";
import { Button } from "@/components/ui/button";
import { normalizeImageSrc } from "@/lib/normalize-image-src";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { LogOut, LayoutDashboard, Monitor, Users, MoreVertical, Menu, X, Globe } from "lucide-react";
import { NotificationBell } from "@/components/notification-bell";
import { OfflineIndicator } from "@/components/layout/OfflineIndicator";
import BranchSelector from "@/components/admin/BranchSelector";
import { QrMenuButton } from "@/components/qrmenu/QrMenuButton";
import { canAccessArea } from "@/lib/authorization";
import { clearAuthSession } from "@/lib/auth-session";

export default function AppHeader() {
    const router = useRouter();
    const { logout, user } = useAuthStore();
    const { t, locale, setLocale } = useLocale();
    const { logoUrl, businessName } = useBrandingStore();
    const [mounted, setMounted] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const normalizedLogoUrl = normalizeImageSrc(logoUrl);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (mobileMenuOpen) {
            document.body.classList.add("overlay-open");
        } else {
            document.body.classList.remove("overlay-open");
        }
        return () => document.body.classList.remove("overlay-open");
    }, [mobileMenuOpen]);

    const handleLogout = () => {
        setMobileMenuOpen(false);
        clearAuthSession(logout);
        router.push("/login");
    };

    if (!mounted) return null;

    /* ── Language toggle (reused in both desktop & mobile) ── */
    const LangToggle = ({ className = "" }: { className?: string }) => (
        <div className={`flex shrink-0 items-center gap-1 rounded-md border border-slate-200 p-1 ${className}`}>
            <Button
                variant={locale === "en" ? "default" : "ghost"}
                size="sm"
                className="h-7 min-w-[2.5rem] px-2 text-xs font-semibold"
                onClick={() => setLocale("en")}
            >
                EN
            </Button>
            <Button
                variant={locale === "ar" ? "default" : "ghost"}
                size="sm"
                className="h-7 min-w-[2.5rem] px-2 text-xs font-semibold"
                onClick={() => setLocale("ar")}
            >
                AR
            </Button>
        </div>
    );

    return (
        <>
        <header className="sticky top-0 z-50 w-full border-b border-slate-200/70 bg-white/90 backdrop-blur-xl">
            {/* Single row — never wraps */}
            <div className="app-navbar mx-auto flex h-13 w-full max-w-[1800px] items-center justify-between gap-4 sm:h-14 sm:gap-6">

                {/* ── LEFT: Logo + Name ── */}
                <div className="flex min-w-0 shrink-0 items-center gap-2">
                    {/* Mobile hamburger — only on xs/sm */}
                    <button
                        className="me-1 flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 md:hidden"
                        onClick={() => setMobileMenuOpen(true)}
                        aria-label="Open menu"
                    >
                        <Menu className="h-4 w-4" />
                    </button>

                    {normalizedLogoUrl ? (
                        <Image
                            src={normalizedLogoUrl}
                            alt={businessName || "logo"}
                            width={32}
                            height={32}
                            unoptimized
                            className="h-8 w-8 shrink-0 rounded object-contain p-0.5"
                        />
                    ) : (
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-primary shadow-sm">
                            <span className="text-xs font-bold text-primary-foreground">R</span>
                        </div>
                    )}
                    <span className="hidden truncate font-bold tracking-tight text-slate-800 sm:inline-block">
                        {businessName || "Retail POS"}
                    </span>
                </div>

                {/* ── RIGHT: Actions ── */}
                <div className="flex items-center gap-2 sm:gap-3 lg:gap-4">
                    {/* Branch selector — renders only for multi-branch users.
                        Switching resets the POS store and bumps branchVersion so
                        every POS screen refetches for the newly-active branch. */}
                    <div className="hidden md:block">
                        <BranchSelector />
                    </div>

                    {/* Lang toggle — always visible */}
                    <LangToggle />

                    {/* Desktop-only navigation buttons */}
                    {user && canAccessArea(user.role, "admin") && (
                        <Button
                            variant="outline"
                            size="sm"
                            className="hidden gap-2 border-slate-200 text-slate-600 hover:bg-slate-50 md:flex"
                            onClick={() => router.push("/ntxadminpos")}
                        >
                            <LayoutDashboard className="h-3 w-3" />
                            <span className="hidden text-xs font-semibold lg:inline">{t("adminPanel")}</span>
                        </Button>
                    )}

                    {/* Public website — new tab, no POS coupling */}
                    <Button
                        variant="outline"
                        size="sm"
                        className="hidden gap-2 border-slate-200 text-slate-600 hover:bg-slate-50 md:flex"
                        onClick={() => window.open("/shop", "_blank")}
                    >
                        <Globe className="h-3 w-3" />
                        <span className="hidden text-xs font-semibold lg:inline">
                            {locale === "ar" ? "المتجر الإلكتروني" : "Online Store"}
                        </span>
                    </Button>

                    {user && canAccessArea(user.role, "display") && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="hidden gap-2 border-slate-200 text-slate-600 hover:bg-slate-50 md:flex"
                                >
                                    <Monitor className="h-3 w-3" />
                                    <span className="hidden text-xs font-semibold lg:inline">
                                        {locale === "ar" ? "شاشة العرض" : "Display"}
                                    </span>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => window.open("/display", "_blank")}>
                                    <Monitor className="me-2 h-3 w-3" />
                                    {locale === "ar" ? "عرض الموظفين" : "Staff Display"}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => window.open("/display?mode=customer", "_blank")}>
                                    <Users className="me-2 h-3 w-3" />
                                    {locale === "ar" ? "عرض العملاء" : "Customer Display"}
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}

                    {/* Active role — desktop/tablet only */}
                    {user && (
                        <div className="hidden text-xs font-medium text-slate-500 lg:block">
                            {t("activeRole")}{" "}
                            <span className="ms-1 rounded-full bg-primary/10 px-2 py-0.5 text-primary">
                                {user.roleName}
                            </span>
                        </div>
                    )}

                    {/* Offline / sync indicator — visible only when it matters */}
                    <OfflineIndicator />

                    {/* Notification bell — always visible */}
                    <NotificationBell />

                    {/* QR Menu — hidden on xs */}
                    <div className="hidden sm:block">
                        <QrMenuButton
                            variant="outline"
                            size="sm"
                            showLabel={false}
                            className="border-slate-200 hover:bg-slate-50"
                        />
                    </div>

                    {/* Sign out — tablet+ only (mobile uses sheet) */}
                    <Button
                        variant="ghost"
                        size="sm"
                        className="hidden gap-2 text-destructive hover:bg-destructive/5 hover:text-destructive/80 md:flex"
                        onClick={handleLogout}
                    >
                        <LogOut className="h-3 w-3" />
                        <span className="hidden text-xs font-semibold sm:inline">{t("signOut")}</span>
                    </Button>
                </div>
            </div>
        </header>

        {/* ── Mobile slide-in drawer ── */}
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetContent
                side="start"
                className="w-[min(100vw,22rem)] p-0"
            >
                <SheetHeader className="border-b border-slate-100 px-5 py-4">
                    <div className="flex items-center justify-between">
                        <SheetTitle className="flex items-center gap-2 text-base font-bold text-slate-800">
                            {normalizedLogoUrl ? (
                                <Image src={normalizedLogoUrl} alt="" width={24} height={24} unoptimized className="h-6 w-6 rounded object-contain" />
                            ) : (
                                <div className="flex h-6 w-6 items-center justify-center rounded bg-primary">
                                    <span className="text-xs font-bold text-primary-foreground">R</span>
                                </div>
                            )}
                            {businessName || "Retail POS"}
                        </SheetTitle>
                    </div>
                </SheetHeader>
                <nav className="flex flex-col gap-1 overflow-y-auto p-4">
                    {user && canAccessArea(user.role, "admin") && (
                        <button
                            className="flex min-h-[44px] w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
                            onClick={() => { setMobileMenuOpen(false); router.push("/ntxadminpos"); }}
                        >
                            <LayoutDashboard className="h-4 w-4 text-slate-500" />
                            {t("adminPanel")}
                        </button>
                    )}
                    <button
                        className="flex min-h-[44px] w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
                        onClick={() => { setMobileMenuOpen(false); window.open("/shop", "_blank"); }}
                    >
                        <Globe className="h-4 w-4 text-slate-500" />
                        {locale === "ar" ? "المتجر الإلكتروني" : "Online Store"}
                    </button>
                    {user && canAccessArea(user.role, "display") && (
                        <>
                            <button
                                className="flex min-h-[44px] w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
                                onClick={() => { setMobileMenuOpen(false); window.open("/display", "_blank"); }}
                            >
                                <Monitor className="h-4 w-4 text-slate-500" />
                                {locale === "ar" ? "عرض الموظفين" : "Staff Display"}
                            </button>
                            <button
                                className="flex min-h-[44px] w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
                                onClick={() => { setMobileMenuOpen(false); window.open("/display?mode=customer", "_blank"); }}
                            >
                                <Users className="h-4 w-4 text-slate-500" />
                                {locale === "ar" ? "عرض العملاء" : "Customer Display"}
                            </button>
                        </>
                    )}
                    <div className="my-1 border-t border-slate-100" />
                    {/* Branch selector — multi-branch users only (self-hides otherwise) */}
                    <div className="px-3 py-2">
                        <BranchSelector />
                    </div>
                    <div className="flex items-center gap-3 px-3 py-2">
                        <span className="text-sm text-slate-500">{t("activeRole")}</span>
                        {user && (
                            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                                {user.roleName}
                            </span>
                        )}
                    </div>
                    <div className="px-3 py-2">
                        <LangToggle className="w-full justify-center" />
                    </div>
                    <div className="my-1 border-t border-slate-100" />
                    <button
                        className="flex min-h-[44px] w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/5"
                        onClick={handleLogout}
                    >
                        <LogOut className="h-4 w-4" />
                        {t("signOut")}
                    </button>
                </nav>
            </SheetContent>
        </Sheet>
        </>
    );
}

"use client"

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { useBrandingStore } from "@/store/brandingStore";
import { login } from "@/lib/api";
import { normalizeImageSrc } from "@/lib/normalize-image-src";
import { warmOfflineCache } from "@/lib/offline/preload";
import { getDefaultRouteForRole } from "@/lib/authorization";
import { toast } from "sonner";
import { useLocale } from "@/components/locale-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Store } from "lucide-react";

export default function LoginPage() {
    const { t, locale, setLocale } = useLocale();
    // Branding is public (BrandingProvider loads it before auth), so the sign-in card can
    // name the business. Absent branding simply renders nothing extra.
    const businessName = useBrandingStore((state) => state.businessName);
    // The same configured logo the rest of the app uses — normalised like every other
    // stored image, because a row written against a dev backend carries that host.
    const logoUrl = normalizeImageSrc(useBrandingStore((state) => state.logoUrl));
    const [logoFailed, setLogoFailed] = useState(false);
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const router = useRouter();
    const { login: setAuthUser } = useAuthStore();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const data = await login(username, password);

            // 1. Save to Store
            setAuthUser({
                id: data.userId,
                tenantId: data.tenantId,
                username: data.username,
                fullName: data.fullName ?? null,
                fullNameAr: data.fullNameAr ?? null,
                role: data.role,
                roleName: data.roleName,
                token: data.token,
                canApplyDiscount: data.canApplyDiscount
            });

            // 2. Set Cookie for Middleware (simple duration)
            // Ideally use a more secure way, but for this demo standard document.cookie
            document.cookie = `auth_role=${data.role}; path=/; max-age=86400;`;
            document.cookie = `auth_token=${data.token}; path=/; max-age=86400;`;
            if (data.tenantId) localStorage.setItem("tenantId", data.tenantId);

            toast.success(`${t("welcomeMsg")}, ${data.username}`);

            // 3. Warm the offline cache so the next page open (cashier, takeaway,
            //    kitchen) has menu + tables + offers available even if the link
            //    drops mid-shift. Fire-and-forget; login flow is never blocked.
            void warmOfflineCache();

            // 4. Redirect based on Role
            router.push(getDefaultRouteForRole(data.role));

        } catch {
            toast.error(t("loginFailed"));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex h-screen w-full items-center justify-center bg-slate-50 dark:bg-zinc-950 px-4">
            <Card className="w-full max-w-sm shadow-2xl border-none">
                <CardHeader className="space-y-1 text-center">
                    <div className="flex justify-end">
                        <div className="flex items-center gap-1 rounded-md border border-slate-200 p-1">
                            <Button
                                variant={locale === "en" ? "default" : "ghost"}
                                size="sm"
                                className="h-7 px-2 text-xs"
                                type="button"
                                onClick={() => setLocale("en")}
                            >
                                EN
                            </Button>
                            <Button
                                variant={locale === "ar" ? "default" : "ghost"}
                                size="sm"
                                className="h-7 px-2 text-xs"
                                type="button"
                                onClick={() => setLocale("ar")}
                            >
                                AR
                            </Button>
                        </div>
                    </div>
                    <div className="flex justify-center mb-4">
                        {logoUrl && !logoFailed ? (
                            // Plain <img>: the box is sized by the logo's own aspect ratio, and
                            // a wordmark must never be cropped to a circle.
                            <img
                                src={logoUrl}
                                alt={businessName ?? ""}
                                onError={() => setLogoFailed(true)}
                                className="h-16 max-w-[70%] object-contain"
                            />
                        ) : (
                            <div className="p-3 bg-primary/10 rounded-full">
                                <Store className="h-10 w-10 text-primary" />
                            </div>
                        )}
                    </div>
                    {businessName ? (
                        <p className="text-sm font-semibold tracking-wide text-primary">{businessName}</p>
                    ) : null}
                    <CardTitle className="text-2xl font-bold">{t("signIn")}</CardTitle>
                    <CardDescription>
                        {t("restaurantManagementSystem")}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="username">{t("username")}</Label>
                            <Input
                                id="username"
                                placeholder="e.g. admin"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">{t("password")}</Label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="******"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                        <Button className="w-full" type="submit" disabled={isLoading}>
                            {isLoading ? t("signingIn") : t("signIn")}
                        </Button>

                  
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}

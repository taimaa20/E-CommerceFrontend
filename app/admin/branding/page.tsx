"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { useBrandingStore } from "@/store/brandingStore";
import { useLocale } from "@/components/locale-provider";
import { extractDominantColor, generateBrandPalette } from "@/lib/colorExtract";
import { getTenantBranding, saveTenantBranding } from "@/lib/api";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Upload, Wand2, Save, RefreshCw, Palette } from "lucide-react";
import { canAccessArea, getUnauthorizedRedirect } from "@/lib/authorization";

export default function BrandingPage() {
    const router = useRouter();
    const { user, isAuthenticated } = useAuthStore();
    const { setBranding, applyTheme } = useBrandingStore();
    const { t } = useLocale();

    const [mounted, setMounted] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isExtracting, setIsExtracting] = useState(false);

    // Local editable state (not committed until Save)
    const [logoUrl, setLogoUrl] = useState<string | null>(null);
    const [businessName, setBusinessName] = useState("");
    const [primaryColor, setPrimaryColor] = useState("#f97316");
    const [primaryForeground, setPrimaryForeground] = useState("#ffffff");
    const [accentColor, setAccentColor] = useState("#ea6b0f");

    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => { setMounted(true); }, []);

    useEffect(() => {
        if (!mounted) return;
        if (!canAccessArea(user?.role, "admin")) {
            router.push(getUnauthorizedRedirect(isAuthenticated, user?.role));
            return;
        }
        // Load current branding from server
        getTenantBranding().then((data) => {
            if (!data) return;
            if (data.logoUrl) setLogoUrl(data.logoUrl);
            if (data.businessName) setBusinessName(data.businessName);
            if (data.primaryColor) setPrimaryColor(data.primaryColor);
            if (data.primaryForeground) setPrimaryForeground(data.primaryForeground);
            if (data.accentColor) setAccentColor(data.accentColor);
        });
    }, [mounted, isAuthenticated, user?.role, router]);

    // Live preview — apply colors to :root as user changes them
    useEffect(() => {
        if (!mounted) return;
        const root = document.documentElement;
        root.style.setProperty('--primary', primaryColor);
        root.style.setProperty('--primary-foreground', primaryForeground);
        root.style.setProperty('--chart-1', accentColor);
        root.style.setProperty('--sidebar-primary', primaryColor);
        root.style.setProperty('--sidebar-primary-foreground', primaryForeground);
    }, [primaryColor, primaryForeground, accentColor, mounted]);

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            toast.error(t("brandingLogoMustBeSmall"));
            return;
        }

        // Read as base64 for immediate preview
        const reader = new FileReader();
        reader.onload = (ev) => {
            const dataUrl = ev.target?.result as string;
            setLogoUrl(dataUrl);
        };
        reader.readAsDataURL(file);

        // Also upload to server via existing upload endpoint
        try {
            const formData = new FormData();
            formData.append("file", file);
            const { api } = await import("@/lib/api");
            const res = await api.post("/uploads/image", formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            if (res.data?.url) setLogoUrl(res.data.url);
        } catch {
            // Keep base64 preview even if upload fails
            toast.warning(t("brandingUploadWarning"));
        }
    };

    const handleAutoExtract = async () => {
        if (!logoUrl) {
            toast.error(t("brandingUploadLogoFirst"));
            return;
        }
        setIsExtracting(true);
        try {
            const dominant = await extractDominantColor(logoUrl);
            const palette = generateBrandPalette(dominant);
            setPrimaryColor(palette.primary);
            setPrimaryForeground(palette.primaryForeground);
            setAccentColor(palette.accent);
            toast.success(t("brandingColorsExtracted"));
        } catch {
            toast.error(t("brandingColorsExtractionFailed"));
        } finally {
            setIsExtracting(false);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const brandingPayload = {
                logoUrl,
                businessName: businessName || null,
                primaryColor,
                primaryForeground,
                accentColor,
                updatedAt: null,
            };

            const success = await saveTenantBranding(brandingPayload);

            // Commit to Zustand store (localStorage) regardless of API result,
            // so branding is always applied locally even without a backend tenant.
            setBranding({
                logoUrl,
                businessName: businessName || null,
                primaryColor,
                primaryForeground,
                accentColor,
                updatedAt: new Date().toISOString(),
            });
            applyTheme();

            if (success) {
                toast.success(t("brandingSavedSuccess"));
            } else {
                toast.success(t("brandingAppliedLocal"));
            }
        } finally {
            setIsSaving(false);
        }
    };

    const handleReset = () => {
        setPrimaryColor("#f97316");
        setPrimaryForeground("#ffffff");
        setAccentColor("#ea6b0f");
    };

    if (!mounted) return null;

    return (
        <div className="p-6 space-y-6 max-w-4xl mx-auto w-full bg-slate-50 dark:bg-zinc-950 min-h-screen">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                        {t("brandingPageTitle")}
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">
                        {t("brandingPageSubtitle")}
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* ── Logo & Business Name ── */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Upload className="w-4 h-4" /> {t("brandingLogoBusinessName")}
                            </CardTitle>
                            <CardDescription>
                                {t("brandingLogoDesc")}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Logo preview */}
                            <div
                                className="flex items-center justify-center w-full h-32 border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:border-primary transition-colors bg-white"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                {logoUrl ? (
                                    <img
                                        src={logoUrl}
                                        alt="logo preview"
                                        className="max-h-24 max-w-full object-contain rounded"
                                    />
                                ) : (
                                    <div className="text-center text-slate-400">
                                        <Upload className="w-8 h-8 mx-auto mb-2" />
                                        <p className="text-sm">{t("brandingClickUpload")}</p>
                                        <p className="text-xs">{t("brandingFileTypes")}</p>
                                    </div>
                                )}
                            </div>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleLogoUpload}
                            />
                            {logoUrl && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full"
                                    onClick={() => setLogoUrl(null)}
                                >
                                    {t("brandingRemoveLogo")}
                                </Button>
                            )}

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700 text-start block">{t("brandingBusinessNameLabel")}</label>
                                <Input
                                    placeholder={t("brandingBusinessNamePlaceholder")}
                                    value={businessName}
                                    onChange={(e) => setBusinessName(e.target.value)}
                                />
                                <p className="text-xs text-slate-400 text-start">
                                    {t("brandingBusinessNameHint")}
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* ── Colors ── */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Palette className="w-4 h-4" /> {t("brandingBrandColors")}
                            </CardTitle>
                            <CardDescription>
                                {t("brandingColorsDesc")}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <Button
                                variant="outline"
                                className="w-full gap-2"
                                onClick={handleAutoExtract}
                                disabled={isExtracting || !logoUrl}
                            >
                                <Wand2 className="w-4 h-4" />
                                {isExtracting ? t("brandingExtractingBtn") : t("brandingAutoExtractBtn")}
                            </Button>

                            <div className="space-y-3">
                                <ColorRow
                                    label={t("brandingPrimaryColor")}
                                    hint={t("brandingPrimaryColorHint")}
                                    value={primaryColor}
                                    onChange={setPrimaryColor}
                                />
                                <ColorRow
                                    label={t("brandingTextOnPrimary")}
                                    hint={t("brandingTextOnPrimaryHint")}
                                    value={primaryForeground}
                                    onChange={setPrimaryForeground}
                                />
                                <ColorRow
                                    label={t("brandingAccentColor")}
                                    hint={t("brandingAccentColorHint")}
                                    value={accentColor}
                                    onChange={setAccentColor}
                                />
                            </div>

                            <Button
                                variant="ghost"
                                size="sm"
                                className="gap-2 text-slate-500"
                                onClick={handleReset}
                            >
                                <RefreshCw className="w-3 h-3" /> {t("brandingResetBtn")}
                            </Button>
                        </CardContent>
                    </Card>
                </div>

                {/* ── Live Preview ── */}
                <Card>
                    <CardHeader>
                        <CardTitle>{t("brandingLivePreview")}</CardTitle>
                        <CardDescription>{t("brandingLivePreviewDesc")}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-4 p-4 bg-white border border-slate-200 rounded-xl">
                            {/* Mini header preview */}
                            <div className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg">
                                {logoUrl ? (
                                    <img src={logoUrl} alt="logo" className="w-5 h-5 object-contain rounded" />
                                ) : (
                                    <div
                                        className="w-5 h-5 rounded flex items-center justify-center text-xs font-bold"
                                        style={{ backgroundColor: primaryColor, color: primaryForeground }}
                                    >
                                        R
                                    </div>
                                )}
                                <span className="text-sm font-bold text-slate-800">{businessName || "Retail POS"}</span>
                            </div>

                            {/* Sample button */}
                            <button
                                className="px-4 py-2 rounded-lg text-sm font-semibold"
                                style={{ backgroundColor: primaryColor, color: primaryForeground }}
                            >
                                {t("brandingPrimaryBtn")}
                            </button>

                            {/* Sample badge */}
                            <Badge
                                style={{ backgroundColor: primaryColor, color: primaryForeground }}
                            >
                                {t("brandingActiveRole")}
                            </Badge>

                            {/* Accent swatch */}
                            <div className="flex items-center gap-2">
                                <div
                                    className="w-6 h-6 rounded-full border border-slate-200"
                                    style={{ backgroundColor: accentColor }}
                                    title="Accent"
                                />
                                <span className="text-xs text-slate-500">{t("brandingAccent")}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* ── Save Button ── */}
                <div className="flex justify-end gap-3">
                    <Button variant="outline" onClick={() => router.push("/ntxadminpos")}>
                        {t("brandingCancelBtn")}
                    </Button>
                    <Button
                        className="gap-2"
                        onClick={handleSave}
                        disabled={isSaving}
                    >
                        <Save className="w-4 h-4" />
                        {isSaving ? t("brandingSavingBtn") : t("brandingSaveBtn")}
                    </Button>
                </div>
        </div>
    );
}

// ─── Helper component ────────────────────────────────────────────────────────

function ColorRow({
    label,
    hint,
    value,
    onChange,
}: {
    label: string;
    hint: string;
    value: string;
    onChange: (v: string) => void;
}) {
    return (
        <div className="flex items-center justify-between gap-3">
            <div className="flex-1">
                <p className="text-sm font-medium text-slate-700 text-start">{label}</p>
                <p className="text-xs text-slate-400 text-start">{hint}</p>
            </div>
            <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-slate-500 w-20">{value}</span>
                <input
                    type="color"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-9 h-9 rounded-lg cursor-pointer border border-slate-200 p-0.5 bg-white"
                />
            </div>
        </div>
    );
}

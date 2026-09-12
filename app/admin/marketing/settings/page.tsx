"use client";

import { useEffect, useState } from "react";
import { RefreshCw, Save, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLocale } from "@/components/locale-provider";
import {
    PointsExpirationMode,
    marketingSettingsApi,
    type MarketingSettings,
} from "@/lib/api-marketing";

export default function MarketingSettingsPage() {
    const { isRtl } = useLocale();
    const t = (en: string, ar: string) => (isRtl ? ar : en);

    const [settings, setSettings] = useState<MarketingSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [saving, setSaving] = useState(false);
    const [seeding, setSeeding] = useState(false);
    const [reloadKey, setReloadKey] = useState(0);

    useEffect(() => {
        let cancelled = false;
        void (async () => {
            setLoading(true);
            setError(false);
            try {
                const data = await marketingSettingsApi.get();
                if (!cancelled) setSettings(data);
            } catch {
                if (!cancelled) setError(true);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [reloadKey]);

    const patch = <K extends keyof MarketingSettings>(key: K, value: MarketingSettings[K]) =>
        setSettings((s) => (s ? { ...s, [key]: value } : s));

    const save = async () => {
        if (!settings) return;
        setSaving(true);
        try {
            const updated = await marketingSettingsApi.update(settings);
            setSettings(updated);
            toast.success(t("Settings saved", "تم حفظ الإعدادات"));
        } catch (e) {
            toast.error(e instanceof Error ? e.message : t("Failed to save", "فشل الحفظ"));
        } finally {
            setSaving(false);
        }
    };

    const seed = async () => {
        setSeeding(true);
        try {
            const result = await marketingSettingsApi.seedDefaults();
            toast.success(result.message);
            setReloadKey((k) => k + 1);
        } catch (e) {
            toast.error(e instanceof Error ? e.message : t("Failed to seed defaults", "فشل تهيئة الإعدادات"));
        } finally {
            setSeeding(false);
        }
    };

    if (loading) {
        return <div className="py-20 text-center text-muted-foreground">{t("Loading…", "جارٍ التحميل…")}</div>;
    }

    if (error || !settings) {
        return (
            <div className="py-20 text-center">
                <p className="mb-4 text-muted-foreground">{t("Failed to load settings.", "تعذّر تحميل الإعدادات.")}</p>
                <Button variant="outline" onClick={() => setReloadKey((k) => k + 1)}>
                    <RefreshCw className="me-2 h-4 w-4" />
                    {t("Retry", "إعادة المحاولة")}
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">{t("Loyalty Settings", "إعدادات الولاء")}</h1>
                    <p className="text-sm text-muted-foreground">
                        {t("Configure loyalty program behaviour for this tenant.", "اضبط سلوك برنامج الولاء لهذا المتجر.")}
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={seed} disabled={seeding}>
                        <Sparkles className="me-2 h-4 w-4" />
                        {seeding ? t("Seeding…", "جارٍ التهيئة…") : t("Seed defaults", "تهيئة افتراضية")}
                    </Button>
                    <Button onClick={save} disabled={saving}>
                        <Save className="me-2 h-4 w-4" />
                        {saving ? t("Saving…", "جارٍ الحفظ…") : t("Save", "حفظ")}
                    </Button>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>{t("Feature toggles", "تفعيل الميزات")}</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2">
                    <ToggleRow
                        label={t("Loyalty program", "برنامج الولاء")}
                        checked={settings.loyaltyEnabled}
                        onChange={(v) => patch("loyaltyEnabled", v)}
                    />
                    <ToggleRow
                        label={t("Use rules engine (delegation)", "استخدام محرك القواعد")}
                        hint={t("When on, earning is computed by the new engine.", "عند التفعيل، يحتسب الكسب عبر المحرك الجديد.")}
                        checked={settings.earnDelegationEnabled}
                        onChange={(v) => patch("earnDelegationEnabled", v)}
                    />
                    <ToggleRow
                        label={t("Rewards", "المكافآت")}
                        checked={settings.rewardsEnabled}
                        onChange={(v) => patch("rewardsEnabled", v)}
                    />
                    <ToggleRow
                        label={t("Promotions", "العروض")}
                        checked={settings.promosEnabled}
                        onChange={(v) => patch("promosEnabled", v)}
                    />
                    <ToggleRow
                        label={t("Vouchers", "القسائم")}
                        checked={settings.vouchersEnabled}
                        onChange={(v) => patch("vouchersEnabled", v)}
                    />
                    <ToggleRow
                        label={t("Referrals", "الإحالات")}
                        checked={settings.referralsEnabled}
                        onChange={(v) => patch("referralsEnabled", v)}
                    />
                    <ToggleRow
                        label={t("Tier demotion", "تنزيل المستوى")}
                        hint={t("Allow the recalculation job to lower tiers. Off = tiers only promote.", "السماح لمهمة إعادة الحساب بتنزيل المستويات. الإيقاف = ترقية فقط.")}
                        checked={settings.tierDemotionEnabled}
                        onChange={(v) => patch("tierDemotionEnabled", v)}
                    />
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>{t("Points & redemption", "النقاط والاستبدال")}</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2">
                    <Field label={t("Base currency", "العملة الأساسية")}>
                        <Input
                            value={settings.baseCurrencyCode}
                            maxLength={3}
                            onChange={(e) => patch("baseCurrencyCode", e.target.value.toUpperCase())}
                        />
                    </Field>
                    <Field label={t("Default point value", "قيمة النقطة الافتراضية")}>
                        <Input
                            type="number"
                            step="0.01"
                            min={0}
                            value={settings.defaultPointValue}
                            onChange={(e) => patch("defaultPointValue", Number(e.target.value))}
                        />
                    </Field>
                    <Field label={t("Minimum redeem points", "الحد الأدنى للاستبدال")}>
                        <Input
                            type="number"
                            min={0}
                            value={settings.minRedeemPoints ?? ""}
                            onChange={(e) => patch("minRedeemPoints", e.target.value === "" ? null : Number(e.target.value))}
                        />
                    </Field>
                    <Field label={t("Maximum redeem points", "الحد الأقصى للاستبدال")}>
                        <Input
                            type="number"
                            min={0}
                            value={settings.maxRedeemPoints ?? ""}
                            onChange={(e) => patch("maxRedeemPoints", e.target.value === "" ? null : Number(e.target.value))}
                        />
                    </Field>
                    <Field label={t("Max stacked discount", "الحد الأقصى للخصم المتراكم")}>
                        <Input
                            type="number"
                            min={0}
                            value={settings.maxStackedDiscount ?? ""}
                            onChange={(e) => patch("maxStackedDiscount", e.target.value === "" ? null : Number(e.target.value))}
                        />
                    </Field>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>{t("Expiration", "انتهاء الصلاحية")}</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2">
                    <Field label={t("Default expiration mode", "نمط الانتهاء الافتراضي")}>
                        <Select
                            value={String(settings.defaultExpirationMode)}
                            onValueChange={(v) => patch("defaultExpirationMode", Number(v) as PointsExpirationMode)}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={String(PointsExpirationMode.Never)}>{t("Never", "أبدًا")}</SelectItem>
                                <SelectItem value={String(PointsExpirationMode.Days)}>{t("Days", "أيام")}</SelectItem>
                                <SelectItem value={String(PointsExpirationMode.Months)}>{t("Months", "أشهر")}</SelectItem>
                                <SelectItem value={String(PointsExpirationMode.Years)}>{t("Years", "سنوات")}</SelectItem>
                            </SelectContent>
                        </Select>
                    </Field>
                    {settings.defaultExpirationMode !== PointsExpirationMode.Never && (
                        <Field label={t("Expiration value", "قيمة الانتهاء")}>
                            <Input
                                type="number"
                                min={1}
                                value={settings.defaultExpirationValue ?? ""}
                                onChange={(e) =>
                                    patch("defaultExpirationValue", e.target.value === "" ? null : Number(e.target.value))
                                }
                            />
                        </Field>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

function ToggleRow({
    label,
    hint,
    checked,
    onChange,
}: {
    label: string;
    hint?: string;
    checked: boolean;
    onChange: (v: boolean) => void;
}) {
    return (
        <div className="flex items-start justify-between gap-3 rounded-lg border p-3">
            <div>
                <p className="text-sm font-medium">{label}</p>
                {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
            </div>
            <Switch checked={checked} onCheckedChange={onChange} />
        </div>
    );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="space-y-1.5">
            <Label>{label}</Label>
            {children}
        </div>
    );
}

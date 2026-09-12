"use client";

import React, { useEffect, useState } from "react";
import { Hash, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useLocale } from "@/components/locale-provider";
import { useOrderNumberingStore } from "@/store/orderNumberingStore";
import {
    OrderNumberResetStrategy,
    OrderNumberSequenceScope,
} from "@/lib/api-order-numbering";
import { getRestaurantToday } from "@/lib/date-time";
import { useSettingsStore } from "@/store/settingsStore";

// Mirrors OrderDisplayNumberService.Format / ResolveChannelCode so the user
// sees the result of toggling flags without a round-trip. Backend remains the
// source of truth on save.

// Channels rendered in the preview when Scope=PerOrderType. Order matches the
// channel codes in OrderDisplayNumberService. `partnerCode` is appended when
// the channel is PT (Partner) and a value is supplied — examples show "TLBT".
// `offline=true` prepends "OFF-" to mirror the backend behavior for synced
// offline orders.
type PreviewChannel = {
    code: string;
    labelEn: string;
    labelAr: string;
    partnerCode?: string;
    offline?: boolean;
};

const PREVIEW_CHANNELS: PreviewChannel[] = [
    { code: "TA", labelEn: "Takeaway",         labelAr: "وجبات خارجية" },
    { code: "DI", labelEn: "In-Store",         labelAr: "داخل المتجر" },
    { code: "PT", labelEn: "Partner (Talabat)", labelAr: "شريك توصيل (طلبات)", partnerCode: "TLBT" },
    { code: "DL", labelEn: "Delivery",         labelAr: "توصيل" },
    { code: "QR", labelEn: "QR Mobile",        labelAr: "QR" },
    { code: "TA", labelEn: "Offline (synced)", labelAr: "غير متصل (مُزامن)", offline: true },
];

function buildExample(
    state: {
        scope: OrderNumberSequenceScope;
        prefix: string;
        includeDate: boolean;
        includeMonth: boolean;
        includeYear: boolean;
        includeShiftNumber: boolean;
        includeBranchCode: boolean;
        branchCode: string;
    },
    channelCode: string,
    timeZone: string,
    partnerCode?: string,
    offline?: boolean,
): string {
    const [yyyy, mm, dd] = getRestaurantToday(timeZone).split("-");

    const parts: string[] = [];
    if (offline) parts.push("OFF");
    if (state.includeBranchCode && state.branchCode.trim()) parts.push(state.branchCode.trim());

    const leading = state.scope === OrderNumberSequenceScope.Global
        ? (state.prefix.trim() || "ORD")
        : (state.prefix.trim() || channelCode);
    parts.push(leading);

    if (channelCode === "PT" && partnerCode) parts.push(partnerCode);

    if (state.includeDate) parts.push(`${yyyy}${mm}${dd}`);
    else if (state.includeYear && state.includeMonth) parts.push(`${yyyy}${mm}`);
    else if (state.includeYear) parts.push(yyyy);
    else if (state.includeMonth) parts.push(mm);

    if (state.includeShiftNumber) parts.push("S001");
    parts.push("1");
    return parts.join("-");
}

export function OrderNumberingForm() {
    const { locale, t } = useLocale();
    const isAr = locale === "ar";
    const { config, isLoaded, isLoading, isSaving, fetch, save } = useOrderNumberingStore();
    const timeZone = useSettingsStore((state) => state.settings.timeZoneId);

    const [resetStrategy, setResetStrategy] = useState<OrderNumberResetStrategy>(
        OrderNumberResetStrategy.Monthly,
    );
    const [scope, setScope] = useState<OrderNumberSequenceScope>(
        OrderNumberSequenceScope.PerOrderType,
    );
    const [prefix, setPrefix] = useState("");
    const [includeDate, setIncludeDate] = useState(false);
    const [includeMonth, setIncludeMonth] = useState(true);
    const [includeYear, setIncludeYear] = useState(true);
    const [includeShiftNumber, setIncludeShiftNumber] = useState(false);
    const [includeBranchCode, setIncludeBranchCode] = useState(false);
    const [branchCode, setBranchCode] = useState("");

    useEffect(() => {
        // Silent on failure — store marks isLoaded so this doesn't re-fire.
        // Defaults render and the user can save to create the config row.
        if (!isLoaded && !isLoading) void fetch();
    }, [isLoaded, isLoading, fetch]);

    useEffect(() => {
        if (!isLoaded) return;
        setResetStrategy(config.resetStrategy);
        setScope(config.scope);
        setPrefix(config.prefix ?? "");
        setIncludeDate(config.includeDate);
        setIncludeMonth(config.includeMonth);
        setIncludeYear(config.includeYear);
        setIncludeShiftNumber(config.includeShiftNumber);
        setIncludeBranchCode(config.includeBranchCode);
        setBranchCode(config.branchCode ?? "");
    }, [config, isLoaded]);

    const previewState = {
        scope,
        prefix,
        includeDate,
        includeMonth,
        includeYear,
        includeShiftNumber,
        includeBranchCode,
        branchCode,
    };
    const previewRows = scope === OrderNumberSequenceScope.Global
        ? [
            { code: "ORD",     labelEn: "All Orders",         labelAr: "كل الطلبات",         example: buildExample(previewState, "ORD", timeZone) },
            { code: "ORD-OFF", labelEn: "Offline (synced)",   labelAr: "غير متصل (مُزامن)",  example: buildExample(previewState, "ORD", timeZone, undefined, true) },
          ]
        : PREVIEW_CHANNELS.map((c) => ({
            code: c.offline ? `${c.code}-OFF` : c.code,
            labelEn: c.labelEn,
            labelAr: c.labelAr,
            example: buildExample(previewState, c.code, timeZone, c.partnerCode, c.offline),
          }));

    const onSave = async () => {
        try {
            await save({
                resetStrategy,
                scope,
                prefix: prefix.trim() || null,
                includeDate,
                includeMonth,
                includeYear,
                includeShiftNumber,
                includeBranchCode,
                branchCode: branchCode.trim() || null,
            });
            toast.success(isAr ? "تم حفظ إعدادات الترقيم" : "Numbering settings saved");
        } catch (err) {
            // Surface the real backend error so we know whether it's auth (401/403),
            // missing table (500), or missing endpoint (404).
            const detail = err instanceof Error ? err.message : String(err);
            toast.error((isAr ? "فشل الحفظ: " : "Save failed: ") + detail);
            console.error("Order numbering save failed:", err);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Hash className="w-5 h-5" />
                    {isAr ? "ترقيم الطلبات" : "Order Numbering"}
                </CardTitle>
                <CardDescription>
                    {isAr
                        ? "تحكم في شكل رقم الطلب الظاهر على الإيصالات وتذاكر المطبخ."
                        : "Control the order number shown on receipts and kitchen tickets."}
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="rounded-md border bg-muted/40 px-4 py-3 space-y-2">
                    <p className="text-xs text-muted-foreground">
                        {isAr ? "معاينة" : "Preview"}
                    </p>
                    <div className="space-y-1">
                        {previewRows.map((row) => (
                            <div key={row.code} className="flex items-center justify-between gap-3 text-sm">
                                <span className="text-muted-foreground text-xs">
                                    {isAr ? row.labelAr : row.labelEn}
                                </span>
                                <span className="font-mono" dir="ltr">{row.example}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <Label className="text-start">
                            {isAr ? "استراتيجية إعادة التعيين" : "Reset Strategy"}
                        </Label>
                        <Select
                            value={String(resetStrategy)}
                            onValueChange={(v) => setResetStrategy(Number(v) as OrderNumberResetStrategy)}
                        >
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value={String(OrderNumberResetStrategy.Never)}>
                                    {isAr ? "بدون إعادة تعيين" : "Never Reset"}
                                </SelectItem>
                                <SelectItem value={String(OrderNumberResetStrategy.Daily)}>
                                    {isAr ? "يومي" : "Daily"}
                                </SelectItem>
                                <SelectItem value={String(OrderNumberResetStrategy.Monthly)}>
                                    {isAr ? "شهري" : "Monthly"}
                                </SelectItem>
                                <SelectItem value={String(OrderNumberResetStrategy.Yearly)}>
                                    {isAr ? "سنوي" : "Yearly"}
                                </SelectItem>
                                <SelectItem value={String(OrderNumberResetStrategy.ShiftOpen)}>
                                    {isAr ? "عند فتح الوردية" : "Shift Open"}
                                </SelectItem>
                                <SelectItem value={String(OrderNumberResetStrategy.ShiftClose)}>
                                    {isAr ? "عند إغلاق الوردية" : "Shift Close"}
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-1">
                        <Label className="text-start">
                            {isAr ? "نطاق التسلسل" : "Sequence Scope"}
                        </Label>
                        <Select
                            value={String(scope)}
                            onValueChange={(v) => setScope(Number(v) as OrderNumberSequenceScope)}
                        >
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value={String(OrderNumberSequenceScope.Global)}>
                                    {isAr ? "تسلسل موحّد" : "Global Sequence"}
                                </SelectItem>
                                <SelectItem value={String(OrderNumberSequenceScope.PerOrderType)}>
                                    {isAr ? "تسلسل منفصل لكل نوع طلب" : "Separate Per Order Type"}
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-1">
                        <Label className="text-start" htmlFor="onPrefix">
                            {isAr ? "البادئة (اختياري)" : "Prefix (optional)"}
                        </Label>
                        <Input
                            id="onPrefix"
                            value={prefix}
                            onChange={(e) => setPrefix(e.target.value)}
                            maxLength={16}
                            placeholder={isAr ? "مثال: ORD" : "e.g. ORD"}
                        />
                    </div>

                    <div className="space-y-1">
                        <Label className="text-start" htmlFor="onBranchCode">
                            {isAr ? "كود الفرع" : "Branch Code"}
                        </Label>
                        <Input
                            id="onBranchCode"
                            value={branchCode}
                            onChange={(e) => setBranchCode(e.target.value)}
                            maxLength={16}
                            placeholder="BR01"
                            disabled={!includeBranchCode}
                        />
                    </div>
                </div>

                <div className="space-y-3 pt-2">
                    <p className="text-sm font-medium">
                        {isAr ? "خيارات العرض" : "Display Options"}
                    </p>

                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-medium text-sm">{isAr ? "تضمين التاريخ الكامل" : "Include Date"}</p>
                            <p className="text-muted-foreground text-xs">YYYYMMDD</p>
                        </div>
                        <Switch checked={includeDate} onCheckedChange={setIncludeDate} />
                    </div>

                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-medium text-sm">{isAr ? "تضمين السنة" : "Include Year"}</p>
                            <p className="text-muted-foreground text-xs">YYYY</p>
                        </div>
                        <Switch checked={includeYear} onCheckedChange={setIncludeYear} disabled={includeDate} />
                    </div>

                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-medium text-sm">{isAr ? "تضمين الشهر" : "Include Month"}</p>
                            <p className="text-muted-foreground text-xs">MM</p>
                        </div>
                        <Switch checked={includeMonth} onCheckedChange={setIncludeMonth} disabled={includeDate} />
                    </div>

                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-medium text-sm">{isAr ? "تضمين رقم الوردية" : "Include Shift Number"}</p>
                            <p className="text-muted-foreground text-xs">S001</p>
                        </div>
                        <Switch checked={includeShiftNumber} onCheckedChange={setIncludeShiftNumber} />
                    </div>

                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-medium text-sm">{isAr ? "تضمين كود الفرع" : "Include Branch Code"}</p>
                            <p className="text-muted-foreground text-xs">{isAr ? "يضاف في بداية الرقم" : "Prepended to the number"}</p>
                        </div>
                        <Switch checked={includeBranchCode} onCheckedChange={setIncludeBranchCode} />
                    </div>
                </div>

                <Button onClick={onSave} className="gap-2" disabled={isSaving || isLoading}>
                    {isSaving
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : <Save className="w-4 h-4" />}
                    {t("save")}
                </Button>
            </CardContent>
        </Card>
    );
}

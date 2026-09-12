"use client";

import React, { useEffect, useState } from "react";
import { Loader2, Save, Timer, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { useShiftRulesStore } from "@/store/shiftRulesStore";
import { ActiveShiftRule } from "@/lib/api-shift-rules";

export function ShiftRulesForm() {
    const { locale, t } = useLocale();
    const isAr = locale === "ar";
    const { config, isLoaded, isLoading, isSaving, fetch, save } = useShiftRulesStore();

    const [activeShiftRule, setActiveShiftRule] = useState<ActiveShiftRule>(ActiveShiftRule.Unlimited);

    const [requireAllOrdersPaid,      setRequireAllOrdersPaid]      = useState(false);
    const [requireAllOrdersReady,     setRequireAllOrdersReady]     = useState(false);
    const [requireAllOrdersServed,    setRequireAllOrdersServed]    = useState(false);
    const [requireAllOrdersCompleted, setRequireAllOrdersCompleted] = useState(false);

    const [allowPendingOrders,               setAllowPendingOrders]               = useState(true);
    const [allowPreparingOrders,             setAllowPreparingOrders]             = useState(true);
    const [allowReadyOrders,                 setAllowReadyOrders]                 = useState(true);
    const [allowPendingDeliveryOrders,       setAllowPendingDeliveryOrders]       = useState(true);
    const [allowPendingCancellationRequests, setAllowPendingCancellationRequests] = useState(true);

    const [allowForcedShiftClose,         setAllowForcedShiftClose]         = useState(false);
    const [allowShiftCloseWithOpenOrders, setAllowShiftCloseWithOpenOrders] = useState(false);

    useEffect(() => {
        if (!isLoaded && !isLoading) void fetch();
    }, [isLoaded, isLoading, fetch]);

    useEffect(() => {
        if (!isLoaded) return;
        setActiveShiftRule(config.activeShiftRule);
        setRequireAllOrdersPaid(config.requireAllOrdersPaid);
        setRequireAllOrdersReady(config.requireAllOrdersReady);
        setRequireAllOrdersServed(config.requireAllOrdersServed);
        setRequireAllOrdersCompleted(config.requireAllOrdersCompleted);
        setAllowPendingOrders(config.allowPendingOrders);
        setAllowPreparingOrders(config.allowPreparingOrders);
        setAllowReadyOrders(config.allowReadyOrders);
        setAllowPendingDeliveryOrders(config.allowPendingDeliveryOrders);
        setAllowPendingCancellationRequests(config.allowPendingCancellationRequests);
        setAllowForcedShiftClose(config.allowForcedShiftClose);
        setAllowShiftCloseWithOpenOrders(config.allowShiftCloseWithOpenOrders);
    }, [config, isLoaded]);

    const onSave = async () => {
        try {
            await save({
                activeShiftRule,
                requireAllOrdersPaid,
                requireAllOrdersReady,
                requireAllOrdersServed,
                requireAllOrdersCompleted,
                allowPendingOrders,
                allowPreparingOrders,
                allowReadyOrders,
                allowPendingDeliveryOrders,
                allowPendingCancellationRequests,
                allowForcedShiftClose,
                allowShiftCloseWithOpenOrders,
            });
            toast.success(isAr ? "تم حفظ قواعد الورديات" : "Shift rules saved");
        } catch (err) {
            const detail = err instanceof Error ? err.message : String(err);
            toast.error((isAr ? "فشل الحفظ: " : "Save failed: ") + detail);
        }
    };

    return (
        <div className="space-y-4">
            {/* Opening Rules */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Timer className="w-5 h-5" />
                        {isAr ? "قواعد فتح الوردية" : "Shift Opening Rules"}
                    </CardTitle>
                    <CardDescription>
                        {isAr
                            ? "تحدّد عدد الورديات المفتوحة في نفس الوقت."
                            : "Controls how many shifts can be open at once."}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-1">
                        <Label className="text-start">
                            {isAr ? "نطاق الوردية النشطة" : "Active Shift Rule"}
                        </Label>
                        <Select
                            value={String(activeShiftRule)}
                            onValueChange={(v) => setActiveShiftRule(Number(v) as ActiveShiftRule)}
                        >
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value={String(ActiveShiftRule.Unlimited)}>
                                    {isAr ? "غير محدود" : "Unlimited"}
                                </SelectItem>
                                <SelectItem value={String(ActiveShiftRule.SinglePerBranch)}>
                                    {isAr ? "وردية واحدة لكل فرع" : "Single per Branch"}
                                </SelectItem>
                                <SelectItem value={String(ActiveShiftRule.SinglePerPosDevice)}>
                                    {isAr ? "وردية واحدة لكل جهاز كاشير" : "Single per POS Device"}
                                </SelectItem>
                                <SelectItem value={String(ActiveShiftRule.SinglePerCashier)}>
                                    {isAr ? "وردية واحدة لكل كاشير" : "Single per Cashier"}
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {/* Closing Rules */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5" />
                        {isAr ? "قواعد إغلاق الوردية" : "Shift Closing Rules"}
                    </CardTitle>
                    <CardDescription>
                        {isAr
                            ? "تمنع إغلاق الوردية أثناء وجود طلبات مفتوحة حسب الإعدادات."
                            : "Blocks closing while open orders match the rules."}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    <SwitchRow
                        title={isAr ? "اشتراط دفع كل الطلبات" : "Require All Orders Paid"}
                        checked={requireAllOrdersPaid}
                        onChange={setRequireAllOrdersPaid}
                    />
                    <SwitchRow
                        title={isAr ? "اشتراط جاهزية كل الطلبات" : "Require All Orders Ready"}
                        checked={requireAllOrdersReady}
                        onChange={setRequireAllOrdersReady}
                    />
                    <SwitchRow
                        title={isAr ? "اشتراط تقديم كل الطلبات" : "Require All Orders Served"}
                        checked={requireAllOrdersServed}
                        onChange={setRequireAllOrdersServed}
                    />
                    <SwitchRow
                        title={isAr ? "اشتراط إنهاء كل الطلبات" : "Require All Orders Completed"}
                        checked={requireAllOrdersCompleted}
                        onChange={setRequireAllOrdersCompleted}
                    />

                    <div className="border-t pt-3 space-y-3">
                        <p className="text-sm font-medium">
                            {isAr ? "السماح بإغلاق الوردية مع وجود طلبات بهذه الحالة" : "Allow closing with orders in these states"}
                        </p>
                        <SwitchRow
                            title={isAr ? "طلبات قيد الانتظار" : "Pending"}
                            checked={allowPendingOrders}
                            onChange={setAllowPendingOrders}
                        />
                        <SwitchRow
                            title={isAr ? "طلبات قيد التحضير" : "Preparing"}
                            checked={allowPreparingOrders}
                            onChange={setAllowPreparingOrders}
                        />
                        <SwitchRow
                            title={isAr ? "طلبات جاهزة" : "Ready"}
                            checked={allowReadyOrders}
                            onChange={setAllowReadyOrders}
                        />
                        <SwitchRow
                            title={isAr ? "طلبات توصيل معلقة" : "Pending Delivery"}
                            description={isAr
                                ? "متوقف — يتم تطبيق نفس قواعد الإكمال على كل أنواع الطلبات (محلي، خارجي، توصيل، شركاء)."
                                : "Deprecated — completion now uses the same rules for all order types (in-store, pickup, delivery, partners)."}
                            checked={allowPendingDeliveryOrders}
                            onChange={setAllowPendingDeliveryOrders}
                        />
                        <SwitchRow
                            title={isAr ? "طلبات إلغاء بانتظار الموافقة" : "Pending Cancellation Requests"}
                            checked={allowPendingCancellationRequests}
                            onChange={setAllowPendingCancellationRequests}
                        />
                    </div>

                    <div className="border-t pt-3 space-y-3">
                        <SwitchRow
                            title={isAr ? "السماح بالإغلاق القسري" : "Allow Forced Shift Close"}
                            description={isAr
                                ? "يسمح للكاشير بتجاوز قواعد الإغلاق عند الضرورة. كل إغلاق قسري يُسجّل في السجل."
                                : "Lets cashier bypass blocking rules when needed. Every force-close is logged."}
                            checked={allowForcedShiftClose}
                            onChange={setAllowForcedShiftClose}
                        />
                        <SwitchRow
                            title={isAr ? "السماح بإغلاق الوردية مع وجود طلبات مفتوحة" : "Allow Close With Open Orders"}
                            description={isAr
                                ? "يتجاوز كل قواعد التحقق. استخدم بحذر."
                                : "Bypasses all validation rules. Use with care."}
                            checked={allowShiftCloseWithOpenOrders}
                            onChange={setAllowShiftCloseWithOpenOrders}
                        />
                    </div>

                    <Button onClick={onSave} className="gap-2 mt-2" disabled={isSaving || isLoading}>
                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        {t("save")}
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}

function SwitchRow({
    title,
    description,
    checked,
    onChange,
}: {
    title: string;
    description?: string;
    checked: boolean;
    onChange: (v: boolean) => void;
}) {
    return (
        <div className="flex items-center justify-between">
            <div>
                <p className="font-medium text-sm">{title}</p>
                {description && <p className="text-muted-foreground text-xs">{description}</p>}
            </div>
            <Switch checked={checked} onCheckedChange={onChange} />
        </div>
    );
}

"use client";

import { useEffect, useState } from "react";
import { ChefHat, Loader2, RefreshCcw } from "lucide-react";
import { toast } from "sonner";
import { useLocale } from "@/components/locale-provider";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { getKitchens, resendKitchenTicket, type KitchenDto } from "@/lib/api";
import type { OrderDto } from "@/types/order";
import { formatOrderSequence } from "@/lib/order-sequence";

interface ResendKitchenTicketModalProps {
    order: OrderDto | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function ResendKitchenTicketModal({
    order,
    open,
    onOpenChange,
}: ResendKitchenTicketModalProps) {
    const { t, locale } = useLocale();
    const [kitchens, setKitchens] = useState<KitchenDto[]>([]);
    const [selectedKitchenIds, setSelectedKitchenIds] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!open) return;

        let cancelled = false;
        setLoading(true);
        setSelectedKitchenIds([]);

        getKitchens()
            .then((data) => {
                if (cancelled) return;

                const printableKitchens = data.filter(
                    (kitchen) => kitchen.isActive && kitchen.printerCount > 0
                );

                setKitchens(printableKitchens);
                setSelectedKitchenIds(
                    printableKitchens.length === 1 ? [printableKitchens[0].id] : []
                );
            })
            .catch(() => {
                if (!cancelled) {
                    setKitchens([]);
                    toast.error(t("resendKitchenTicketError"));
                }
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [open, t]);

    const isSelected = (kitchenId: string) => selectedKitchenIds.includes(kitchenId);

    const toggleKitchen = (kitchenId: string, checked: boolean) => {
        setSelectedKitchenIds((prev) =>
            checked
                ? Array.from(new Set([...prev, kitchenId]))
                : prev.filter((id) => id !== kitchenId)
        );
    };

    const handleSubmit = async () => {
        if (!order) return;

        if (selectedKitchenIds.length === 0) {
            toast.error(t("resendKitchenTicketNoSelection"));
            return;
        }

        setSubmitting(true);
        try {
            const result = await resendKitchenTicket(order.id, selectedKitchenIds);
            if (!result.enqueued) {
                toast.error(t("resendKitchenTicketError"));
                return;
            }

            toast.success(
                t("resendKitchenTicketSuccess").replace("{count}", String(result.jobs.length))
            );
            onOpenChange(false);
        } catch {
            toast.error(t("resendKitchenTicketError"));
        } finally {
            setSubmitting(false);
        }
    };

    const selectedAll = kitchens.length > 0 && selectedKitchenIds.length === kitchens.length;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <ChefHat className="h-5 w-5 text-orange-600" />
                        {t("resendKitchenTicketTitle")}
                    </DialogTitle>
                    <DialogDescription>
                        {formatOrderSequence(order) ?? `#${order?.orderNumber}`} · {t("resendKitchenTicketDesc")}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-slate-700">
                            {t("kitchens")}
                        </span>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={loading || kitchens.length === 0}
                            onClick={() =>
                                setSelectedKitchenIds(selectedAll ? [] : kitchens.map((kitchen) => kitchen.id))
                            }
                        >
                            {selectedAll ? t("resendKitchenTicketClear") : t("resendKitchenTicketSelectAll")}
                        </Button>
                    </div>

                    {loading ? (
                        <div className="flex min-h-32 items-center justify-center rounded-lg border border-slate-200 text-sm text-slate-500">
                            <Loader2 className="me-2 h-4 w-4 animate-spin" />
                            {t("loadingText")}
                        </div>
                    ) : kitchens.length === 0 ? (
                        <div className="flex min-h-32 items-center justify-center rounded-lg border border-dashed border-slate-300 px-4 text-center text-sm text-slate-500">
                            {t("resendKitchenTicketEmpty")}
                        </div>
                    ) : (
                        <div className="max-h-72 space-y-2 overflow-y-auto pe-1">
                            {kitchens.map((kitchen) => {
                                const checked = isSelected(kitchen.id);
                                const name = locale === "ar" && kitchen.nameAr ? kitchen.nameAr : kitchen.name;

                                return (
                                    <label
                                        key={kitchen.id}
                                        className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5 hover:bg-slate-50"
                                    >
                                        <Checkbox
                                            checked={checked}
                                            onCheckedChange={(value) => toggleKitchen(kitchen.id, value === true)}
                                        />
                                        <span className="min-w-0 flex-1 text-sm font-semibold text-slate-800">
                                            {name}
                                        </span>
                                        <span className="text-xs font-medium text-slate-500">
                                            {kitchen.printerCount}
                                        </span>
                                    </label>
                                );
                            })}
                        </div>
                    )}
                </div>

                <DialogFooter className="gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={submitting}
                    >
                        {t("cancel")}
                    </Button>
                    <Button
                        type="button"
                        onClick={handleSubmit}
                        disabled={loading || submitting || selectedKitchenIds.length === 0}
                        className="gap-2"
                    >
                        {submitting ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <RefreshCcw className="h-4 w-4" />
                        )}
                        {t("resendKitchenTicketConfirm")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

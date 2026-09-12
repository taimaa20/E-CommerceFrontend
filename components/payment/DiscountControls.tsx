"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { OrderDiscountType } from "@/types/order";

interface DiscountControlsProps {
    locale: string;
    canEdit: boolean;
    type: OrderDiscountType | null;
    value: number;
    currency: string;
    onTypeChange: (type: OrderDiscountType) => void;
    onValueChange: (value: number) => void;
    onRemove: () => void;
}

export function DiscountControls({
    locale,
    canEdit,
    type,
    value,
    currency,
    onTypeChange,
    onValueChange,
    onRemove,
}: DiscountControlsProps) {
    const ar = locale === "ar";

    return (
        <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
            <div className="flex items-center justify-between gap-3">
                <Label>{ar ? "نوع الخصم" : "Discount Type"}</Label>
                {type && value > 0 && canEdit && (
                    <Button type="button" variant="ghost" size="sm" onClick={onRemove}>
                        {ar ? "إزالة" : "Remove"}
                    </Button>
                )}
            </div>
            <div className="grid grid-cols-2 gap-2">
                <Button
                    type="button"
                    variant={type === "FixedAmount" ? "default" : "outline"}
                    disabled={!canEdit}
                    onClick={() => onTypeChange("FixedAmount")}
                >
                    {ar ? "مبلغ ثابت" : "Fixed Amount"}
                </Button>
                <Button
                    type="button"
                    variant={type === "Percentage" ? "default" : "outline"}
                    disabled={!canEdit}
                    onClick={() => onTypeChange("Percentage")}
                >
                    {ar ? "نسبة مئوية" : "Percentage"}
                </Button>
            </div>
            <div className="relative">
                <Input
                    type="number"
                    min="0"
                    max={type === "Percentage" ? 100 : undefined}
                    step="0.01"
                    value={value || ""}
                    disabled={!canEdit || !type}
                    onChange={(event) => onValueChange(Number(event.target.value))}
                />
                <span className="pointer-events-none absolute end-3 top-2.5 text-sm text-muted-foreground">
                    {type === "Percentage" ? "%" : currency}
                </span>
            </div>
            {!canEdit && (
                <p className="text-xs text-muted-foreground">
                    {ar ? "يمكن تعديل الخصم قبل بدء الدفع فقط." : "The discount can only be changed before payment starts."}
                </p>
            )}
        </div>
    );
}

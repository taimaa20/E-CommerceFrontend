"use client";

import { Boxes, ChevronRight, Layers } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useLocale } from "@/components/locale-provider";
import type { InventoryItemType } from "@/components/inventory/inventory-shared";

/**
 * The single entry point for adding anything to inventory.
 *
 * The operator picks what kind of thing they are stocking, and the correct form follows. That
 * choice exists because the two are genuinely different to run — one is bought and sold as
 * itself, the other is consumed by recipes — not because the database stores them apart.
 */
export function AddInventoryItemDialog({
    open,
    onOpenChange,
    onChoose,
    allowFinished,
}: {
    open: boolean;
    onOpenChange: (value: boolean) => void;
    onChoose: (type: InventoryItemType) => void;
    /** False on a branch that sells no finished goods, so the choice is not offered. */
    allowFinished: boolean;
}) {
    const { locale } = useLocale();
    const ar = locale === "ar";

    const choose = (type: InventoryItemType) => {
        onOpenChange(false);
        onChoose(type);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>{ar ? "إضافة صنف للمخزون" : "Add inventory item"}</DialogTitle>
                    <DialogDescription>
                        {ar
                            ? "اختر نوع الصنف لعرض النموذج المناسب."
                            : "Choose what you are stocking and the right form follows."}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-3 pt-2">
                    {allowFinished && (
                        <ChoiceCard
                            icon={<Boxes className="h-5 w-5 text-violet-600 dark:text-violet-400" />}
                            title={ar ? "منتج للبيع" : "Product"}
                            body={
                                ar
                                    ? "يُشترى ويُباع كما هو — عطر، مستحضر، إكسسوار. له رمز SKU وسعر بيع، ويظهر في المنتجات ونقطة البيع."
                                    : "Bought and sold as itself — a perfume, a cosmetic, a jewellery piece. It gets a SKU and a selling price, and appears in Products and the POS."
                            }
                            onClick={() => choose("finished")}
                        />
                    )}
                    <ChoiceCard
                        icon={<Layers className="h-5 w-5 text-sky-600 dark:text-sky-400" />}
                        title={ar ? "مادة خام" : "Raw material"}
                        body={
                            ar
                                ? "تُستهلك عبر وصفات المنتجات — دقيق، لحم، مشروب. تُدار بالدفعات وتاريخ الصلاحية."
                                : "Consumed through product recipes — flour, meat, a drink base. Managed by batches and expiry."
                        }
                        onClick={() => choose("material")}
                    />
                </div>
            </DialogContent>
        </Dialog>
    );
}

function ChoiceCard({
    icon,
    title,
    body,
    onClick,
}: {
    icon: React.ReactNode;
    title: string;
    body: string;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="flex w-full items-start gap-3 rounded-lg border p-4 text-start transition-colors hover:border-primary hover:bg-accent"
        >
            <span className="mt-0.5 shrink-0">{icon}</span>
            <span className="flex-1">
                <span className="block font-medium">{title}</span>
                <span className="mt-0.5 block text-sm text-muted-foreground">{body}</span>
            </span>
            <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground rtl:-scale-x-100" />
        </button>
    );
}

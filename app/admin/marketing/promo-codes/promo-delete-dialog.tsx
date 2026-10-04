"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { promoCodesApi, type PromoCode } from "@/lib/api-marketing";
import type { Translate } from "./promo-form";

interface Props {
    promo: PromoCode;
    t: Translate;
    onClose: () => void;
    onDeleted: () => void;
}

/** Two-step delete. The server soft-deletes, so past orders keep their discount. */
export default function PromoDeleteDialog({ promo, t, onClose, onDeleted }: Props) {
    const [deleting, setDeleting] = useState(false);

    const confirm = async () => {
        if (deleting) return;
        setDeleting(true);
        try {
            await promoCodesApi.remove(promo.id);
            toast.success(t("Promo code deleted", "تم حذف رمز الخصم"));
            onDeleted();
        } catch (e) {
            toast.error(e instanceof Error ? e.message : t("Delete failed", "فشل الحذف"));
            setDeleting(false);
        }
    };

    return (
        <Dialog open onOpenChange={open => { if (!open && !deleting) onClose(); }}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{t("Delete promo code?", "حذف رمز الخصم؟")}</DialogTitle>
                </DialogHeader>

                <p className="text-sm text-muted-foreground">
                    <span className="font-mono font-semibold text-foreground" dir="ltr">{promo.code}</span>{" "}
                    {t("will no longer be available or applicable to new orders. Historical usage will be preserved.",
                        "لن يكون متاحاً أو قابلاً للتطبيق على الطلبات الجديدة. سيتم الحفاظ على سجل الاستخدام.")}
                </p>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={deleting}>{t("Cancel", "إلغاء")}</Button>
                    <Button variant="destructive" onClick={confirm} disabled={deleting}>{t("Delete", "حذف")}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

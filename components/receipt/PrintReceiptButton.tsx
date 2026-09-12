"use client";

import React from "react";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSettingsStore } from "@/store/settingsStore";
import { useBrandingStore } from "@/store/brandingStore";
import { usePosStore } from "@/store/posStore";
import { printReceipt } from "@/lib/print-receipt";
import { useLocale } from "@/components/locale-provider";
import type { OrderDto } from "@/types/order";

interface PrintReceiptButtonProps {
    order: OrderDto | null | undefined;
    variant?: "default" | "outline" | "ghost" | "destructive" | "secondary";
    size?: "sm" | "default" | "lg" | "icon";
    className?: string;
    label?: string;
    /** When true, shows only the printer icon (no label). Useful in tight spaces. */
    iconOnly?: boolean;
}

/**
 * Reusable "Print Receipt" button.
 * Reads settings, logo, products and currency from Zustand stores automatically.
 * Just pass the order and it handles everything else.
 */
export function PrintReceiptButton({
    order,
    variant = "outline",
    size = "default",
    className,
    label,
    iconOnly = false,
}: PrintReceiptButtonProps) {
    const { t } = useLocale();
    const settings             = useSettingsStore((s) => s.settings);
    const logoUrl              = useBrandingStore((s) => s.logoUrl);
    const businessName         = useBrandingStore((s) => s.businessName);
    const products             = usePosStore((s) => s.products);
    const currency             = usePosStore((s) => s.currency);
    const storeServiceChargeRate = usePosStore((s) => s.serviceChargeRate);
    const storeTaxRate         = usePosStore((s) => s.taxRate);

    const handlePrint = () => {
        if (!order) return;
        printReceipt({
            order,
            settings,
            logoUrl,
            businessName,
            products,
            currency,
            storeServiceChargeRate,
            storeTaxRate,
            customerPhone: order.customerPhone,
            amountTendered: order.amountTendered,
            changeAmount: order.changeAmount,
            forceReprint: true,
        });
    };

    if (!order) return null;

    return (
        <Button
            variant={variant}
            size={size}
            className={className}
            onClick={handlePrint}
            aria-label={label ?? t("printReceiptBtn")}
            title={label ?? t("printReceiptBtn")}
        >
            <Printer className={iconOnly ? "" : "me-2 h-4 w-4"} />
            {!iconOnly && (label ?? t("printReceiptBtn"))}
        </Button>
    );
}

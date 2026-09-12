"use client";

import React from "react";
import { ShoppingBasket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/components/locale-provider";
import { cn } from "@/lib/utils";
import { usePosStore } from "@/store/posStore";

interface BottomNavProps {
    itemCount: number;
    totalAmount: number;
    onCartClick: () => void;
    className?: string;
}

export default function BottomNav({ itemCount, totalAmount, onCartClick, className }: BottomNavProps) {
    const { currency } = usePosStore();
    const { t } = useLocale();
    
    if (itemCount === 0) return null;

    return (
        <div className={cn("fixed bottom-0 inset-x-0 p-4 bg-white border-t border-slate-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-50 safe-area-bottom", className)}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 flex flex-col">
                    <span className="text-sm font-medium text-slate-500">{t("total")}</span>
                    <span className="truncate text-xl font-bold text-slate-900 sm:text-2xl">
                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: currency }).format(totalAmount)}
                    </span>
                </div>

                <Button
                    onClick={onCartClick}
                    aria-label={`${t("myCart")} (${itemCount})`}
                    className="w-full bg-gradient-to-r from-orange-500 to-red-600 text-base font-semibold text-white shadow-lg shadow-orange-200 hover:from-orange-600 hover:to-red-700 sm:w-auto sm:min-w-[14rem]"
                >
                    <ShoppingBasket className="h-5 w-5" />
                    {t("myCart")} ({itemCount})
                </Button>
            </div>
        </div>
    );
}

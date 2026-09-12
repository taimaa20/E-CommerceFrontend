"use client";

import { FileSpreadsheet } from "lucide-react";
import { useLocale } from "@/components/locale-provider";

/**
 * Small, non-intrusive provenance line telling the operator which DOHA LUXE workbook sheet
 * a screen corresponds to. Deliberately a label, not a mapping engine.
 */
export function WorkbookSource({ sheet, note }: { sheet: string; note?: string }) {
    const { locale } = useLocale();
    const ar = locale === "ar";

    return (
        <p className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            <FileSpreadsheet className="h-3.5 w-3.5 shrink-0" />
            <span>
                {ar ? "المصدر في ملف إكسل: " : "Workbook source: "}
                <span className="font-medium text-foreground">{sheet}</span>
            </span>
            {note && <span className="opacity-80">— {note}</span>}
        </p>
    );
}

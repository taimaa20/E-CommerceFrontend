"use client";

import { Inbox } from "lucide-react";
import { useLocale } from "@/components/locale-provider";

export function WidgetEmpty({ message }: { message?: string }) {
    const { locale } = useLocale();
    const ar = locale === "ar";
    const fallback = ar ? "لا توجد بيانات لهذا الفلتر" : "No data for the selected filter";

    return (
        <div
            // flex-1 fills available card body height so sibling cards in the
            // same grid row remain visually aligned even when one is empty.
            className="flex-1"
            style={{
                display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center",
                minHeight: 160,
                padding: "16px 24px", gap: 10, textAlign: "center",
            }}
        >
            <div style={{
                width: 36, height: 36, borderRadius: 999,
                background: "var(--ds-bg-sunken)",
                display: "grid", placeItems: "center",
                color: "var(--ds-text-faint)",
            }}>
                <Inbox style={{ width: 16, height: 16 }} />
            </div>
            <span style={{ fontSize: 13, color: "var(--ds-text-muted)", maxWidth: 240 }}>
                {message ?? fallback}
            </span>
        </div>
    );
}

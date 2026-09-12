import type { DashboardFilter, DashboardFilterPreset } from "@/lib/dashboard/filter-types";

const PRESET_LABELS: Record<DashboardFilterPreset, { en: string; ar: string }> = {
    Default: { en: "Current", ar: "الحالي" },
    Today: { en: "Today", ar: "اليوم" },
    Yesterday: { en: "Yesterday", ar: "أمس" },
    ThisWeek: { en: "This week", ar: "هذا الأسبوع" },
    ThisMonth: { en: "This month", ar: "هذا الشهر" },
    ThisQuarter: { en: "This quarter", ar: "هذا الربع" },
    ThisYear: { en: "This year", ar: "هذه السنة" },
    Last7: { en: "Last 7 days", ar: "آخر 7 أيام" },
    Last30: { en: "Last 30 days", ar: "آخر 30 يوم" },
    LastMonth: { en: "Last month", ar: "الشهر الماضي" },
    Custom: { en: "Custom range", ar: "فترة مخصصة" },
};

// Compact period labels for narrow KPI card titles — keep them short so long
// presets (e.g. "This quarter" / "هذا الربع") never overflow the card.
const COMPACT_PRESET_LABELS: Record<DashboardFilterPreset, { en: string; ar: string }> = {
    Default: { en: "Current", ar: "الحالي" },
    Today: { en: "Today", ar: "اليوم" },
    Yesterday: { en: "Yesterday", ar: "أمس" },
    ThisWeek: { en: "Week", ar: "أسبوع" },
    ThisMonth: { en: "Month", ar: "شهر" },
    ThisQuarter: { en: "Quarter", ar: "ربع" },
    ThisYear: { en: "YTD", ar: "السنة" },
    Last7: { en: "7d", ar: "٧ أيام" },
    Last30: { en: "30d", ar: "٣٠ يوم" },
    LastMonth: { en: "Last month", ar: "ش. ماضٍ" },
    Custom: { en: "Custom", ar: "مخصص" },
};

function dateOnly(value?: string | null) {
    return value?.slice(0, 10) ?? "";
}

function getCompactFilterLabel(filter: DashboardFilter, ar: boolean) {
    const label = COMPACT_PRESET_LABELS[filter.preset] ?? COMPACT_PRESET_LABELS.Default;
    return ar ? label.ar : label.en;
}

export function getDashboardFilterLabel(filter: DashboardFilter, ar: boolean) {
    if (filter.preset === "Custom" && (filter.startUtc || filter.endUtc)) {
        const start = dateOnly(filter.startUtc);
        const end = dateOnly(filter.endUtc);
        if (start && end) return `${start} - ${end}`;
        return start || end;
    }

    const label = PRESET_LABELS[filter.preset] ?? PRESET_LABELS.Default;
    return ar ? label.ar : label.en;
}

export function withFilterLabel(label: string, filter: DashboardFilter, ar: boolean) {
    // KPI titles use the compact period label so quarter/year/custom presets
    // never break the narrow card layout. The full label still appears in card
    // subtitles via getDashboardFilterLabel.
    return `${label} · ${getCompactFilterLabel(filter, ar)}`;
}

/**
 * Suffix for point-in-time / live operational KPIs (current stock, active
 * orders/tables). These are NOT scoped to the selected reporting period, so
 * they must never carry a "Today / This week" suffix — that would imply a
 * historical filter the value does not honour.
 */
export function withLiveLabel(label: string, ar: boolean) {
    return `${label} · ${ar ? "مباشر" : "Live"}`;
}

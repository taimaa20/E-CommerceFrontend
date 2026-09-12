/**
 * Lightweight client-side CSV export for dashboard snapshots. Honours the
 * active filter window (encoded into the filename) so each export is
 * self-identifying.
 *
 * Two entry points:
 *   - exportSnapshotToCsv:   full snapshot dump (every section).
 *   - exportSnapshotSection: pick specific sections by key — used by the
 *     report-center buttons so "P&L statement" produces a focused P&L file,
 *     "Revenue breakdown" produces a daily-revenue + by-cashier file, etc.
 */
import type { DashboardFilter } from "./filter-types";

type Row = Record<string, string | number | null | undefined>;

function escape(value: string | number | null | undefined): string {
    if (value === null || value === undefined) return "";
    const s = String(value);
    if (s.includes(",") || s.includes("\n") || s.includes('"')) {
        return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
}

function toCsv(rows: Row[]): string {
    if (rows.length === 0) return "";
    const headers = Array.from(new Set(rows.flatMap((r) => Object.keys(r))));
    const head = headers.join(",");
    const body = rows.map((r) => headers.map((h) => escape(r[h])).join(",")).join("\n");
    return head + "\n" + body;
}

/**
 * Triggers a browser download for a backend-generated Excel workbook (bilingual
 * .xlsx). The filename mirrors the backend convention so downloads are
 * self-identifying. Used by the Home, Operations and Inventory dashboards.
 */
export function downloadWorkbook(blob: Blob, filenamePrefix: string): void {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${filenamePrefix}-${new Date().toISOString().slice(0, 10)}.xlsx`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
}

function downloadCsv(filename: string, csv: string): void {
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }); // BOM for Excel
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function filenameSlug(filter: DashboardFilter, scope: string, kind?: string): string {
    const stamp = new Date().toISOString().slice(0, 10);
    const preset = filter.preset === "Default" ? "current" : filter.preset.toLowerCase();
    return `${scope}${kind ? `-${kind}` : ""}-${preset}-${stamp}.csv`;
}

function flatten(prefix: string, obj: Record<string, unknown>): Row {
    const out: Row = {};
    for (const [k, v] of Object.entries(obj)) {
        if (v === null || v === undefined) continue;
        if (typeof v === "object" && !Array.isArray(v)) {
            Object.assign(out, flatten(prefix ? `${prefix}.${k}` : k, v as Record<string, unknown>));
        } else if (typeof v === "string" || typeof v === "number") {
            out[prefix ? `${prefix}.${k}` : k] = v;
        }
    }
    return out;
}

// Canonical list of sections we know how to render. Each key matches a
// property on the corresponding snapshot DTO.
const SCALAR_SECTIONS = ["revenue", "orders", "profitability", "headline", "stockHealth", "waste", "counters", "health"];
const ARRAY_SECTIONS = [
    "revenueTrend", "revenueByDay", "hourlySeries", "hourlyOrders", "wasteDailyTrend", "cancellationTrend", "refundTrend",
    "topProducts", "topCashiers", "bestSellers", "worstSellers", "revenueByCashier",
    "topWastedProducts", "wasteByEmployee", "expiringSoon",
    "refundsByEmployee", "cancellationsByEmployee", "discountsByEmployee",
    "voucherAbuseByCashier", "manualStockReductions",
    "recentOrders", "recentActivity", "alerts",
    "paymentSplit", "channelSplit", "orderTypeSplit", "wasteByCategory",
    "paymentMethodAnalytics", "orderSourceAnalytics", "partnerAnalytics",
    "cardBreakdown", "payMobBreakdown",
];

function blocksFromSnapshot(snapshot: unknown, include?: string[]) {
    if (!snapshot) return [];
    const snap = snapshot as Record<string, unknown>;
    const wanted = include ? new Set(include) : null;
    const blocks: { title: string; rows: Row[] }[] = [];

    const scalarRow: Row = {};
    for (const k of SCALAR_SECTIONS) {
        if (wanted && !wanted.has(k)) continue;
        const v = snap[k];
        if (v && typeof v === "object") {
            Object.assign(scalarRow, flatten(k, v as Record<string, unknown>));
        }
    }
    if (Object.keys(scalarRow).length > 0) blocks.push({ title: "Summary", rows: [scalarRow] });

    for (const k of ARRAY_SECTIONS) {
        if (wanted && !wanted.has(k)) continue;
        const v = snap[k];
        if (Array.isArray(v) && v.length > 0) blocks.push({ title: k, rows: v as Row[] });
    }
    return blocks;
}

/** Flattens any snapshot DTO into a CSV with one block per section. */
export function exportSnapshotToCsv(
    snapshot: unknown,
    filter: DashboardFilter,
    scope: "home" | "operations" | "financial" | "inventory" | "audit",
): boolean {
    const blocks = blocksFromSnapshot(snapshot);
    if (blocks.length === 0) return false;
    const csv = blocks.map((b) => `# ${b.title}\n${toCsv(b.rows)}`).join("\n\n");
    downloadCsv(filenameSlug(filter, scope), csv);
    return true;
}

/**
 * Same as exportSnapshotToCsv but only includes the named sections. Powers
 * the financial Export Center's per-report buttons so each download is
 * focused on its report kind instead of dumping everything.
 *
 * @param kind  short slug appended to the filename (e.g. "pnl", "revenue", "cogs")
 * @param sections  exact property names on the snapshot to include
 */
export function exportSnapshotSection(
    snapshot: unknown,
    filter: DashboardFilter,
    scope: "home" | "operations" | "financial" | "inventory" | "audit",
    kind: string,
    sections: string[],
): boolean {
    const blocks = blocksFromSnapshot(snapshot, sections);
    if (blocks.length === 0) return false;
    const csv = blocks.map((b) => `# ${b.title}\n${toCsv(b.rows)}`).join("\n\n");
    downloadCsv(filenameSlug(filter, scope, kind), csv);
    return true;
}

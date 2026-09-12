/**
 * Retail POS — dashboard design system primitives.
 * Ported from the Mise design package, scoped under .dash via dashboard.css.
 *
 * Every component here is presentational only — no data-fetching, no business
 * logic. They take values and render them in the design system's idiom.
 */
"use client";

import * as React from "react";
import {
    ArrowDown, ArrowUp, ChevronRight, type LucideIcon,
} from "lucide-react";
import { parseUtcInstant } from "@/lib/date-time";

/* ============================================================
   Sparkline — tiny inline trend for KPI cards
   ============================================================ */
export const Sparkline: React.FC<{
    data: number[];
    color?: string;
    height?: number;
    fillOpacity?: number;
}> = ({ data, color = "var(--ds-primary)", height = 36, fillOpacity = 1 }) => {
    const gid = React.useId();
    if (!data?.length) return <div style={{ height }} />;

    const w = 200;
    const h = height;
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;
    const step = data.length > 1 ? w / (data.length - 1) : w;
    const pts = data.map((v, i) => [i * step, h - ((v - min) / range) * (h - 6) - 3] as const);
    const line = pts.map((p, i) => (i === 0 ? "M" : "L") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
    const area = line + ` L ${w} ${h} L 0 ${h} Z`;
    return (
        <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" width="100%" height={h} className="spark-area">
            <defs>
                <linearGradient id={gid} x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity="0.35" />
                    <stop offset="100%" stopColor={color} stopOpacity="0" />
                </linearGradient>
            </defs>
            <path className="area" d={area} fill={`url(#${gid})`} opacity={fillOpacity ? 1 : 0} />
            <path className="line" d={line} stroke={color} />
        </svg>
    );
};

/* ============================================================
   Delta pill
   ============================================================ */
export const Delta: React.FC<{ value: number; suffix?: string; invert?: boolean }> =
    ({ value, suffix = "%", invert = false }) => {
        const positive = value >= 0;
        const good = invert ? !positive : positive;
        const cls = value === 0 ? "delta-flat" : good ? "delta-up" : "delta-down";
        const Arrow = positive ? ArrowUp : ArrowDown;
        return (
            <span className={`kpi-delta ${cls}`}>
                <Arrow size={10} strokeWidth={2.5} />
                {Math.abs(value).toFixed(1)}{suffix}
            </span>
        );
    };

/* ============================================================
   KPI Card
   ============================================================ */
export const KPI: React.FC<{
    label: string;
    value: string | number;
    unit?: string;
    delta?: number | null;
    deltaSuffix?: string;
    invertDelta?: boolean;
    spark?: number[];
    sparkColor?: string;
    icon?: LucideIcon;
    foot?: React.ReactNode;
    loading?: boolean;
}> = ({ label, value, unit, delta, deltaSuffix = "%", invertDelta, icon: Icon, foot, loading }) => (
    <div className="kpi">
        <div className="kpi-label">
            {Icon && <Icon size={13} className="ico" />}
            {label}
        </div>
        <div className="kpi-row">
            <span className="kpi-val">{loading ? "—" : value}</span>
            {unit && <span className="kpi-unit">{unit}</span>}
            {delta !== undefined && delta !== null && !loading && (
                <Delta value={delta} suffix={deltaSuffix} invert={invertDelta} />
            )}
        </div>
        {foot && <div className="kpi-foot">{foot}</div>}
    </div>
);

/* ============================================================
   Pill (status badge)
   ============================================================ */
export type PillColor = "neutral" | "green" | "red" | "amber" | "blue" | "purple";
export const Pill: React.FC<{ color?: PillColor; children: React.ReactNode; dot?: boolean }> =
    ({ color = "neutral", children, dot = true }) => (
        <span className={`pill pill-${color}`}>
            {dot && <span className="pill-dot" />}
            {children}
        </span>
    );

/* ============================================================
   Card
   ============================================================ */
export const Card: React.FC<{
    title?: React.ReactNode;
    subtitle?: React.ReactNode;
    action?: React.ReactNode;
    tabs?: React.ReactNode;
    padding?: boolean;
    children: React.ReactNode;
    style?: React.CSSProperties;
    className?: string;
}> = ({ title, subtitle, action, tabs, padding = true, children, style, className }) => (
    <div className={`card ${className ?? ""}`} style={style}>
        {(title || action || tabs) && (
            <div className="card-header">
                {title && (
                    <div className="col-stack">
                        <h3 className="card-title">{title}</h3>
                        {subtitle && <p className="card-subtitle">{subtitle}</p>}
                    </div>
                )}
                {tabs && <div className="card-head-tabs">{tabs}</div>}
                {action && <div className="card-action">{action}</div>}
            </div>
        )}
        <div className={padding ? "card-body" : ""}>{children}</div>
    </div>
);

/* ============================================================
   AreaChart — smooth multi-series
   ============================================================ */
export interface AreaSeries { name: string; data: number[]; color?: string }

function smoothPath(pts: ReadonlyArray<readonly [number, number]>): string {
    if (pts.length < 2) return "";
    let d = `M ${pts[0][0]} ${pts[0][1]}`;
    for (let i = 0; i < pts.length - 1; i++) {
        const [x0, y0] = pts[i];
        const [x1, y1] = pts[i + 1];
        const cx = (x0 + x1) / 2;
        d += ` C ${cx} ${y0}, ${cx} ${y1}, ${x1} ${y1}`;
    }
    return d;
}

export const AreaChart: React.FC<{
    series: AreaSeries[];
    labels: string[];
    height?: number;
    gridY?: number;
    fill?: boolean;
    showLegend?: boolean;
}> = ({ series, labels, height = 220, gridY = 4, fill = true, showLegend = true }) => {
    const W = 800, H = height, padL = 36, padR = 14, padT = 18, padB = 26;
    const innerW = W - padL - padR;
    const innerH = H - padT - padB;
    const allVals = series.flatMap(s => s.data);
    if (allVals.length === 0) return <div style={{ height }} />;
    const max = Math.ceil(Math.max(...allVals) * 1.1) || 1;
    const min = 0;
    const range = max - min || 1;
    const step = labels.length > 1 ? innerW / (labels.length - 1) : innerW;
    const yTicks = Array.from({ length: gridY + 1 }, (_, i) => min + (range / gridY) * i);
    const fmt = (v: number) => v >= 1000 ? (v / 1000).toFixed(v >= 10000 ? 0 : 1) + "k" : v.toString();
    const xLabelEvery = Math.max(1, Math.ceil(labels.length / 8));

    return (
        <div>
            {showLegend && (
                <div style={{ display: "flex", gap: 14, marginBottom: 6, paddingLeft: padL }}>
                    {series.map((s, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, color: "var(--ds-text-secondary)" }}>
                            <span style={{ width: 8, height: 8, borderRadius: 2, background: s.color ?? "var(--ds-primary)" }} />
                            {s.name}
                        </div>
                    ))}
                </div>
            )}
            <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none">
                <defs>
                    {series.map((s, i) => {
                        const c = s.color ?? "var(--ds-primary)";
                        return (
                            <linearGradient key={i} id={`ds-area-${i}`} x1="0" x2="0" y1="0" y2="1">
                                <stop offset="0%" stopColor={c} stopOpacity="0.22" />
                                <stop offset="100%" stopColor={c} stopOpacity="0" />
                            </linearGradient>
                        );
                    })}
                </defs>
                {yTicks.map((t, i) => {
                    const y = padT + innerH - ((t - min) / range) * innerH;
                    return (
                        <g key={i}>
                            <line x1={padL} x2={W - padR} y1={y} y2={y} stroke="var(--ds-border-subtle)" strokeWidth="1" strokeDasharray={i === 0 ? "" : "2 3"} />
                            <text x={padL - 6} y={y + 3} textAnchor="end" fontSize="10" fontFamily="var(--ds-font-mono)" fill="var(--ds-text-muted)">{fmt(t)}</text>
                        </g>
                    );
                })}
                {labels.map((l, i) => i % xLabelEvery === 0 && (
                    <text key={i} x={padL + i * step} y={H - 8} textAnchor="middle" fontSize="10" fill="var(--ds-text-muted)" fontFamily="var(--ds-font-mono)">{l}</text>
                ))}
                {series.map((s, i) => {
                    const c = s.color ?? "var(--ds-primary)";
                    const pts = s.data.map((v, idx) => [padL + idx * step, padT + innerH - ((v - min) / range) * innerH] as const);
                    const d = smoothPath(pts);
                    const area = d + ` L ${padL + innerW} ${padT + innerH} L ${padL} ${padT + innerH} Z`;
                    const last = pts[pts.length - 1];
                    return (
                        <g key={i}>
                            {fill && <path d={area} fill={`url(#ds-area-${i})`} />}
                            <path d={d} fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                            {last && <circle cx={last[0]} cy={last[1]} r="3" fill="#fff" stroke={c} strokeWidth="2" />}
                        </g>
                    );
                })}
            </svg>
        </div>
    );
};

/* ============================================================
   BarChart — single or stacked
   ============================================================ */
export const BarChart: React.FC<{
    data: number[] | number[][];
    labels: string[];
    height?: number;
    color?: string;
    colors?: string[];
    formatY?: (v: number) => string;
}> = ({ data, labels, height = 200, color = "var(--ds-primary)", colors, formatY }) => {
    const W = 800, H = height, padL = 36, padR = 8, padT = 14, padB = 24;
    const innerW = W - padL - padR;
    const innerH = H - padT - padB;
    const isStacked = Array.isArray(data[0]);
    const totals = isStacked
        ? (data as number[][]).map(arr => arr.reduce((a, b) => a + b, 0))
        : (data as number[]);
    if (totals.length === 0) return <div style={{ height }} />;
    const max = Math.ceil(Math.max(...totals) * 1.15) || 1;
    const bw = innerW / labels.length;
    const barW = Math.min(bw * 0.6, 28);
    const fmt = formatY ?? ((v: number) => v >= 1000 ? (v / 1000).toFixed(0) + "k" : v.toString());
    const yTicks = 4;
    return (
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none">
            {Array.from({ length: yTicks + 1 }, (_, i) => {
                const v = (max / yTicks) * i;
                const y = padT + innerH - (v / max) * innerH;
                return (
                    <g key={i}>
                        <line x1={padL} x2={W - padR} y1={y} y2={y} stroke="var(--ds-border-subtle)" strokeDasharray={i === 0 ? "" : "2 3"} />
                        <text x={padL - 6} y={y + 3} textAnchor="end" fontSize="10" fill="var(--ds-text-muted)" fontFamily="var(--ds-font-mono)">{fmt(v)}</text>
                    </g>
                );
            })}
            {labels.map((lab, i) => {
                const x = padL + bw * i + bw / 2 - barW / 2;
                if (isStacked) {
                    let yOff = 0;
                    return (
                        <g key={i}>
                            {(data as number[][])[i].map((val, j) => {
                                const segH = (val / max) * innerH;
                                const y = padT + innerH - segH - yOff;
                                yOff += segH;
                                return (
                                    <rect key={j} x={x} y={y} width={barW} height={segH}
                                        fill={colors?.[j] ?? color}
                                        rx={j === (data as number[][])[i].length - 1 ? 3 : 0} />
                                );
                            })}
                            <text x={x + barW / 2} y={H - 8} textAnchor="middle" fontSize="10" fill="var(--ds-text-muted)" fontFamily="var(--ds-font-mono)">{lab}</text>
                        </g>
                    );
                }
                const v = (data as number[])[i];
                const bh = (v / max) * innerH;
                const y = padT + innerH - bh;
                return (
                    <g key={i}>
                        <rect x={x} y={y} width={barW} height={bh} fill={color} rx="3" />
                        <text x={x + barW / 2} y={H - 8} textAnchor="middle" fontSize="10" fill="var(--ds-text-muted)" fontFamily="var(--ds-font-mono)">{lab}</text>
                    </g>
                );
            })}
        </svg>
    );
};

/* ============================================================
   Donut
   ============================================================ */
export interface DonutSlice { value: number; color: string }
export const Donut: React.FC<{
    data: DonutSlice[];
    size?: number;
    thickness?: number;
    centerLabel?: string;
    centerValue?: string;
}> = ({ data, size = 160, thickness = 18, centerLabel, centerValue }) => {
    const total = data.reduce((a, b) => a + b.value, 0);
    if (total === 0) return <div style={{ width: size, height: size }} />;
    const r = size / 2 - thickness / 2 - 2;
    const c = size / 2;
    const circ = 2 * Math.PI * r;
    let cum = 0;
    return (
        <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
            <circle cx={c} cy={c} r={r} fill="none" stroke="var(--ds-border-subtle)" strokeWidth={thickness} />
            {data.map((d, i) => {
                const len = (d.value / total) * circ;
                const off = circ - cum;
                cum += len;
                return (
                    <circle key={i} cx={c} cy={c} r={r}
                        fill="none" stroke={d.color} strokeWidth={thickness}
                        strokeDasharray={`${len} ${circ - len}`}
                        strokeDashoffset={off}
                        transform={`rotate(-90 ${c} ${c})`}
                        strokeLinecap="butt" />
                );
            })}
            {centerValue && (
                <>
                    <text x={c} y={c - 2} textAnchor="middle" fontSize="20" fontWeight="600" fill="var(--ds-text)" fontFamily="var(--ds-font-mono)" letterSpacing="-0.02em">{centerValue}</text>
                    <text x={c} y={c + 14} textAnchor="middle" fontSize="11" fill="var(--ds-text-muted)">{centerLabel}</text>
                </>
            )}
        </svg>
    );
};

/* ============================================================
   BarList — horizontal ranked bars
   ============================================================ */
export interface BarListItem { label: string; sub?: string; value: number; icon?: React.ReactNode; color?: string }
export const BarList: React.FC<{
    items: BarListItem[];
    max?: number;
    color?: string;
    showValue?: boolean;
    fmt?: (v: number) => string;
}> = ({ items, max, color = "var(--ds-primary)", showValue = true, fmt = (v) => String(v) }) => {
    if (items.length === 0) {
        return <div className="muted" style={{ fontSize: 12, padding: 12, textAlign: "center" }}>—</div>;
    }
    const m = max ?? Math.max(...items.map(i => i.value));
    return (
        <div className="scroll-list scroll-list-sm" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {items.map((it, i) => (
                <div key={i}>
                    <div className="between" style={{ marginBottom: 4 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0, fontSize: 12.5 }}>
                            {it.icon && (
                                <span style={{ width: 22, height: 22, borderRadius: 6, background: "var(--ds-bg-sunken)", display: "grid", placeItems: "center", flexShrink: 0, fontSize: 11 }}>
                                    {it.icon}
                                </span>
                            )}
                            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it.label}</span>
                            {it.sub && <span style={{ fontSize: 11, color: "var(--ds-text-muted)" }}>{it.sub}</span>}
                        </div>
                        {showValue && <span className="num" style={{ fontSize: 12, color: "var(--ds-text)" }}>{fmt(it.value)}</span>}
                    </div>
                    <div className="bar">
                        <div className="bar-fill" style={{ width: `${m ? (it.value / m) * 100 : 0}%`, background: it.color ?? color }} />
                    </div>
                </div>
            ))}
        </div>
    );
};

/* ============================================================
   AlertRow
   ============================================================ */
export const AlertRow: React.FC<{
    tone?: PillColor;
    icon: LucideIcon;
    title: string;
    meta?: string;
    time?: string;
    action?: React.ReactNode;
}> = ({ tone = "neutral", icon: Icon, title, meta, time, action }) => {
    const bg = `var(--ds-${tone}-soft, oklch(0.96 0.005 60))`;
    const fg = `var(--ds-${tone}-text, var(--ds-text-secondary))`;
    return (
        <div className="alert-row">
            <div className="alert-icon" style={{ background: bg, color: fg }}>
                <Icon size={14} />
            </div>
            <div className="alert-body">
                <div className="alert-title">{title}</div>
                {meta && <div className="alert-meta">{meta}</div>}
            </div>
            {time && <div className="alert-time">{time}</div>}
            {action}
        </div>
    );
};

/* ============================================================
   InitialAvatar — colored initials chip
   ============================================================ */
export const InitialAvatar: React.FC<{ name: string; size?: number; hue?: number }> =
    ({ name, size = 24, hue = 27 }) => {
        const init = (name || "?").split(" ").map(p => p[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
        return (
            <span style={{
                width: size, height: size, borderRadius: 999,
                background: `linear-gradient(135deg, oklch(0.78 0.06 ${hue}), oklch(0.55 0.12 ${hue}))`,
                color: "#fff",
                display: "inline-grid", placeItems: "center",
                fontSize: size * 0.42, fontWeight: 600,
                flexShrink: 0,
                fontFamily: "var(--ds-font-sans)",
            }}>{init}</span>
        );
    };

/* ============================================================
   Gauge — radial percentage
   ============================================================ */
export const Gauge: React.FC<{
    value: number;
    max?: number;
    size?: number;
    color?: string;
    label?: string;
    sub?: string;
}> = ({ value, max = 100, size = 120, color = "var(--ds-primary)", label, sub }) => {
    const r = (size - 14) / 2;
    const c = size / 2;
    const circ = 2 * Math.PI * r;
    const pct = Math.min(Math.max(value / max, 0), 1);
    return (
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                <circle cx={c} cy={c} r={r} fill="none" stroke="var(--ds-bg-sunken)" strokeWidth="10" />
                <circle cx={c} cy={c} r={r} fill="none" stroke={color} strokeWidth="10"
                    strokeDasharray={`${pct * circ} ${circ}`} strokeLinecap="round"
                    transform={`rotate(-90 ${c} ${c})`} />
                <text x={c} y={c} textAnchor="middle" dy="0.35em" fontSize="20" fontWeight="600" fill="var(--ds-text)" fontFamily="var(--ds-font-mono)">
                    {Math.round(value)}
                </text>
            </svg>
            <div>
                {label && <div style={{ fontWeight: 600, fontSize: 14 }}>{label}</div>}
                {sub && <div style={{ fontSize: 12, color: "var(--ds-text-muted)" }}>{sub}</div>}
            </div>
        </div>
    );
};

/* ============================================================
   Heatmap
   ============================================================ */
export const Heatmap: React.FC<{
    data: number[][];        // [rows][cols]
    rows: string[];
    cols: number;
    max: number;
    color?: string;
}> = ({ data, rows, cols, max, color = "var(--ds-primary)" }) => (
    <div className="heatmap" style={{ gridTemplateColumns: `auto repeat(${cols}, 1fr)` }}>
        <div />
        {Array.from({ length: cols }).map((_, c) => (
            <div key={`ch-${c}`} style={{ fontSize: 9.5, color: "var(--ds-text-muted)", textAlign: "center", fontFamily: "var(--ds-font-mono)" }}>
                {c % 3 === 0 ? c.toString().padStart(2, "0") : ""}
            </div>
        ))}
        {rows.map((rowLabel, r) => (
            <React.Fragment key={r}>
                <div style={{ fontSize: 10, color: "var(--ds-text-muted)", paddingRight: 6, display: "flex", alignItems: "center" }}>{rowLabel}</div>
                {data[r].map((v, c) => {
                    const intensity = max ? v / max : 0;
                    return (
                        <div key={c} className="heatmap-cell" title={`${rowLabel} ${c}:00 — ${v}`} style={{
                            background: intensity < 0.05
                                ? "oklch(0.96 0.005 60)"
                                : `color-mix(in oklch, ${color} ${Math.round(20 + intensity * 80)}%, transparent)`,
                        }} />
                    );
                })}
            </React.Fragment>
        ))}
    </div>
);

/* ============================================================
   SectionHeader — uppercase muted heading + link slot
   ============================================================ */
export const SectionHeader: React.FC<{ title: string; right?: React.ReactNode }> = ({ title, right }) => (
    <div className="section-h">
        <h2>{title}</h2>
        {right}
    </div>
);

/* ============================================================
   Helpers
   ============================================================ */
export function relativeTime(iso: string | Date, locale: "en" | "ar" = "en"): string {
    const date = parseUtcInstant(iso);
    const now = Date.now();
    const diffSec = Math.max(0, Math.round((now - date.getTime()) / 1000));
    if (locale === "ar") {
        if (diffSec < 60) return "الآن";
        const min = Math.round(diffSec / 60);
        if (min < 60) return `قبل ${min} د`;
        const hr = Math.round(min / 60);
        if (hr < 24) return `قبل ${hr} س`;
        return `قبل ${Math.round(hr / 24)} ي`;
    }
    if (diffSec < 60) return "now";
    const min = Math.round(diffSec / 60);
    if (min < 60) return `${min}m`;
    const hr = Math.round(min / 60);
    if (hr < 24) return `${hr}h`;
    return `${Math.round(hr / 24)}d`;
}

export function elapsedMMSS(sec: number): string {
    const m = Math.floor(sec / 60).toString().padStart(2, "0");
    const s = Math.floor(sec % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
}

export const ChevRight = () => <ChevronRight size={11} />;

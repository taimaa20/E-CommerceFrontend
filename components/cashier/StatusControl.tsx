"use client";

import { memo } from "react";
import { CheckCircle2, Truck, ChefHat } from "lucide-react";
import type { OrderDto } from "@/types/order";
import { getCashierOrderState } from "@/lib/cashier-order-selectors";

export type StatusStep = "pending" | "preparing" | "ready" | "served";

interface StatusControlProps {
    order: OrderDto;
    onAdvance: (target: "ready" | "served" | "pickup") => void;
    disabled?: boolean;
    locale?: "en" | "ar";
}

const STEP_META: Record<StatusStep, { en: string; ar: string; dotClass: string }> = {
    pending: { en: "Pending", ar: "بانتظار", dotClass: "bg-slate-400" },
    preparing: { en: "Preparing", ar: "قيد التحضير", dotClass: "bg-amber-500" },
    ready: { en: "Ready", ar: "جاهز", dotClass: "bg-emerald-500" },
    served: { en: "Served", ar: "تم التقديم", dotClass: "bg-purple-500" },
};

const STEP_ORDER: StatusStep[] = ["pending", "preparing", "ready", "served"];

function deriveStep(order: OrderDto): StatusStep {
    const s = getCashierOrderState(order);
    if (s.served || s.isCompleted) return "served";
    if (s.isReady) return "ready";
    const hasItems = (order.items?.length ?? 0) > 0;
    return hasItems ? "preparing" : "pending";
}

/**
 * Status control rail — shown inside order modal.
 * Gives cashier visual state + one-tap advance buttons.
 *
 * Payment, readiness, and handoff actions are independent. The backend
 * promotes the order when all three flags are present.
 */
function StatusControlImpl({ order, onAdvance, disabled = false, locale = "en" }: StatusControlProps) {
    const current = deriveStep(order);
    const state = getCashierOrderState(order);
    const currentIdx = STEP_ORDER.indexOf(current);
    const isArabic = locale === "ar";
    const terminalMeta = state.isTakeaway
        ? { en: "Picked Up", ar: "تم الاستلام", dotClass: STEP_META.served.dotClass }
        : state.isDelivery
        ? { en: "Delivered", ar: "تم التوصيل", dotClass: STEP_META.served.dotClass }
        : STEP_META.served;

    const canMarkReady = !state.isReady && !state.isCompleted && !state.isCancelled;
    const canMarkServed =
        !state.isTakeaway &&
        state.isReady &&
        !state.served &&
        !state.isCompleted &&
        !state.isCancelled;
    const canMarkPickup =
        state.isTakeaway &&
        state.isReady &&
        !state.served &&
        !state.isCompleted &&
        !state.isCancelled;

    return (
        <div className="rounded-lg border border-slate-200 bg-white p-3">
            {/* Rail */}
            <div className="flex items-center justify-between gap-1" role="status" aria-label="Order status">
                {STEP_ORDER.map((step, i) => {
                    const done = i <= currentIdx;
                    const isCurrent = i === currentIdx;
                    const meta = step === "served" ? terminalMeta : STEP_META[step];
                    return (
                        <div key={step} className="flex flex-1 items-center gap-1 min-w-0">
                            <div className="flex flex-col items-center gap-1 min-w-0">
                                <span
                                    className={`h-2.5 w-2.5 rounded-full flex-shrink-0 transition-colors ${
                                        done ? meta.dotClass : "bg-slate-200"
                                    } ${isCurrent ? "ring-2 ring-offset-1 ring-slate-300" : ""}`}
                                    aria-hidden="true"
                                />
                                <span
                                    className={`text-[10px] leading-tight text-center ${
                                        done ? "font-semibold text-slate-800" : "text-slate-400"
                                    }`}
                                >
                                    {isArabic ? meta.ar : meta.en}
                                </span>
                            </div>
                            {i < STEP_ORDER.length - 1 && (
                                <span
                                    className={`h-0.5 flex-1 rounded-full transition-colors ${
                                        i < currentIdx ? "bg-emerald-400" : "bg-slate-200"
                                    }`}
                                    aria-hidden="true"
                                />
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Actions */}
            <div className="mt-3 flex flex-wrap gap-2">
                {canMarkReady && (
                    <button
                        type="button"
                        onClick={() => onAdvance("ready")}
                        disabled={disabled}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 active:scale-[0.98] transition disabled:opacity-50"
                    >
                        <CheckCircle2 className="h-4 w-4" />
                        {isArabic ? "وضع جاهز" : "Mark Ready"}
                    </button>
                )}
                {canMarkServed && (
                    <button
                        type="button"
                        onClick={() => onAdvance("served")}
                        disabled={disabled}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-purple-600 px-3 py-2 text-sm font-semibold text-white hover:bg-purple-700 active:scale-[0.98] transition disabled:opacity-50"
                    >
                        <Truck className="h-4 w-4" />
                        {state.isDelivery
                            ? (isArabic ? "تم التوصيل" : "Mark Delivered")
                            : (isArabic ? "تم التقديم" : "Mark Served")}
                    </button>
                )}
                {canMarkPickup && (
                    <button
                        type="button"
                        onClick={() => onAdvance("pickup")}
                        disabled={disabled}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700 active:scale-[0.98] transition disabled:opacity-50"
                    >
                        <Truck className="h-4 w-4" />
                        {isArabic ? "تم الاستلام" : "Mark Picked Up"}
                    </button>
                )}
                {!canMarkReady && !canMarkServed && !canMarkPickup && (
                    <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                        {state.served || state.isCompleted ? (
                            <>
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                                {isArabic ? "لا إجراء متبقٍ" : "No further actions"}
                            </>
                        ) : (
                            <>
                                <ChefHat className="h-3.5 w-3.5" />
                                {isArabic ? "في انتظار المطبخ" : "Awaiting kitchen"}
                            </>
                        )}
                    </span>
                )}
            </div>
        </div>
    );
}

export const StatusControl = memo(StatusControlImpl);

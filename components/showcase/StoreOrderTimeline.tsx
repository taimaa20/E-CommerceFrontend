"use client";

import { Check } from "lucide-react";
import type { OnlineOrderProgressStep } from "@/lib/online-order-status";

/**
 * Order progress built from the existing customer statuses only.
 * Mobile reads as a vertical timeline (labels stay legible); wider screens use a
 * horizontal track. Two markups rather than one contorted layout, because the
 * connector geometry genuinely differs between the two.
 */
export default function StoreOrderTimeline({ steps }: { steps: OnlineOrderProgressStep[] }) {
    if (steps.length === 0) return null;

    return (
        <>
            <ol className="sm:hidden">
                {steps.map((step, index) => (
                    <li key={step.key} className="relative flex gap-3 pb-5 last:pb-0">
                        {index < steps.length - 1 && (
                            <span
                                aria-hidden
                                className={`absolute start-[11px] top-6 bottom-0 w-0.5 ${step.state === "completed" ? "bg-emerald-600" : "bg-border"}`}
                            />
                        )}
                        <Dot state={step.state} />
                        <span className={`pt-0.5 text-sm ${labelClass(step.state)}`}>{step.label}</span>
                    </li>
                ))}
            </ol>

            <ol className="hidden sm:flex">
                {steps.map((step, index) => (
                    <li key={step.key} className="relative flex min-w-0 flex-1 flex-col items-center gap-2 text-center">
                        {index > 0 && (
                            <span
                                aria-hidden
                                className={`absolute end-1/2 top-[11px] h-0.5 w-full ${step.state === "upcoming" ? "bg-border" : "bg-emerald-600"}`}
                            />
                        )}
                        <Dot state={step.state} />
                        <span className={`px-1 text-[12px] leading-tight ${labelClass(step.state)}`}>{step.label}</span>
                    </li>
                ))}
            </ol>
        </>
    );
}

function Dot({ state }: { state: OnlineOrderProgressStep["state"] }) {
    return (
        <span
            aria-hidden
            className={`relative z-10 flex size-6 shrink-0 items-center justify-center rounded-full border-2 ${
                state === "completed"
                    ? "border-emerald-600 bg-emerald-600 text-white"
                    : state === "current"
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background"
            }`}
        >
            {state === "completed"
                ? <Check className="size-3.5" strokeWidth={3} />
                : <span className={`size-1.5 rounded-full ${state === "current" ? "bg-current" : "bg-muted-foreground/40"}`} />}
        </span>
    );
}

function labelClass(state: OnlineOrderProgressStep["state"]): string {
    if (state === "upcoming") return "text-muted-foreground";
    return state === "current" ? "font-semibold text-foreground" : "text-foreground";
}

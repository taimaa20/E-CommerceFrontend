"use client";

import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "../i18n/useT";

interface Props {
  message?: string;
  className?: string;
  /**
   * - `spinner` (default): compact branded spinner for small async areas.
   * - `menu`: full premium skeleton (offers + list) so the menu never flashes
   *   a lonely spinner on slow restaurant Wi-Fi.
   */
  variant?: "spinner" | "menu";
}

export function LoadingState({ message, className, variant = "spinner" }: Props) {
  const t = useT();

  if (variant === "menu") {
    return (
      <div
        role="status"
        aria-live="polite"
        aria-label={t("loading")}
        className={cn("px-4 py-4 space-y-5", className)}
      >
        {/* Offers strip */}
        <Skeleton className="h-32 w-full rounded-2xl" />
        {/* Best-sellers rail */}
        <div className="flex gap-3 overflow-hidden">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-40 w-40 shrink-0 rounded-2xl" />
          ))}
        </div>
        {/* List rows */}
        <div className="space-y-2.5">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex gap-3.5 rounded-3xl border border-border/60 bg-card p-3"
            >
              <Skeleton className="size-[88px] shrink-0 rounded-2xl" />
              <div className="flex-1 space-y-2 py-1">
                <Skeleton className="h-4 w-2/3 rounded-full" />
                <Skeleton className="h-3 w-full rounded-full" />
                <Skeleton className="h-3 w-1/2 rounded-full" />
                <div className="flex items-center justify-between pt-2">
                  <Skeleton className="h-4 w-16 rounded-full" />
                  <Skeleton className="size-9 rounded-full" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground",
        className,
      )}
    >
      <Loader2 className="size-7 animate-spin text-primary" />
      <span className="text-sm">{message ?? t("loading")}</span>
    </div>
  );
}

/** Shimmering placeholder block. */
function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("relative overflow-hidden bg-muted", className)}
      aria-hidden
    >
      <span className="absolute inset-0 cqr-shimmer" />
    </div>
  );
}

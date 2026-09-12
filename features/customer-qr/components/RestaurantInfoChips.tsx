"use client";

import { Clock, Star } from "lucide-react";
import { useT } from "../i18n/useT";
import type { RestaurantInfo } from "../types";

interface Props {
  restaurant: RestaurantInfo;
  /** Render light text/borders for use on the dark twilight hero. */
  onDark?: boolean;
}

/**
 * Rating · open-now · avg-prep chips for the welcome hero. Each chip renders
 * only when its source value exists, so an unconfigured tenant degrades to
 * fewer chips (or none) instead of showing placeholders.
 */
export function RestaurantInfoChips({ restaurant, onDark }: Props) {
  const t = useT();
  const { rating, ratingCount, avgPrepMinutes, openNow } = restaurant;

  const hasRating = typeof rating === "number";
  const hasPrep = typeof avgPrepMinutes === "number";
  if (!hasRating && !openNow && !hasPrep) return null;

  const base = onDark
    ? "text-white/90"
    : "text-foreground";
  const sub = onDark ? "text-white/60" : "text-muted-foreground";

  return (
    <div className={`flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs font-semibold ${base}`}>
      {hasRating && (
        <span className="inline-flex items-center gap-1">
          <Star
            className="size-3.5 fill-current"
            style={{ color: "var(--cqr-gold)" }}
          />
          <span>{rating!.toFixed(1)}</span>
          {ratingCount && (
            <span className={`font-medium ${sub}`}>({ratingCount})</span>
          )}
        </span>
      )}

      {openNow && (
        <span
          className="inline-flex items-center gap-1.5"
          style={{ color: "var(--cqr-success)" }}
        >
          <span
            className="size-1.5 rounded-full"
            style={{ background: "var(--cqr-success)" }}
          />
          {t("openNow")}
        </span>
      )}

      {hasPrep && (
        <span className="inline-flex items-center gap-1">
          <Clock className={`size-3.5 ${sub}`} />
          <span>{avgPrepMinutes}</span>
          <span className={`font-medium ${sub}`}>{t("avgPrep")}</span>
        </span>
      )}
    </div>
  );
}

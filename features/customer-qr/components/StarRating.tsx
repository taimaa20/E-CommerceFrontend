"use client";

import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  value: number;
  onChange: (next: number) => void;
  max?: number;
  size?: "md" | "lg";
}

export function StarRating({ value, onChange, max = 5, size = "lg" }: Props) {
  return (
    <div className="flex items-center gap-2 justify-center">
      {Array.from({ length: max }, (_, i) => i + 1).map((n) => {
        const active = n <= value;
        return (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            aria-label={`Rate ${n}`}
            className={cn(
              "transition-transform hover:scale-110",
              active ? "text-amber-400" : "text-slate-300 dark:text-slate-700",
            )}
          >
            <Star
              className={cn(
                size === "lg" ? "size-9" : "size-6",
                active && "fill-amber-400",
              )}
              strokeWidth={1.5}
            />
          </button>
        );
      })}
    </div>
  );
}

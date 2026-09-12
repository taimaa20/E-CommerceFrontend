"use client";

import type { VoucherAvailability } from "@/lib/api";
import { formatCurrency } from "@/lib/currencies";

interface VoucherControlsProps {
  locale: string;
  currency: string;
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  availability: VoucherAvailability | null;
  discountAmount: number;
  disabled: boolean;
  disabledReason?: string;
}

export function VoucherControls({
  locale,
  currency,
  enabled,
  onEnabledChange,
  availability,
  discountAmount,
  disabled,
  disabledReason,
}: VoucherControlsProps) {
  const remaining = availability?.remainingToday ?? 0;

  return (
    <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50/70 p-3">
      <div className="flex items-start justify-between gap-3">
        <label className="flex min-w-0 flex-1 items-center gap-2 text-sm font-semibold text-amber-900">
          <input
            type="checkbox"
            checked={enabled}
            disabled={disabled}
            onChange={(event) => onEnabledChange(event.target.checked)}
            className="h-4 w-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
          />
          <span>{locale === "ar" ? "تطبيق القسيمة" : "Apply Voucher"}</span>
        </label>
        <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-amber-800 ring-1 ring-amber-200">
          {remaining}/{availability?.dailyLimit ?? 0}
        </span>
      </div>

      {enabled && discountAmount > 0 && (
        <div className="flex items-center justify-between rounded-md bg-white px-2 py-1.5 text-sm">
          <span className="font-medium text-slate-600">{locale === "ar" ? "خصم القسيمة" : "Voucher Discount"}</span>
          <span className="font-bold text-amber-700">-{formatCurrency(discountAmount, currency)}</span>
        </div>
      )}

      {disabled && disabledReason && (
        <div className="text-xs font-medium text-amber-800">{disabledReason}</div>
      )}
    </div>
  );
}

"use client";

import { Banknote, CreditCard, Landmark } from "lucide-react";
import type { PaymentMethodId } from "../types";

/** Vector-only mock brand badges — no external SVG files needed. */
export function PaymentIcon({ id, className }: { id: PaymentMethodId; className?: string }) {
  const base = "h-7 w-12 rounded-md text-[10px] font-bold flex items-center justify-center text-white shadow-sm";
  switch (id) {
    case "apple_pay":
      return (
        <span className={`${base} bg-black ${className ?? ""}`}>
          <AppleLogo /> Pay
        </span>
      );
    case "google_pay":
      return (
        <span className={`${base} bg-white text-slate-800 border border-slate-200 ${className ?? ""}`}>
          <span className="text-[11px] font-bold">G</span>Pay
        </span>
      );
    case "visa":
      return (
        <span
          className={`${base} bg-gradient-to-br from-[#1a1f71] to-[#0a0e3f] tracking-widest text-[11px] ${className ?? ""}`}
        >
          VISA
        </span>
      );
    case "mastercard":
      return (
        <span className={`${base} bg-white border border-slate-200 ${className ?? ""}`}>
          <span className="size-3.5 -me-1.5 rounded-full bg-[#eb001b]" />
          <span className="size-3.5 rounded-full bg-[#f79e1b] mix-blend-multiply" />
        </span>
      );
    case "card":
      return (
        <span className={`${base} bg-gradient-to-br from-slate-700 to-slate-900 ${className ?? ""}`}>
          <CreditCard className="size-4" />
        </span>
      );
    case "debit":
      return (
        <span className={`${base} bg-gradient-to-br from-emerald-600 to-emerald-800 ${className ?? ""}`}>
          <Landmark className="size-4" />
        </span>
      );
    case "cash":
      return (
        <span className={`${base} bg-gradient-to-br from-amber-500 to-amber-700 ${className ?? ""}`}>
          <Banknote className="size-4" />
        </span>
      );
    default:
      return <span className={`${base} bg-slate-500 ${className ?? ""}`}>?</span>;
  }
}

function AppleLogo() {
  return (
    <svg viewBox="0 0 24 24" className="size-3.5 me-0.5" fill="currentColor" aria-hidden>
      <path d="M16.365 1.43c0 1.14-.46 2.23-1.22 3.02-.81.86-2.13 1.52-3.21 1.44-.13-1.1.42-2.27 1.16-3.04C13.92 1.95 15.27 1.37 16.365 1.43Zm3.4 17.2c-.55 1.25-.82 1.81-1.53 2.91-.99 1.53-2.39 3.43-4.13 3.45-1.55.02-1.95-1-4.06-1-2.11 0-2.55 1-4.1 1-1.74 0-3.06-1.72-4.06-3.25C-.39 17.4-.7 12.43 1.84 9.6 3.27 7.97 5.27 7 7.13 7c1.78 0 2.9 1 4.37 1 1.43 0 2.3-1.01 4.36-1.01 1.51 0 3.12.82 4.27 2.24-3.75 2.05-3.14 7.44-.36 9.4Z" />
    </svg>
  );
}

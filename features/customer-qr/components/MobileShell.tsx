"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useDir } from "../store/localeStore";

type ShellSize = "phone" | "wide" | "full";

interface Props {
  children: React.ReactNode;
  className?: string;
  /** Pin a sticky footer below the scrollable content. */
  footer?: React.ReactNode;
  /** Sticky header. */
  header?: React.ReactNode;
  /**
   * - `phone` (default): 460px card. On desktop it floats on a premium
   *   branded backdrop so the diner journey looks intentional, not stranded.
   *   Use for checkout-style flows (welcome, order, bill, payment, success).
   * - `wide`: 760px card. Heavier admin lists.
   * - `full`: fluid up to 1280px, no frame. Use for the menu browser.
   */
  size?: ShellSize;
}

export function MobileShell({
  children,
  className,
  footer,
  header,
  size = "phone",
}: Props) {
  const dir = useDir();

  if (size === "full") {
    return (
      <div dir={dir} className="min-h-[100dvh] w-full bg-background flex flex-col">
        {header && (
          <div className="sticky top-0 z-30 bg-background/85 backdrop-blur-xl border-b border-border/60">
            {header}
          </div>
        )}
        <main className={cn("flex-1", className)}>{children}</main>
        {footer && (
          <div className="sticky bottom-0 z-30 bg-background/95 backdrop-blur-xl border-t border-border/60">
            {footer}
          </div>
        )}
      </div>
    );
  }

  const cap = size === "wide" ? "md:max-w-[760px]" : "md:max-w-[460px]";

  return (
    <div
      dir={dir}
      className="relative min-h-[100dvh] w-full flex justify-center md:items-center md:py-8 overflow-hidden bg-muted/40"
    >
      {/* Premium desktop backdrop — hidden on mobile where the card is full-screen. */}
      <div className="hidden md:block pointer-events-none absolute inset-0 cqr-grad-brand opacity-[0.12]" />
      <div className="hidden md:block pointer-events-none absolute -top-24 -start-24 size-[28rem] rounded-full bg-primary/15 blur-3xl" />
      <div className="hidden md:block pointer-events-none absolute -bottom-32 -end-24 size-[32rem] rounded-full bg-primary/10 blur-3xl" />

      <div
        className={cn(
          "relative z-10 w-full min-h-[100dvh] flex flex-col bg-card text-card-foreground",
          cap,
          // Phone-frame styling only kicks in at md+ where the backdrop exists.
          "md:min-h-[min(880px,calc(100dvh-4rem))] md:max-h-[calc(100dvh-4rem)] md:rounded-[2.5rem] md:overflow-hidden md:cqr-phone-frame md:border md:border-border/50",
          className,
        )}
      >
        {header && (
          <div className="sticky top-0 z-30 bg-card/85 backdrop-blur-xl border-b border-border/60">
            {header}
          </div>
        )}
        <main className="flex-1 overflow-y-auto">{children}</main>
        {footer && (
          <div className="sticky bottom-0 z-30 bg-card/95 backdrop-blur-xl border-t border-border/60">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useDir } from "../store/localeStore";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { useRestaurant } from "../hooks/useRestaurant";
import { useT } from "../i18n/useT";

interface Props {
  children: React.ReactNode;
  /** Optional area rendered at the end of the top bar (actions, etc.). */
  topbarEnd?: React.ReactNode;
  /** Constrain the main content width. Defaults to a roomy dashboard width. */
  contentClassName?: string;
}

/**
 * Full-width, responsive chrome for staff / operator surfaces (the hub and
 * the QR management console). Unlike the diner MobileShell, this is a true
 * web layout: sticky top bar, fluid content, generous spacing on desktop.
 */
export function OperatorShell({ children, topbarEnd, contentClassName }: Props) {
  const dir = useDir();
  const t = useT();
  const { data: restaurant } = useRestaurant();

  return (
    <div dir={dir} className="min-h-[100dvh] w-full bg-muted/30 flex flex-col">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 h-16 flex items-center gap-3">
          <Link href="/customer-qr" className="flex items-center min-w-0">
            {restaurant && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={restaurant.logoUrl}
                alt={t.bi(restaurant.name)}
                className="h-8 w-auto max-w-[180px] object-contain"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />
            )}
          </Link>
          <div className="ms-auto flex items-center gap-2">
            {topbarEnd}
            <LanguageSwitcher variant="outline" />
          </div>
        </div>
      </header>

      <main className="flex-1">
        <div
          className={cn(
            "mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 py-6 lg:py-10",
            contentClassName,
          )}
        >
          {children}
        </div>
      </main>
    </div>
  );
}

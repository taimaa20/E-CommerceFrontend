"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { useT } from "../i18n/useT";

interface Props {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  right?: React.ReactNode;
}

export function BrandHeader({ title, subtitle, showBack, onBack, right }: Props) {
  const router = useRouter();
  const t = useT();
  const BackIcon = t.isRtl ? ChevronRight : ChevronLeft;

  return (
    <div className="flex items-center gap-2 px-4 py-3">
      {showBack ? (
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => (onBack ? onBack() : router.back())}
          aria-label={t("back")}
          className="-ms-1 rounded-full"
        >
          <BackIcon className="size-5" />
        </Button>
      ) : (
        <div className="size-9" aria-hidden />
      )}
      <div className="flex-1 min-w-0 text-center">
        {title && (
          <div className="text-base font-semibold truncate">{title}</div>
        )}
        {subtitle && (
          <div className="text-xs text-muted-foreground truncate">{subtitle}</div>
        )}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {right}
        <LanguageSwitcher />
      </div>
    </div>
  );
}

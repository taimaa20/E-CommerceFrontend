"use client";

import { Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useModuleLocale } from "../store/localeStore";
import { useT } from "../i18n/useT";

interface Props {
  variant?: "ghost" | "outline";
  size?: "sm" | "default";
  /** Light translucent pill for placement on a dark hero. */
  onDark?: boolean;
}

export function LanguageSwitcher({ variant = "ghost", size = "sm", onDark }: Props) {
  const toggle = useModuleLocale((s) => s.toggle);
  const locale = useModuleLocale((s) => s.locale);
  const t = useT();

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={toggle}
      aria-label={t("language")}
      className={cn(
        "gap-2 font-medium",
        onDark &&
          "rounded-full border border-white/20 bg-white/10 text-white backdrop-blur hover:bg-white/20 hover:text-white",
      )}
    >
      <Globe className="size-4" />
      <span className="text-sm">{locale === "en" ? t("arabic") : t("english")}</span>
    </Button>
  );
}

"use client";

import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useT } from "../i18n/useT";

interface Props {
  value: string;
  onChange: (v: string) => void;
}

export function SearchInput({ value, onChange }: Props) {
  const t = useT();
  return (
    <div className="relative">
      <Search className="absolute top-1/2 -translate-y-1/2 start-3 size-4 text-muted-foreground pointer-events-none" />
      <Input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t("searchPlaceholder")}
        className="h-11 rounded-xl border-slate-200 bg-card ps-9 pe-9 text-sm shadow-sm focus-visible:bg-card"
      />
      {value && (
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => onChange("")}
          className="absolute top-1/2 -translate-y-1/2 end-1.5 rounded-full size-7"
          aria-label="clear"
        >
          <X className="size-3.5" />
        </Button>
      )}
    </div>
  );
}

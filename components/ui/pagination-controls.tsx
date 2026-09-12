"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLocale } from "@/components/locale-provider";
import { Bidi } from "@/components/ui/bidi";

interface PaginationControlsProps {
    pageNumber: number;
    pageSize: number;
    totalCount: number;
    onPageChange: (page: number) => void;
    onPageSizeChange: (size: number) => void;
    pageSizeOptions?: number[];
    isLoading?: boolean;
}

export function PaginationControls({
    pageNumber,
    pageSize,
    totalCount,
    onPageChange,
    onPageSizeChange,
    pageSizeOptions = [10, 20, 50, 100],
    isLoading = false,
}: PaginationControlsProps) {
    const { t } = useLocale();
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
    const firstItem = totalCount === 0 ? 0 : (pageNumber - 1) * pageSize + 1;
    const lastItem = Math.min(pageNumber * pageSize, totalCount);

    // Build visible page numbers (max 5 shown around current)
    const getPageNumbers = () => {
        const pages: (number | "...")[] = [];
        if (totalPages <= 7) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            pages.push(1);
            if (pageNumber > 3) pages.push("...");
            const start = Math.max(2, pageNumber - 1);
            const end = Math.min(totalPages - 1, pageNumber + 1);
            for (let i = start; i <= end; i++) pages.push(i);
            if (pageNumber < totalPages - 2) pages.push("...");
            pages.push(totalPages);
        }
        return pages;
    };

    const showingLabel =
        totalCount === 0
            ? t("paginationNoResults")
            : t("paginationShowing")
                  .replace("{first}", String(firstItem))
                  .replace("{last}", String(lastItem))
                  .replace("{total}", String(totalCount));

    return (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-4">
            {/* Inline-start: showing X–Y of Z + page size */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Bidi>{showingLabel}</Bidi>
                <Select
                    value={String(pageSize)}
                    onValueChange={(val) => {
                        onPageSizeChange(Number(val));
                        onPageChange(1);
                    }}
                    disabled={isLoading}
                >
                    <SelectTrigger className="h-8 w-[70px]">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent side="top">
                        {pageSizeOptions.map((opt) => (
                            <SelectItem key={opt} value={String(opt)}>
                                {opt}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <span>{t("perPage")}</span>
            </div>

            {/* Inline-end: page buttons */}
            <div className="flex items-center gap-1">
                <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onPageChange(pageNumber - 1)}
                    disabled={pageNumber <= 1 || isLoading}
                    aria-label={t("previous")}
                >
                    <ChevronLeft className="rtl:-scale-x-100 h-4 w-4" />
                </Button>

                {getPageNumbers().map((p, idx) =>
                    p === "..." ? (
                        <span key={`ellipsis-${idx}`} className="px-1 text-muted-foreground">
                            …
                        </span>
                    ) : (
                        <Button
                            key={p}
                            variant={p === pageNumber ? "default" : "outline"}
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => onPageChange(p as number)}
                            disabled={isLoading}
                        >
                            {p}
                        </Button>
                    )
                )}

                <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onPageChange(pageNumber + 1)}
                    disabled={pageNumber >= totalPages || isLoading}
                    aria-label={t("next")}
                >
                    <ChevronRight className="rtl:-scale-x-100 h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}

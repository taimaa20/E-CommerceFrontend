"use client";

import * as React from "react";
import { Check, ChevronDown, Loader2, Search, X } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export interface StandardFilterOption {
    value: string;
    label: string;
    description?: string | null;
    disabled?: boolean;
    searchText?: string;
}

interface StandardFilterBaseProps {
    label?: string;
    placeholder: string;
    searchPlaceholder: string;
    emptyText: string;
    loadingText: string;
    clearLabel: string;
    selectAllLabel?: string;
    options: StandardFilterOption[];
    icon?: React.ReactNode;
    loading?: boolean;
    disabled?: boolean;
    className?: string;
    triggerClassName?: string;
    contentClassName?: string;
    align?: "start" | "center" | "end";
    clearable?: boolean;
    maxMenuHeightClassName?: string;
}

type StandardFilterProps =
    | (StandardFilterBaseProps & {
        multiple?: false;
        value: string | null;
        onValueChange: (value: string | null) => void;
    })
    | (StandardFilterBaseProps & {
        multiple: true;
        values: string[];
        onValuesChange: (values: string[]) => void;
    });

export function StandardFilter(props: StandardFilterProps) {
    const [open, setOpen] = React.useState(false);
    const [query, setQuery] = React.useState("");
    const selectedValues = props.multiple
        ? props.values
        : props.value === null || props.value === undefined
            ? []
            : [props.value];
    const selectedSet = new Set(selectedValues);
    const visibleOptions = props.options.filter((option) => {
        const needle = normalizeFilterText(query);
        if (!needle) return true;
        const haystack = normalizeFilterText(`${option.label} ${option.description ?? ""} ${option.searchText ?? ""}`);
        return haystack.includes(needle);
    });
    const enabledVisibleOptions = visibleOptions.filter((option) => !option.disabled);
    const selectedOptions = props.options.filter((option) => selectedSet.has(option.value));
    const triggerLabel = getTriggerLabel(props.placeholder, selectedOptions, props.multiple);
    const hasSelection = selectedValues.length > 0;

    const handleSingleChange = (value: string) => {
        if (props.multiple) return;
        props.onValueChange(value);
        setOpen(false);
        setQuery("");
    };

    const handleMultiToggle = (value: string) => {
        if (!props.multiple) return;
        const next = new Set(props.values);
        if (next.has(value)) {
            next.delete(value);
        } else {
            next.add(value);
        }
        props.onValuesChange(Array.from(next));
    };

    const handleClear = () => {
        if (props.multiple) {
            props.onValuesChange([]);
        } else {
            props.onValueChange(null);
        }
        setQuery("");
    };

    const handleSelectAllVisible = () => {
        if (!props.multiple) return;
        const next = new Set(props.values);
        enabledVisibleOptions.forEach((option) => next.add(option.value));
        props.onValuesChange(Array.from(next));
    };

    return (
        <DropdownMenu open={open} onOpenChange={setOpen}>
            <DropdownMenuTrigger asChild>
                <button
                    type="button"
                    disabled={props.disabled}
                    aria-label={props.label ?? props.placeholder}
                    className={cn(
                        "inline-flex h-10 min-w-0 items-center justify-between gap-2 rounded-md border bg-background px-3 text-sm shadow-xs outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50",
                        props.triggerClassName,
                        props.className,
                    )}
                >
                    <span className="flex min-w-0 items-center gap-2">
                        {props.icon ? <span className="shrink-0 text-muted-foreground">{props.icon}</span> : null}
                        {props.label ? <span className="shrink-0 text-muted-foreground">{props.label}</span> : null}
                        <span className="truncate font-medium">{triggerLabel}</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-1">
                        {props.loading ? <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" /> : null}
                        {props.clearable && hasSelection ? (
                            <span
                                role="button"
                                tabIndex={0}
                                aria-label={props.clearLabel}
                                className="rounded-sm p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                                onClick={(event) => {
                                    event.preventDefault();
                                    event.stopPropagation();
                                    handleClear();
                                }}
                                onKeyDown={(event) => {
                                    if (event.key !== "Enter" && event.key !== " ") return;
                                    event.preventDefault();
                                    event.stopPropagation();
                                    handleClear();
                                }}
                            >
                                <X className="h-3.5 w-3.5" />
                            </span>
                        ) : null}
                        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                    </span>
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                align={props.align ?? "start"}
                className={cn("w-[--radix-dropdown-menu-trigger-width] min-w-64 p-0", props.contentClassName)}
                onCloseAutoFocus={(event) => event.preventDefault()}
            >
                <div className="space-y-2 border-b p-2">
                    <div className="relative">
                        <Search className="absolute start-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            onKeyDown={(event) => {
                                if (event.key !== "Escape") event.stopPropagation();
                            }}
                            placeholder={props.searchPlaceholder}
                            className="h-9 ps-8 text-sm"
                        />
                    </div>
                    {props.multiple ? (
                        <div className="flex items-center justify-between gap-2">
                            <Button
                                type="button"
                                variant="ghost"
                                size="xs"
                                className="h-7 px-2"
                                onClick={handleSelectAllVisible}
                                disabled={enabledVisibleOptions.length === 0}
                            >
                                {props.selectAllLabel ?? "Select all"}
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                size="xs"
                                className="h-7 px-2"
                                onClick={handleClear}
                                disabled={!hasSelection}
                            >
                                {props.clearLabel}
                            </Button>
                        </div>
                    ) : null}
                </div>

                {props.loading ? (
                    <div className="flex items-center gap-2 p-3 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {props.loadingText}
                    </div>
                ) : visibleOptions.length === 0 ? (
                    <div className="p-3 text-sm text-muted-foreground">{props.emptyText}</div>
                ) : (
                    <ScrollArea className={cn("max-h-64", props.maxMenuHeightClassName)}>
                        <div className="p-1">
                            {props.label ? (
                                <>
                                    <DropdownMenuLabel className="px-2 text-xs text-muted-foreground">
                                        {props.label}
                                    </DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                </>
                            ) : null}
                            {visibleOptions.map((option) => props.multiple ? (
                                <DropdownMenuCheckboxItem
                                    key={option.value}
                                    checked={selectedSet.has(option.value)}
                                    disabled={option.disabled}
                                    onCheckedChange={() => handleMultiToggle(option.value)}
                                    onSelect={(event) => event.preventDefault()}
                                >
                                    <OptionText option={option} />
                                </DropdownMenuCheckboxItem>
                            ) : (
                                <DropdownMenuItem
                                    key={option.value}
                                    disabled={option.disabled}
                                    onSelect={() => handleSingleChange(option.value)}
                                >
                                    <OptionText option={option} />
                                    {selectedSet.has(option.value) ? <Check className="ms-auto h-4 w-4" /> : null}
                                </DropdownMenuItem>
                            ))}
                        </div>
                    </ScrollArea>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

function OptionText({ option }: { option: StandardFilterOption }) {
    return (
        <span className="min-w-0">
            <span className="block truncate">{option.label}</span>
            {option.description ? (
                <span className="block truncate text-xs text-muted-foreground">{option.description}</span>
            ) : null}
        </span>
    );
}

function getTriggerLabel(
    placeholder: string,
    selectedOptions: StandardFilterOption[],
    multiple?: boolean,
) {
    if (selectedOptions.length === 0) return placeholder;
    if (!multiple) return selectedOptions[0].label;
    if (selectedOptions.length === 1) return selectedOptions[0].label;
    return `${selectedOptions[0].label} +${selectedOptions.length - 1}`;
}

function normalizeFilterText(value: string): string {
    return value.normalize("NFKC").trim().toLocaleLowerCase();
}

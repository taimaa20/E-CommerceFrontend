"use client";

import { memo, useCallback, useEffect, useRef, type ChangeEvent, type KeyboardEvent } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";

interface SearchBarProps {
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
  /** Enter — a barcode scanner ends its transmission with one. Absent = Enter does nothing,
   *  which is the behaviour every existing caller had. */
  onSubmit?: (value: string) => void;
  /** Focus on mount so a scan works the moment the till opens, with no click first. */
  autoFocus?: boolean;
}

function SearchBarComponent({ value, placeholder, onChange, onSubmit, autoFocus }: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      onChange(event.target.value);
    },
    [onChange],
  );

  const handleClear = useCallback(() => {
    onChange("");
    inputRef.current?.focus();
  }, [onChange]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onChange("");
        return;
      }
      if (event.key !== "Enter" || !onSubmit) return;
      // Enter here only ever resolves a search term to a product. It never confirms an
      // order and never takes payment — those stay deliberate, mouse-driven actions.
      event.preventDefault();
      const term = event.currentTarget.value.trim();
      if (term) onSubmit(term);
    },
    [onChange, onSubmit],
  );

  return (
    <div className="relative min-w-0 flex-1">
      <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <Input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoComplete="off"
        className="h-11 min-h-11 rounded-lg bg-white px-10 py-2.5 text-sm"
      />
      {value && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={handleClear}
          className="absolute end-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

export const SearchBar = memo(SearchBarComponent);

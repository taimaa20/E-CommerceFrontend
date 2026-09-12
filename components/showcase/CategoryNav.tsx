"use client";

import React, { useRef, useEffect } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { normalizeImageSrc } from "@/lib/normalize-image-src";
import { LayoutGrid } from "lucide-react";

interface Category {
    id: string;
    name: string;
    displayName?: string;
    imageUrl?: string;
    isActive: boolean;
}

interface CategoryNavExtraTab {
    id: string;
    label: string;
    icon?: React.ReactNode;
    count?: number;
}

interface CategoryNavProps {
    categories: Category[];
    activeId: string | null;
    onSelect: (id: string | null) => void;
    allLabel: string;
    extraTabs?: CategoryNavExtraTab[];
    /** Optional per-category product counts — renders as a small chip inside each pill. Website parity. */
    counts?: Record<string, number>;
    /** Optional total count rendered on the "All" pill. */
    totalCount?: number;
}

export default function CategoryNav({ categories, activeId, onSelect, allLabel, extraTabs = [], counts, totalCount }: CategoryNavProps) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const activeRef = useRef<HTMLButtonElement>(null);

    // Auto-scroll the active pill into view
    useEffect(() => {
        if (activeRef.current && scrollRef.current) {
            const container = scrollRef.current;
            const pill = activeRef.current;
            const offset = pill.offsetLeft - container.offsetWidth / 2 + pill.offsetWidth / 2;
            container.scrollTo({ left: offset, behavior: "smooth" });
        }
    }, [activeId]);

    return (
        <nav className="showcase-category-nav" role="tablist" aria-label="Menu categories">
            <div ref={scrollRef} className="showcase-category-scroll">
                {/* "All" pill */}
                <button
                    ref={activeId === null ? activeRef : undefined}
                    role="tab"
                    aria-selected={activeId === null}
                    onClick={() => onSelect(null)}
                    className={cn(
                        "showcase-category-pill",
                        activeId === null && "active"
                    )}
                >
                    <LayoutGrid className="w-4 h-4" />
                    <span>{allLabel}</span>
                    {typeof totalCount === "number" && (
                        <span className="showcase-category-pill-count">{totalCount}</span>
                    )}
                </button>

                {extraTabs.map((tab) => (
                    <button
                        key={tab.id}
                        ref={activeId === tab.id ? activeRef : undefined}
                        role="tab"
                        aria-selected={activeId === tab.id}
                        onClick={() => onSelect(tab.id)}
                        className={cn(
                            "showcase-category-pill",
                            activeId === tab.id && "active"
                        )}
                    >
                        {tab.icon}
                        <span>{tab.label}</span>
                        {typeof tab.count === "number" && (
                            <span className="showcase-category-pill-count">{tab.count}</span>
                        )}
                    </button>
                ))}

                {categories.map((cat) => {
                    const categoryImageSrc = normalizeImageSrc(cat.imageUrl);
                    const count = counts?.[cat.id];

                    return (
                        <button
                            key={cat.id}
                            ref={activeId === cat.id ? activeRef : undefined}
                            role="tab"
                            aria-selected={activeId === cat.id}
                            onClick={() => onSelect(cat.id)}
                            className={cn(
                                "showcase-category-pill",
                                activeId === cat.id && "active"
                            )}
                        >
                            {categoryImageSrc && (
                                <Image
                                    src={categoryImageSrc}
                                    alt=""
                                    width={20}
                                    height={20}
                                    unoptimized
                                    className="h-5 w-5 rounded-full object-cover"
                                />
                            )}
                            <span>{cat.displayName || cat.name}</span>
                            {typeof count === "number" && (
                                <span className="showcase-category-pill-count">{count}</span>
                            )}
                        </button>
                    );
                })}
            </div>
        </nav>
    );
}

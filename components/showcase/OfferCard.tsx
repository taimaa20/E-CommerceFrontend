"use client";

import React from "react";
import Image from "next/image";
import { Eye, Gift, Clock3, Tag } from "lucide-react";
import { useLocale } from "@/components/locale-provider";
import { buildOfferTimeLabel, isOfferAvailableNow } from "@/lib/offer-utils";
import { OfferResponseDto } from "@/types/offer";
import { useSettingsStore } from "@/store/settingsStore";

interface OfferCardProps {
    offer: OfferResponseDto;
    formatPrice: (amount: number) => string;
    onView: (offer: OfferResponseDto) => void;
    viewLabel: string;
}

export default function OfferCard({ offer, formatPrice, onView, viewLabel }: OfferCardProps) {
    const { locale } = useLocale();
    const timeZone = useSettingsStore((state) => state.settings.timeZoneId);
    const isAr = locale === "ar";
    const primaryName = isAr ? (offer.nameAr || offer.name) : (offer.name || offer.nameAr);
    const description = isAr ? (offer.descriptionAr || offer.description) : (offer.description || offer.descriptionAr);
    const savings = Math.max(offer.originalTotal - offer.finalPrice, 0);
    const availableNow = isOfferAvailableNow(offer, timeZone);
    const availabilityLabel = availableNow
        ? (isAr ? "متاح الآن" : "Available now")
        : (isAr ? "غير متاح الآن" : "Not available now");
    const offerLabel = isAr ? "العروض" : "Offers";
    const finalLabel = isAr ? "النهائي" : "Final";
    const originalLabel = isAr ? "الأصلي" : "Original";
    const savingLabel = isAr ? "التوفير" : "Saving";
    const timeLabel = isAr ? "الوقت" : "Time";
    const offerImageSrc = offer.imageUrl || "/offer-placeholder.svg";

    return (
        <article
            className={`group relative h-full overflow-hidden rounded-2xl border border-amber-200/70 bg-gradient-to-br from-amber-50 via-white to-orange-50 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-xl hover:shadow-amber-100/80 ${availableNow ? "" : "opacity-80"}`}
            onClick={() => onView(offer)}
            role="button"
            tabIndex={0}
            aria-label={primaryName}
            onKeyDown={(e) => e.key === "Enter" && onView(offer)}
        >
            <div className="absolute end-0 top-0 h-24 w-24 rounded-full bg-amber-200/30 blur-3xl" />

            <div className="relative flex h-full flex-col gap-3 p-4">
                <div className="-m-4 mb-1 overflow-hidden border-b border-amber-200/70 bg-amber-50">
                    <div className="relative aspect-[16/9] w-full">
                        <Image
                            src={offerImageSrc}
                            alt={primaryName}
                            fill
                            unoptimized
                            sizes="(max-width: 640px) 100vw, 24rem"
                            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                        />
                    </div>
                </div>

                <div className="flex min-h-[7rem] items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                            <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold shadow-sm ${availableNow ? "bg-emerald-600 text-white" : "bg-slate-700 text-white"}`}>
                                {availabilityLabel}
                            </span>
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-white/85 px-2.5 py-1 text-[10px] font-semibold text-amber-700">
                                <Gift className="h-3 w-3" />
                                <span>{offerLabel}</span>
                            </span>
                        </div>
                        <h3 className="line-clamp-1 text-xl font-bold text-slate-900">{primaryName}</h3>
                        {description ? (
                            <p className="mt-1 line-clamp-2 min-h-[2.5rem] text-sm text-slate-600">{description}</p>
                        ) : null}
                    </div>

                    <div className="shrink-0 rounded-xl bg-slate-900 px-3 py-2 text-end text-white shadow-lg">
                        <div className="text-[10px] font-medium uppercase tracking-[0.2em] text-white/60">
                            {finalLabel}
                        </div>
                        <div className="text-base font-black">{formatPrice(offer.finalPrice)}</div>
                    </div>
                </div>

                <div className="flex min-h-[3.5rem] flex-wrap content-start gap-2">
                    {offer.products.slice(0, 3).map((product) => (
                        <span
                            key={`${offer.id}-${product.productId}`}
                            className="rounded-full border border-slate-200 bg-white/90 px-2.5 py-1 text-xs font-medium text-slate-700"
                        >
                            {isAr ? (product.nameAr || product.name) : (product.name || product.nameAr)} × {product.quantity}
                        </span>
                    ))}
                    {offer.products.length > 3 ? (
                        <span className="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">
                            +{offer.products.length - 3}
                        </span>
                    ) : null}
                </div>

                <div className="mt-auto flex flex-wrap items-stretch gap-2">
                    <div className="min-w-[7rem] flex-1 rounded-xl border border-white/80 bg-white/75 p-2.5">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                            {originalLabel}
                        </div>
                        <div className="mt-1 text-sm font-bold text-slate-500 line-through">
                            {formatPrice(offer.originalTotal)}
                        </div>
                    </div>
                    <div className="min-w-[7rem] flex-1 rounded-xl border border-white/80 bg-white/75 p-2.5">
                        <div className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                            <Tag className="h-3.5 w-3.5" />
                            {savingLabel}
                        </div>
                        <div className="mt-1 text-sm font-bold text-emerald-600">
                            {formatPrice(savings)}
                        </div>
                    </div>
                    <div className="min-w-[7rem] flex-1 rounded-xl border border-white/80 bg-white/75 p-2.5">
                        <div className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                            <Clock3 className="h-3.5 w-3.5" />
                            {timeLabel}
                        </div>
                        <div className="mt-1 text-sm font-bold text-slate-700">
                            {buildOfferTimeLabel(offer)}
                        </div>
                    </div>
                    <div className="ms-auto flex items-center">
                        <span className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white opacity-90 transition group-hover:opacity-100">
                        <Eye className="h-3.5 w-3.5" />
                        {viewLabel}
                        </span>
                    </div>
                </div>
            </div>
        </article>
    );
}

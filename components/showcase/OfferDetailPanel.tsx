"use client";

import React from "react";
import Image from "next/image";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useLocale } from "@/components/locale-provider";
import { buildOfferTimeLabel, getOfferMajorAllergens, isOfferAvailableNow, normalizeOfferDate } from "@/lib/offer-utils";
import { OfferResponseDto } from "@/types/offer";
import { AlertTriangle, CalendarDays, Clock3, Flame, Gift, Tag, X } from "lucide-react";
import { useSettingsStore } from "@/store/settingsStore";

interface OfferDetailPanelProps {
    offer: OfferResponseDto | null;
    open: boolean;
    onClose: () => void;
    formatPrice: (amount: number) => string;
}

export default function OfferDetailPanel({ offer, open, onClose, formatPrice }: OfferDetailPanelProps) {
    const { locale } = useLocale();
    const timeZone = useSettingsStore((state) => state.settings.timeZoneId);
    const isAr = locale === "ar";

    if (!offer) return null;

    const primaryName = isAr ? (offer.nameAr || offer.name) : (offer.name || offer.nameAr);
    const offerDescription = isAr ? (offer.descriptionAr || offer.description) : (offer.description || offer.descriptionAr);
    const majorAllergens = getOfferMajorAllergens(offer);
    const savings = Math.max(offer.originalTotal - offer.finalPrice, 0);
    const availableNow = isOfferAvailableNow(offer, timeZone);
    const offerBadgeLabel = isAr ? "العرض الخاص" : "Special Offer";
    const finalLabel = isAr ? "النهائي" : "Final";
    const originalLabel = isAr ? "الأصلي" : "Original";
    const savingLabel = isAr ? "التوفير" : "Saving";
    const discountLabel = offer.discountType === 0
        ? `${isAr ? "سعر العرض" : "Offer price"}: ${formatPrice(offer.discountValue)}`
        : `${isAr ? "خصم" : "Discount"}: ${offer.discountValue}%`;
    const offerImageSrc = offer.imageUrl || "/offer-placeholder.svg";

    return (
        <Sheet open={open} onOpenChange={(value) => !value && onClose()}>
            <SheetContent
                side="right"
                showCloseButton={false}
                className="showcase-detail-sheet w-full sm:max-w-md p-0 flex flex-col h-[100dvh] min-h-0"
                dir={isAr ? "rtl" : "ltr"}
            >
                <div className="relative h-44 flex-shrink-0 overflow-hidden bg-gradient-to-br from-amber-400 via-orange-400 to-rose-500 sm:h-52">
                    <Image
                        src={offerImageSrc}
                        alt={primaryName}
                        fill
                        unoptimized
                        sizes="(max-width: 640px) 100vw, 28rem"
                        className="object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/20 to-transparent" />
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.28),transparent_35%)]" />
                    <div className="absolute -bottom-10 -start-10 h-24 w-24 rounded-full bg-white/20 blur-2xl" />

                    <button
                        onClick={onClose}
                        className={isAr
                            ? "absolute top-3 start-3 z-10 h-8 w-8 rounded-full border border-border bg-background/80 flex items-center justify-center backdrop-blur-sm transition-colors hover:bg-background"
                            : "absolute top-3 end-3 z-10 h-8 w-8 rounded-full border border-border bg-background/80 flex items-center justify-center backdrop-blur-sm transition-colors hover:bg-background"
                        }
                        aria-label="Close"
                    >
                        <X className="h-4 w-4" />
                    </button>

                    <div className="absolute inset-x-0 bottom-0 p-4 text-white sm:p-5">
                        <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-semibold backdrop-blur-sm">
                            <Gift className="h-3.5 w-3.5" />
                            <span>{offerBadgeLabel}</span>
                        </div>
                        <SheetHeader className="space-y-2 p-0 text-start">
                            <SheetTitle className="text-2xl font-black text-white sm:text-3xl">
                                {primaryName}
                            </SheetTitle>
                        </SheetHeader>
                    </div>
                </div>

                <ScrollArea className="min-h-0 flex-1 overflow-y-auto">
                    <div className="space-y-4 px-4 pb-6 pt-4 text-start sm:px-5">
                        {offerDescription ? (
                            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm leading-5 text-slate-700">
                                {offerDescription}
                            </div>
                        ) : null}

                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                            <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                                <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                                    {finalLabel}
                                </div>
                                <div className="mt-2 text-xl font-black text-slate-900">
                                    {formatPrice(offer.finalPrice)}
                                </div>
                            </div>
                            <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                                <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                                    {originalLabel}
                                </div>
                                <div className="mt-2 text-base font-bold text-slate-500 line-through">
                                    {formatPrice(offer.originalTotal)}
                                </div>
                            </div>
                            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 shadow-sm">
                                <div className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-600">
                                    <Tag className="h-3.5 w-3.5" />
                                    {savingLabel}
                                </div>
                                <div className="mt-2 text-base font-black text-emerald-700">
                                    {formatPrice(savings)}
                                </div>
                            </div>
                        </div>

                        {majorAllergens.length > 0 ? (
                            <div className="showcase-detail-section !rounded-xl !p-3">
                                <h4 className={isAr ? "showcase-detail-section-title justify-end" : "showcase-detail-section-title"}>
                                    <AlertTriangle className="w-4 h-4 text-warning" />
                                    <span>{isAr ? "مسببات الحساسية الرئيسية" : "Major allergens"}</span>
                                </h4>
                                <div className={isAr ? "flex flex-wrap justify-end gap-2" : "flex flex-wrap gap-2"}>
                                    {majorAllergens.map((allergen) => (
                                        <Badge key={allergen.flag} variant="outline" className="rounded-full bg-white px-3 py-1 text-xs font-semibold">
                                            {isAr ? allergen.ar : allergen.en}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        ) : null}

                        <div className="showcase-detail-section !rounded-xl !p-3">
                            <h4 className={isAr ? "showcase-detail-section-title justify-end" : "showcase-detail-section-title"}>
                                <Gift className="w-4 h-4 text-primary" />
                                <span>{isAr ? "محتويات العرض" : "Offer includes"}</span>
                            </h4>
                            <div className="space-y-2">
                                {offer.products.map((product) => (
                                    <div
                                        key={`${offer.id}-${product.productId}`}
                                        className="flex items-start justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5"
                                    >
                                        <div className="flex-1 text-start">
                                            <div className="text-base font-semibold text-slate-900">
                                                {isAr ? (product.nameAr || product.name) : (product.name || product.nameAr)}
                                            </div>
                                            <div className={isAr ? "flex flex-wrap items-center justify-end gap-2 text-xs text-slate-500" : "flex flex-wrap items-center gap-2 text-xs text-slate-500"}>
                                                <span>{isAr ? "الكمية" : "Qty"}: {product.quantity}</span>
                                                {product.calories != null ? (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2 py-0.5 font-medium text-orange-700">
                                                        <Flame className="h-3 w-3" />
                                                        {product.calories} kcal
                                                    </span>
                                                ) : null}
                                            </div>
                                            {(isAr ? (product.descriptionAr || product.description) : (product.description || product.descriptionAr)) && (
                                                <p className="mt-1.5 text-sm leading-5 text-slate-600">
                                                    {isAr ? (product.descriptionAr || product.description) : (product.description || product.descriptionAr)}
                                                </p>
                                            )}
                                        </div>
                                        <div className="text-sm font-bold text-slate-700">
                                            {formatPrice(product.price * product.quantity)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="showcase-detail-section !rounded-xl !p-3">
                            <h4 className={isAr ? "showcase-detail-section-title justify-end" : "showcase-detail-section-title"}>
                                <Clock3 className="w-4 h-4 text-primary" />
                                <span>{isAr ? "التفاصيل" : "Details"}</span>
                            </h4>
                            <div className="grid gap-2 sm:grid-cols-2">
                                <div className="rounded-lg border border-slate-200 bg-white p-3">
                                    <div className="mb-1.5 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                                        <CalendarDays className="h-4 w-4" />
                                        <span>{isAr ? "الفترة" : "Date range"}</span>
                                    </div>
                                    <div className="text-sm font-semibold text-slate-800">
                                        {normalizeOfferDate(offer.startDate)} - {normalizeOfferDate(offer.endDate)}
                                    </div>
                                </div>
                                <div className="rounded-lg border border-slate-200 bg-white p-3">
                                    <div className="mb-1.5 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                                        <Clock3 className="h-4 w-4" />
                                        <span>{isAr ? "الوقت اليومي" : "Daily time"}</span>
                                    </div>
                                    <div className="text-sm font-semibold text-slate-800">
                                        {buildOfferTimeLabel(offer)}
                                    </div>
                                </div>
                            </div>

                            <div className="mt-2.5 flex flex-wrap gap-2">
                                <Badge variant="secondary" className="rounded-full px-2.5 py-1 text-[11px] font-semibold">
                                    {discountLabel}
                                </Badge>
                                <Badge
                                    className={availableNow
                                        ? "rounded-full bg-emerald-600 px-2.5 py-1 text-[11px] font-semibold text-white"
                                        : "rounded-full bg-slate-500 px-2.5 py-1 text-[11px] font-semibold text-white"
                                    }
                                >
                                    {availableNow
                                        ? (isAr ? "متاح الآن" : "Available now")
                                        : (isAr ? "غير متاح الآن" : "Not available now")}
                                </Badge>
                            </div>
                        </div>
                    </div>
                </ScrollArea>
            </SheetContent>
        </Sheet>
    );
}

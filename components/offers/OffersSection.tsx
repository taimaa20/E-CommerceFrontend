"use client";

import { memo, useCallback } from "react";
import Image from "next/image";
import { Clock, Gift } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useLocale } from "@/components/locale-provider";
import { formatCurrency } from "@/lib/currencies";
import { buildOfferTimeLabel } from "@/lib/offer-utils";
import { OfferResponseDto } from "@/types/offer";

interface OffersSectionProps {
  currency: string;
  offers: OfferResponseDto[];
  onSelectOffer: (offer: OfferResponseDto) => void;
  disabled?: boolean;
}

interface OfferCardProps {
  currency: string;
  disabled: boolean;
  isAr: boolean;
  offer: OfferResponseDto;
  onSelectOffer: (offer: OfferResponseDto) => void;
}

const getOfferName = (offer: OfferResponseDto, isAr: boolean) =>
  isAr ? offer.nameAr || offer.name : offer.name || offer.nameAr;

const getOfferDescription = (offer: OfferResponseDto, isAr: boolean) =>
  isAr ? offer.descriptionAr || offer.description : offer.description || offer.descriptionAr;

function OfferCardComponent({ currency, disabled, isAr, offer, onSelectOffer }: OfferCardProps) {
  const savings = Math.max(0, offer.originalTotal - offer.finalPrice);
  const offerImageSrc = offer.imageUrl || "/offer-placeholder.svg";
  const isDisabled = disabled || !offer.isAvailableNow;
  const offerName = getOfferName(offer, isAr);
  const offerDescription = getOfferDescription(offer, isAr);
  const unavailableLabel = isAr ? "غير متاح الآن" : "Not available now";

  const handleClick = useCallback(() => {
    if (!isDisabled) {
      onSelectOffer(offer);
    }
  }, [isDisabled, offer, onSelectOffer]);

  return (
    <button
      type="button"
      disabled={isDisabled}
      onClick={handleClick}
      className={`group relative flex min-h-36 overflow-hidden rounded-lg border bg-white text-start shadow-xs transition ${
        isDisabled
          ? "cursor-not-allowed border-slate-200"
          : "border-amber-200 hover:border-amber-300 hover:shadow-md active:scale-[0.99]"
      }`}
    >
      <div className="relative w-32 shrink-0 bg-slate-100 sm:w-36">
        <Image
          src={offerImageSrc}
          alt={offerName}
          fill
          unoptimized
          sizes="9rem"
          className="object-cover transition duration-300 group-hover:scale-105"
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="line-clamp-1 text-sm font-bold text-slate-900">{offerName}</div>
            {offerDescription && (
              <div className="mt-1 line-clamp-1 text-xs text-slate-500">{offerDescription}</div>
            )}
          </div>
          <Gift className="h-4 w-4 shrink-0 text-amber-600" />
        </div>

        <div className="mt-2 flex flex-wrap gap-1.5">
          {offer.products.slice(0, 2).map((product) => (
            <span
              key={`${offer.id}-${product.productId}`}
              className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-700"
            >
              {(isAr ? product.nameAr || product.name : product.name || product.nameAr)} × {product.quantity}
            </span>
          ))}
          {offer.products.length > 2 && (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
              +{offer.products.length - 2}
            </span>
          )}
        </div>

        <div className="mt-auto flex items-end justify-between gap-3 pt-3">
          <div>
            {offer.originalTotal > offer.finalPrice && (
              <div className="text-[11px] font-medium text-slate-400 line-through">
                {formatCurrency(offer.originalTotal, currency)}
              </div>
            )}
            <div className="text-lg font-bold text-success">
              {formatCurrency(offer.finalPrice, currency)}
            </div>
          </div>
          <div className="text-end">
            {savings > 0 && (
              <div className="mb-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                {isAr ? "وفر" : "Save"} {formatCurrency(savings, currency)}
              </div>
            )}
            <div className="inline-flex items-center gap-1 rounded-full bg-slate-950 px-2 py-1 text-[11px] font-bold text-amber-200">
              <Clock className="h-3 w-3" />
              {buildOfferTimeLabel(offer)}
            </div>
          </div>
        </div>
      </div>

      {!offer.isAvailableNow && (
        <>
          <div className="absolute inset-0 bg-white/25" aria-hidden="true" />
          <div className="absolute end-3 top-3 rounded-full bg-slate-950 px-3 py-1 text-xs font-bold text-white shadow-sm">
            {unavailableLabel}
          </div>
        </>
      )}
    </button>
  );
}

const OfferCard = memo(OfferCardComponent);

export function OffersSection({ currency, offers, onSelectOffer, disabled = false }: OffersSectionProps) {
  const { locale } = useLocale();
  const isAr = locale === "ar";

  if (offers.length === 0) {
    return null;
  }

  return (
    <section className="mb-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Gift className="h-4 w-4 text-amber-600" />
          <h2 className="text-base font-bold text-slate-900">{isAr ? "العروض" : "Offers"}</h2>
        </div>
        <Badge className="bg-emerald-100 px-2.5 py-1 text-emerald-700 hover:bg-emerald-100">
          {offers.length} {isAr ? "عرض" : `offer${offers.length === 1 ? "" : "s"}`}
        </Badge>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-3">
        {offers.map((offer) => (
          <OfferCard
            key={offer.id}
            offer={offer}
            currency={currency}
            disabled={disabled}
            isAr={isAr}
            onSelectOffer={onSelectOffer}
          />
        ))}
      </div>
    </section>
  );
}

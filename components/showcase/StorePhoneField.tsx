"use client";

import { useId } from "react";
import {
    countryOptions,
    dialCode,
    flagSrc,
    formatNational,
    isSupportedCountry,
    type PhoneCountry,
} from "@/lib/store-phone";

interface StorePhoneFieldProps {
    /** The national part as the shopper typed it; the parent keeps the E.164 form. */
    value: string;
    country: PhoneCountry;
    onChange: (national: string) => void;
    onCountryChange: (country: PhoneCountry) => void;
    isAr: boolean;
    invalid?: boolean;
    describedBy?: string;
}

/**
 * Country picker plus national number, in one control.
 *
 * The country is a native `<select>` on purpose: on a phone that is the platform's own
 * picker, it reads correctly to a screen reader and in RTL, and it needs no popover layered
 * over the storefront's own tokens. The flag for the *selected* country sits beside it as an
 * SVG so the shopper sees "🇯🇴 +962" at a glance, which a native option list cannot render.
 */
export default function StorePhoneField({
    value,
    country,
    onChange,
    onCountryChange,
    isAr,
    invalid,
    describedBy,
}: StorePhoneFieldProps) {
    const numberId = useId();
    const countryId = useId();
    const options = countryOptions(isAr ? "ar" : "en");
    const selected = options.find(option => option.code === country);
    const t = (en: string, ar: string) => (isAr ? ar : en);

    return (
        <div className="block">
            <label className="sf-label" htmlFor={numberId}>
                {t("Mobile number", "رقم الجوال")}
            </label>
            <div
                data-invalid={invalid ? "true" : undefined}
                className="sf-phone-field"
            >
                {/* The flag and dial code are what the shopper reads; the select sits on top of
                    them, transparent, so the whole block is one tap target without losing the
                    native picker. */}
                <span className="sf-phone-country">
                    {/* A static ~400-byte SVG from public/ — next/image would add a request to
                        the optimizer for a file it cannot optimise. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={flagSrc(country)}
                        alt=""
                        aria-hidden="true"
                        width={22}
                        height={15}
                        className="sf-phone-flag"
                    />
                    <span dir="ltr" className="text-[0.9375rem] font-medium tabular-nums">{dialCode(country)}</span>
                    <svg viewBox="0 0 12 12" aria-hidden="true" className="size-3 shrink-0 opacity-50">
                        <path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <label htmlFor={countryId} className="sr-only">{t("Country", "الدولة")}</label>
                    <select
                        id={countryId}
                        value={country}
                        onChange={event => isSupportedCountry(event.target.value) && onCountryChange(event.target.value)}
                        className="sf-phone-select"
                    >
                        {options.map(option => (
                            <option key={option.code} value={option.code}>
                                {option.name} ({option.dialCode})
                            </option>
                        ))}
                    </select>
                </span>

                <input
                    id={numberId}
                    type="tel"
                    inputMode="tel"
                    dir="ltr"
                    autoComplete="tel-national"
                    aria-invalid={invalid || undefined}
                    aria-describedby={describedBy}
                    placeholder={t("7 9123 4567", "7 9123 4567")}
                    value={value}
                    onChange={event => onChange(formatNational(event.target.value, country))}
                    className="sf-phone-input"
                />
            </div>
            <span className="sf-meta mt-1 block">
                {selected
                    ? t(`We will save this as ${selected.dialCode}… in international format.`,
                        `سنحفظ الرقم بالصيغة الدولية ${selected.dialCode}…`)
                    : ""}
            </span>
        </div>
    );
}

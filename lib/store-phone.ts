/**
 * Country-aware phone handling for the storefront.
 *
 * One rule everywhere: what the shopper types is a national number inside a chosen country,
 * and what the backend stores is E.164. Nothing outside this module formats or validates a
 * phone number by hand — `libphonenumber-js` carries the per-country metadata so we do not
 * have to guess at lengths and prefixes country by country.
 */
import {
    AsYouType,
    getCountries,
    getCountryCallingCode,
    parsePhoneNumberFromString,
    type CountryCode,
} from "libphonenumber-js/max";

export type PhoneCountry = CountryCode;

/** Used when nothing in the store's own configuration or the browser suggests a country. */
const LAST_RESORT_COUNTRY: PhoneCountry = "JO";

export interface CountryOption {
    code: PhoneCountry;
    name: string;
    dialCode: string;
}

const SUPPORTED = new Set<string>(getCountries());

export function isSupportedCountry(value: string | null | undefined): value is PhoneCountry {
    return !!value && SUPPORTED.has(value);
}

/** `+962` — the visible dial code for a country. */
export function dialCode(country: PhoneCountry): string {
    return `+${getCountryCallingCode(country)}`;
}

/**
 * Every selectable country, named in the shopper's language and sorted the way that language
 * sorts. `Intl.DisplayNames` already ships the translations, so no country-name table is kept
 * in the repo to drift out of date.
 */
export function countryOptions(locale: string): CountryOption[] {
    const names = displayNames(locale);
    const collator = new Intl.Collator(locale);
    return getCountries()
        .map(code => ({ code, name: names?.of(code) ?? code, dialCode: dialCode(code) }))
        .sort((a, b) => collator.compare(a.name, b.name));
}

function displayNames(locale: string): Intl.DisplayNames | null {
    try {
        return new Intl.DisplayNames([locale], { type: "region" });
    } catch {
        return null;
    }
}

/**
 * The country to start on: the store's own contact number first (a shop in Amman should not
 * open on Afghanistan), then the browser's region, then the fallback.
 */
export function defaultCountry(storeNumbers: (string | null | undefined)[]): PhoneCountry {
    for (const candidate of storeNumbers) {
        const parsed = candidate ? parsePhoneNumberFromString(candidate.trim()) : undefined;
        if (parsed?.country) return parsed.country;
    }

    const region = browserRegion();
    return isSupportedCountry(region) ? region : LAST_RESORT_COUNTRY;
}

function browserRegion(): string | undefined {
    if (typeof navigator === "undefined") return undefined;
    try {
        return new Intl.Locale(navigator.language).maximize().region;
    } catch {
        return undefined;
    }
}

/** Groups digits the way the selected country writes them, as the shopper types. */
export function formatNational(input: string, country: PhoneCountry): string {
    return new AsYouType(country).input(stripToNationalDigits(input, country));
}

/**
 * A pasted "+962 79 123 4567" or "00962791234567" should not end up as a national number
 * starting with the country code repeated. Leading zeros of a national trunk prefix are left
 * alone — `AsYouType` knows which countries keep them.
 */
function stripToNationalDigits(input: string, country: PhoneCountry): string {
    const digits = input.replace(/\D/g, "");
    const code = getCountryCallingCode(country);
    if (input.trim().startsWith("+") && digits.startsWith(code)) return digits.slice(code.length);
    if (digits.startsWith(`00${code}`)) return digits.slice(code.length + 2);
    return digits;
}

/** The value sent to the backend: `+9627XXXXXXXX`, or "" while the number is incomplete. */
export function toE164(input: string, country: PhoneCountry): string {
    const parsed = parse(input, country);
    return parsed?.number ?? "";
}

/** True only for a number that is valid for the selected country, not merely plausible. */
export function isValidForCountry(input: string, country: PhoneCountry): boolean {
    return parse(input, country)?.isValid() === true;
}

function parse(input: string, country: PhoneCountry) {
    const national = stripToNationalDigits(input, country);
    if (!national) return undefined;
    return parsePhoneNumberFromString(national, country);
}

/** Splits a stored E.164 number back into a country and the national part, for editing. */
export function fromE164(value: string | null | undefined): { country: PhoneCountry; national: string } | null {
    const parsed = value ? parsePhoneNumberFromString(value.trim()) : undefined;
    if (!parsed?.country) return null;
    return { country: parsed.country, national: parsed.formatNational() };
}

/** `/flags/3x2/JO.svg` — served from public/, so no flag payload reaches the JS bundle. */
export function flagSrc(country: PhoneCountry): string {
    return `/flags/3x2/${country}.svg`;
}

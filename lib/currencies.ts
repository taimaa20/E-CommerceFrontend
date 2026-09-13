/**
 * Money formatting for the whole app.
 *
 * The currency CODE is the monetary identity, and it is what gets formatted. `Intl.NumberFormat`
 * already knows every ISO-4217 currency, so a currency the business adds to the Currency lookup
 * formats correctly without anyone editing this file or redeploying.
 *
 * What this module must never do — and no longer does — is substitute one real currency for
 * another. A code it does not recognise is not an invitation to print a different currency's
 * symbol; the amount is still that currency's amount.
 *
 * Nothing here converts between currencies. There is no rate, and adding a currency adds an
 * option, never a calculation.
 */

// Currency definitions
export interface Currency {
    code: string;
    name: string;
    symbol: string;
}

/**
 * Offline display metadata for the currencies this app has always shipped with — human-readable
 * names for a handful of back-office screens.
 *
 * It is NOT the list of selectable currencies (that is the managed Currency lookup, served by
 * `/api/currencies`) and it is NOT consulted when formatting money. `symbol` in particular is
 * decoration: formatting is standards-based off the code, so a symbol here — or one an admin
 * types into the Currency lookup — can never change what an amount means.
 */
export const SUPPORTED_CURRENCIES: Record<string, Currency> = {
    JOD: { code: 'JOD', name: 'Jordanian Dinar', symbol: 'د.ا' },
    USD: { code: 'USD', name: 'US Dollar', symbol: '$' },
    EGP: { code: 'EGP', name: 'Egyptian Pound', symbol: '£' },
    SAR: { code: 'SAR', name: 'Saudi Riyal', symbol: 'ر.س' },
    QAR: { code: 'QAR', name: 'Qatari Riyal', symbol: 'ر.ق' },
};

/** Used only when a caller supplies no currency at all — never as a stand-in for one it has. */
export const DEFAULT_CURRENCY = 'USD';

export const CURRENCY_LOCALE_MAP: Record<string, string> = {
    JOD: 'ar-JO',
    USD: 'en-US',
    EGP: 'ar-EG',
    SAR: 'ar-SA',
    QAR: 'ar-QA',
};

/** ISO-4217 codes are three letters, which is exactly what `Intl.NumberFormat` will accept. */
const ISO_CURRENCY_CODE = /^[A-Z]{3}$/;

/** True when the value can be used as a currency code. */
export const isCurrencyCode = (value: string | null | undefined): boolean =>
    ISO_CURRENCY_CODE.test((value ?? '').trim().toUpperCase());

export interface CurrencyFormatOptions {
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
}

const DEFAULT_FRACTION_DIGITS = 2;

/**
 * Formats an amount in a currency, letting callers keep their own precision.
 *
 * Every money string in the app comes through here, so there is one rule about what a code
 * means rather than one per screen.
 */
export const formatCurrencyAmount = (
    amount: number,
    currencyCode: string | null | undefined,
    options: CurrencyFormatOptions = {},
): string => {
    const supplied = (currencyCode ?? '').trim().toUpperCase();
    // An absent code falls back to the app default — that is what calling `formatCurrency(x)`
    // has always meant. A code that IS supplied is never swapped for another one.
    const code = supplied || DEFAULT_CURRENCY;
    const minimumFractionDigits = options.minimumFractionDigits ?? DEFAULT_FRACTION_DIGITS;

    if (ISO_CURRENCY_CODE.test(code)) {
        try {
            return new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: code,
                minimumFractionDigits,
                ...(options.maximumFractionDigits != null
                    ? { maximumFractionDigits: options.maximumFractionDigits }
                    : {}),
            }).format(amount);
        } catch {
            // Unreachable for a well-formed code on a compliant runtime. Caught so that a
            // formatting failure can never take a page down with it.
        }
    }

    // The code is not usable as a currency. Show the amount with the code as written rather
    // than dressing it up as some other currency — the number keeps its meaning, and whoever
    // sees it can tell that the code needs fixing.
    const number = new Intl.NumberFormat('en-US', {
        minimumFractionDigits,
        maximumFractionDigits: Math.max(minimumFractionDigits, options.maximumFractionDigits ?? minimumFractionDigits),
    }).format(amount);
    return supplied ? `${supplied} ${number}` : number;
};

/** The app-wide money format: two decimals, with the currency's own precision above that. */
export const formatCurrency = (amount: number, currencyCode: string = DEFAULT_CURRENCY): string =>
    formatCurrencyAmount(amount, currencyCode);

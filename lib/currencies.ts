// Currency definitions
export interface Currency {
    code: string;
    name: string;
    symbol: string;
}

export const SUPPORTED_CURRENCIES: Record<string, Currency> = {
    JOD: { code: 'JOD', name: 'Jordanian Dinar', symbol: 'د.ا' },
    USD: { code: 'USD', name: 'US Dollar', symbol: '$' },
    EGP: { code: 'EGP', name: 'Egyptian Pound', symbol: '£' },
    SAR: { code: 'SAR', name: 'Saudi Riyal', symbol: 'ر.س' },
    QAR: { code: 'QAR', name: 'Qatari Riyal', symbol: 'ر.ق' },
};

export const DEFAULT_CURRENCY = 'USD';

export const CURRENCY_LOCALE_MAP: Record<string, string> = {
    JOD: 'ar-JO',
    USD: 'en-US',
    EGP: 'ar-EG',
    SAR: 'ar-SA',
    QAR: 'ar-QA',
};

export const formatCurrency = (amount: number, currencyCode: string = DEFAULT_CURRENCY): string => {
    const currency = SUPPORTED_CURRENCIES[currencyCode];
    
    if (!currency) {
        // Fallback to USD if currency code is not found
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2
        }).format(amount);
    }

    // Always use en-US locale for English numerals, regardless of currency
    const formatted = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency.code,
        minimumFractionDigits: 2
    }).format(amount);

    return formatted;
};

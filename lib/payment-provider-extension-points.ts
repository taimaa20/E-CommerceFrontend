export const FUTURE_PAYMENT_PROVIDERS = [
    "stripe",
    "paypal",
    "myfatoorah",
    "paytabs",
    "tap",
] as const;

export type FuturePaymentProvider = (typeof FUTURE_PAYMENT_PROVIDERS)[number];

export interface PaymentProviderExtensionPoint {
    provider: FuturePaymentProvider;
    enabled: false;
}

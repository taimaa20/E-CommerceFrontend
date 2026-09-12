"use client";

import { Loader2, Wallet } from "lucide-react";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { getPaymentMethodName, type PaymentMethodDto } from "@/lib/api-payment-methods";

/**
 * Lists the payment methods configured for the current branch, exactly as configured.
 * It deliberately makes no claim about a method's *type* — the PaymentMethod model carries
 * no card/bank/wallet classification, so inferring one from the display name would be a
 * guess. "Requires a reference number" is a separate, configured concern and is the only
 * thing that changes this component's behaviour.
 */
interface CardPaymentMethodSelectorProps {
    methods: PaymentMethodDto[];
    selectedId: string;
    onSelectedIdChange: (id: string) => void;
    referenceNumber?: string;
    onReferenceNumberChange?: (value: string) => void;
    locale: string;
    loading?: boolean;
    disabled?: boolean;
}

export function CardPaymentMethodSelector({
    methods,
    selectedId,
    onSelectedIdChange,
    referenceNumber = "",
    onReferenceNumberChange,
    locale,
    loading = false,
    disabled = false,
}: CardPaymentMethodSelectorProps) {
    const title = locale === "ar" ? "طريقة الدفع" : "Payment Method";
    const loadingText = locale === "ar" ? "جاري تحميل طرق الدفع" : "Loading payment methods";
    const emptyText = locale === "ar" ? "لا توجد طرق دفع نشطة" : "No active payment methods";
    const selectedMethod = methods.find((method) => method.id === selectedId);
    const referenceRequired = selectedMethod?.requiresReferenceNumber === true;

    return (
        <div className="rounded-xl border border-info/20 bg-info/5 p-3">
            <div className="mb-2 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                    <Wallet className="h-4 w-4 text-info" />
                    <span>{title}</span>
                </div>
                <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-info ring-1 ring-info/20">
                    {locale === "ar" ? "مطلوب" : "Required"}
                </span>
            </div>

            {loading ? (
                <div className="flex min-h-20 items-center justify-center gap-2 text-sm font-medium text-slate-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>{loadingText}</span>
                </div>
            ) : methods.length === 0 ? (
                <div className="flex min-h-20 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white text-sm font-medium text-slate-500">
                    {emptyText}
                </div>
            ) : (
                <div className="space-y-3">
                    <RadioGroup
                        value={selectedId}
                        onValueChange={onSelectedIdChange}
                        disabled={disabled}
                        className="grid grid-cols-1 gap-2 sm:grid-cols-2"
                    >
                        {methods.map((method) => {
                            const selected = selectedId === method.id;
                            return (
                                <label
                                    key={method.id}
                                    htmlFor={`payment-method-${method.id}`}
                                    className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-lg border bg-white px-3 py-2 text-sm font-semibold transition-colors ${
                                        selected
                                            ? "border-info bg-info/10 text-info shadow-sm"
                                            : "border-slate-200 text-slate-700 hover:border-info/40 hover:bg-info/5"
                                    } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
                                >
                                    <RadioGroupItem id={`payment-method-${method.id}`} value={method.id} />
                                    <span className="min-w-0 flex-1 whitespace-normal break-words leading-tight">{getPaymentMethodName(method, locale)}</span>
                                    {method.requiresReferenceNumber ? (
                                        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 ring-1 ring-amber-200">
                                            {locale === "ar" ? "مرجع" : "Ref"}
                                        </span>
                                    ) : null}
                                </label>
                            );
                        })}
                    </RadioGroup>

                    {selectedMethod ? (
                        <div
                            className={`rounded-lg border p-3 ${
                                referenceRequired ? "border-amber-200 bg-amber-50/70" : "border-slate-200 bg-slate-50/70"
                            }`}
                        >
                            <label htmlFor="payment-reference-number" className="mb-1.5 flex items-center justify-between gap-2 text-sm font-semibold text-slate-800">
                                <span>{locale === "ar" ? "رقم المرجع" : "Reference Number"}</span>
                                <span
                                    className={`rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold ring-1 ${
                                        referenceRequired
                                            ? "text-amber-700 ring-amber-200"
                                            : "text-slate-500 ring-slate-200"
                                    }`}
                                >
                                    {referenceRequired
                                        ? locale === "ar" ? "مطلوب" : "Required"
                                        : locale === "ar" ? "اختياري" : "Optional"}
                                </span>
                            </label>
                            <Input
                                id="payment-reference-number"
                                value={referenceNumber}
                                onChange={(event) => onReferenceNumberChange?.(event.target.value)}
                                maxLength={120}
                                autoComplete="off"
                                disabled={disabled}
                                aria-required={referenceRequired}
                                placeholder={locale === "ar" ? "أدخل رقم العملية" : "Enter transaction reference"}
                                className="bg-white"
                            />
                        </div>
                    ) : null}
                </div>
            )}
        </div>
    );
}

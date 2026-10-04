"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail } from "lucide-react";
import StorePhoneField from "@/components/showcase/StorePhoneField";
import { isPlausibleEmail } from "@/lib/guest-order-access";
import { defaultCountry, fromE164, isValidForCountry, toE164, type PhoneCountry } from "@/lib/store-phone";
import { useSettingsStore } from "@/store/settingsStore";

export type GuestContactField = "email" | "name" | "phone";

/**
 * Contact step for a shopper checking out without an account: email first, then the name and
 * mobile the store delivers to. Signing in stays one tap away but is never required. The email
 * is used for this order only — it is not a marketing opt-in and it does not sign anybody in.
 */
export default function GuestContactSection({
    email,
    name,
    phone,
    emailConfirmed,
    onFieldChange,
    onContinue,
    onEditEmail,
    signInHref,
    isAr,
}: {
    email: string;
    name: string;
    /** E.164, or "" while the number typed is not yet valid. */
    phone: string;
    emailConfirmed: boolean;
    onFieldChange: (field: GuestContactField, value: string) => void;
    onContinue: () => void;
    onEditEmail: () => void;
    signInHref: string;
    isAr: boolean;
}) {
    const t = (en: string, ar: string) => (isAr ? ar : en);
    const settings = useSettingsStore(state => state.settings);
    const remembered = fromE164(phone);
    const [country, setCountry] = useState<PhoneCountry | null>(remembered?.country ?? null);
    const [national, setNational] = useState(remembered?.national ?? "");
    const [emailError, setEmailError] = useState(false);
    const activeCountry = country ?? defaultCountry([settings.whatsAppNumber, settings.restaurantPhone]);

    const updatePhone = (value: string, selected: PhoneCountry) => {
        setNational(value);
        onFieldChange("phone", isValidForCountry(value, selected) ? toE164(value, selected) : "");
    };

    const continueAsGuest = (event: React.FormEvent) => {
        event.preventDefault();
        if (!isPlausibleEmail(email)) {
            setEmailError(true);
            return;
        }
        setEmailError(false);
        onContinue();
    };

    const signInPrompt = (
        <p className="sf-meta mt-3">
            {t("Already have an account?", "لديك حساب بالفعل؟")}{" "}
            <Link href={signInHref} className="font-medium text-foreground underline underline-offset-2">
                {t("Sign in", "تسجيل الدخول")}
            </Link>
        </p>
    );

    if (!emailConfirmed) {
        return (
            <form onSubmit={continueAsGuest} noValidate>
                <label htmlFor="sf-guest-email" className="sf-label">{t("Email", "البريد الإلكتروني")}</label>
                <input
                    id="sf-guest-email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    required
                    maxLength={200}
                    dir="ltr"
                    value={email}
                    aria-invalid={emailError || undefined}
                    aria-describedby="sf-guest-email-hint"
                    onChange={event => { setEmailError(false); onFieldChange("email", event.target.value); }}
                    className="sf-field"
                />
                <p id="sf-guest-email-hint" className={`mt-1.5 text-[13px] ${emailError ? "font-medium text-destructive" : "sf-meta"}`}>
                    {emailError
                        ? t("Enter a valid email address.", "أدخل بريداً إلكترونياً صحيحاً.")
                        : t("We use it only to send updates about this order.", "نستخدمه فقط لإرسال تحديثات هذا الطلب.")}
                </p>
                <button type="submit" className="sf-btn sf-btn--primary mt-4 w-full sm:w-auto">
                    {t("Continue as guest", "المتابعة كضيف")}
                </button>
                {signInPrompt}
            </form>
        );
    }

    return (
        <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-center justify-between gap-3 rounded-[12px] border p-3.5 sm:col-span-2">
                <span className="flex min-w-0 items-center gap-2">
                    <Mail className="size-4 shrink-0 text-muted-foreground" />
                    <span className="truncate font-medium" dir="ltr">{email.trim()}</span>
                </span>
                <button type="button" onClick={onEditEmail} className="sf-btn sf-btn--quiet sf-btn--sm shrink-0">
                    {t("Change", "تغيير")}
                </button>
            </div>
            <div className="sm:col-span-2">
                <label htmlFor="sf-guest-name" className="sf-label">{t("Full name", "الاسم الكامل")}</label>
                <input
                    id="sf-guest-name"
                    autoComplete="name"
                    required
                    maxLength={120}
                    value={name}
                    onChange={event => onFieldChange("name", event.target.value)}
                    className="sf-field"
                />
            </div>
            <div className="sm:col-span-2">
                <StorePhoneField
                    value={national}
                    country={activeCountry}
                    onChange={value => updatePhone(value, activeCountry)}
                    onCountryChange={selected => { setCountry(selected); updatePhone(national, selected); }}
                    isAr={isAr}
                />
            </div>
            <div className="sm:col-span-2">{signInPrompt}</div>
        </div>
    );
}

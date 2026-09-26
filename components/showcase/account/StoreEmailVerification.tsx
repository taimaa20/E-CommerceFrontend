"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Loader2, MailCheck } from "lucide-react";
import { CustomerApiError } from "@/lib/api-customer-account";

const CODE_LENGTH = 6;

interface StoreEmailVerificationProps {
    /** What the shopper is shown, masked by the backend. The real address stays with the
        parent, which owns the calls. */
    maskedEmail: string;
    /** ISO timestamp before which a resend is refused. */
    resendAvailableAt: string;
    isAr: boolean;
    onVerify: (code: string) => Promise<void>;
    onResend: () => Promise<{ maskedEmail: string; resendAvailableAt: string }>;
    onBack: () => void;
}

/**
 * The step between "account created" and "signed in": the shopper types the six digits that
 * were emailed to them. Everything the screen needs to say about a failure comes from the
 * backend's `status` slug, so wording and behaviour never drift apart.
 */
export default function StoreEmailVerification({
    maskedEmail,
    resendAvailableAt,
    isAr,
    onVerify,
    onResend,
    onBack,
}: StoreEmailVerificationProps) {
    const t = (en: string, ar: string) => (isAr ? ar : en);

    const [code, setCode] = useState("");
    const [verifying, setVerifying] = useState(false);
    const [resending, setResending] = useState(false);
    const [succeeded, setSucceeded] = useState(false);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [destination, setDestination] = useState(maskedEmail);
    const [cooldown, setCooldown] = useState(() => secondsUntil(resendAvailableAt));
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => { inputRef.current?.focus(); }, []);

    // One interval for the whole cooldown; it stops itself at zero rather than ticking on.
    useEffect(() => {
        if (cooldown <= 0) return;
        const timer = setInterval(() => setCooldown(current => (current <= 1 ? 0 : current - 1)), 1000);
        return () => clearInterval(timer);
    }, [cooldown]);

    const describe = (caught: unknown): string => {
        if (caught instanceof CustomerApiError) {
            switch (caught.code) {
                case "CODE_EXPIRED":
                    return t("That code has expired. Send yourself a new one.", "انتهت صلاحية الرمز. اطلب رمزاً جديداً.");
                case "CODE_INVALID":
                    return t("That code is not correct. Check it and try again.", "الرمز غير صحيح. تحقق منه وحاول مرة أخرى.");
                case "TOO_MANY_ATTEMPTS":
                    return t("Too many incorrect attempts. Send yourself a new code.", "محاولات خاطئة كثيرة. اطلب رمزاً جديداً.");
                case "TOO_MANY_REQUESTS":
                    return t("Too many codes requested. Please try again later.", "طلبت رموزاً كثيرة. حاول لاحقاً.");
                case "RESEND_TOO_SOON":
                    return t("A code was just sent. Give it a moment.", "تم إرسال رمز للتو. انتظر قليلاً.");
                case "EMAIL_NOT_SENT":
                    return t("We could not send the email just now. Try again in a moment.", "تعذر إرسال البريد الآن. حاول بعد قليل.");
            }
            if (caught.status === 429) return t("Too many attempts. Wait a minute and try again.", "محاولات كثيرة. انتظر دقيقة ثم أعد المحاولة.");
        }
        return t("Something went wrong. Please try again.", "حدث خطأ. حاول مرة أخرى.");
    };

    const submit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (verifying || succeeded) return;
        if (code.length !== CODE_LENGTH) {
            setError(t("Enter the 6-digit code.", "أدخل الرمز المكوّن من 6 أرقام."));
            return;
        }

        setVerifying(true);
        setError("");
        setNotice("");
        try {
            await onVerify(code);
            // Held on screen through the redirect so the shopper sees the step complete
            // rather than a spinner that disappears.
            setSucceeded(true);
        } catch (caught) {
            setError(describe(caught));
            setCode("");
            inputRef.current?.focus();
            setVerifying(false);
        }
    };

    const resend = async () => {
        if (resending || cooldown > 0 || succeeded) return;
        setResending(true);
        setError("");
        setNotice("");
        try {
            const sent = await onResend();
            setDestination(sent.maskedEmail || destination);
            setCooldown(secondsUntil(sent.resendAvailableAt));
            setCode("");
            setNotice(t("A new code is on its way.", "تم إرسال رمز جديد."));
            inputRef.current?.focus();
        } catch (caught) {
            setError(describe(caught));
        } finally {
            setResending(false);
        }
    };

    if (succeeded) {
        return (
            <div className="sf-card w-full max-w-md p-5 text-center sm:p-7">
                <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-[var(--sf-accent-soft)] text-[var(--sf-accent-ink)]">
                    <CheckCircle2 className="size-6" />
                </span>
                <h1 className="sf-page-title mt-4">{t("Email confirmed", "تم تأكيد البريد")}</h1>
                <p className="sf-meta mt-1">{t("Taking you to your account…", "جارٍ تحويلك إلى حسابك…")}</p>
                <Loader2 className="mx-auto mt-4 size-4 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="sf-card w-full max-w-md p-5 sm:p-7">
            <span className="flex size-11 items-center justify-center rounded-full bg-[var(--sf-accent-soft)] text-[var(--sf-accent-ink)]">
                <MailCheck className="size-5" />
            </span>
            <h1 className="sf-page-title mt-4">{t("Confirm your email", "تأكيد بريدك الإلكتروني")}</h1>
            <p className="sf-meta mt-1">
                {t("We sent a 6-digit code to ", "أرسلنا رمزاً من 6 أرقام إلى ")}
                <span dir="ltr" className="font-medium text-foreground">{destination}</span>
                {t(". It is valid for 10 minutes.", ". الرمز صالح لمدة 10 دقائق.")}
            </p>

            <form onSubmit={submit} noValidate className="mt-5 space-y-4">
                <label className="block">
                    <span className="sf-label">{t("Verification code", "رمز التحقق")}</span>
                    <input
                        ref={inputRef}
                        className="sf-field sf-otp-input"
                        type="text"
                        dir="ltr"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        maxLength={CODE_LENGTH}
                        aria-invalid={!!error || undefined}
                        aria-describedby={error ? "verification-error" : undefined}
                        value={code}
                        onChange={event => { setCode(event.target.value.replace(/\D/g, "").slice(0, CODE_LENGTH)); setError(""); }}
                    />
                </label>

                {error && <p id="verification-error" role="alert" className="text-sm text-destructive">{error}</p>}
                {notice && <p role="status" className="text-sm text-[var(--sf-accent-ink)]">{notice}</p>}

                <button
                    type="submit"
                    disabled={verifying || code.length !== CODE_LENGTH}
                    className="sf-btn sf-btn--primary sf-btn--lg w-full"
                >
                    {verifying && <Loader2 className="size-4 animate-spin" />}
                    {t("Verify", "تأكيد")}
                </button>
            </form>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t pt-4">
                <button
                    type="button"
                    onClick={resend}
                    disabled={resending || cooldown > 0}
                    className="sf-btn sf-btn--quiet sf-btn--sm -ms-3"
                >
                    {resending && <Loader2 className="size-4 animate-spin" />}
                    {cooldown > 0
                        ? t(`Resend code in ${cooldown}s`, `إعادة الإرسال بعد ${cooldown} ثانية`)
                        : t("Resend code", "إعادة إرسال الرمز")}
                </button>
                <button type="button" onClick={onBack} className="sf-btn sf-btn--quiet sf-btn--sm -me-3">
                    {t("Use a different email", "استخدام بريد آخر")}
                </button>
            </div>
        </div>
    );
}

function secondsUntil(iso: string): number {
    const target = new Date(iso).getTime();
    if (Number.isNaN(target)) return 0;
    return Math.max(0, Math.ceil((target - Date.now()) / 1000));
}

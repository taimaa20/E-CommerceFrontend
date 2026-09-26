"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import StoreShell from "@/components/showcase/StoreShell";
import StoreEmailVerification from "@/components/showcase/account/StoreEmailVerification";
import StorePhoneField from "@/components/showcase/StorePhoneField";
import { useLocale } from "@/components/locale-provider";
import { CustomerApiError } from "@/lib/api-customer-account";
import { authPromptMessage, safeNextPath, type AuthPromptReason } from "@/lib/customer-auth-prompt";
import { defaultCountry, isValidForCountry, toE164, type PhoneCountry } from "@/lib/store-phone";
import { useCustomerSessionStore } from "@/store/customerSessionStore";
import { useSettingsStore } from "@/store/settingsStore";

type Mode = "signIn" | "register";

const PROMPT_REASONS: AuthPromptReason[] = ["favorite", "checkout", "address", "account"];
const EMPTY_REGISTRATION = { firstName: "", lastName: "", email: "", phone: "", password: "", confirmPassword: "" };
const PASSWORD_RULE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

/** What the shopper must still do before the session exists. */
interface PendingVerification {
    email: string;
    maskedEmail: string;
    resendAvailableAt: string;
}

export default function CustomerSignInPage() {
    return (
        <StoreShell>
            <Suspense fallback={null}>
                <SignInPanel />
            </Suspense>
        </StoreShell>
    );
}

/**
 * Sign in or create an account, then return to where the shopper was. The guest cart lives on
 * this device and is never touched here, so it is exactly as they left it afterwards.
 *
 * Whether creating an account signs the shopper in on the spot is the backend's decision: it
 * either answers with a session, or says the address still has to be confirmed — and only then
 * does this screen switch to the emailed-code step. Neither entry point assumes which it will be.
 */
function SignInPanel() {
    const { locale } = useLocale();
    const isAr = locale === "ar";
    const router = useRouter();
    const searchParams = useSearchParams();
    const next = safeNextPath(searchParams.get("next"));
    const reasonParam = searchParams.get("reason") as AuthPromptReason | null;
    const reason = reasonParam && PROMPT_REASONS.includes(reasonParam) ? reasonParam : null;

    const status = useCustomerSessionStore(state => state.status);
    const signIn = useCustomerSessionStore(state => state.signIn);
    const signUp = useCustomerSessionStore(state => state.signUp);
    const verifyEmail = useCustomerSessionStore(state => state.verifyEmail);
    const resendEmailCode = useCustomerSessionStore(state => state.resendEmailCode);
    const settings = useSettingsStore(state => state.settings);

    const [mode, setMode] = useState<Mode>("signIn");
    const [identifier, setIdentifier] = useState("");
    const [password, setPassword] = useState("");
    const [registration, setRegistration] = useState(EMPTY_REGISTRATION);
    const [country, setCountry] = useState<PhoneCountry | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [pending, setPending] = useState<PendingVerification | null>(null);

    // The store's own contact number is the best guess at where its shoppers are; it is only
    // known once settings have loaded, and only used until the shopper picks for themselves.
    const activeCountry = country ?? defaultCountry([settings.whatsAppNumber, settings.restaurantPhone]);

    useEffect(() => {
        if (status === "authenticated" && !submitting) router.replace(next);
    }, [status, submitting, next, router]);

    const t = (en: string, ar: string) => (isAr ? ar : en);

    const describeError = (caught: unknown) => {
        if (caught instanceof CustomerApiError) {
            if (caught.code === "EMAIL_NOT_SENT")
                return t("We could not send your verification email. Please try again in a moment.", "تعذر إرسال بريد التحقق. حاول بعد قليل.");
            if (caught.status === 401) return t("Email/mobile or password is incorrect.", "البريد/الجوال أو كلمة المرور غير صحيحة.");
            if (caught.status === 409) return t("An account with this email or mobile number already exists. Sign in instead.", "يوجد حساب بهذا البريد أو رقم الجوال. سجّل الدخول بدلاً من ذلك.");
            if (caught.status === 429) return t("Too many attempts. Please wait a minute and try again.", "محاولات كثيرة. انتظر دقيقة ثم أعد المحاولة.");
            if (caught.status === 400) return caught.message;
        }
        return t("Something went wrong. Please try again.", "حدث خطأ. حاول مرة أخرى.");
    };

    const passwordsMatch =
        registration.confirmPassword.length === 0 || registration.password === registration.confirmPassword;

    const validateRegistration = () => {
        const { firstName, lastName, email, phone, password: newPassword, confirmPassword } = registration;
        if (!firstName.trim() || !lastName.trim() || !email.trim() || !phone.trim())
            return t("Fill in every field.", "املأ جميع الحقول.");
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
            return t("Enter a valid email address.", "أدخل بريداً إلكترونياً صحيحاً.");
        if (!isValidForCountry(phone, activeCountry))
            return t("Enter a valid mobile number for the country you selected.", "أدخل رقم جوال صحيحاً للدولة التي اخترتها.");
        if (!PASSWORD_RULE.test(newPassword))
            return t(
                "Password needs 8+ characters with upper and lower case letters, a number and a symbol.",
                "كلمة المرور 8 أحرف على الأقل وتتضمن حرفاً كبيراً وصغيراً ورقماً ورمزاً.",
            );
        if (newPassword !== confirmPassword)
            return t("The two passwords do not match.", "كلمتا المرور غير متطابقتين.");
        return "";
    };

    const submit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (submitting) return;
        const validationError = mode === "register"
            ? validateRegistration()
            : (!identifier.trim() || !password ? t("Enter your email or mobile and password.", "أدخل البريد أو الجوال وكلمة المرور.") : "");
        if (validationError) {
            setError(validationError);
            return;
        }

        setSubmitting(true);
        setError("");
        const email = mode === "register" ? registration.email.trim().toLowerCase() : identifier.trim().toLowerCase();
        try {
            const result = mode === "signIn"
                ? await signIn(identifier, password)
                : await signUp({
                    firstName: registration.firstName.trim(),
                    lastName: registration.lastName.trim(),
                    email,
                    mobileNumber: toE164(registration.phone, activeCountry),
                    password: registration.password,
                    preferredLanguage: isAr ? "ar" : "en",
                });

            // Either entry point can land here: a new account, or a returning shopper whose
            // address was never confirmed. The backend names the destination address, so this
            // works even when they signed in with their mobile number.
            if (result.requiresEmailVerification) {
                setPending({
                    email: result.email || email,
                    maskedEmail: result.verification.maskedEmail,
                    resendAvailableAt: result.verification.resendAvailableAt,
                });
                setSubmitting(false);
                return;
            }

            toast.success(mode === "signIn" ? t("Welcome back", "مرحباً بعودتك") : t("Your account is ready", "تم إنشاء حسابك"));
            router.replace(next);
        } catch (caught) {
            setError(describeError(caught));
            setSubmitting(false);
        }
    };

    const setField = (field: keyof typeof EMPTY_REGISTRATION, value: string) =>
        setRegistration(current => ({ ...current, [field]: value }));

    if (pending) {
        return (
            <div className="sf-container flex justify-center">
                <StoreEmailVerification
                    maskedEmail={pending.maskedEmail}
                    resendAvailableAt={pending.resendAvailableAt}
                    isAr={isAr}
                    onVerify={async code => {
                        await verifyEmail(pending.email, code);
                        toast.success(t("Your account is ready", "تم إنشاء حسابك"));
                        router.replace(next);
                    }}
                    onResend={() => resendEmailCode(pending.email)}
                    onBack={() => { setPending(null); setMode("register"); setError(""); }}
                />
            </div>
        );
    }

    return (
        <div className="sf-container flex justify-center">
            <div className="sf-card w-full max-w-md p-5 sm:p-7">
                <h1 className="sf-page-title">{mode === "signIn" ? t("Sign in", "تسجيل الدخول") : t("Create account", "إنشاء حساب")}</h1>
                <p className="sf-meta mt-1">{authPromptMessage(reason, isAr)}</p>

                <div role="tablist" className="mt-5 grid grid-cols-2 gap-1 rounded-[12px] bg-[var(--sf-surface-sunken)] p-1">
                    {(["signIn", "register"] as const).map(tab => (
                        <button
                            key={tab}
                            type="button"
                            role="tab"
                            aria-selected={mode === tab}
                            onClick={() => { setMode(tab); setError(""); }}
                            className={`min-h-10 rounded-[10px] text-sm font-medium transition-colors ${mode === tab ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}
                        >
                            {tab === "signIn" ? t("Sign in", "تسجيل الدخول") : t("Create account", "حساب جديد")}
                        </button>
                    ))}
                </div>

                <form onSubmit={submit} noValidate className="mt-5 space-y-4">
                    {mode === "signIn" ? (
                        <>
                            <label className="block">
                                <span className="sf-label">{t("Email or mobile number", "البريد الإلكتروني أو رقم الجوال")}</span>
                                <input className="sf-field" autoComplete="username" value={identifier} onChange={e => setIdentifier(e.target.value)} />
                            </label>
                            <label className="block">
                                <span className="sf-label">{t("Password", "كلمة المرور")}</span>
                                <input className="sf-field" type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} />
                            </label>
                        </>
                    ) : (
                        <>
                            <div className="grid grid-cols-2 gap-3">
                                <label className="block">
                                    <span className="sf-label">{t("First name", "الاسم الأول")}</span>
                                    <input className="sf-field" autoComplete="given-name" value={registration.firstName} onChange={e => setField("firstName", e.target.value)} />
                                </label>
                                <label className="block">
                                    <span className="sf-label">{t("Last name", "اسم العائلة")}</span>
                                    <input className="sf-field" autoComplete="family-name" value={registration.lastName} onChange={e => setField("lastName", e.target.value)} />
                                </label>
                            </div>
                            <label className="block">
                                <span className="sf-label">{t("Email", "البريد الإلكتروني")}</span>
                                <input className="sf-field" type="email" dir="ltr" autoComplete="email" value={registration.email} onChange={e => setField("email", e.target.value)} />
                                {/* Neutral either way: whether the address has to be confirmed by
                                    an emailed code is the backend's call, and it answers only once
                                    this form is submitted. The verification step carries its own copy. */}
                                <span className="sf-meta mt-1 block">
                                    {t("Used to sign in and to send you order updates.", "يُستخدم لتسجيل الدخول وإرسال تحديثات طلبك.")}
                                </span>
                            </label>
                            <StorePhoneField
                                value={registration.phone}
                                country={activeCountry}
                                onChange={value => setField("phone", value)}
                                onCountryChange={setCountry}
                                isAr={isAr}
                            />
                            <label className="block">
                                <span className="sf-label">{t("Password", "كلمة المرور")}</span>
                                <input className="sf-field" type="password" autoComplete="new-password" value={registration.password} onChange={e => setField("password", e.target.value)} />
                                <span className="sf-meta mt-1 block">
                                    {t("8+ characters with upper and lower case, a number and a symbol.", "8 أحرف على الأقل مع حرف كبير وصغير ورقم ورمز.")}
                                </span>
                            </label>
                            <label className="block">
                                <span className="sf-label">{t("Confirm password", "تأكيد كلمة المرور")}</span>
                                <input
                                    className="sf-field"
                                    type="password"
                                    autoComplete="new-password"
                                    aria-invalid={!passwordsMatch || undefined}
                                    aria-describedby={passwordsMatch ? undefined : "confirm-password-mismatch"}
                                    value={registration.confirmPassword}
                                    onChange={e => setField("confirmPassword", e.target.value)}
                                />
                                {!passwordsMatch && (
                                    <span id="confirm-password-mismatch" className="mt-1 block text-sm text-destructive">
                                        {t("The two passwords do not match.", "كلمتا المرور غير متطابقتين.")}
                                    </span>
                                )}
                            </label>
                        </>
                    )}

                    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}

                    <button
                        type="submit"
                        disabled={submitting || status === "unknown" || (mode === "register" && !passwordsMatch)}
                        className="sf-btn sf-btn--primary sf-btn--lg w-full"
                    >
                        {submitting && <Loader2 className="size-4 animate-spin" />}
                        {mode === "signIn" ? t("Sign in", "تسجيل الدخول") : t("Create account", "إنشاء الحساب")}
                    </button>
                </form>
            </div>
        </div>
    );
}

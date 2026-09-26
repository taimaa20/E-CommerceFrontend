"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import StoreShell from "@/components/showcase/StoreShell";
import { useLocale } from "@/components/locale-provider";
import { CustomerApiError } from "@/lib/api-customer-account";
import { authPromptMessage, safeNextPath, type AuthPromptReason } from "@/lib/customer-auth-prompt";
import { useCustomerSessionStore } from "@/store/customerSessionStore";

type Mode = "signIn" | "register";

const PROMPT_REASONS: AuthPromptReason[] = ["favorite", "checkout", "address", "account"];
const EMPTY_REGISTRATION = { firstName: "", lastName: "", email: "", mobileNumber: "", password: "" };
const PASSWORD_RULE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

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

    const [mode, setMode] = useState<Mode>("signIn");
    const [identifier, setIdentifier] = useState("");
    const [password, setPassword] = useState("");
    const [registration, setRegistration] = useState(EMPTY_REGISTRATION);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        if (status === "authenticated" && !submitting) router.replace(next);
    }, [status, submitting, next, router]);

    const t = (en: string, ar: string) => (isAr ? ar : en);

    const describeError = (caught: unknown) => {
        if (caught instanceof CustomerApiError) {
            if (caught.status === 401) return t("Email/mobile or password is incorrect.", "البريد/الجوال أو كلمة المرور غير صحيحة.");
            if (caught.status === 409) return t("An account with this email or mobile number already exists. Sign in instead.", "يوجد حساب بهذا البريد أو رقم الجوال. سجّل الدخول بدلاً من ذلك.");
            if (caught.status === 429) return t("Too many attempts. Please wait a minute and try again.", "محاولات كثيرة. انتظر دقيقة ثم أعد المحاولة.");
            if (caught.status === 400) return caught.message;
        }
        return t("Something went wrong. Please try again.", "حدث خطأ. حاول مرة أخرى.");
    };

    const validateRegistration = () => {
        const { firstName, lastName, email, mobileNumber, password: newPassword } = registration;
        if (!firstName.trim() || !lastName.trim() || !email.trim() || !mobileNumber.trim())
            return t("Fill in every field.", "املأ جميع الحقول.");
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
            return t("Enter a valid email address.", "أدخل بريداً إلكترونياً صحيحاً.");
        if (!PASSWORD_RULE.test(newPassword))
            return t(
                "Password needs 8+ characters with upper and lower case letters, a number and a symbol.",
                "كلمة المرور 8 أحرف على الأقل وتتضمن حرفاً كبيراً وصغيراً ورقماً ورمزاً.",
            );
        return "";
    };

    const submit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (submitting) return;
        const validationError = mode === "register" ? validateRegistration() : (!identifier.trim() || !password ? t("Enter your email or mobile and password.", "أدخل البريد أو الجوال وكلمة المرور.") : "");
        if (validationError) {
            setError(validationError);
            return;
        }

        setSubmitting(true);
        setError("");
        try {
            if (mode === "signIn") {
                await signIn(identifier, password);
            } else {
                await signUp({
                    firstName: registration.firstName.trim(),
                    lastName: registration.lastName.trim(),
                    email: registration.email.trim(),
                    mobileNumber: registration.mobileNumber.trim(),
                    password: registration.password,
                    preferredLanguage: isAr ? "ar" : "en",
                });
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
                            </label>
                            <label className="block">
                                <span className="sf-label">{t("Mobile number", "رقم الجوال")}</span>
                                <input className="sf-field" type="tel" dir="ltr" autoComplete="tel" value={registration.mobileNumber} onChange={e => setField("mobileNumber", e.target.value)} />
                            </label>
                            <label className="block">
                                <span className="sf-label">{t("Password", "كلمة المرور")}</span>
                                <input className="sf-field" type="password" autoComplete="new-password" value={registration.password} onChange={e => setField("password", e.target.value)} />
                                <span className="sf-meta mt-1 block">
                                    {t("8+ characters with upper and lower case, a number and a symbol.", "8 أحرف على الأقل مع حرف كبير وصغير ورقم ورمز.")}
                                </span>
                            </label>
                        </>
                    )}

                    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}

                    <button type="submit" disabled={submitting || status === "unknown"} className="sf-btn sf-btn--primary sf-btn--lg w-full">
                        {submitting && <Loader2 className="size-4 animate-spin" />}
                        {mode === "signIn" ? t("Sign in", "تسجيل الدخول") : t("Create account", "إنشاء الحساب")}
                    </button>
                </form>
            </div>
        </div>
    );
}

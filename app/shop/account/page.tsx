"use client";

import { useEffect, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import AccountLayout from "@/components/showcase/account/AccountLayout";
import { customerAccountApi, type CustomerProfile } from "@/lib/api-customer-account";
import { useCustomerSessionStore } from "@/store/customerSessionStore";

export default function AccountProfilePage() {
    return <AccountLayout>{isAr => <ProfileSection isAr={isAr} />}</AccountLayout>;
}

/**
 * Name and language are editable here. Email and mobile are the account's sign-in identifiers;
 * changing them needs a verification step that does not exist yet, so they are shown read-only.
 */
function ProfileSection({ isAr }: { isAr: boolean }) {
    const t = (en: string, ar: string) => (isAr ? ar : en);
    const setCustomer = useCustomerSessionStore(state => state.setCustomer);
    const [profile, setProfile] = useState<CustomerProfile | null>(null);
    const [form, setForm] = useState({ firstName: "", lastName: "" });
    const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
    const [revision, setRevision] = useState(0);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        let cancelled = false;
        setLoadState("loading");
        customerAccountApi.getProfile()
            .then(data => {
                if (cancelled) return;
                setProfile(data);
                setForm({ firstName: data.firstName, lastName: data.lastName });
                setLoadState("ready");
            })
            .catch(() => { if (!cancelled) setLoadState("error"); });
        return () => { cancelled = true; };
    }, [revision]);

    const save = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!form.firstName.trim() || !form.lastName.trim()) {
            toast.error(t("First and last name are required", "الاسم الأول واسم العائلة مطلوبان"));
            return;
        }
        setSaving(true);
        try {
            const updated = await customerAccountApi.updateProfile({
                firstName: form.firstName.trim(),
                lastName: form.lastName.trim(),
                preferredLanguage: profile?.preferredLanguage,
            });
            setProfile(updated);
            setCustomer(updated);
            toast.success(t("Profile saved", "تم حفظ الملف الشخصي"));
        } catch {
            toast.error(t("Could not save your profile", "تعذر حفظ الملف الشخصي"));
        } finally {
            setSaving(false);
        }
    };

    if (loadState === "loading") {
        return (
            <div role="status" className="sf-card space-y-3 p-5">
                <span className="sr-only">{t("Loading", "جارٍ التحميل")}</span>
                <div className="sf-skel h-4 w-1/3" />
                <div className="sf-skel h-10 w-full" />
                <div className="sf-skel h-10 w-full" />
            </div>
        );
    }

    if (loadState === "error" || !profile) {
        return (
            <div role="alert" className="sf-empty">
                <p className="font-semibold">{t("Could not load your profile", "تعذر تحميل الملف الشخصي")}</p>
                <button type="button" onClick={() => setRevision(v => v + 1)} className="sf-btn sf-btn--outline mt-5">
                    <RefreshCw className="size-4" />
                    {t("Try again", "إعادة المحاولة")}
                </button>
            </div>
        );
    }

    return (
        <form onSubmit={save} className="sf-card space-y-4 p-5">
            <h2 className="text-base font-semibold">{t("Profile", "الملف الشخصي")}</h2>
            <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                    <span className="sf-label">{t("First name", "الاسم الأول")}</span>
                    <input className="sf-field" value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} />
                </label>
                <label className="block">
                    <span className="sf-label">{t("Last name", "اسم العائلة")}</span>
                    <input className="sf-field" value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} />
                </label>
                <label className="block">
                    <span className="sf-label">{t("Email", "البريد الإلكتروني")}</span>
                    <input className="sf-field" dir="ltr" value={profile.email} readOnly disabled />
                </label>
                <label className="block">
                    <span className="sf-label">{t("Mobile number", "رقم الجوال")}</span>
                    <input className="sf-field" dir="ltr" value={profile.mobileNumber} readOnly disabled />
                </label>
            </div>
            <p className="sf-meta">{t("Customer number", "رقم العميل")}: <span dir="ltr">{profile.customerNumber}</span></p>
            <button type="submit" disabled={saving} className="sf-btn sf-btn--primary">
                {saving && <Loader2 className="size-4 animate-spin" />}
                {t("Save changes", "حفظ التغييرات")}
            </button>
        </form>
    );
}

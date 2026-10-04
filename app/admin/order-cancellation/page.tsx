"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useLocale } from "@/components/locale-provider";
import { isAdminRole } from "@/lib/authorization";
import {
    CANCELLABLE_ORDER_STATUSES,
    getEffectiveOrderCancellationPolicy,
    saveOrderCancellationPolicy,
    type OrderCancellationPolicyDto,
    type OrderCancellationPolicyUpsertDto,
} from "@/lib/api-order-cancellation";
import { useAuthStore } from "@/store/authStore";

type Draft = OrderCancellationPolicyUpsertDto;

/**
 * The cancellation policy every cancellation endpoint enforces. This screen is the only place the
 * rules are authored; the storefront, the mobile app and the POS all ask the backend what is
 * allowed rather than carrying a copy of these switches.
 */
export default function OrderCancellationPolicyPage() {
    const { t, locale } = useLocale();
    const role = useAuthStore(state => state.user?.role);
    const isAr = locale === "ar";
    const label = (en: string, ar: string) => (isAr ? ar : en);

    const [draft, setDraft] = useState<Draft | null>(null);
    const [loadFailed, setLoadFailed] = useState(false);
    const [saving, setSaving] = useState(false);

    const load = useCallback(async () => {
        setLoadFailed(false);
        try {
            setDraft(toDraft(await getEffectiveOrderCancellationPolicy()));
        } catch {
            setDraft(null);
            setLoadFailed(true);
        }
    }, []);

    useEffect(() => { void load(); }, [load]);

    if (!isAdminRole(role)) {
        return <div className="flex h-40 items-center justify-center text-slate-500">{t("anErrorOccurred")}</div>;
    }

    if (loadFailed) {
        return (
            <div role="alert" className="mx-auto max-w-3xl p-6">
                <p className="font-medium">{label("Could not load the cancellation policy.", "تعذر تحميل سياسة الإلغاء.")}</p>
                <button type="button" onClick={() => void load()} className="mt-4 rounded-md border px-4 py-2 text-sm">
                    {label("Try again", "إعادة المحاولة")}
                </button>
            </div>
        );
    }

    if (!draft) {
        return (
            <div role="status" className="flex h-40 items-center justify-center gap-2 text-slate-500">
                <Loader2 className="size-5 animate-spin" />
                {label("Loading policy", "جارٍ تحميل السياسة")}
            </div>
        );
    }

    const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
        setDraft(current => (current ? { ...current, [key]: value } : current));

    const toggleStatus = (status: string) =>
        setDraft(current => current && ({
            ...current,
            allowedCustomerStatuses: current.allowedCustomerStatuses.includes(status)
                ? current.allowedCustomerStatuses.filter(s => s !== status)
                : [...current.allowedCustomerStatuses, status],
        }));

    const save = async () => {
        setSaving(true);
        try {
            setDraft(toDraft(await saveOrderCancellationPolicy(draft)));
            toast.success(label("Cancellation policy saved", "تم حفظ سياسة الإلغاء"));
        } catch {
            toast.error(label("Could not save the policy", "تعذر حفظ السياسة"));
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="mx-auto max-w-3xl space-y-6 p-6">
            <header>
                <h1 className="flex items-center gap-2 text-xl font-semibold">
                    <ShieldCheck className="size-5" />
                    {label("Order cancellation policy", "سياسة إلغاء الطلبات")}
                </h1>
                <p className="mt-1 text-sm text-slate-500">
                    {label(
                        "These rules are enforced by the backend on every cancellation, from any client.",
                        "يتم تطبيق هذه القواعد من الخادم على كل عملية إلغاء ومن أي تطبيق.",
                    )}
                </p>
            </header>

            <Section title={label("What customers may do", "ما يمكن للعملاء فعله")}>
                <Toggle
                    label={label("Customer cancellation enabled", "تمكين إلغاء العميل")}
                    checked={draft.customerCancellationEnabled}
                    onChange={value => set("customerCancellationEnabled", value)}
                />
                <Toggle
                    label={label("Cancel the whole order", "إلغاء الطلب بالكامل")}
                    checked={draft.customerFullOrderCancellationEnabled}
                    onChange={value => set("customerFullOrderCancellationEnabled", value)}
                />
                <Toggle
                    label={label("Cancel individual items", "إلغاء عناصر محددة")}
                    checked={draft.customerItemCancellationEnabled}
                    onChange={value => set("customerItemCancellationEnabled", value)}
                />
                <Toggle
                    label={label("Reduce item quantity", "تقليل كمية العنصر")}
                    checked={draft.customerQuantityReductionEnabled}
                    onChange={value => set("customerQuantityReductionEnabled", value)}
                />
                <Toggle
                    label={label("Require a reason", "طلب سبب")}
                    checked={draft.customerReasonRequired}
                    onChange={value => set("customerReasonRequired", value)}
                />
                <label className="block text-sm">
                    <span className="text-slate-600">
                        {label("Cancellation window (minutes, blank = no limit)", "مدة الإلغاء (بالدقائق، فارغ = بلا حد)")}
                    </span>
                    <input
                        type="number"
                        min={1}
                        value={draft.customerCancellationWindowMinutes ?? ""}
                        onChange={e => set("customerCancellationWindowMinutes", e.target.value ? Number(e.target.value) : null)}
                        className="mt-1 w-40 rounded-md border px-3 py-2"
                    />
                </label>
            </Section>

            <Section title={label("Order statuses a customer may cancel in", "حالات الطلب التي يمكن للعميل الإلغاء فيها")}>
                <div className="flex flex-wrap gap-2">
                    {CANCELLABLE_ORDER_STATUSES.map(status => (
                        <button
                            key={status}
                            type="button"
                            onClick={() => toggleStatus(status)}
                            aria-pressed={draft.allowedCustomerStatuses.includes(status)}
                            className={`rounded-full border px-3 py-1 text-sm ${
                                draft.allowedCustomerStatuses.includes(status)
                                    ? "border-emerald-600 bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
                                    : "text-slate-600"
                            }`}
                        >
                            {status}
                        </button>
                    ))}
                </div>
                <p className="text-xs text-slate-500">
                    {label(
                        "The fulfilment cutoff is whatever you leave unselected — nothing is hard-coded.",
                        "حد التنفيذ هو ما لا تختاره هنا — لا شيء مثبت في الكود.",
                    )}
                </p>
            </Section>

            <Section title={label("Paid orders and staff", "الطلبات المدفوعة والموظفون")}>
                <Toggle
                    label={label(
                        "A paid order's cancellation goes to staff for a refund decision",
                        "يُحوَّل إلغاء الطلب المدفوع إلى الموظفين لاتخاذ قرار الاسترداد",
                    )}
                    checked={draft.paidOrderRequiresStaffApproval}
                    onChange={value => set("paidOrderRequiresStaffApproval", value)}
                />
                <Toggle
                    label={label("Staff may cancel", "يمكن للموظفين الإلغاء")}
                    checked={draft.staffCancellationEnabled}
                    onChange={value => set("staffCancellationEnabled", value)}
                />
                <Toggle
                    label={label("Require a reason from staff", "طلب سبب من الموظفين")}
                    checked={draft.staffReasonRequired}
                    onChange={value => set("staffReasonRequired", value)}
                />
                <Toggle
                    label={label("Allow an administrator to override this policy", "السماح للمسؤول بتجاوز هذه السياسة")}
                    checked={draft.adminOverrideEnabled}
                    onChange={value => set("adminOverrideEnabled", value)}
                />
                <Toggle
                    label={label("Vary the rules by loyalty tier", "تغيير القواعد حسب فئة الولاء")}
                    checked={draft.tierRulesEnabled}
                    onChange={value => set("tierRulesEnabled", value)}
                />
            </Section>

            <button
                type="button"
                onClick={save}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900"
            >
                {saving && <Loader2 className="size-4 animate-spin" />}
                {label("Save policy", "حفظ السياسة")}
            </button>
        </div>
    );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <section className="space-y-3 rounded-lg border p-4">
            <h2 className="font-medium">{title}</h2>
            {children}
        </section>
    );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
    return (
        <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="size-4" />
            <span>{label}</span>
        </label>
    );
}

/**
 * The effective policy arrives with its id and branch name; the upsert contract carries neither.
 * Editing the branch-scoped view writes a branch override, editing the tenant view writes the default.
 */
function toDraft(policy: OrderCancellationPolicyDto): Draft {
    return {
        branchId: policy.branchId ?? null,
        customerCancellationEnabled: policy.customerCancellationEnabled,
        customerFullOrderCancellationEnabled: policy.customerFullOrderCancellationEnabled,
        customerItemCancellationEnabled: policy.customerItemCancellationEnabled,
        customerQuantityReductionEnabled: policy.customerQuantityReductionEnabled,
        customerCancellationWindowMinutes: policy.customerCancellationWindowMinutes ?? null,
        customerReasonRequired: policy.customerReasonRequired,
        paidOrderRequiresStaffApproval: policy.paidOrderRequiresStaffApproval,
        staffCancellationEnabled: policy.staffCancellationEnabled,
        staffReasonRequired: policy.staffReasonRequired,
        adminOverrideEnabled: policy.adminOverrideEnabled,
        tierRulesEnabled: policy.tierRulesEnabled,
        allowedCustomerStatuses: [...policy.allowedCustomerStatuses],
        tierRules: policy.tierRules.map(rule => ({ ...rule })),
    };
}

"use client";

import { useEffect, useState } from "react";
import { Search, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getCategories, getProducts } from "@/lib/api";
import {
    PromoAudience,
    PromoDiscountType,
    PromoTargetType,
    marketingWalletApi,
    promoCodesApi,
    segmentsApi,
    type PromoCode,
    type Segment,
    type WalletSearchItem,
} from "@/lib/api-marketing";
import type { CategoryDto, ProductDto } from "@/types/pos";
import {
    AUDIENCE_LABELS,
    emptyPromoForm,
    formFromPromo,
    fromLocalInput,
    optionalNumber,
    toLocalInput,
    toPayload,
    validatePromoForm,
    type PromoForm,
    type Translate,
} from "./promo-form";

const AUDIENCES = [
    PromoAudience.Everyone,
    PromoAudience.SignedInCustomers,
    PromoAudience.SpecificCustomers,
    PromoAudience.Segment,
];

interface Props {
    promo: PromoCode | null;
    isRtl: boolean;
    t: Translate;
    onClose: () => void;
    onSaved: () => void;
}

export default function PromoEditorDialog({ promo, isRtl, t, onClose, onSaved }: Props) {
    const [form, setForm] = useState<PromoForm>(() => (promo ? formFromPromo(promo) : emptyPromoForm()));
    const [products, setProducts] = useState<ProductDto[]>([]);
    const [categories, setCategories] = useState<CategoryDto[]>([]);
    const [segments, setSegments] = useState<Segment[]>([]);
    const [submitting, setSubmitting] = useState(false);
    const set = (patch: Partial<PromoForm>) => setForm(current => ({ ...current, ...patch }));

    // Reference lists are only needed for the pickers; a failure leaves them empty, never blocks editing.
    useEffect(() => {
        void Promise.allSettled([getProducts(), getCategories(), segmentsApi.list(false)]).then(([p, c, s]) => {
            if (p.status === "fulfilled") setProducts(p.value);
            if (c.status === "fulfilled") setCategories(c.value);
            if (s.status === "fulfilled") setSegments(s.value);
        });
    }, []);

    const submit = async () => {
        const problem = validatePromoForm(form, t);
        if (problem) { toast.error(problem); return; }
        setSubmitting(true);
        try {
            const payload = toPayload(form);
            if (promo) await promoCodesApi.update(promo.id, payload);
            else await promoCodesApi.create(payload);
            toast.success(t("Promo code saved", "تم حفظ رمز الخصم"));
            onSaved();
        } catch (e) {
            toast.error(e instanceof Error ? e.message : t("Save failed", "فشل الحفظ"));
        } finally {
            setSubmitting(false);
        }
    };

    const isPercent = form.discountType === PromoDiscountType.Percentage;
    const nameOf = (item: { name: string; nameAr?: string | null }) => (isRtl ? item.nameAr || item.name : item.name);

    return (
        <Dialog open onOpenChange={open => { if (!open && !submitting) onClose(); }}>
            <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>{promo ? t("Edit promo code", "تعديل رمز الخصم") : t("New promo code", "رمز خصم جديد")}</DialogTitle>
                </DialogHeader>

                <div className="grid gap-4 sm:grid-cols-2">
                    <Field label={t("Code", "الرمز")}>
                        <Input dir="ltr" value={form.code} maxLength={40} onChange={e => set({ code: e.target.value.toUpperCase().replace(/\s/g, "") })} placeholder="SAVE10" />
                    </Field>
                    <Field label={t("Name (EN)", "الاسم (إنجليزي)")}>
                        <Input value={form.name} maxLength={150} onChange={e => set({ name: e.target.value })} />
                    </Field>
                    <Field label={t("Name (AR)", "الاسم (عربي)")}>
                        <Input dir="rtl" value={form.nameAr ?? ""} maxLength={150} onChange={e => set({ nameAr: e.target.value })} />
                    </Field>
                    <Field label={t("Discount type", "نوع الخصم")}>
                        <Select value={String(form.discountType)} onValueChange={v => {
                            const discountType = Number(v) as PromoDiscountType;
                            set({ discountType, maxDiscountAmount: discountType === PromoDiscountType.Percentage ? form.maxDiscountAmount : null });
                        }}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value={String(PromoDiscountType.Percentage)}>{t("Percentage", "نسبة مئوية")}</SelectItem>
                                <SelectItem value={String(PromoDiscountType.FixedAmount)}>{t("Fixed amount", "مبلغ ثابت")}</SelectItem>
                            </SelectContent>
                        </Select>
                    </Field>
                    <Field label={isPercent ? t("Percentage (%)", "النسبة (%)") : t("Amount", "المبلغ")}>
                        <Input type="number" min={0.01} max={isPercent ? 100 : undefined} step="0.01" value={form.discountValue}
                            onChange={e => set({ discountValue: Number(e.target.value) })} />
                    </Field>
                    {isPercent && (
                        <Field label={t("Maximum discount (optional)", "الحد الأقصى للخصم (اختياري)")}>
                            <Input type="number" min={0.01} step="0.01" value={form.maxDiscountAmount ?? ""}
                                onChange={e => set({ maxDiscountAmount: optionalNumber(e.target.value) })} />
                        </Field>
                    )}
                    <Field label={t("Minimum spend on eligible items (optional)", "الحد الأدنى للمنتجات المشمولة (اختياري)")}>
                        <Input type="number" min={0} step="0.01" value={form.minOrderAmount ?? ""}
                            onChange={e => set({ minOrderAmount: optionalNumber(e.target.value) })} />
                    </Field>
                    <Field label={t("Starts", "يبدأ")}>
                        <Input type="datetime-local" value={toLocalInput(form.startsAt)}
                            onChange={e => set({ startsAt: fromLocalInput(e.target.value) ?? new Date().toISOString() })} />
                    </Field>
                    <Field label={t("Ends (optional)", "ينتهي (اختياري)")}>
                        <Input type="datetime-local" value={toLocalInput(form.endsAt)} onChange={e => set({ endsAt: fromLocalInput(e.target.value) })} />
                    </Field>
                    <Field label={t("Total usage limit (optional)", "حد الاستخدام الإجمالي (اختياري)")}>
                        <Input type="number" min={1} step={1} value={form.usageLimit ?? ""} onChange={e => set({ usageLimit: optionalNumber(e.target.value) })} />
                    </Field>
                    <Field label={t("Uses per customer (optional)", "الاستخدامات لكل عميل (اختياري)")}>
                        <Input type="number" min={1} step={1} value={form.perCustomerLimit ?? ""} onChange={e => set({ perCustomerLimit: optionalNumber(e.target.value) })} />
                    </Field>

                    <Field label={t("Who can use it", "من يمكنه الاستخدام")}>
                        <Select value={String(form.audience)} onValueChange={v => set({ audience: Number(v) as PromoAudience })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {AUDIENCES.map(key => (
                                    <SelectItem key={key} value={String(key)}>{t(...AUDIENCE_LABELS[key])}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </Field>
                    {form.audience === PromoAudience.Segment && (
                        <Field label={t("Segment", "الشريحة")}>
                            <Select value={form.segmentId ?? ""} onValueChange={v => set({ segmentId: v })}>
                                <SelectTrigger><SelectValue placeholder={t("Select segment", "اختر الشريحة")} /></SelectTrigger>
                                <SelectContent>{segments.map(s => <SelectItem key={s.id} value={s.id}>{nameOf(s)}</SelectItem>)}</SelectContent>
                            </Select>
                        </Field>
                    )}
                    {form.audience === PromoAudience.SpecificCustomers && (
                        <div className="sm:col-span-2">
                            <CustomerPicker form={form} set={set} t={t} />
                        </div>
                    )}

                    <div className="sm:col-span-2">
                        <TargetPicker form={form} set={set} t={t} products={products} categories={categories} nameOf={nameOf} />
                    </div>

                    <Field label={t("Description (optional)", "الوصف (اختياري)")} wide>
                        <Textarea rows={2} maxLength={500} value={form.description ?? ""} onChange={e => set({ description: e.target.value })} />
                    </Field>

                    <Toggle checked={form.firstOrderOnly} onChange={v => set({ firstOrderOnly: v })}
                        label={t("First order only", "للطلب الأول فقط")}
                        hint={t("Only customers with no previous orders. Requires sign-in.", "فقط للعملاء بدون طلبات سابقة. يتطلب تسجيل الدخول.")} />
                    <Toggle checked={form.combineWithProductOffers} onChange={v => set({ combineWithProductOffers: v })}
                        label={t("Combine with product offers", "يجمع مع عروض المنتجات")}
                        hint={t("Off: items already on sale or in a bundle are not discounted again.", "عند الإيقاف: لا يُخصم مرة أخرى على المنتجات المخفضة أو ضمن عرض.")} />
                    <Toggle checked={form.isActive} onChange={v => set({ isActive: v })} label={t("Active", "نشط")} />
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={submitting}>{t("Cancel", "إلغاء")}</Button>
                    <Button onClick={submit} disabled={submitting}>{t("Save", "حفظ")}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function Field({ label, wide, children }: { label: string; wide?: boolean; children: React.ReactNode }) {
    return (
        <div className={`space-y-1.5 ${wide ? "sm:col-span-2" : ""}`}>
            <Label>{label}</Label>
            {children}
        </div>
    );
}

function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
    return (
        <label className="flex items-start gap-2 text-sm sm:col-span-2">
            <Switch checked={checked} onCheckedChange={onChange} className="mt-0.5" />
            <span>
                <span className="font-medium">{label}</span>
                {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
            </span>
        </label>
    );
}

function TargetPicker({ form, set, t, products, categories, nameOf }: {
    form: PromoForm;
    set: (patch: Partial<PromoForm>) => void;
    t: Translate;
    products: ProductDto[];
    categories: CategoryDto[];
    nameOf: (item: { name: string; nameAr?: string | null }) => string;
}) {
    const [kind, setKind] = useState<PromoTargetType>(PromoTargetType.Category);
    const [isExclusion, setIsExclusion] = useState(false);
    const options = kind === PromoTargetType.Product ? products : categories;

    const add = (id: string) => {
        const option = options.find(o => o.id === id);
        if (!option || form.targets.some(target => target.targetType === kind && target.targetId === id)) return;
        set({ targets: [...form.targets, { targetType: kind, targetId: id, isExclusion, name: nameOf(option) }] });
    };

    return (
        <div className="space-y-2 rounded-lg border p-3">
            <p className="text-sm font-medium">{t("Products & categories", "المنتجات والفئات")}</p>
            <p className="text-xs text-muted-foreground">
                {t("No rules = the whole cart is eligible. Include rules limit the discount; exclude rules always win.",
                    "بدون قواعد = السلة كاملة مشمولة. قواعد التضمين تحدد الخصم، وقواعد الاستثناء لها الأولوية.")}
            </p>
            <div className="grid gap-2 sm:grid-cols-[8rem_8rem_1fr]">
                <Select value={String(kind)} onValueChange={v => setKind(Number(v) as PromoTargetType)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value={String(PromoTargetType.Category)}>{t("Category", "فئة")}</SelectItem>
                        <SelectItem value={String(PromoTargetType.Product)}>{t("Product", "منتج")}</SelectItem>
                    </SelectContent>
                </Select>
                <Select value={isExclusion ? "exclude" : "include"} onValueChange={v => setIsExclusion(v === "exclude")}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="include">{t("Include", "تضمين")}</SelectItem>
                        <SelectItem value="exclude">{t("Exclude", "استثناء")}</SelectItem>
                    </SelectContent>
                </Select>
                <Select value="" onValueChange={add}>
                    <SelectTrigger><SelectValue placeholder={t("Add…", "إضافة…")} /></SelectTrigger>
                    <SelectContent>{options.map(o => <SelectItem key={o.id} value={o.id}>{nameOf(o)}</SelectItem>)}</SelectContent>
                </Select>
            </div>
            {form.targets.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                    {form.targets.map(target => (
                        <span key={`${target.targetType}-${target.targetId}`}
                            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs ${target.isExclusion ? "border-destructive/40 text-destructive" : ""}`}>
                            {target.isExclusion ? t("Except", "باستثناء") : t("Only", "فقط")}: {target.name ?? target.targetId}
                            <button type="button" aria-label={t("Remove", "إزالة")}
                                onClick={() => set({ targets: form.targets.filter(x => x !== target) })}>
                                <X className="size-3" />
                            </button>
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
}

function CustomerPicker({ form, set, t }: { form: PromoForm; set: (patch: Partial<PromoForm>) => void; t: Translate }) {
    const [term, setTerm] = useState("");
    const [results, setResults] = useState<WalletSearchItem[]>([]);

    const search = async () => {
        try { setResults((await marketingWalletApi.search(term.trim(), 1, 8)).items); }
        catch { setResults([]); toast.error(t("Customer search failed", "فشل البحث عن العملاء")); }
    };
    const add = (c: WalletSearchItem) => {
        if (form.customers.some(x => x.customerId === c.customerId)) return;
        set({ customers: [...form.customers, { customerId: c.customerId, name: c.name, phoneNumber: c.phoneNumber }] });
    };

    return (
        <div className="space-y-2 rounded-lg border p-3">
            <p className="text-sm font-medium">{t("Customers", "العملاء")}</p>
            <form className="flex gap-2" onSubmit={e => { e.preventDefault(); void search(); }}>
                <Input placeholder={t("Search name / phone", "بحث بالاسم / الهاتف")} value={term} onChange={e => setTerm(e.target.value)} />
                <Button type="submit" variant="outline" size="icon" aria-label={t("Search", "بحث")}><Search className="h-4 w-4" /></Button>
            </form>
            {results.map(c => (
                <button key={c.customerId} type="button" onClick={() => add(c)}
                    className="flex w-full justify-between rounded-md border p-2 text-start text-sm hover:bg-muted">
                    <span>{c.name}</span><span className="text-xs text-muted-foreground" dir="ltr">{c.phoneNumber}</span>
                </button>
            ))}
            <div className="flex flex-wrap gap-1.5">
                {form.customers.map(c => (
                    <span key={c.customerId} className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs">
                        {c.name ?? c.phoneNumber ?? c.customerId}
                        <button type="button" aria-label={t("Remove", "إزالة")}
                            onClick={() => set({ customers: form.customers.filter(x => x.customerId !== c.customerId) })}>
                            <X className="size-3" />
                        </button>
                    </span>
                ))}
            </div>
        </div>
    );
}

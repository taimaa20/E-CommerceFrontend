import {
    PromoAudience,
    PromoDiscountType,
    type PromoCode,
    type PromoCodeCustomer,
    type PromoCodeStatus,
    type PromoCodeUpsert,
} from "@/lib/api-marketing";

export type Translate = (en: string, ar: string) => string;

/** Editor state: the upsert payload plus the display rows the customer picker needs. */
export interface PromoForm extends PromoCodeUpsert {
    customers: PromoCodeCustomer[];
}

const DAY_MS = 864e5;
const DEFAULT_DURATION_DAYS = 30;

export const emptyPromoForm = (): PromoForm => ({
    code: "",
    name: "",
    nameAr: "",
    description: "",
    descriptionAr: "",
    discountType: PromoDiscountType.Percentage,
    discountValue: 10,
    maxDiscountAmount: null,
    minOrderAmount: null,
    startsAt: new Date().toISOString(),
    endsAt: new Date(Date.now() + DEFAULT_DURATION_DAYS * DAY_MS).toISOString(),
    isActive: true,
    usageLimit: null,
    perCustomerLimit: null,
    audience: PromoAudience.Everyone,
    segmentId: null,
    firstOrderOnly: false,
    combineWithProductOffers: false,
    branchId: null,
    targets: [],
    customerIds: [],
    customers: [],
});

export const formFromPromo = (p: PromoCode): PromoForm => ({
    code: p.code,
    name: p.name,
    nameAr: p.nameAr ?? "",
    description: p.description ?? "",
    descriptionAr: p.descriptionAr ?? "",
    discountType: p.discountType,
    discountValue: p.discountValue,
    maxDiscountAmount: p.maxDiscountAmount ?? null,
    minOrderAmount: p.minOrderAmount ?? null,
    startsAt: p.startsAt,
    endsAt: p.endsAt ?? null,
    isActive: p.isActive,
    usageLimit: p.usageLimit ?? null,
    perCustomerLimit: p.perCustomerLimit ?? null,
    audience: p.audience,
    segmentId: p.segmentId ?? null,
    firstOrderOnly: p.firstOrderOnly,
    combineWithProductOffers: p.combineWithProductOffers,
    branchId: p.branchId ?? null,
    targets: p.targets,
    customerIds: p.customers.map(c => c.customerId),
    customers: p.customers,
});

export const toPayload = ({ customers, ...form }: PromoForm): PromoCodeUpsert => ({
    ...form,
    code: form.code.trim().toUpperCase(),
    customerIds: customers.map(c => c.customerId),
});

/**
 * Mirrors the server's configuration rules so obvious mistakes are caught before saving.
 * The API re-validates everything and remains the authority.
 */
export function validatePromoForm(form: PromoForm, t: Translate): string | null {
    const code = form.code.trim();
    if (!/^[A-Za-z0-9_-]{3,40}$/.test(code)) return t("Code must be 3–40 letters, digits, - or _.", "يجب أن يتكون الرمز من 3 إلى 40 حرفاً أو رقماً أو - أو _.");
    if (!form.name.trim()) return t("Name is required.", "الاسم مطلوب.");
    if (!(form.discountValue > 0)) return t("Discount must be greater than zero.", "يجب أن يكون الخصم أكبر من صفر.");
    if (form.discountType === PromoDiscountType.Percentage && form.discountValue > 100)
        return t("A percentage cannot exceed 100%.", "لا يمكن أن تتجاوز النسبة 100%.");
    if (form.maxDiscountAmount != null && !(form.maxDiscountAmount > 0))
        return t("Maximum discount must be greater than zero.", "يجب أن يكون الحد الأقصى للخصم أكبر من صفر.");
    if (form.minOrderAmount != null && form.minOrderAmount < 0)
        return t("Minimum order cannot be negative.", "لا يمكن أن يكون الحد الأدنى سالباً.");
    if (form.endsAt && new Date(form.endsAt) <= new Date(form.startsAt))
        return t("End must be after start.", "يجب أن تكون النهاية بعد البداية.");
    if (form.usageLimit != null && !(Number.isInteger(form.usageLimit) && form.usageLimit >= 1))
        return t("Usage limit must be a whole number of at least 1.", "يجب أن يكون حد الاستخدام عدداً صحيحاً لا يقل عن 1.");
    if (form.perCustomerLimit != null && !(Number.isInteger(form.perCustomerLimit) && form.perCustomerLimit >= 1))
        return t("Per-customer limit must be a whole number of at least 1.", "يجب أن يكون الحد لكل عميل عدداً صحيحاً لا يقل عن 1.");
    if (form.usageLimit != null && form.perCustomerLimit != null && form.perCustomerLimit > form.usageLimit)
        return t("Per-customer limit cannot exceed the total limit.", "لا يمكن أن يتجاوز الحد لكل عميل الحد الإجمالي.");
    if (form.audience === PromoAudience.Segment && !form.segmentId) return t("Choose a segment.", "اختر شريحة.");
    if (form.audience === PromoAudience.SpecificCustomers && form.customers.length === 0)
        return t("Choose at least one customer.", "اختر عميلاً واحداً على الأقل.");
    return null;
}

export const STATUS_LABELS: Record<PromoCodeStatus, [string, string]> = {
    Active: ["Active", "نشط"],
    Scheduled: ["Scheduled", "مجدول"],
    Expired: ["Expired", "منتهي"],
    Inactive: ["Inactive", "غير نشط"],
    Exhausted: ["Limit reached", "استُنفد"],
};

export const AUDIENCE_LABELS: Record<PromoAudience, [string, string]> = {
    [PromoAudience.Everyone]: ["Everyone", "الجميع"],
    [PromoAudience.SignedInCustomers]: ["Signed-in customers", "العملاء المسجلون"],
    [PromoAudience.SpecificCustomers]: ["Specific customers", "عملاء محددون"],
    [PromoAudience.Segment]: ["Customer segment", "شريحة عملاء"],
};

export const toLocalInput = (iso?: string | null) => {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export const fromLocalInput = (local: string) => (local ? new Date(local).toISOString() : null);

export const optionalNumber = (value: string) => (value.trim() === "" ? null : Number(value));

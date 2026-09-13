"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useLocale } from "@/components/locale-provider";
import {
    whatsAppContactApi,
    WHATSAPP_PURPOSES,
    type WhatsAppContact,
    type WhatsAppContactInput,
    type WhatsAppPurpose,
} from "@/lib/api-whatsapp-contacts";

interface ContactForm {
    id?: string;
    label: string;
    labelAr: string;
    phoneNumber: string;
    purpose: WhatsAppPurpose;
    messageTemplate: string;
    messageTemplateAr: string;
    isActive: boolean;
    isDefault: boolean;
    sortOrder: number;
}

/**
 * Suggested starting text, offered in the form so a new destination is one click rather than a
 * blank box. It is only a default IN THE FORM — what the storefront sends is always whatever is
 * saved on the row, which is why no customer-facing wording lives in a storefront component.
 */
const SUGGESTED_TEMPLATES: Record<WhatsAppPurpose, { en: string; ar: string }> = {
    0: {
        en: "Hello, I would like to ask about your products.",
        ar: "مرحباً، أود الاستفسار عن منتجاتكم.",
    },
    1: {
        en: "Hello, I would like to ask about:\nProduct: {ProductName}\nDepartment: {CategoryName}\nReference: {SKU}\nLink: {ProductUrl}{CategoryUrl}",
        ar: "مرحباً، أود الاستفسار عن:\nالمنتج: {ProductName}\nالقسم: {CategoryName}\nالرمز: {SKU}\nالرابط: {ProductUrl}{CategoryUrl}",
    },
    2: {
        en: "Hello, I need help with an order.\nOrder: {OrderNumber}",
        ar: "مرحباً، أحتاج مساعدة بخصوص طلب.\nالطلب: {OrderNumber}",
    },
};

const emptyForm = (purpose: WhatsAppPurpose = 0): ContactForm => ({
    label: "",
    labelAr: "",
    phoneNumber: "",
    purpose,
    messageTemplate: SUGGESTED_TEMPLATES[purpose].en,
    messageTemplateAr: SUGGESTED_TEMPLATES[purpose].ar,
    isActive: true,
    isDefault: true,
    sortOrder: 0,
});

/**
 * WhatsApp destinations for the online store.
 *
 * Both the number and the message are edited here, so neither ever requires a code change. The
 * storefront asks for a purpose and is handed the destination assigned to it — which is what
 * lets a second number be added later without touching a single storefront page.
 */
export default function AdminWhatsAppPage() {
    const { locale } = useLocale();
    const isAr = locale === "ar";
    const t = (en: string, ar: string) => (isAr ? ar : en);
    const purposeLabel = (purpose: WhatsAppPurpose) => {
        const row = WHATSAPP_PURPOSES.find(option => option.value === purpose);
        return row ? (isAr ? row.ar : row.en) : String(purpose);
    };

    const [contacts, setContacts] = useState<WhatsAppContact[]>([]);
    const [form, setForm] = useState<ContactForm>(emptyForm());
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            setContacts(await whatsAppContactApi.list());
        } catch {
            toast.error(t("Could not load WhatsApp destinations", "تعذر تحميل وجهات واتساب"));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { void load(); }, []);

    const edit = (contact: WhatsAppContact) => {
        setForm({
            id: contact.id,
            label: contact.label,
            labelAr: contact.labelAr ?? "",
            phoneNumber: contact.phoneNumber,
            purpose: contact.purpose,
            messageTemplate: contact.messageTemplate ?? "",
            messageTemplateAr: contact.messageTemplateAr ?? "",
            isActive: contact.isActive,
            isDefault: contact.isDefault,
            sortOrder: contact.sortOrder,
        });
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    /** Changing the purpose of an unsaved row swaps in that purpose's suggested wording. */
    const changePurpose = (purpose: WhatsAppPurpose) => {
        setForm(current => current.id
            ? { ...current, purpose }
            : { ...current, purpose, messageTemplate: SUGGESTED_TEMPLATES[purpose].en, messageTemplateAr: SUGGESTED_TEMPLATES[purpose].ar });
    };

    const save = async () => {
        if (!form.label.trim()) {
            toast.error(t("A label is required", "الاسم التعريفي مطلوب"));
            return;
        }
        const digits = form.phoneNumber.replace(/\D/g, "");
        if (digits.length < 7 || digits.length > 15) {
            toast.error(t(
                "Enter the number in international form, for example +974 1234 5678.",
                "أدخل الرقم بالصيغة الدولية، مثل ‎+974 1234 5678.",
            ));
            return;
        }

        const payload: WhatsAppContactInput = {
            label: form.label.trim(),
            labelAr: form.labelAr.trim() || undefined,
            phoneNumber: form.phoneNumber.trim(),
            purpose: form.purpose,
            messageTemplate: form.messageTemplate.trim() || undefined,
            messageTemplateAr: form.messageTemplateAr.trim() || undefined,
            isActive: form.isActive,
            isDefault: form.isDefault,
            sortOrder: Number.isFinite(form.sortOrder) ? form.sortOrder : 0,
        };

        setSaving(true);
        try {
            if (form.id) await whatsAppContactApi.update(form.id, payload);
            else await whatsAppContactApi.create(payload);
            toast.success(t("Destination saved", "تم حفظ الوجهة"));
            setForm(emptyForm());
            await load();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : t("Could not save the destination", "تعذر حفظ الوجهة"));
        } finally {
            setSaving(false);
        }
    };

    const remove = async (contact: WhatsAppContact) => {
        if (!window.confirm(t(
            `Remove "${contact.label}"? The store will stop offering this destination.`,
            `إزالة "${contact.label}"؟ سيتوقف المتجر عن عرض هذه الوجهة.`,
        ))) return;
        try {
            await whatsAppContactApi.remove(contact.id);
            toast.success(t("Destination removed", "تمت إزالة الوجهة"));
            if (form.id === contact.id) setForm(emptyForm());
            await load();
        } catch {
            toast.error(t("Could not remove the destination", "تعذرت إزالة الوجهة"));
        }
    };

    return (
        <div className="space-y-6 p-4 sm:p-6" dir={isAr ? "rtl" : "ltr"}>
            <div>
                <h1 className="text-2xl font-bold">{t("WhatsApp", "واتساب")}</h1>
                <p className="max-w-3xl text-sm text-muted-foreground">
                    {t(
                        "Where the online store's WhatsApp buttons lead, and what they say. The store asks for a kind of enquiry rather than a phone number, so you can point general and product enquiries at different numbers whenever you need to.",
                        "إلى أين تؤدي أزرار واتساب في المتجر، وما الذي ترسله. يطلب المتجر نوع الاستفسار لا رقم الهاتف، لذا يمكنك توجيه الاستفسارات العامة واستفسارات المنتجات إلى أرقام مختلفة متى شئت.",
                    )}
                </p>
                {!loading && contacts.length === 0 && (
                    <p className="mt-2 max-w-3xl rounded-md border border-dashed p-3 text-sm text-muted-foreground">
                        {t(
                            "No destination is configured yet, so the store is currently using the WhatsApp number from Store Settings for general enquiries. Adding a destination below takes over from it.",
                            "لا توجد وجهة مُعدّة بعد، لذا يستخدم المتجر حالياً رقم واتساب من إعدادات المتجر للاستفسارات العامة. إضافة وجهة أدناه ستحلّ محله.",
                        )}
                    </p>
                )}
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>{form.id ? t("Edit destination", "تعديل الوجهة") : t("New destination", "وجهة جديدة")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <div className="space-y-2">
                            <Label htmlFor="wa-label">{t("Label", "الاسم التعريفي")}</Label>
                            <Input
                                id="wa-label"
                                value={form.label}
                                maxLength={80}
                                onChange={(event) => setForm({ ...form, label: event.target.value })}
                                placeholder={t("Sales", "المبيعات")}
                            />
                            <p className="text-xs text-muted-foreground">
                                {t("For your own reference — shoppers never see it.", "لاستخدامك الداخلي — لا يراه العملاء.")}
                            </p>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="wa-label-ar">{t("Label (Arabic)", "الاسم التعريفي (عربي)")}</Label>
                            <Input
                                id="wa-label-ar"
                                value={form.labelAr}
                                maxLength={80}
                                onChange={(event) => setForm({ ...form, labelAr: event.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="wa-phone">{t("WhatsApp number", "رقم واتساب")}</Label>
                            <Input
                                id="wa-phone"
                                value={form.phoneNumber}
                                maxLength={30}
                                dir="ltr"
                                onChange={(event) => setForm({ ...form, phoneNumber: event.target.value })}
                                placeholder="+974 1234 5678"
                            />
                            <p className="text-xs text-muted-foreground">
                                {t("International form, including the country code.", "بالصيغة الدولية، مع رمز الدولة.")}
                            </p>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="wa-purpose">{t("Used for", "تُستخدم لـ")}</Label>
                            <select
                                id="wa-purpose"
                                value={form.purpose}
                                onChange={(event) => changePurpose(Number(event.target.value) as WhatsAppPurpose)}
                                className="h-9 w-full rounded-md border bg-transparent px-3 text-sm"
                            >
                                {WHATSAPP_PURPOSES.map(option => (
                                    <option key={option.value} value={option.value}>
                                        {isAr ? option.ar : option.en}
                                    </option>
                                ))}
                            </select>
                            <p className="text-xs text-muted-foreground">
                                {t(
                                    "A kind with no destination falls back to general enquiries.",
                                    "أي نوع بلا وجهة يعود إلى وجهة الاستفسارات العامة.",
                                )}
                            </p>
                        </div>
                    </div>

                    <div className="grid gap-4 lg:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="wa-template">{t("Message", "الرسالة")}</Label>
                            <Textarea
                                id="wa-template"
                                value={form.messageTemplate}
                                maxLength={1000}
                                rows={5}
                                onChange={(event) => setForm({ ...form, messageTemplate: event.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="wa-template-ar">{t("Message (Arabic)", "الرسالة (عربي)")}</Label>
                            <Textarea
                                id="wa-template-ar"
                                value={form.messageTemplateAr}
                                maxLength={1000}
                                rows={5}
                                dir="rtl"
                                onChange={(event) => setForm({ ...form, messageTemplateAr: event.target.value })}
                            />
                        </div>
                    </div>

                    <div className="rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
                        <p className="mb-1 font-medium text-foreground">
                            {t("Placeholders", "العناصر النائبة")}
                        </p>
                        <p>
                            <code className="font-mono">{"{ProductName}"}</code>{" · "}
                            <code className="font-mono">{"{SKU}"}</code>{" · "}
                            <code className="font-mono">{"{ProductUrl}"}</code>{" · "}
                            <code className="font-mono">{"{CategoryName}"}</code>{" · "}
                            <code className="font-mono">{"{CategoryUrl}"}</code>{" · "}
                            <code className="font-mono">{"{OrderNumber}"}</code>
                        </p>
                        <p className="mt-1">
                            {t(
                                "They are filled in from whatever the shopper is looking at: the product on a product page, the department on a department page, the order number on an order. Anything the page does not have is left out, together with its line, and anything unrecognised is removed rather than sent as text.",
                                "تُملأ من المنتج الذي يتصفحه العميل. وما لا يملكه المنتج يُحذف مع سطره، وأي عنصر غير معروف يُزال بدل إرساله كنص.",
                            )}
                        </p>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-3">
                        <div className="space-y-2">
                            <Label htmlFor="wa-sort">{t("Sort order", "الترتيب")}</Label>
                            <Input
                                id="wa-sort"
                                type="number"
                                value={form.sortOrder}
                                onChange={(event) => setForm({ ...form, sortOrder: Number(event.target.value) })}
                            />
                        </div>
                        <div className="flex items-end">
                            <label className="flex cursor-pointer items-center gap-2 text-sm">
                                <input
                                    type="checkbox"
                                    checked={form.isActive}
                                    onChange={(event) => setForm({ ...form, isActive: event.target.checked })}
                                />
                                {t("Offer this destination in the store", "عرض هذه الوجهة في المتجر")}
                            </label>
                        </div>
                        <div className="flex items-end">
                            <label className="flex cursor-pointer items-center gap-2 text-sm">
                                <input
                                    type="checkbox"
                                    checked={form.isDefault}
                                    onChange={(event) => setForm({ ...form, isDefault: event.target.checked })}
                                />
                                {t("Preferred for this kind", "المفضلة لهذا النوع")}
                            </label>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <Button onClick={save} disabled={saving}>
                            {saving ? <Loader2 className="me-2 size-4 animate-spin" /> : <Plus className="me-2 size-4" />}
                            {form.id ? t("Save changes", "حفظ التغييرات") : t("Add destination", "إضافة وجهة")}
                        </Button>
                        {form.id && (
                            <Button variant="outline" onClick={() => setForm(emptyForm())}>
                                {t("Cancel", "إلغاء")}
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>{t("All destinations", "كل الوجهات")}</CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center py-10">
                            <Loader2 className="size-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : contacts.length === 0 ? (
                        <p className="py-8 text-center text-sm text-muted-foreground">
                            {t("No destinations yet.", "لا توجد وجهات بعد.")}
                        </p>
                    ) : (
                        <ul className="divide-y">
                            {contacts.map((contact) => (
                                <li key={contact.id} className="flex flex-wrap items-center gap-3 py-3">
                                    <span className="min-w-0 flex-1">
                                        <span className="block truncate font-medium">{contact.label}</span>
                                        <span className="block truncate text-sm text-muted-foreground" dir="ltr">
                                            {contact.phoneNumber}
                                        </span>
                                    </span>
                                    <Badge variant="secondary">{purposeLabel(contact.purpose)}</Badge>
                                    {contact.isDefault && <Badge>{t("Preferred", "المفضلة")}</Badge>}
                                    {!contact.isActive && <Badge variant="outline">{t("Inactive", "غير مفعّلة")}</Badge>}
                                    <Button variant="outline" size="sm" onClick={() => edit(contact)}>
                                        {t("Edit", "تعديل")}
                                    </Button>
                                    <Button variant="ghost" size="sm" onClick={() => remove(contact)}>
                                        <Trash2 className="size-4 text-destructive" />
                                    </Button>
                                </li>
                            ))}
                        </ul>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

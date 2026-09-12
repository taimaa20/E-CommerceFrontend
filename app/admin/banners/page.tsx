"use client";

import { type ChangeEvent, useEffect, useState } from "react";
import Image from "next/image";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useLocale } from "@/components/locale-provider";
import { uploadImage } from "@/lib/api";
import {
    BANNER_LINK_TYPES,
    storefrontBannerApi,
    type BannerLinkType,
    type StorefrontBanner,
    type StorefrontBannerInput,
} from "@/lib/api-storefront-banners";
import { getCategories, getProducts } from "@/lib/api";
import type { CategoryDto, ProductDto } from "@/types/pos";

/** Only the home hero exists today; the enum is append-only on both sides. */
const HOME_HERO_PLACEMENT = 0;

interface BannerForm {
    id?: string;
    title: string;
    titleAr: string;
    subtitle: string;
    subtitleAr: string;
    imageUrl: string;
    imageKey: string;
    mobileImageUrl: string;
    mobileImageKey: string;
    ctaLabel: string;
    ctaLabelAr: string;
    linkType: BannerLinkType;
    linkValue: string;
    isActive: boolean;
    /** datetime-local strings; empty means "no bound". */
    startsAt: string;
    endsAt: string;
    sortOrder: number;
}

const emptyForm = (): BannerForm => ({
    title: "", titleAr: "", subtitle: "", subtitleAr: "",
    imageUrl: "", imageKey: "", mobileImageUrl: "", mobileImageKey: "",
    ctaLabel: "", ctaLabelAr: "",
    linkType: BANNER_LINK_TYPES.none, linkValue: "",
    isActive: true, startsAt: "", endsAt: "", sortOrder: 0,
});

/**
 * Storefront promotional banners.
 *
 * A banner points at a destination that already exists — a department, a product, the
 * offers page or a search — so the business can run a campaign without a code change and
 * without inventing a landing page. Scheduling is stored in UTC; the fields here are the
 * browser's local time and are converted on both sides.
 */
export default function AdminBannersPage() {
    const { locale } = useLocale();
    const isAr = locale === "ar";
    const t = (en: string, ar: string) => (isAr ? ar : en);

    const [banners, setBanners] = useState<StorefrontBanner[]>([]);
    const [categories, setCategories] = useState<CategoryDto[]>([]);
    const [products, setProducts] = useState<ProductDto[]>([]);
    const [form, setForm] = useState<BannerForm>(emptyForm());
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState<"desktop" | "mobile" | null>(null);

    const load = async () => {
        setLoading(true);
        try {
            setBanners(await storefrontBannerApi.list());
        } catch {
            toast.error(t("Could not load banners", "تعذر تحميل اللافتات"));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void load();
        void getCategories().then(setCategories).catch(() => setCategories([]));
        void getProducts().then(setProducts).catch(() => setProducts([]));
    }, []);

    const upload = async (event: ChangeEvent<HTMLInputElement>, slot: "desktop" | "mobile") => {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (!file) return;
        setUploading(slot);
        try {
            const result = await uploadImage(file, { detailed: true });
            if (!result?.url) throw new Error("upload failed");
            setForm(current => slot === "desktop"
                ? { ...current, imageUrl: result.url, imageKey: result.imageKey ?? "" }
                : { ...current, mobileImageUrl: result.url, mobileImageKey: result.imageKey ?? "" });
        } catch {
            toast.error(t("Image upload failed", "فشل رفع الصورة"));
        } finally {
            setUploading(null);
        }
    };

    const edit = (banner: StorefrontBanner) => {
        setForm({
            id: banner.id,
            title: banner.title, titleAr: banner.titleAr ?? "",
            subtitle: banner.subtitle ?? "", subtitleAr: banner.subtitleAr ?? "",
            imageUrl: banner.imageUrl, imageKey: banner.imageKey ?? "",
            mobileImageUrl: banner.mobileImageUrl ?? "", mobileImageKey: banner.mobileImageKey ?? "",
            ctaLabel: banner.ctaLabel ?? "", ctaLabelAr: banner.ctaLabelAr ?? "",
            linkType: banner.linkType, linkValue: banner.linkValue ?? "",
            isActive: banner.isActive,
            startsAt: toLocalInput(banner.startsAtUtc),
            endsAt: toLocalInput(banner.endsAtUtc),
            sortOrder: banner.sortOrder,
        });
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const save = async () => {
        if (!form.title.trim()) { toast.error(t("A title is required", "العنوان مطلوب")); return; }
        if (!form.imageUrl.trim()) { toast.error(t("An image is required", "الصورة مطلوبة")); return; }
        if (needsLinkValue(form.linkType) && !form.linkValue.trim()) {
            toast.error(t("Choose where the banner links to", "اختر وجهة اللافتة"));
            return;
        }

        const payload: StorefrontBannerInput = {
            title: form.title.trim(),
            titleAr: form.titleAr.trim() || undefined,
            subtitle: form.subtitle.trim() || undefined,
            subtitleAr: form.subtitleAr.trim() || undefined,
            imageUrl: form.imageUrl.trim(),
            imageKey: form.imageKey.trim() || undefined,
            mobileImageUrl: form.mobileImageUrl.trim() || undefined,
            mobileImageKey: form.mobileImageKey.trim() || undefined,
            ctaLabel: form.ctaLabel.trim() || undefined,
            ctaLabelAr: form.ctaLabelAr.trim() || undefined,
            linkType: form.linkType,
            linkValue: form.linkValue.trim() || undefined,
            placement: HOME_HERO_PLACEMENT,
            isActive: form.isActive,
            startsAtUtc: toUtc(form.startsAt),
            endsAtUtc: toUtc(form.endsAt),
            sortOrder: Number.isFinite(form.sortOrder) ? form.sortOrder : 0,
        };

        setSaving(true);
        try {
            if (form.id) await storefrontBannerApi.update(form.id, payload);
            else await storefrontBannerApi.create(payload);
            toast.success(t("Banner saved", "تم حفظ اللافتة"));
            setForm(emptyForm());
            await load();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : t("Could not save the banner", "تعذر حفظ اللافتة"));
        } finally {
            setSaving(false);
        }
    };

    const remove = async (banner: StorefrontBanner) => {
        if (!window.confirm(t(`Remove "${banner.title}" from the storefront?`, `إزالة "${banner.title}" من المتجر؟`))) return;
        try {
            await storefrontBannerApi.remove(banner.id);
            toast.success(t("Banner removed", "تمت إزالة اللافتة"));
            if (form.id === banner.id) setForm(emptyForm());
            await load();
        } catch {
            toast.error(t("Could not remove the banner", "تعذرت إزالة اللافتة"));
        }
    };

    return (
        <div className="space-y-6 p-4 sm:p-6" dir={isAr ? "rtl" : "ltr"}>
            <div>
                <h1 className="text-2xl font-bold">{t("Storefront banners", "لافتات المتجر")}</h1>
                <p className="text-sm text-muted-foreground">
                    {t(
                        "Scheduled promotional banners on the online store home page. Only banners that are active and inside their schedule are shown to shoppers.",
                        "لافتات ترويجية مجدولة على الصفحة الرئيسية للمتجر. تظهر للعملاء فقط اللافتات المفعّلة وضمن جدولها الزمني.",
                    )}
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>{form.id ? t("Edit banner", "تعديل اللافتة") : t("New banner", "لافتة جديدة")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <Label htmlFor="banner-title">{t("Title", "العنوان")}</Label>
                            <Input id="banner-title" value={form.title} maxLength={120}
                                onChange={event => setForm({ ...form, title: event.target.value })} />
                        </div>
                        <div>
                            <Label htmlFor="banner-title-ar">{t("Title (Arabic)", "العنوان بالعربية")}</Label>
                            <Input id="banner-title-ar" dir="rtl" value={form.titleAr} maxLength={120}
                                onChange={event => setForm({ ...form, titleAr: event.target.value })} />
                        </div>
                        <div>
                            <Label htmlFor="banner-sub">{t("Subtitle", "العنوان الفرعي")}</Label>
                            <Textarea id="banner-sub" rows={2} value={form.subtitle} maxLength={240}
                                onChange={event => setForm({ ...form, subtitle: event.target.value })} />
                        </div>
                        <div>
                            <Label htmlFor="banner-sub-ar">{t("Subtitle (Arabic)", "العنوان الفرعي بالعربية")}</Label>
                            <Textarea id="banner-sub-ar" dir="rtl" rows={2} value={form.subtitleAr} maxLength={240}
                                onChange={event => setForm({ ...form, subtitleAr: event.target.value })} />
                        </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <ImageSlot
                            label={t("Wide image (desktop)", "صورة عريضة (سطح المكتب)")}
                            hint={t("Used at every width unless a phone image is added.", "تُستخدم في كل العروض ما لم تُضف صورة للهاتف.")}
                            url={form.imageUrl}
                            busy={uploading === "desktop"}
                            onPick={event => upload(event, "desktop")}
                            onClear={() => setForm({ ...form, imageUrl: "", imageKey: "" })}
                        />
                        <ImageSlot
                            label={t("Phone image (optional)", "صورة الهاتف (اختياري)")}
                            hint={t("A portrait crop shown below 640px.", "قصاصة عمودية تظهر في الشاشات الصغيرة.")}
                            url={form.mobileImageUrl}
                            busy={uploading === "mobile"}
                            onPick={event => upload(event, "mobile")}
                            onClear={() => setForm({ ...form, mobileImageUrl: "", mobileImageKey: "" })}
                        />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <Label htmlFor="banner-cta">{t("Button label", "نص الزر")}</Label>
                            <Input id="banner-cta" value={form.ctaLabel} maxLength={40}
                                onChange={event => setForm({ ...form, ctaLabel: event.target.value })} />
                        </div>
                        <div>
                            <Label htmlFor="banner-cta-ar">{t("Button label (Arabic)", "نص الزر بالعربية")}</Label>
                            <Input id="banner-cta-ar" dir="rtl" value={form.ctaLabelAr} maxLength={40}
                                onChange={event => setForm({ ...form, ctaLabelAr: event.target.value })} />
                        </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <Label htmlFor="banner-link-type">{t("Links to", "الوجهة")}</Label>
                            <select
                                id="banner-link-type"
                                value={form.linkType}
                                onChange={event => setForm({ ...form, linkType: Number(event.target.value) as BannerLinkType, linkValue: "" })}
                                className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                            >
                                <option value={BANNER_LINK_TYPES.none}>{t("Nothing (image only)", "بدون رابط")}</option>
                                <option value={BANNER_LINK_TYPES.category}>{t("A category", "قسم")}</option>
                                <option value={BANNER_LINK_TYPES.product}>{t("A product", "منتج")}</option>
                                <option value={BANNER_LINK_TYPES.offers}>{t("The offers page", "صفحة العروض")}</option>
                                <option value={BANNER_LINK_TYPES.search}>{t("A search term", "نتيجة بحث")}</option>
                                <option value={BANNER_LINK_TYPES.external}>{t("An external https link", "رابط خارجي https")}</option>
                            </select>
                        </div>

                        <div>
                            <Label htmlFor="banner-link-value">{t("Destination", "التفاصيل")}</Label>
                            {form.linkType === BANNER_LINK_TYPES.category && (
                                <select id="banner-link-value" value={form.linkValue}
                                    onChange={event => setForm({ ...form, linkValue: event.target.value })}
                                    className="h-9 w-full rounded-md border bg-background px-3 text-sm">
                                    <option value="">{t("Select a category", "اختر قسماً")}</option>
                                    {categories.map(category => (
                                        <option key={category.id} value={category.id}>
                                            {isAr ? category.nameAr || category.name : category.name}
                                        </option>
                                    ))}
                                </select>
                            )}
                            {form.linkType === BANNER_LINK_TYPES.product && (
                                <select id="banner-link-value" value={form.linkValue}
                                    onChange={event => setForm({ ...form, linkValue: event.target.value })}
                                    className="h-9 w-full rounded-md border bg-background px-3 text-sm">
                                    <option value="">{t("Select a product", "اختر منتجاً")}</option>
                                    {products.map(product => (
                                        <option key={product.id} value={product.id}>
                                            {isAr ? product.nameAr || product.name : product.name}
                                        </option>
                                    ))}
                                </select>
                            )}
                            {form.linkType === BANNER_LINK_TYPES.search && (
                                <Input id="banner-link-value" value={form.linkValue} maxLength={100}
                                    placeholder={t("e.g. gift sets", "مثال: هدايا")}
                                    onChange={event => setForm({ ...form, linkValue: event.target.value })} />
                            )}
                            {form.linkType === BANNER_LINK_TYPES.external && (
                                <Input id="banner-link-value" dir="ltr" value={form.linkValue} maxLength={500}
                                    placeholder="https://"
                                    onChange={event => setForm({ ...form, linkValue: event.target.value })} />
                            )}
                            {!needsLinkValue(form.linkType) && (
                                <p className="pt-2 text-sm text-muted-foreground">
                                    {form.linkType === BANNER_LINK_TYPES.offers
                                        ? t("Opens the storefront offers page.", "يفتح صفحة العروض في المتجر.")
                                        : t("The banner will not be clickable.", "لن تكون اللافتة قابلة للنقر.")}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-4">
                        <div>
                            <Label htmlFor="banner-start">{t("Starts", "يبدأ")}</Label>
                            <Input id="banner-start" type="datetime-local" value={form.startsAt}
                                onChange={event => setForm({ ...form, startsAt: event.target.value })} />
                        </div>
                        <div>
                            <Label htmlFor="banner-end">{t("Ends", "ينتهي")}</Label>
                            <Input id="banner-end" type="datetime-local" value={form.endsAt}
                                onChange={event => setForm({ ...form, endsAt: event.target.value })} />
                        </div>
                        <div>
                            <Label htmlFor="banner-sort">{t("Order", "الترتيب")}</Label>
                            <Input id="banner-sort" type="number" value={form.sortOrder}
                                onChange={event => setForm({ ...form, sortOrder: Number(event.target.value) })} />
                        </div>
                        <div className="flex items-end">
                            <label className="flex h-9 items-center gap-2 text-sm">
                                <input type="checkbox" checked={form.isActive}
                                    onChange={event => setForm({ ...form, isActive: event.target.checked })} />
                                {t("Active", "مفعّلة")}
                            </label>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <Button onClick={save} disabled={saving || !!uploading}>
                            {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Plus className="mr-2 size-4" />}
                            {form.id ? t("Save changes", "حفظ التغييرات") : t("Add banner", "إضافة لافتة")}
                        </Button>
                        {form.id && (
                            <Button variant="outline" onClick={() => setForm(emptyForm())} disabled={saving}>
                                {t("Cancel", "إلغاء")}
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>{t("Configured banners", "اللافتات المُعدّة")}</CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <p className="py-8 text-center text-sm text-muted-foreground">{t("Loading…", "جارٍ التحميل…")}</p>
                    ) : banners.length === 0 ? (
                        <p className="py-8 text-center text-sm text-muted-foreground">
                            {t("No banners yet. The storefront shows its own cover panel until one is added.",
                                "لا توجد لافتات. يعرض المتجر لوحته الافتراضية حتى تُضاف لافتة.")}
                        </p>
                    ) : (
                        <ul className="divide-y">
                            {banners.map(banner => (
                                <li key={banner.id} className="flex flex-wrap items-center gap-3 py-3">
                                    <div className="relative h-14 w-24 shrink-0 overflow-hidden rounded border bg-muted">
                                        {banner.imageUrl && (
                                            <Image src={banner.imageUrl} alt="" fill unoptimized sizes="96px" className="object-cover" />
                                        )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate font-medium">{banner.title}</p>
                                        <p className="truncate text-xs text-muted-foreground">
                                            {describeSchedule(banner, isAr)}
                                        </p>
                                    </div>
                                    <Badge variant={banner.isLiveNow ? "default" : "secondary"}>
                                        {banner.isLiveNow ? t("Live", "معروضة") : banner.isActive ? t("Scheduled", "مجدولة") : t("Inactive", "معطّلة")}
                                    </Badge>
                                    <Button variant="outline" size="sm" onClick={() => edit(banner)}>{t("Edit", "تعديل")}</Button>
                                    <Button variant="ghost" size="sm" onClick={() => remove(banner)}>
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

function ImageSlot({
    label, hint, url, busy, onPick, onClear,
}: {
    label: string;
    hint: string;
    url: string;
    busy: boolean;
    onPick: (event: ChangeEvent<HTMLInputElement>) => void;
    onClear: () => void;
}) {
    return (
        <div>
            <Label>{label}</Label>
            <div className="mt-1 flex items-center gap-3">
                <div className="relative h-20 w-32 shrink-0 overflow-hidden rounded border bg-muted">
                    {url && <Image src={url} alt="" fill unoptimized sizes="128px" className="object-cover" />}
                </div>
                <div className="min-w-0 space-y-2">
                    <Input type="file" accept="image/*" disabled={busy} onChange={onPick} className="text-xs" />
                    {url && (
                        <Button type="button" variant="ghost" size="sm" onClick={onClear}>
                            <Trash2 className="mr-1 size-3.5" /> {label.includes("Phone") ? "Remove" : "Remove"}
                        </Button>
                    )}
                    <p className="text-xs text-muted-foreground">{hint}</p>
                </div>
            </div>
        </div>
    );
}

function needsLinkValue(linkType: BannerLinkType): boolean {
    return linkType !== BANNER_LINK_TYPES.none && linkType !== BANNER_LINK_TYPES.offers;
}

/** UTC instant → the value a `datetime-local` input expects, in the browser's zone. */
function toLocalInput(utc?: string): string {
    if (!utc) return "";
    const date = new Date(utc);
    if (Number.isNaN(date.getTime())) return "";
    const pad = (value: number) => String(value).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** `datetime-local` (browser zone) → the UTC instant the API stores. */
function toUtc(local: string): string | null {
    if (!local) return null;
    const date = new Date(local);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function describeSchedule(banner: StorefrontBanner, isAr: boolean): string {
    const format = (value?: string) => value ? new Date(value).toLocaleString(isAr ? "ar" : "en-GB") : null;
    const start = format(banner.startsAtUtc);
    const end = format(banner.endsAtUtc);
    if (!start && !end) return isAr ? "بدون جدول زمني" : "No schedule — always eligible";
    if (start && end) return `${start} → ${end}`;
    return start ? `${isAr ? "من" : "From"} ${start}` : `${isAr ? "حتى" : "Until"} ${end}`;
}

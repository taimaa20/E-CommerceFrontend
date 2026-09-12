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
import { useLocale } from "@/components/locale-provider";
import { uploadImage } from "@/lib/api";
import {
    productBrandApi,
    type ProductBrand,
    type ProductBrandInput,
    type UnregisteredProductBrand,
} from "@/lib/api-product-brands";

interface BrandForm {
    id?: string;
    name: string;
    nameAr: string;
    logoUrl: string;
    logoKey: string;
    isActive: boolean;
    sortOrder: number;
}

const emptyForm = (): BrandForm => ({
    name: "", nameAr: "", logoUrl: "", logoKey: "", isActive: true, sortOrder: 0,
});

/**
 * Brand identity for the storefront.
 *
 * Products already name their brand as text; a row here is what that name resolves to, and
 * it is where the logo lives. Nothing is re-tagged on the products, so uploading a logo makes
 * every product of that brand show it at once, and removing the row simply puts the name back.
 */
export default function AdminBrandsPage() {
    const { locale } = useLocale();
    const isAr = locale === "ar";
    const t = (en: string, ar: string) => (isAr ? ar : en);

    const [brands, setBrands] = useState<ProductBrand[]>([]);
    const [unregistered, setUnregistered] = useState<UnregisteredProductBrand[]>([]);
    const [form, setForm] = useState<BrandForm>(emptyForm());
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            const [rows, missing] = await Promise.all([
                productBrandApi.list(),
                productBrandApi.unregistered(),
            ]);
            setBrands(rows);
            setUnregistered(missing);
        } catch {
            toast.error(t("Could not load brands", "تعذر تحميل العلامات التجارية"));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { void load(); }, []);

    const upload = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (!file) return;
        setUploading(true);
        try {
            const result = await uploadImage(file, { detailed: true });
            if (!result?.url) throw new Error("upload failed");
            setForm(current => ({ ...current, logoUrl: result.url, logoKey: result.imageKey ?? "" }));
        } catch {
            toast.error(t("Logo upload failed", "فشل رفع الشعار"));
        } finally {
            setUploading(false);
        }
    };

    const edit = (brand: ProductBrand) => {
        setForm({
            id: brand.id,
            name: brand.name,
            nameAr: brand.nameAr ?? "",
            logoUrl: brand.logoUrl ?? "",
            logoKey: brand.logoKey ?? "",
            isActive: brand.isActive,
            sortOrder: brand.sortOrder,
        });
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const save = async () => {
        if (!form.name.trim()) { toast.error(t("A brand name is required", "اسم العلامة مطلوب")); return; }

        const payload: ProductBrandInput = {
            name: form.name.trim(),
            nameAr: form.nameAr.trim() || undefined,
            logoUrl: form.logoUrl.trim() || undefined,
            logoKey: form.logoKey.trim() || undefined,
            isActive: form.isActive,
            sortOrder: Number.isFinite(form.sortOrder) ? form.sortOrder : 0,
        };

        setSaving(true);
        try {
            if (form.id) await productBrandApi.update(form.id, payload);
            else await productBrandApi.create(payload);
            toast.success(t("Brand saved", "تم حفظ العلامة"));
            setForm(emptyForm());
            await load();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : t("Could not save the brand", "تعذر حفظ العلامة"));
        } finally {
            setSaving(false);
        }
    };

    const remove = async (brand: ProductBrand) => {
        if (!window.confirm(t(
            `Remove "${brand.name}"? Its products will show the brand name instead of the logo.`,
            `إزالة "${brand.name}"؟ ستعرض منتجاتها اسم العلامة بدلاً من الشعار.`,
        ))) return;
        try {
            await productBrandApi.remove(brand.id);
            toast.success(t("Brand removed", "تمت إزالة العلامة"));
            if (form.id === brand.id) setForm(emptyForm());
            await load();
        } catch {
            toast.error(t("Could not remove the brand", "تعذرت إزالة العلامة"));
        }
    };

    return (
        <div className="space-y-6 p-4 sm:p-6" dir={isAr ? "rtl" : "ltr"}>
            <div>
                <h1 className="text-2xl font-bold">{t("Brands", "العلامات التجارية")}</h1>
                <p className="text-sm text-muted-foreground">
                    {t(
                        "The brands your catalogue carries, and the logo the online store shows for each. A brand with no logo simply shows its name.",
                        "العلامات التجارية في كتالوجك، والشعار الذي يعرضه المتجر لكل منها. العلامة بدون شعار تُعرض باسمها فقط.",
                    )}
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>{form.id ? t("Edit brand", "تعديل العلامة") : t("New brand", "علامة جديدة")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="brand-name">{t("Brand name", "اسم العلامة")}</Label>
                            <Input
                                id="brand-name"
                                value={form.name}
                                maxLength={120}
                                onChange={(event) => setForm({ ...form, name: event.target.value })}
                                placeholder={t("Exactly as it appears on your products", "كما تظهر تماماً على منتجاتك")}
                            />
                            <p className="text-xs text-muted-foreground">
                                {t(
                                    "Matched to products by name, ignoring case and spacing.",
                                    "تُطابق المنتجات بالاسم، بغض النظر عن حالة الأحرف والمسافات.",
                                )}
                            </p>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="brand-name-ar">{t("Brand name (Arabic)", "اسم العلامة (عربي)")}</Label>
                            <Input
                                id="brand-name-ar"
                                value={form.nameAr}
                                maxLength={120}
                                onChange={(event) => setForm({ ...form, nameAr: event.target.value })}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="brand-logo">{t("Logo", "الشعار")}</Label>
                        <div className="flex flex-wrap items-center gap-3">
                            <Input id="brand-logo" type="file" accept="image/*" onChange={upload} className="max-w-xs" />
                            {uploading && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
                            {form.logoUrl && (
                                <>
                                    <span className="relative h-10 w-24 overflow-hidden rounded border bg-muted/40">
                                        <Image src={form.logoUrl} alt="" fill unoptimized className="object-contain p-1" />
                                    </span>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setForm({ ...form, logoUrl: "", logoKey: "" })}
                                    >
                                        {t("Remove logo", "إزالة الشعار")}
                                    </Button>
                                </>
                            )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {t(
                                "Shown at its own proportions and never cropped — a wordmark on a transparent background works best.",
                                "يُعرض بأبعاده الأصلية ولا يُقص أبداً — الشعار النصي بخلفية شفافة هو الأنسب.",
                            )}
                        </p>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="brand-sort">{t("Sort order", "الترتيب")}</Label>
                            <Input
                                id="brand-sort"
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
                                {t("Show this brand's logo in the store", "إظهار شعار هذه العلامة في المتجر")}
                            </label>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <Button onClick={save} disabled={saving}>
                            {saving ? <Loader2 className="me-2 size-4 animate-spin" /> : <Plus className="me-2 size-4" />}
                            {form.id ? t("Save changes", "حفظ التغييرات") : t("Add brand", "إضافة علامة")}
                        </Button>
                        {form.id && (
                            <Button variant="outline" onClick={() => setForm(emptyForm())}>
                                {t("Cancel", "إلغاء")}
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>

            {unregistered.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>{t("Brands without a logo", "علامات بدون شعار")}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="mb-3 text-sm text-muted-foreground">
                            {t(
                                "These brand names appear on your products but have no brand row yet. Add one to give them a logo.",
                                "تظهر أسماء هذه العلامات على منتجاتك لكن لا يوجد لها سجل بعد. أضف سجلاً لمنحها شعاراً.",
                            )}
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {unregistered.map((row) => (
                                <Button
                                    key={row.name}
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setForm({ ...emptyForm(), name: row.name })}
                                >
                                    <Plus className="me-1.5 size-3.5" />
                                    {row.name}
                                    <span className="ms-1.5 text-muted-foreground">({row.productCount})</span>
                                </Button>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            <Card>
                <CardHeader>
                    <CardTitle>{t("All brands", "كل العلامات")}</CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center py-10">
                            <Loader2 className="size-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : brands.length === 0 ? (
                        <p className="py-8 text-center text-sm text-muted-foreground">
                            {t("No brands yet.", "لا توجد علامات بعد.")}
                        </p>
                    ) : (
                        <ul className="divide-y">
                            {brands.map((brand) => (
                                <li key={brand.id} className="flex flex-wrap items-center gap-3 py-3">
                                    <span className="relative h-10 w-20 shrink-0 overflow-hidden rounded border bg-muted/40">
                                        {brand.logoUrl ? (
                                            <Image src={brand.logoUrl} alt="" fill unoptimized className="object-contain p-1" />
                                        ) : (
                                            <span className="flex h-full items-center justify-center text-[10px] uppercase text-muted-foreground">
                                                {t("No logo", "بلا شعار")}
                                            </span>
                                        )}
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <span className="block truncate font-medium">{brand.name}</span>
                                        {brand.nameAr && (
                                            <span className="block truncate text-sm text-muted-foreground">{brand.nameAr}</span>
                                        )}
                                    </span>
                                    <Badge variant="secondary">
                                        {brand.productCount} {t("products", "منتج")}
                                    </Badge>
                                    {!brand.isActive && <Badge variant="outline">{t("Hidden", "مخفية")}</Badge>}
                                    <Button variant="outline" size="sm" onClick={() => edit(brand)}>
                                        {t("Edit", "تعديل")}
                                    </Button>
                                    <Button variant="ghost" size="sm" onClick={() => remove(brand)}>
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

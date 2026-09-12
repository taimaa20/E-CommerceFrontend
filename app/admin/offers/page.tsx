"use client";

import { type ChangeEvent, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getAllOffers, getProducts, createOffer, updateOffer, deactivateOffer, deleteOffer, reactivateOffer, uploadImage } from "@/lib/api";
import { calculateOfferPreview, getEffectiveProductPrice, normalizeOfferDate, normalizeOfferTime, toOfferApiTime } from "@/lib/offer-utils";
import { formatCurrency } from "@/lib/currencies";
import { getRestaurantToday } from "@/lib/date-time";
import { useLocale } from "@/components/locale-provider";
import { usePosStore } from "@/store/posStore";
import { useSettingsStore } from "@/store/settingsStore";
import { OfferResponseDto } from "@/types/offer";
import { ProductDto } from "@/types/pos";

type OfferFormProduct = {
  productId: string;
  quantity: number;
};

type OfferFormState = {
  name: string;
  nameAr: string;
  description: string;
  descriptionAr: string;
  imageUrl: string;
  discountType: number;
  discountValue: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  products: OfferFormProduct[];
};

const emptyForm = (): OfferFormState => ({
  name: "",
  nameAr: "",
  description: "",
  descriptionAr: "",
  imageUrl: "",
  discountType: 0,
  discountValue: "",
  startDate: "",
  endDate: "",
  startTime: "",
  endTime: "",
  products: [],
});

const createNewOfferForm = (timeZone: string): OfferFormState => {
  const today = getRestaurantToday(timeZone);
  return {
    ...emptyForm(),
    startDate: today,
    endDate: today,
    startTime: "00:00",
    endTime: "23:59",
  };
};

export default function AdminOffersPage() {
  const { locale } = useLocale();
  const isAr = locale === "ar";
  const { currency } = usePosStore();
  const timeZone = useSettingsStore((state) => state.settings.timeZoneId);
  const [offers, setOffers] = useState<OfferResponseDto[]>([]);
  const [products, setProducts] = useState<ProductDto[]>([]);
  const [form, setForm] = useState<OfferFormState>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingOfferId, setEditingOfferId] = useState<number | null>(null);
  const [pendingProductId, setPendingProductId] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const [pendingActionOfferId, setPendingActionOfferId] = useState<number | null>(null);

  const OFFER_IMAGE_TYPES = useMemo(
    () => new Set(["image/jpeg", "image/png", "image/webp"]),
    [],
  );
  const OFFER_IMAGE_MAX_SIZE = 5 * 1024 * 1024;

  useEffect(() => {
    void loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    const [loadedOffers, loadedProducts] = await Promise.all([getAllOffers(), getProducts()]);
    setOffers(loadedOffers);
    setProducts(loadedProducts);
    setIsLoading(false);
  };

  const productMap = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products],
  );

  const selectedProducts = useMemo(
    () =>
      form.products
        .map((item) => {
          const product = productMap.get(item.productId);
          return product ? { ...item, product } : null;
        })
        .filter((item): item is { productId: string; quantity: number; product: ProductDto } => !!item),
    [form.products, productMap],
  );

  const preview = useMemo(
    () =>
      calculateOfferPreview(
        selectedProducts.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          price: getEffectiveProductPrice(item.product),
        })),
        form.discountType,
        Number(form.discountValue || 0),
      ),
    [selectedProducts, form.discountType, form.discountValue],
  );

  const availableProducts = useMemo(
    () => products.filter((product) => !form.products.some((item) => item.productId === product.id)),
    [products, form.products],
  );

  const getText = (ar: string, en: string) => (isAr ? ar : en);

  const getOfferName = (offer: OfferResponseDto) =>
    isAr ? (offer.nameAr || offer.name) : (offer.name || offer.nameAr);

  const getOfferDescription = (offer: OfferResponseDto) =>
    isAr ? (offer.descriptionAr || offer.description || "") : (offer.description || offer.descriptionAr || "");

  const getProductName = (product: { name: string; nameAr?: string | null }) =>
    isAr ? (product.nameAr || product.name) : (product.name || product.nameAr || "");

  const updateImagePreview = (nextPreview: string) => {
    setImagePreview((current) => {
      if (current.startsWith("blob:") && current !== nextPreview) {
        URL.revokeObjectURL(current);
      }
      return nextPreview;
    });
  };

  useEffect(() => {
    return () => {
      if (imagePreview.startsWith("blob:")) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  const validateForm = () => {
    const nextErrors: Record<string, string> = {};

    if (!form.name.trim()) {
      nextErrors.name = getText("الاسم بالإنجليزية مطلوب", "Name (English) is required");
    }

    if (!form.nameAr.trim()) {
      nextErrors.nameAr = getText("الاسم بالعربية مطلوب", "Name (Arabic) is required");
    }

    if (form.products.length === 0) {
      nextErrors.products = getText("اختر منتجًا واحدًا على الأقل", "Select at least one product");
    }

    if (Number(form.discountValue) <= 0) {
      nextErrors.discountValue = getText("القيمة يجب أن تكون أكبر من صفر", "Value must be greater than 0");
    }

    if (!form.startDate || !form.endDate || form.endDate < form.startDate) {
      nextErrors.dateRange = getText("تأكد أن تاريخ النهاية بعد البداية", "End date must be after or equal to start date");
    }

    if (!form.startTime || !form.endTime) {
      nextErrors.timeRange = getText("وقت البداية والنهاية مطلوبان", "Start and end time are required");
    } else if (form.startTime === form.endTime) {
      nextErrors.timeRange = getText("وقت البداية والنهاية لا يمكن أن يكونا متطابقين", "Start and end time cannot be the same");
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const isValid = useMemo(() => {
    return (
      !!form.name.trim() &&
      !!form.nameAr.trim() &&
      form.products.length > 0 &&
      Number(form.discountValue) > 0 &&
      !!form.startDate &&
      !!form.endDate &&
      !!form.startTime &&
      !!form.endTime &&
      form.endDate >= form.startDate &&
      form.startTime !== form.endTime
    );
  }, [form]);

  const openNewForm = () => {
    setEditingOfferId(null);
    setErrors({});
    setPendingProductId("");
    setImageFile(null);
    updateImagePreview("");
    setForm(createNewOfferForm(timeZone));
    setIsFormOpen(true);
  };

  const openEditForm = (offer: OfferResponseDto) => {
    setEditingOfferId(offer.id);
    setErrors({});
    setPendingProductId("");
    setForm({
      name: offer.name,
      nameAr: offer.nameAr,
      description: offer.description || "",
      descriptionAr: offer.descriptionAr || "",
      imageUrl: offer.imageUrl || "",
      discountType: offer.discountType,
      discountValue: String(offer.discountValue),
      startDate: normalizeOfferDate(offer.startDate),
      endDate: normalizeOfferDate(offer.endDate),
      startTime: normalizeOfferTime(offer.startTime),
      endTime: normalizeOfferTime(offer.endTime),
      products: offer.products.map((product) => ({
        productId: product.productId,
        quantity: product.quantity,
      })),
    });
    setImageFile(null);
    updateImagePreview(offer.imageUrl || "");
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingOfferId(null);
    setErrors({});
    setPendingProductId("");
    setImageFile(null);
    updateImagePreview("");
    setForm(emptyForm());
  };

  const handleImageFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;

    if (!file) {
      setImageFile(null);
      updateImagePreview(form.imageUrl.trim());
      return;
    }

    if (!OFFER_IMAGE_TYPES.has(file.type)) {
      toast.error(getText("نوع الصورة يجب أن يكون JPG أو PNG أو WEBP", "Image must be JPG, PNG, or WEBP"));
      event.target.value = "";
      return;
    }

    if (file.size > OFFER_IMAGE_MAX_SIZE) {
      toast.error(getText("حجم الصورة يجب ألا يتجاوز 5 ميجابايت", "Image size must be 5 MB or less"));
      event.target.value = "";
      return;
    }

    setImageFile(file);
    updateImagePreview(URL.createObjectURL(file));
  };

  const addProductToForm = () => {
    if (!pendingProductId) return;
    setForm((current) => ({
      ...current,
      products: [...current.products, { productId: pendingProductId, quantity: 1 }],
    }));
    setPendingProductId("");
  };

  const updateProductQuantity = (productId: string, delta: number) => {
    setForm((current) => ({
      ...current,
      products: current.products.map((item) =>
        item.productId === productId
          ? { ...item, quantity: Math.max(1, item.quantity + delta) }
          : item,
      ),
    }));
  };

  const removeProduct = (productId: string) => {
    setForm((current) => ({
      ...current,
      products: current.products.filter((item) => item.productId !== productId),
    }));
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setIsSaving(true);
    let resolvedImageUrl = form.imageUrl.trim();

    if (imageFile) {
      const uploadedUrl = await uploadImage(imageFile);
      if (!uploadedUrl) {
        toast.error(getText("تعذر رفع الصورة", "Failed to upload image"));
        setIsSaving(false);
        return;
      }
      resolvedImageUrl = uploadedUrl;
    }

    const payload = {
      name: form.name.trim(),
      nameAr: form.nameAr.trim(),
      description: form.description.trim() || null,
      descriptionAr: form.descriptionAr.trim() || null,
      imageUrl: resolvedImageUrl || null,
      discountType: form.discountType,
      discountValue: Number(form.discountValue),
      startDate: form.startDate,
      endDate: form.endDate,
      startTime: toOfferApiTime(form.startTime),
      endTime: toOfferApiTime(form.endTime),
      products: form.products,
    };

    try {
      if (editingOfferId) {
        await updateOffer(editingOfferId, payload);
        toast.success(getText("تم تحديث العرض", "Offer updated"));
      } else {
        await createOffer(payload);
        toast.success(getText("تم حفظ العرض", "Offer saved"));
      }
      await loadData();
      closeForm();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : getText("تعذر حفظ العرض", "Failed to save offer");
      toast.error(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeactivate = async (offerId: number) => {
    if (!confirm(getText("هل تريد إلغاء تفعيل هذا العرض؟", "Are you sure you want to deactivate this offer?"))) {
      return;
    }

    setPendingActionOfferId(offerId);
    try {
      const success = await deactivateOffer(offerId);
      if (success) {
        toast.success(getText("تم إلغاء تفعيل العرض", "Offer deactivated"));
        await loadData();
      } else {
        toast.error(getText("تعذر إلغاء العرض", "Failed to deactivate offer"));
      }
    } finally {
      setPendingActionOfferId(null);
    }
  };

  const handleReactivate = async (offerId: number) => {
    setPendingActionOfferId(offerId);
    try {
      const success = await reactivateOffer(offerId);
      if (success) {
        toast.success(getText("تمت إعادة تفعيل العرض", "Offer reactivated"));
        await loadData();
      } else {
        toast.error(getText("تعذر إعادة التفعيل", "Failed to reactivate offer"));
      }
    } finally {
      setPendingActionOfferId(null);
    }
  };

  const handleDelete = async (offerId: number, offerName: string) => {
    if (!confirm(`${getText("هل أنت متأكد من حذف العرض", "Are you sure you want to delete the offer")} "${offerName}"?`)) {
      return;
    }

    setPendingActionOfferId(offerId);
    try {
      const success = await deleteOffer(offerId);
      if (success) {
        toast.success(getText("تم حذف العرض", "Offer deleted"));
        await loadData();
      } else {
        toast.error(getText("تعذر حذف العرض", "Failed to delete offer"));
      }
    } finally {
      setPendingActionOfferId(null);
    }
  };

  return (
    <div className="space-y-6 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{getText("العروض", "Offers")}</h1>
          <p className="text-sm text-slate-500">{getText("إدارة عروض الوجبات والباقات", "Manage combo and bundle offers")}</p>
        </div>
        {!isFormOpen && (
          <Button onClick={openNewForm} className="bg-primary text-primary-foreground hover:bg-primary/90">
            {getText("عرض جديد", "New Offer")}
          </Button>
        )}
      </div>

      {isFormOpen ? (
        <Card className="border-amber-200">
          <CardHeader>
            <CardTitle>{editingOfferId ? getText("تعديل العرض", "Edit Offer") : getText("إنشاء عرض", "Create Offer")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>{getText("الاسم بالإنجليزية", "Name (English)")}</Label>
                <Input
                  value={form.name}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                />
                {errors.name && <p className="text-sm text-red-600">{errors.name}</p>}
              </div>

              <div className="space-y-2">
                <Label>{getText("الاسم بالعربية", "Name (Arabic)")}</Label>
                <Input
                  dir="rtl"
                  value={form.nameAr}
                  onChange={(event) => setForm((current) => ({ ...current, nameAr: event.target.value }))}
                />
                {errors.nameAr && <p className="text-sm text-red-600">{errors.nameAr}</p>}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>{getText("الوصف بالإنجليزية", "Description (English)")}</Label>
                <Textarea
                  rows={4}
                  value={form.description}
                  onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                  placeholder={getText("وصف مختصر للعرض باللغة الإنجليزية", "Short summary for the offer in English")}
                />
              </div>

              <div className="space-y-2">
                <Label>{getText("الوصف بالعربية", "Description (Arabic)")}</Label>
                <Textarea
                  dir="rtl"
                  rows={4}
                  value={form.descriptionAr}
                  onChange={(event) => setForm((current) => ({ ...current, descriptionAr: event.target.value }))}
                  placeholder={getText("وصف مختصر للعرض باللغة العربية", "Short summary for the offer in Arabic")}
                />
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(18rem,22rem)]">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>{getText("رابط الصورة", "Image URL")}</Label>
                  <Input
                    value={form.imageUrl}
                    placeholder={getText("ألصق رابط الصورة إن وجد", "Paste an existing image URL if you have one")}
                    onChange={(event) => {
                      const nextUrl = event.target.value;
                      setForm((current) => ({ ...current, imageUrl: nextUrl }));
                      if (!imageFile) {
                        updateImagePreview(nextUrl.trim());
                      }
                    }}
                  />
                </div>

                <div className="space-y-2">
                  <Label>{getText("رفع صورة العرض", "Upload offer image")}</Label>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="block w-full cursor-pointer text-sm text-muted-foreground file:me-4 file:rounded file:border-0 file:bg-muted file:px-4 file:py-2 file:text-sm file:font-semibold file:text-foreground hover:file:bg-muted/80"
                    onChange={handleImageFileChange}
                  />
                  <p className="text-xs text-slate-500">
                    {getText("الأنواع المسموحة: JPG و PNG و WEBP حتى 5 ميجابايت", "Allowed: JPG, PNG, and WEBP up to 5 MB")}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>{getText("معاينة الصورة", "Image preview")}</Label>
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-sm">
                  <div className="relative aspect-[16/9] w-full">
                    <Image
                      src={imagePreview || "/offer-placeholder.svg"}
                      alt="Offer preview"
                      fill
                      unoptimized
                      sizes="(max-width: 1024px) 100vw, 22rem"
                      className="object-cover"
                    />
                  </div>
                </div>
                {!imagePreview && (
                  <p className="text-xs text-slate-500">
                    {getText("سيتم استخدام الصورة الافتراضية حتى تختار صورة", "The default placeholder will be used until you select an image")}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-end">
                <div className="flex-1 space-y-2">
                  <Label>{getText("المنتجات", "Products")}</Label>
                  <select
                    className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                    value={pendingProductId}
                    onChange={(event) => setPendingProductId(event.target.value)}
                  >
                    <option value="">{getText("اختر منتجًا", "Select a product")}</option>
                    {availableProducts.map((product) => (
                      <option key={product.id} value={product.id}>
                        {getProductName(product)}
                      </option>
                    ))}
                  </select>
                </div>
                <Button type="button" variant="outline" onClick={addProductToForm}>
                  {getText("إضافة المنتج", "Add Product")}
                </Button>
              </div>

              {errors.products && <p className="text-sm text-red-600">{errors.products}</p>}

              <div className="space-y-3">
                {selectedProducts.map((item) => (
                  <div key={item.productId} className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="font-semibold text-slate-900">
                        {getProductName(item.product)}
                      </div>
                      <div className="text-sm text-slate-500">
                        {formatCurrency(getEffectiveProductPrice(item.product), currency)} {getText("لكل قطعة", "per item")}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button type="button" variant="outline" onClick={() => updateProductQuantity(item.productId, -1)}>
                        -
                      </Button>
                      <span className="min-w-8 text-center font-semibold">{item.quantity}</span>
                      <Button type="button" variant="outline" onClick={() => updateProductQuantity(item.productId, 1)}>
                        +
                      </Button>
                      <Button type="button" variant="ghost" className="text-red-600" onClick={() => removeProduct(item.productId)}>
                        {getText("إزالة", "Remove")}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>{getText("نوع الخصم", "Discount Type")}</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={form.discountType === 0 ? "default" : "outline"}
                    onClick={() => setForm((current) => ({ ...current, discountType: 0 }))}
                  >
                    {getText("السعر النهائي", "Final Price")}
                  </Button>
                  <Button
                    type="button"
                    variant={form.discountType === 1 ? "default" : "outline"}
                    onClick={() => setForm((current) => ({ ...current, discountType: 1 }))}
                  >
                    {getText("نسبة الخصم", "Discount %")}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>{form.discountType === 0 ? getText("السعر النهائي", "Final Price") : getText("نسبة الخصم", "Discount %")}</Label>
                <Input
                  type="number"
                  min={0}
                  max={form.discountType === 1 ? 100 : undefined}
                  value={form.discountValue}
                  onChange={(event) => setForm((current) => ({ ...current, discountValue: event.target.value }))}
                />
                {errors.discountValue && <p className="text-sm text-red-600">{errors.discountValue}</p>}
              </div>
            </div>

            <Card className="bg-slate-950 text-white">
              <CardContent className="space-y-3 p-5">
                <div className="flex items-center justify-between text-sm text-slate-300">
                  <span>{getText("الإجمالي الأصلي", "Original total")}</span>
                  <span>{formatCurrency(preview.originalTotal, currency)}</span>
                </div>
                <div className="flex items-center justify-between text-sm text-emerald-300">
                  <span>{getText("قيمة التوفير", "Discount saved")}</span>
                  <span>{formatCurrency(preview.savings, currency)}</span>
                </div>
                <div className="flex items-center justify-between border-t border-white/10 pt-3">
                  <span className="text-base font-semibold">{getText("السعر النهائي", "Final price")}</span>
                  <span className="text-3xl font-black text-amber-300">{formatCurrency(preview.finalPrice, currency)}</span>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-slate-900">{getText("نافذة التوفر", "Availability Window")}</h3>
                <p className="text-sm text-slate-500">{getText("يوميًا خلال هذه الفترة", "Active daily within this window")}</p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>{getText("تاريخ البداية", "Start Date")}</Label>
                  <Input
                    type="date"
                    value={form.startDate}
                    onChange={(event) => setForm((current) => ({ ...current, startDate: event.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>{getText("تاريخ النهاية", "End Date")}</Label>
                  <Input
                    type="date"
                    value={form.endDate}
                    onChange={(event) => setForm((current) => ({ ...current, endDate: event.target.value }))}
                  />
                </div>
              </div>
              {errors.dateRange && <p className="text-sm text-red-600">{errors.dateRange}</p>}

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>{getText("من الساعة", "Daily from")}</Label>
                  <Input
                    type="time"
                    value={form.startTime}
                    onChange={(event) => setForm((current) => ({ ...current, startTime: event.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>{getText("إلى الساعة", "Daily to")}</Label>
                  <Input
                    type="time"
                    value={form.endTime}
                    onChange={(event) => setForm((current) => ({ ...current, endTime: event.target.value }))}
                  />
                </div>
              </div>
              {errors.timeRange && <p className="text-sm text-red-600">{errors.timeRange}</p>}
            </div>

            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={closeForm}>
                {getText("رجوع", "Back")}
              </Button>
              <Button type="button" onClick={handleSave} disabled={!isValid || isSaving} className="bg-primary text-primary-foreground hover:bg-primary/90">
                {isSaving ? getText("جارٍ الحفظ...", "Saving...") : getText("حفظ العرض", "Save Offer")}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>{getText("قائمة العروض", "Offers List")}</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="py-10 text-center text-slate-500">{getText("جارٍ تحميل العروض...", "Loading offers...")}</div>
            ) : offers.length === 0 ? (
              <div className="py-10 text-center text-slate-500">{getText("لا توجد عروض حتى الآن", "No offers yet")}</div>
            ) : (
              <Table className="[&_th]:whitespace-normal [&_td]:whitespace-pre">
                <TableHeader>
                  <TableRow>
                    <TableHead>{getText("الصورة", "Image")}</TableHead>
                    <TableHead>{getText("الاسم", "Name")}</TableHead>
                    <TableHead className="min-w-[220px]">{getText("المنتجات", "Products")}</TableHead>
                    <TableHead>{getText("السعر النهائي", "Final Price")}</TableHead>
                    <TableHead>{getText("الخصم", "Discount")}</TableHead>
                    <TableHead>{getText("الفترة", "Date Range")}</TableHead>
                    <TableHead>{getText("الوقت", "Time Window")}</TableHead>
                    <TableHead>{getText("الحالة", "Status")}</TableHead>
                    <TableHead className="text-end">{getText("الإجراءات", "Actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {offers.map((offer) => (
                    <TableRow key={offer.id}>
                      <TableCell>
                        <div className="relative h-14 w-20 overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                          <Image
                            src={offer.imageUrl || "/offer-placeholder.svg"}
                            alt={getOfferName(offer)}
                            fill
                            unoptimized
                            sizes="80px"
                            className="object-cover"
                          />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-semibold">{getOfferName(offer)}</div>
                        {getOfferDescription(offer) && (
                          <div className="mt-1 text-xs text-slate-400">
                            {getOfferDescription(offer)}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="min-w-[220px] max-w-sm whitespace-normal text-sm leading-6 text-slate-600">
                        <div className="space-y-1">
                          {offer.products.map((product) => (
                            <div key={`${offer.id}-${product.productId}`}>
                              {getProductName(product)} × {product.quantity}
                            </div>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>{formatCurrency(offer.finalPrice, currency)}</TableCell>
                      <TableCell>
                        {offer.discountType === 0
                          ? `${getText("ثابت", "Fixed")} ${formatCurrency(offer.discountValue, currency)}`
                          : `${offer.discountValue}%`}
                      </TableCell>
                      <TableCell>
                        {normalizeOfferDate(offer.startDate)} → {normalizeOfferDate(offer.endDate)}
                      </TableCell>
                      <TableCell>
                        {normalizeOfferTime(offer.startTime)} → {normalizeOfferTime(offer.endTime)}
                      </TableCell>
                      <TableCell>
                        <Badge className={offer.isActive && offer.isAvailableNow ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-700"}>
                          {offer.isActive
                            ? (offer.isAvailableNow ? getText("متاح الآن", "Available") : getText("غير متاح الآن", "Not Now"))
                            : getText("غير نشط", "Inactive")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-end">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" onClick={() => openEditForm(offer)} disabled={pendingActionOfferId === offer.id}>
                            {getText("تعديل", "Edit")}
                          </Button>
                          {offer.isActive ? (
                            <Button
                              variant="ghost"
                              className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                              onClick={() => handleDeactivate(offer.id)}
                              disabled={pendingActionOfferId === offer.id}
                            >
                              {getText("إلغاء التفعيل", "Deactivate")}
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              className="text-primary hover:text-primary/80 hover:bg-primary/5"
                              onClick={() => handleReactivate(offer.id)}
                              disabled={pendingActionOfferId === offer.id}
                            >
                              {getText("إعادة التفعيل", "Reactivate")}
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleDelete(offer.id, getOfferName(offer))}
                            disabled={pendingActionOfferId === offer.id}
                          >
                            {getText("حذف", "Delete")}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

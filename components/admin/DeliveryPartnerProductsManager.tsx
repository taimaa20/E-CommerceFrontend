"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { RefreshCw, Search, Store } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useLocale } from "@/components/locale-provider";
import { getCategories } from "@/lib/api";
import { formatCurrency } from "@/lib/currencies";
import { usePosStore } from "@/store/posStore";
import type { CategoryDto } from "@/types/pos";
import {
    DELIVERY_PARTNER_PRICING_RULE,
    getDeliveryPartnerMappingCategoryName,
    getDeliveryPartnerMappingProductName,
    getDeliveryPartnerName,
    getDeliveryPartnerProducts,
    getPricingRuleLabel,
    resolveMappingEffectivePrice,
    upsertDeliveryPartnerProductMapping,
    type DeliveryPartnerDto,
    type DeliveryPartnerPricingRule,
    type DeliveryPartnerProductMappingDto,
} from "@/lib/api-delivery-partners";

interface DeliveryPartnerProductsManagerProps {
    partner: DeliveryPartnerDto;
}

const DEFAULT_PAGE_SIZE = 20;
const PRICING_MODE_DEFAULT = "partner-default";

export default function DeliveryPartnerProductsManager({ partner }: DeliveryPartnerProductsManagerProps) {
    const { locale } = useLocale();
    const ar = locale === "ar";
    const { currency } = usePosStore();
    const [rows, setRows] = useState<DeliveryPartnerProductMappingDto[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
    const [search, setSearch] = useState("");
    const [categoryId, setCategoryId] = useState("all");
    const [categories, setCategories] = useState<CategoryDto[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [dirtyProducts, setDirtyProducts] = useState<Set<string>>(new Set());

    const text = {
        search: ar ? "ابحث بالاسم أو الكود" : "Search by name or code",
        allCategories: ar ? "كل التصنيفات" : "All categories",
        categoryFilter: ar ? "التصنيف" : "Category",
        products: ar ? "منتجات الشريك" : "Partner products",
        product: ar ? "المنتج" : "Product",
        category: ar ? "التصنيف" : "Category",
        externalId: ar ? "معرّف المنتج" : "Product ID",
        enabled: ar ? "مفعل" : "Enabled",
        available: ar ? "متوفر" : "Available",
        pricingRule: ar ? "قاعدة السعر" : "Pricing rule",
        pricingValue: ar ? "قيمة السعر" : "Pricing value",
        resultPrice: ar ? "سعر الشريك" : "Partner price",
        saveMappings: ar ? "حفظ الربط" : "Save mappings",
        refresh: ar ? "تحديث" : "Refresh",
        emptyProducts: ar ? "لا توجد منتجات" : "No products found",
        failedLoad: ar ? "تعذر تحميل المنتجات" : "Could not load partner products",
        failedSave: ar ? "تعذر حفظ ربط المنتجات" : "Could not save product mappings",
        mappingsSaved: ar ? "تم حفظ ربط المنتجات" : "Product mappings saved",
        loading: ar ? "جار التحميل..." : "Loading...",
        saving: ar ? "جار الحفظ..." : "Saving...",
        partnerDefault: ar ? "قاعدة الشريك" : "Partner default",
    };

    const loadRows = async () => {
        setLoading(true);
        try {
            const result = await getDeliveryPartnerProducts(partner.id, {
                page,
                pageSize,
                search,
                categoryId: categoryId === "all" ? undefined : categoryId,
            });
            setRows(result.items);
            setTotalCount(result.totalCount);
            setDirtyProducts(new Set());
        } catch {
            toast.error(text.failedLoad);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void loadRows();
    }, [partner.id, page, pageSize, search, categoryId]);

    useEffect(() => {
        let cancelled = false;
        void getCategories().then((items) => {
            if (!cancelled) setCategories(items);
        });

        return () => {
            cancelled = true;
        };
    }, []);

    const updateProductRow = (productId: string, patch: Partial<DeliveryPartnerProductMappingDto>) => {
        setRows((currentRows) => currentRows.map((row) =>
            row.productId === productId ? resolveMappingEffectivePrice({ ...row, ...patch }) : row
        ));
        setDirtyProducts((current) => new Set(current).add(productId));
    };

    const handleSaveMappings = async () => {
        if (dirtyProducts.size === 0) return;
        setSaving(true);
        try {
            await Promise.all(Array.from(dirtyProducts).map((productId) => {
                const row = rows.find((item) => item.productId === productId);
                if (!row) return Promise.resolve();
                return upsertDeliveryPartnerProductMapping(productId, partner.id, mappingPayload(row));
            }));
            toast.success(text.mappingsSaved);
            await loadRows();
        } catch {
            toast.error(text.failedSave);
        } finally {
            setSaving(false);
        }
    };

    return (
        <Card>
            <CardHeader className="pb-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <CardTitle className="flex items-center gap-2 text-base">
                        <Store className="h-4 w-4 text-primary" />
                        {text.products}: {getDeliveryPartnerName(partner, ar)}
                    </CardTitle>
                    <div className="flex flex-wrap gap-2">
                        <Button variant="outline" className="gap-2" onClick={() => void loadRows()} disabled={loading || saving}>
                            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                            {text.refresh}
                        </Button>
                        <Button onClick={() => void handleSaveMappings()} disabled={dirtyProducts.size === 0 || saving}>
                            {saving ? text.saving : text.saveMappings}{dirtyProducts.size > 0 ? ` (${dirtyProducts.size})` : ""}
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid gap-3 md:grid-cols-[1fr_260px]">
                    <div className="relative">
                        <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <Input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder={text.search} className="ps-9" />
                    </div>
                    <Select value={categoryId} onValueChange={(value) => { setCategoryId(value); setPage(1); }}>
                        <SelectTrigger aria-label={text.categoryFilter}>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">{text.allCategories}</SelectItem>
                            {categories.map((category) => (
                                <SelectItem key={category.id} value={category.id}>
                                    {ar ? (category.nameAr || category.name) : category.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="overflow-x-auto border border-slate-200">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{text.product}</TableHead>
                                <TableHead>{text.category}</TableHead>
                                <TableHead>{text.enabled}</TableHead>
                                <TableHead>{text.externalId}</TableHead>
                                <TableHead>{text.pricingRule}</TableHead>
                                <TableHead>{text.pricingValue}</TableHead>
                                <TableHead>{text.resultPrice}</TableHead>
                                <TableHead>{text.available}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow><TableCell colSpan={8} className="h-24 text-center text-slate-500">{text.loading}</TableCell></TableRow>
                            ) : rows.length === 0 ? (
                                <TableRow><TableCell colSpan={8} className="h-24 text-center text-slate-500">{text.emptyProducts}</TableCell></TableRow>
                            ) : rows.map((row) => (
                                <PartnerProductRow
                                    key={row.productId}
                                    row={row}
                                    ar={ar}
                                    currency={currency}
                                    text={text}
                                    onUpdateRow={updateProductRow}
                                />
                            ))}
                        </TableBody>
                    </Table>
                </div>
                <PaginationControls
                    pageNumber={page}
                    pageSize={pageSize}
                    totalCount={totalCount}
                    onPageChange={setPage}
                    onPageSizeChange={(nextSize) => { setPageSize(nextSize); setPage(1); }}
                    pageSizeOptions={[10, 20, 50]}
                    isLoading={loading}
                />
            </CardContent>
        </Card>
    );
}

function PartnerProductRow({
    row,
    ar,
    currency,
    text,
    onUpdateRow,
}: {
    row: DeliveryPartnerProductMappingDto;
    ar: boolean;
    currency: string;
    text: Record<string, string>;
    onUpdateRow: (productId: string, patch: Partial<DeliveryPartnerProductMappingDto>) => void;
}) {
    const pricingMode = row.pricingRuleType == null ? PRICING_MODE_DEFAULT : String(row.pricingRuleType);
    const categoryName = getDeliveryPartnerMappingCategoryName(row, ar);
    const usesValue = row.pricingRuleType != null
        && row.pricingRuleType !== DELIVERY_PARTNER_PRICING_RULE.None
        && row.pricingRuleType !== DELIVERY_PARTNER_PRICING_RULE.CustomPrice;
    const usesCustomPrice = row.pricingRuleType === DELIVERY_PARTNER_PRICING_RULE.CustomPrice;

    return (
        <TableRow>
            <TableCell className="min-w-52">
                <div className="font-medium">{getDeliveryPartnerMappingProductName(row, ar)}</div>
            </TableCell>
            <TableCell className="min-w-36 text-sm text-slate-600">
                {categoryName || "-"}
            </TableCell>
            <TableCell>
                <Switch checked={row.isEnabled} onCheckedChange={(checked) => onUpdateRow(row.productId, { isEnabled: checked })} />
            </TableCell>
            <TableCell className="min-w-40">
                <Input value={row.partnerProductId ?? ""} onChange={(event) => onUpdateRow(row.productId, { partnerProductId: event.target.value || null })} maxLength={120} />
            </TableCell>
            <TableCell className="min-w-48">
                <Select value={pricingMode} onValueChange={(value) => {
                    if (value === PRICING_MODE_DEFAULT) {
                        onUpdateRow(row.productId, { pricingRuleType: null, pricingRuleValue: null, customPrice: null });
                        return;
                    }
                    const rule = Number(value) as DeliveryPartnerPricingRule;
                    onUpdateRow(row.productId, {
                        pricingRuleType: rule,
                        pricingRuleValue: rule === DELIVERY_PARTNER_PRICING_RULE.CustomPrice ? null : 0,
                        customPrice: rule === DELIVERY_PARTNER_PRICING_RULE.CustomPrice ? row.productBasePrice : null,
                    });
                }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value={PRICING_MODE_DEFAULT}>{text.partnerDefault}</SelectItem>
                        <SelectItem value={String(DELIVERY_PARTNER_PRICING_RULE.None)}>{getPricingRuleLabel(DELIVERY_PARTNER_PRICING_RULE.None, ar)}</SelectItem>
                        <SelectItem value={String(DELIVERY_PARTNER_PRICING_RULE.PercentageIncrease)}>{getPricingRuleLabel(DELIVERY_PARTNER_PRICING_RULE.PercentageIncrease, ar)}</SelectItem>
                        <SelectItem value={String(DELIVERY_PARTNER_PRICING_RULE.PercentageDiscount)}>{getPricingRuleLabel(DELIVERY_PARTNER_PRICING_RULE.PercentageDiscount, ar)}</SelectItem>
                        <SelectItem value={String(DELIVERY_PARTNER_PRICING_RULE.FixedIncrease)}>{getPricingRuleLabel(DELIVERY_PARTNER_PRICING_RULE.FixedIncrease, ar)}</SelectItem>
                        <SelectItem value={String(DELIVERY_PARTNER_PRICING_RULE.FixedDiscount)}>{getPricingRuleLabel(DELIVERY_PARTNER_PRICING_RULE.FixedDiscount, ar)}</SelectItem>
                        <SelectItem value={String(DELIVERY_PARTNER_PRICING_RULE.CustomPrice)}>{getPricingRuleLabel(DELIVERY_PARTNER_PRICING_RULE.CustomPrice, ar)}</SelectItem>
                    </SelectContent>
                </Select>
            </TableCell>
            <TableCell className="min-w-32">
                {usesCustomPrice ? (
                    <Input type="number" min={0} step="0.01" value={row.customPrice ?? ""} onChange={(event) => onUpdateRow(row.productId, { customPrice: numberOrNull(event.target.value) })} />
                ) : usesValue ? (
                    <Input type="number" min={0} step="0.01" value={row.pricingRuleValue ?? ""} onChange={(event) => onUpdateRow(row.productId, { pricingRuleValue: numberOrNull(event.target.value) })} />
                ) : (
                    <Badge variant="secondary">{row.priceSource === "PartnerDefault" ? text.partnerDefault : getPricingRuleLabel(row.effectivePricingRuleType, ar)}</Badge>
                )}
            </TableCell>
            <TableCell className="font-semibold">{formatCurrency(row.effectivePrice, currency)}</TableCell>
            <TableCell>
                <Switch checked={row.isAvailable} onCheckedChange={(checked) => onUpdateRow(row.productId, { isAvailable: checked })} />
            </TableCell>
        </TableRow>
    );
}

function numberOrNull(value: string): number | null {
    if (value === "") return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
}

function mappingPayload(row: DeliveryPartnerProductMappingDto) {
    return {
        partnerProductId: row.partnerProductId?.trim() || null,
        isEnabled: row.isEnabled,
        isAvailable: row.isAvailable,
        pricingRuleType: row.pricingRuleType ?? null,
        pricingRuleValue: row.pricingRuleValue ?? null,
        customPrice: row.customPrice ?? null,
        availableStartDate: row.availableStartDate ?? null,
        availableEndDate: row.availableEndDate ?? null,
        availableFrom: normalizeTime(row.availableFrom),
        availableTo: normalizeTime(row.availableTo),
    };
}

function normalizeTime(value?: string | null): string | null {
    if (!value) return null;
    return value.length === 5 ? `${value}:00` : value;
}

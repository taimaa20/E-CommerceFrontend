"use client";

import { useEffect, useState } from "react";
import { Boxes, PackageSearch, Search } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useLocale } from "@/components/locale-provider";
import { InventoryActiveBadge } from "@/components/inventory/inventory-shared";
import { RetailState, StockStatusBadge } from "@/components/retail/retail-shared";
import { getProductsPaginated } from "@/lib/api";
import { retailApi } from "@/lib/api-retail";
import type { ProductDto } from "@/types/pos";
import type { RetailProductDetail, RetailProductDto } from "@/types/retail";

const SEARCH_DEBOUNCE_MS = 300;
const PICKER_PAGE_SIZE = 8;
// The product endpoint's page-size ceiling. Product names are unique per tenant, so a search on
// the item's own name always returns its product well inside one page.
const PRODUCT_LOOKUP_PAGE_SIZE = 100;

/**
 * Starts product setup from something that is already in stock.
 *
 * A retail inventory item IS a Product — its stock record and movement history hang off that
 * ProductId — so picking one creates and links nothing. It hands back that same Product so the
 * form opens it for editing, and saving goes through the normal product update of the same id.
 */
export function ExistingInventoryItemPicker({ onSelect }: { onSelect: (product: ProductDto) => void }) {
    const { locale } = useLocale();
    const ar = locale === "ar";

    const [searchInput, setSearchInput] = useState("");
    const [search, setSearch] = useState("");
    const [items, setItems] = useState<RetailProductDto[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    // Null until the unfiltered catalogue has answered once. A tenant with no stocked items never
    // sees this card, so its product form stays exactly as it was.
    const [hasCatalogue, setHasCatalogue] = useState<boolean | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [reloadKey, setReloadKey] = useState(0);
    const [openingProductId, setOpeningProductId] = useState<string | null>(null);

    useEffect(() => {
        const timeoutId = window.setTimeout(() => setSearch(searchInput.trim()), SEARCH_DEBOUNCE_MS);
        return () => window.clearTimeout(timeoutId);
    }, [searchInput]);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError(false);

        retailApi
            .catalog({ pageNumber: 1, pageSize: PICKER_PAGE_SIZE, search })
            .then((page) => {
                if (cancelled) return;
                setItems(page.items);
                setTotalCount(page.totalCount);
                if (!search) setHasCatalogue(page.totalCount > 0);
            })
            .catch(() => {
                if (!cancelled) setError(true);
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [search, reloadKey]);

    if (hasCatalogue === false) return null;

    const openItem = async (item: RetailProductDto) => {
        const failure = ar ? "تعذّر فتح المنتج الخاص بهذا الصنف." : "Could not open the product for this item.";
        setOpeningProductId(item.productId);
        try {
            const page = await getProductsPaginated(1, PRODUCT_LOOKUP_PAGE_SIZE, item.name);
            const product = page.items.find((row) => row.id === item.productId);
            if (product) onSelect(product);
            else toast.error(failure);
        } catch {
            toast.error(failure);
        } finally {
            setOpeningProductId(null);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                    <PackageSearch className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                    {ar ? "صنف موجود في المخزون" : "Existing inventory item"}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                    {ar
                        ? "هل الصنف موجود في المخزون؟ اختره لتجهيز المنتج نفسه ونشره. يبقى الرمز والمخزون والتكلفة كما هي، ولا يُنشأ أو يُكرَّر أي شيء."
                        : "Already in stock? Pick it to configure and publish that same product. Its SKU, stock and cost stay as they are — nothing is created or duplicated."}
                </p>
            </CardHeader>
            <CardContent className="space-y-3">
                <div className="relative">
                    <Search className="pointer-events-none absolute start-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        placeholder={ar ? "ابحث بالاسم أو الرمز أو الباركود" : "Search by name, SKU or barcode"}
                        className="ps-8"
                    />
                </div>

                {loading && <RetailState kind="loading" ar={ar} />}
                {!loading && error && <RetailState kind="error" ar={ar} onRetry={() => setReloadKey((key) => key + 1)} />}
                {!loading && !error && items.length === 0 && (
                    <RetailState kind="empty" ar={ar} emptyText={ar ? "لا توجد أصناف مطابقة." : "No inventory items match."} />
                )}

                {!loading && !error && items.length > 0 && (
                    <ul className="divide-y rounded-md border">
                        {items.map((item) => (
                            <li key={item.productId}>
                                <button
                                    type="button"
                                    onClick={() => void openItem(item)}
                                    disabled={openingProductId !== null}
                                    className="flex w-full items-center gap-3 p-3 text-start transition-colors hover:bg-accent disabled:cursor-wait disabled:opacity-60"
                                >
                                    <span className="min-w-0 flex-1">
                                        <span className="block truncate font-medium">{item.displayName}</span>
                                        <span className="block truncate text-xs text-muted-foreground">
                                            <span className="font-mono">{item.sku}</span>
                                            {itemIdentity(item) && ` · ${itemIdentity(item)}`}
                                        </span>
                                    </span>
                                    <span className="flex shrink-0 flex-col items-end gap-1">
                                        <span className="text-sm tabular-nums">
                                            {openingProductId === item.productId
                                                ? (ar ? "جارٍ الفتح…" : "Opening…")
                                                : `${ar ? "المتوفر" : "Available"}: ${item.stockOnHand}`}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <StockStatusBadge status={item.stockStatus} ar={ar} />
                                            {!item.isActive && <InventoryActiveBadge isActive={false} ar={ar} />}
                                        </span>
                                    </span>
                                </button>
                            </li>
                        ))}
                    </ul>
                )}

                {!loading && !error && totalCount > items.length && (
                    <p className="text-xs text-muted-foreground">
                        {ar
                            ? `يُعرض ${items.length} من ${totalCount}. حدّد البحث لتضييق النتائج.`
                            : `Showing ${items.length} of ${totalCount}. Refine the search to narrow it down.`}
                    </p>
                )}
            </CardContent>
        </Card>
    );
}

/**
 * Read-only view of the stock record a product is sold from. Shown in place of the stocking
 * choice, which is already settled for such a product and cannot be changed from this form.
 */
export function LinkedInventoryItemCard({ detail }: { detail: RetailProductDetail }) {
    const { locale } = useLocale();
    const ar = locale === "ar";
    const supplier = (ar ? detail.supplierNameAr : null) || detail.supplierName;

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                    <Boxes className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                    {ar ? "صنف المخزون" : "Inventory item"}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                    {ar
                        ? "يُباع هذا المنتج من سجل المخزون الموجود أدناه. الحفظ لا يُنشئ مخزونًا ولا يغيّر الكمية — المخزون يتحرك فقط بالمشتريات والمبيعات والتسويات."
                        : "This product is sold from the existing stock record below. Saving never creates stock or changes the quantity — stock moves only through purchases, sales and adjustments."}
                </p>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm sm:grid-cols-3">
                <Figure label={ar ? "الرمز (SKU)" : "SKU"} value={detail.sku} mono />
                <Figure label={ar ? "الباركود" : "Barcode"} value={detail.barcode} mono />
                <Figure label={ar ? "العلامة التجارية" : "Brand"} value={detail.brand} />
                <Figure label={ar ? "الحجم" : "Size"} value={detail.sizeLabel} />
                <Figure label={ar ? "المورّد" : "Supplier"} value={supplier} />
                <div>
                    <p className="text-xs text-muted-foreground">{ar ? "المتوفر" : "Available"}</p>
                    <div className="mt-0.5 flex items-center gap-2">
                        <span className="font-semibold tabular-nums">{detail.stockOnHand}</span>
                        <StockStatusBadge status={detail.stockStatus} ar={ar} />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

function Figure({ label, value, mono }: { label: string; value?: string | null; mono?: boolean }) {
    return (
        <div className="min-w-0">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className={`mt-0.5 truncate font-medium ${mono ? "font-mono text-xs" : ""}`}>{value || "—"}</p>
        </div>
    );
}

/** Barcode (when it differs from the SKU), brand and size — what tells similar items apart. */
function itemIdentity(item: RetailProductDetail): string {
    return [item.barcode && item.barcode !== item.sku ? item.barcode : null, item.brand, item.sizeLabel]
        .filter(Boolean)
        .join(" · ");
}

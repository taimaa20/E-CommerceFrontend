"use client"

import React, { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { PlusCircle, Edit, Trash2, Package, Upload, Search, X } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { StandardFilter, type StandardFilterOption } from "@/components/filters/StandardFilter"
import { ProductDto, CategoryDto } from "@/types/pos"
import { getProducts, getProductsPaginated, uploadProductsExcel, deleteProduct, getCategories } from "@/lib/api"
import { productImage } from "@/lib/product-image"
import { PaginationControls } from "@/components/ui/pagination-controls"
import ProductSheet from "@/components/admin/ProductSheet"
import { useLocale } from "@/components/locale-provider"
import { usePosStore } from "@/store/posStore"
import { RetailStockCell } from "@/components/retail/RetailStockCell"

const SEARCH_DEBOUNCE_MS = 300

export default function ProductsPage() {
    const searchParams = useSearchParams()
    const { t, locale } = useLocale()
    const { currency } = usePosStore()
    const [products, setProducts] = useState<ProductDto[]>([])
    // Retail columns appear only when the current page actually contains retail
    // products. Data-driven, so no branch flag leaks into the rest of the screen.
    const hasRetailProducts = products.some((product) => product.retail)
    const [categories, setCategories] = useState<CategoryDto[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [loadError, setLoadError] = useState(false)
    const [isSheetOpen, setIsSheetOpen] = useState(false)
    const [editProduct, setEditProduct] = useState<ProductDto | null>(null)
    const [isUploading, setIsUploading] = useState(false)

    // Pagination state
    const [pageNumber, setPageNumber] = useState(1)
    const [pageSize, setPageSize] = useState(10)
    const [totalCount, setTotalCount] = useState(0)

    // Filter state
    const [searchInput, setSearchInput] = useState("")
    const [searchTerm, setSearchTerm] = useState("")
    const [filterCategory, setFilterCategory] = useState("all")
    const [filterStatus, setFilterStatus] = useState("all")
    const [filterStation, setFilterStation] = useState("all")

    useEffect(() => {
        getCategories().then(setCategories).catch(() => {})
    }, [])

    useEffect(() => {
        const productId = searchParams.get("productId")
        if (!productId) return
        getProducts().then((rows) => {
            const product = rows.find((row) => row.id === productId)
            if (product) { setEditProduct(product); setIsSheetOpen(true) }
        }).catch(() => {})
    }, [searchParams])

    // Debounce search so each keystroke doesn't fire its own request.
    useEffect(() => {
        const timeoutId = window.setTimeout(() => {
            setSearchTerm(searchInput.trim())
            setPageNumber(1)
        }, SEARCH_DEBOUNCE_MS)

        return () => window.clearTimeout(timeoutId)
    }, [searchInput])

    // Re-fetch whenever page or filters change
    useEffect(() => {
        fetchProducts()
    }, [pageNumber, pageSize, searchTerm, filterCategory, filterStatus, filterStation])

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;

        setIsUploading(true);
        const file = e.target.files[0];

        try {
            const result = await uploadProductsExcel(file);
            if (result && result.count >= 0) {
                toast.success(result.message || t("productsUploadedSuccess"));
                fetchProducts();
            } else {
                toast.error(t("uploadFailedMsg"));
            }
        } catch (error) {
            toast.error(t("uploadErrorMsg"));
        } finally {
            setIsUploading(false);
            e.target.value = "";
        }
    };

    const fetchProducts = async () => {
        setIsLoading(true)
        setLoadError(false)
        try {
            const categoryId = filterCategory !== "all" ? filterCategory : undefined
            const status = filterStatus !== "all" ? (filterStatus as "active" | "inactive") : undefined
            const stationRouting = filterStation !== "all" ? Number(filterStation) : undefined

            const data = await getProductsPaginated(
                pageNumber, pageSize, searchTerm, categoryId, status, stationRouting
            )
            setProducts(data.items)
            setTotalCount(data.totalCount)
        } catch (error) {
            setLoadError(true)
            console.error("Error fetching products:", error)
            toast.error(t("couldNotConnect"))
        } finally {
            setIsLoading(false)
        }
    }

    const handleEdit = (product: ProductDto) => {
        setEditProduct(product)
        setIsSheetOpen(true)
    }

    const handleNewProduct = () => {
        setEditProduct(null)
        setIsSheetOpen(true)
    }

    const handleDeleteProduct = async (id: string, name: string) => {
        if (!confirm(`${t("confirmDelete")} ${name}?`)) return

        try {
            const success = await deleteProduct(id)
            if (success) {
                toast.success(t("productDeletedSuccess"))
                fetchProducts()
            } else {
                toast.error(t("productDeleteFailed"))
            }
        } catch (error) {
            console.error("Error deleting product:", error)
            toast.error(t("productDeleteFailed"))
        }
    }

    const handleSheetClose = (open: boolean) => {
        setIsSheetOpen(open)
        if (!open) {
            setEditProduct(null)
        }
    }

    const resetFilters = () => {
        setSearchInput("")
        setSearchTerm("")
        setFilterCategory("all")
        setFilterStatus("all")
        setFilterStation("all")
        setPageNumber(1)
    }

    // Reset to page 1 when any filter changes
    const handleFilterChange = (setter: React.Dispatch<React.SetStateAction<string>>) =>
        (value: string) => {
            setter(value)
            setPageNumber(1)
        }

    const isFiltered = searchInput !== "" || searchTerm !== "" || filterCategory !== "all" || filterStatus !== "all" || filterStation !== "all"

    const filterMenuText = {
        search: t("filterSearchPlaceholder"),
        empty: t("filterNoOptions"),
        loading: t("loadingText"),
        clear: t("filterClear"),
    }
    const categoryFilterOptions: StandardFilterOption[] = [
        { value: "all", label: t("allCategories") },
        ...categories.map((c) => ({
            value: c.id,
            label: locale === "ar" ? (c.nameAr || c.displayName || c.name) : (c.displayName || c.name),
            searchText: `${c.name} ${c.nameAr ?? ""}`,
        })),
    ]
    const statusFilterOptions: StandardFilterOption[] = [
        { value: "all", label: t("allStatuses") },
        { value: "active", label: t("activeStatus") },
        { value: "inactive", label: t("inactiveStatus") },
    ]
    const stationFilterOptions: StandardFilterOption[] = [
        { value: "all", label: t("allStations") },
        { value: "0", label: `👨‍🍳 ${t("stationKitchen")}` },
        { value: "1", label: `🍹 ${t("stationBar")}` },
        { value: "2", label: `🔄 ${t("stationBoth")}` },
    ]

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 2
        }).format(amount)
    }

    const getStationBadge = (routing: number) => {
        switch (routing) {
            case 0: return <Badge variant="outline" className="bg-primary/5 text-primary">👨‍🍳 {t("stationKitchen")}</Badge>
            case 1: return <Badge variant="outline" className="bg-info/10 text-info">🍹 {t("stationBar")}</Badge>
            case 2: return <Badge variant="outline" className="bg-accent/10 text-accent-foreground">🔄 {t("stationBoth")}</Badge>
            default: return <Badge variant="outline">-</Badge>
        }
    }

    const hasAllergens = (allergens: number) => allergens > 0

    return (
        <div className="space-y-6 p-0 sm:p-2 lg:p-4">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between rtl:sm:flex-row-reverse">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                        {t("menuMgmtTitle")}
                    </h1>
                    <p className="text-muted-foreground">
                        {t("menuMgmtSubtitle")}
                    </p>
                </div>

                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row rtl:sm:flex-row-reverse">
                    <label htmlFor="excel-upload">
                        <Button
                            variant="outline"
                            className="w-full cursor-pointer gap-2 sm:w-auto"
                            asChild
                        >
                            <span>
                                <Upload className="w-4 h-4" />
                                {t("uploadExcel")}
                            </span>
                        </Button>
                    </label>
                    <input
                        id="excel-upload"
                        type="file"
                        accept=".xlsx, .xls"
                        className="hidden"
                        onChange={handleFileUpload}
                        disabled={isUploading}
                    />

                    <Button
                        onClick={handleNewProduct}
                        className="w-full gap-2 bg-primary text-primary-foreground hover:bg-primary/90 sm:w-auto"
                    >
                        <PlusCircle className="w-4 h-4" />
                        {t("addNewProduct")}
                    </Button>
                </div>
            </div>

            {/* Product List */}
            <Card className="border-none shadow-xl bg-white/50 backdrop-blur-sm dark:bg-zinc-900/50">
                <CardHeader>
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between rtl:md:flex-row-reverse">
                        <div>
                            <CardTitle>{t("productList")}</CardTitle>
                            <CardDescription>{t("productListDesc")}</CardDescription>
                        </div>
                    </div>

                    {/* Search + Filters */}
                    <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:flex-wrap rtl:sm:flex-row-reverse">
                        <div className="relative flex-1 min-w-[180px]">
                            <Search className="absolute start-2.5 top-2.5 h-4 w-4 text-muted-foreground rtl:start-auto rtl:end-2.5" />
                            <Input
                                placeholder={t("searchProducts")}
                                value={searchInput}
                                onChange={(e) => setSearchInput(e.target.value)}
                                className="ps-8 rtl:ps-0 rtl:pe-8"
                            />
                        </div>

                        <StandardFilter
                            value={filterCategory}
                            onValueChange={(value) => handleFilterChange(setFilterCategory)(value ?? "all")}
                            options={categoryFilterOptions}
                            placeholder={t("allCategories")}
                            searchPlaceholder={filterMenuText.search}
                            emptyText={filterMenuText.empty}
                            loadingText={filterMenuText.loading}
                            clearLabel={filterMenuText.clear}
                            clearable={false}
                            triggerClassName="w-full sm:w-44"
                        />

                        <StandardFilter
                            value={filterStatus}
                            onValueChange={(value) => handleFilterChange(setFilterStatus)(value ?? "all")}
                            options={statusFilterOptions}
                            placeholder={t("allStatuses")}
                            searchPlaceholder={filterMenuText.search}
                            emptyText={filterMenuText.empty}
                            loadingText={filterMenuText.loading}
                            clearLabel={filterMenuText.clear}
                            clearable={false}
                            triggerClassName="w-full sm:w-40"
                        />

                        <StandardFilter
                            value={filterStation}
                            onValueChange={(value) => handleFilterChange(setFilterStation)(value ?? "all")}
                            options={stationFilterOptions}
                            placeholder={t("allStations")}
                            searchPlaceholder={filterMenuText.search}
                            emptyText={filterMenuText.empty}
                            loadingText={filterMenuText.loading}
                            clearLabel={filterMenuText.clear}
                            clearable={false}
                            triggerClassName="w-full sm:w-40"
                        />

                        {isFiltered && (
                            <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground" onClick={resetFilters}>
                                <X className="w-3.5 h-3.5" />
                                {t("resetFilters")}
                            </Button>
                        )}
                    </div>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                        </div>
                    ) : loadError ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>{t("couldNotConnect")}</p>
                            <Button
                                onClick={fetchProducts}
                                variant="outline"
                                className="mt-4"
                            >
                                {t("retryBtn")}
                            </Button>
                        </div>
                    ) : totalCount === 0 && !isFiltered ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>{t("noProductsYet")}</p>
                            <Button
                                onClick={handleNewProduct}
                                variant="outline"
                                className="mt-4"
                            >
                                {t("addFirstProduct")}
                            </Button>
                        </div>
                    ) : products.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <Search className="h-12 w-12 mx-auto mb-4 opacity-30" />
                            <p className="font-medium">{t("noProductsYet")}</p>
                            <Button variant="ghost" size="sm" className="mt-3" onClick={resetFilters}>
                                {t("resetFilters")}
                            </Button>
                        </div>
                    ) : (
                        <>
                        <div className="overflow-x-auto rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/50">
                                        <TableHead className="font-bold">{t("productNameCol")}</TableHead>
                                        {hasRetailProducts && (
                                            <>
                                                <TableHead className="font-bold">{locale === "ar" ? "الرمز" : "SKU"}</TableHead>
                                                <TableHead className="font-bold">{locale === "ar" ? "العلامة" : "Brand"}</TableHead>
                                                <TableHead className="text-end font-bold">{locale === "ar" ? "المخزون" : "Stock"}</TableHead>
                                                <TableHead className="text-end font-bold">{locale === "ar" ? "التكلفة" : "Cost"}</TableHead>
                                            </>
                                        )}
                                        <TableHead className="font-bold">{t("priceCol")}</TableHead>
                                        <TableHead className="font-bold">{t("stationCol")}</TableHead>
                                        <TableHead className="text-center font-bold">{t("statusCol")}</TableHead>
                                        <TableHead className="text-center font-bold">{t("featuresCol")}</TableHead>
                                        <TableHead className="text-end font-bold">{t("actions")}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {products.map((product) => (
                                        <TableRow
                                            key={product.id}
                                            className="hover:bg-muted/50 transition-colors"
                                        >
                                            <TableCell className="font-medium">
                                                {(() => {
                                                    const productDisplayName = product.displayName || product.name;
                                                    return (
                                                <div className="flex items-center gap-3">
                                                    {(() => {
                                                        // 40×40 admin thumbnail — use the 200-px WebP variant
                                                        // (~8-15 KB) when available, falling back to the legacy
                                                        // full-resolution URL for pre-pipeline products. A page
                                                        // with 50 product rows now transfers ~500 KB of thumbs
                                                        // instead of 30 MB of originals.
                                                        const thumbSrc = productImage(product.imageKey, product.imageUrl, "thumb");
                                                        return thumbSrc ? (
                                                            <img
                                                                src={thumbSrc}
                                                                alt={productDisplayName}
                                                                className="w-10 h-10 rounded-lg object-cover"
                                                                loading="lazy"
                                                                decoding="async"
                                                            />
                                                        ) : (
                                                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-400 to-pink-600 flex items-center justify-center text-white font-bold">
                                                                {productDisplayName.charAt(0)}
                                                            </div>
                                                        );
                                                    })()}
                                                    <div>
                                                        <div className="font-semibold">{productDisplayName}</div>
                                                        {product.modifierGroups.length > 0 && (
                                                            <div className="text-xs text-muted-foreground">
                                                                {product.modifierGroups.length} {t("optionGroups")}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                    )
                                                })()}
                                            </TableCell>
                                            {hasRetailProducts && (
                                                <>
                                                    <TableCell className="font-mono text-xs">{product.retail?.sku ?? "—"}</TableCell>
                                                    <TableCell className="text-sm">{product.retail?.brand ?? "—"}</TableCell>
                                                    <TableCell className="text-end tabular-nums">
                                                        {product.retail ? (
                                                            <RetailStockCell detail={product.retail} ar={locale === "ar"} />
                                                        ) : (
                                                            "—"
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-end tabular-nums text-sm">
                                                        {product.retail && product.costPrice != null
                                                            ? formatCurrency(product.costPrice)
                                                            : "—"}
                                                    </TableCell>
                                                </>
                                            )}
                                            <TableCell>
                                                <div className="space-y-1">
                                                    {product.discountedPrice ? (
                                                        <>
                                                            <div className="text-sm line-through text-muted-foreground">
                                                                {formatCurrency(product.basePrice)}
                                                            </div>
                                                            <div className="text-lg font-bold text-destructive">
                                                                {formatCurrency(product.discountedPrice)}
                                                            </div>
                                                            <Badge variant="destructive" className="text-xs">
                                                                {t("discountedBadge")}
                                                            </Badge>
                                                        </>
                                                    ) : (
                                                        <div className="text-lg font-semibold">
                                                            {formatCurrency(product.basePrice)}
                                                        </div>
                                                    )}
                                                    {product.costPrice && (
                                                        <div className="text-xs text-muted-foreground">
                                                                {t("costLabel")} {formatCurrency(product.costPrice)}
                                                        </div>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {getStationBadge(product.stationRouting)}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {product.isActive ? (
                                                    <Badge className="bg-success/10 text-success dark:bg-success/10 dark:text-success">
                                                        {t("activeStatus")}
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="secondary">
                                                        {t("inactiveStatus")}
                                                    </Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    {hasAllergens(product.allergens) && (
                                                        <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30">
                                                            ⚠️ {t("allergenBadge")}
                                                        </Badge>
                                                    )}
                                                    {product.printerIds && (
                                                        <Badge variant="outline" className="bg-info/10 text-info">
                                                            🖨️ Printer
                                                        </Badge>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-end">
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        onClick={() => handleEdit(product)}
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-slate-500 hover:text-primary hover:bg-primary/5"
                                                    >
                                                        <Edit className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        onClick={() => handleDeleteProduct(product.id, product.displayName || product.name)}
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-slate-500 hover:text-destructive hover:bg-destructive/5"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                        <PaginationControls
                            pageNumber={pageNumber}
                            pageSize={pageSize}
                            totalCount={totalCount}
                            onPageChange={setPageNumber}
                            onPageSizeChange={(size) => { setPageSize(size); setPageNumber(1) }}
                            isLoading={isLoading}
                        />
                        </>
                    )}
                </CardContent>
            </Card>

            {/* Product Sheet */}
            <ProductSheet
                open={isSheetOpen}
                onOpenChange={handleSheetClose}
                onSuccess={fetchProducts}
                editProduct={editProduct}
            />
        </div>
    )
}


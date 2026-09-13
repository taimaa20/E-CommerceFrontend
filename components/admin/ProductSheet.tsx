"use client"

import React, { useState, useEffect, useRef } from "react"
import { Save, Plus, X, Trash2, AlertCircle, Pencil, Check, Link2 } from "lucide-react"
import { toast } from "sonner"
import { usePosStore } from "@/store/posStore"
import { generateUUID } from "@/lib/uuid"
import { formatCurrency } from "@/lib/currencies"
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetFooter
} from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { useLocale } from "@/components/locale-provider"
import ProductGalleryEditor, { type GalleryEntry } from "@/components/admin/ProductGalleryEditor"
import { InventoryCostingFields, emptyInventoryCostingForm, inventoryCostingFormFromDetail, inventoryCostingPayloadFromForm, type InventoryCostingFormState } from "@/components/products/InventoryCostingFields"
import { ProductInventoryBehaviourField, type ProductInventoryBehaviour } from "@/components/products/ProductInventoryBehaviourField"
import { ExistingInventoryItemPicker, LinkedInventoryItemCard } from "@/components/products/ExistingInventoryItemField"
import { ProcurementApi, type Supplier } from "@/lib/api-procurement"
import { ProductDto, ModifierGroupDto, ModifierDto, StationRouting, AllergenType, RecipeItemDto, RecipeItemAlternativeDto, CategoryDto, ModifierGroupLibraryDto, ProductOptionDto, ProductOptionRecipeItemDto, RecipeItemAlternativePricingType } from "@/types/pos"
import { createProduct, updateProduct, getProducts, getRawMaterials, RawMaterial, UnitLabels, addRecipeItem, deleteRecipeItem, updateRecipeItem, uploadImage, getCategories, getModifierGroups, getProductOptions, createProductOption, updateProductOption, deleteProductOption, addProductOptionRecipeItem, updateProductOptionRecipeItem, deleteProductOptionRecipeItem, createRecipeItemAlternative, updateRecipeItemAlternative, deleteRecipeItemAlternative, getKitchens, getPrinters, KitchenDto, PrinterDto } from "@/lib/api"
import ProductDeliveryPartnersTab from "@/components/admin/ProductDeliveryPartnersTab"
import ProductBranchAssignmentsTab from "@/components/admin/ProductBranchAssignmentsTab"
import { config } from "@/lib/config"
import {
    DELIVERY_PARTNER_STATUS,
    getDeliveryPartners,
    getDeliveryPartnerProductMappings,
    resolveMappingEffectivePrice,
    upsertDeliveryPartnerProductMapping,
    type DeliveryPartnerDto,
    type DeliveryPartnerProductMappingDto,
} from "@/lib/api-delivery-partners"
import { getTranslatedUnit } from "@/lib/utils"
import { DEFAULT_PROFIT_MARGIN, MAX_MARGIN_PERCENT, MAX_MARKUP_VALUE, calculateBasePriceFromMarkup, formatMarkupValue, formatPricingValue, normalizeNonNegativeInput, parsePricingNumber, roundCurrency, type ProductMarkupType, type ProductPricingMode } from "@/lib/product-pricing"
import { resolveRecipeAlternativePriceImpactForRow, resolveRecipeAlternativePriceLabel } from "@/lib/recipe-alternative-pricing"

interface ProductSheetProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess: () => void
    editProduct?: ProductDto | null
    /** Opens an already-stocked Product for editing instead of creating a new one. */
    onConfigureExistingProduct?: (product: ProductDto) => void
}

type AlternativeDraftState = {
    rawMaterialId: string
    amount: string
    priceAdjustment: string
    isDefault: boolean
}

const ALLERGEN_OPTIONS = [
    { value: AllergenType.Gluten },
    { value: AllergenType.Dairy },
    { value: AllergenType.Nuts },
    { value: AllergenType.Eggs },
    { value: AllergenType.Fish },
    { value: AllergenType.Shellfish },
    { value: AllergenType.Soy },
    { value: AllergenType.Sesame },
]

/**
 * Tailwind needs the whole class name to exist in the source, so the tab strip picks its
 * column count from here rather than composing one at runtime.
 */
const TAB_GRID_COLUMNS: Record<number, string> = {
    4: "sm:grid-cols-4",
    5: "sm:grid-cols-5",
    6: "sm:grid-cols-6",
    7: "sm:grid-cols-7",
}

const createAlternativeDraftState = (): AlternativeDraftState => ({
    rawMaterialId: "",
    amount: "",
    priceAdjustment: "0",
    isDefault: false,
})

export default function ProductSheet({ open, onOpenChange, onSuccess, editProduct, onConfigureExistingProduct }: ProductSheetProps) {
    const { t, locale } = useLocale()
    const currency = usePosStore((s) => s.currency)
    // Tab 1: Genel Bilgiler
    const [productName, setProductName] = useState("")
    const [productNameAr, setProductNameAr] = useState("")
    const [productDescription, setProductDescription] = useState("")
    const [productDescriptionAr, setProductDescriptionAr] = useState("")
    const [productCalories, setProductCalories] = useState("")
    // Storefront gallery. Entry 0 is the PRIMARY image (Product.imageUrl/imageKey);
    // entries 1+ become the ProductImages collection, in this order.
    const [gallery, setGallery] = useState<GalleryEntry[]>([])
    const [isActive, setIsActive] = useState(true)
    // Public "Coming Soon" flag — toggles menu/website Coming-Soon rendering.
    const [isSoon, setIsSoon] = useState(false)

    // Tab 2: Finans
    const [costPrice, setCostPrice] = useState("")
    const [basePrice, setBasePrice] = useState("")
    const [pricingMode, setPricingMode] = useState<ProductPricingMode>("manual")
    const [markup, setMarkup] = useState("1")
    const [profitMargin, setProfitMargin] = useState(DEFAULT_PROFIT_MARGIN.toString())
    const [discountPercentage, setDiscountPercentage] = useState("0")
    const [discountedPrice, setDiscountedPrice] = useState("")
    // Public-menu-only promotional pricing — does NOT affect POS / orders.
    const [useCustomPrice, setUseCustomPrice] = useState(false)
    const [customPrice, setCustomPrice] = useState("")

    // Tab 3: Operasyon
    const [allergens, setAllergens] = useState<number>(0)
    const [stationRouting, setStationRouting] = useState<number>(StationRouting.KitchenOnly)
    const [printerIds, setPrinterIds] = useState("")
    const [kitchenId, setKitchenId] = useState<string>("")
    const [kitchens, setKitchens] = useState<KitchenDto[]>([])
    const [printers, setPrinters] = useState<PrinterDto[]>([])
    const referenceDataLoadedRef = useRef(false)
    const [allKitchenPrinters, setAllKitchenPrinters] = useState<boolean>(false)
    const [kitchenPrinterIds, setKitchenPrinterIds] = useState<string[]>([])
    const [availabilityExpanded, setAvailabilityExpanded] = useState(false)
    const [availableStartDate, setAvailableStartDate] = useState("")
    const [availableEndDate, setAvailableEndDate] = useState("")
    const [availableFrom, setAvailableFrom] = useState("")
    const [availableTo, setAvailableTo] = useState("")

    // Modifier Groups
    const [modifierGroups, setModifierGroups] = useState<ModifierGroupDto[]>([])

    // Recipe Tab
    const [recipeItems, setRecipeItems] = useState<RecipeItemDto[]>([])
    const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([])
    const [selectedMaterialId, setSelectedMaterialId] = useState("")
    const [recipeAmount, setRecipeAmount] = useState("")
    const [selectedRecipeTarget, setSelectedRecipeTarget] = useState("base")
    // Inline recipe row editing
    const [editingRecipeItemId, setEditingRecipeItemId] = useState<string | null>(null)
    const [editingRecipeAmount, setEditingRecipeAmount] = useState<string>("")

    // Per-recipe-row ingredient alternatives (Pita → Saj, etc.)
    // Only one row is expanded at a time → a single draft object is enough.
    const [expandedAltRecipeId, setExpandedAltRecipeId] = useState<string | null>(null)
    const [alternativeDrafts, setAlternativeDrafts] = useState<Record<string, AlternativeDraftState>>({})

    // Product Options (variants / alternatives) — each option overrides price + recipe
    // The option is selected FROM the raw materials list: the material becomes the
    // option's single auto-created recipe ingredient, and its name/price default
    // from the material. Extra ingredients can be added later via "Edit recipe".
    const [productOptions, setProductOptions] = useState<ProductOptionDto[]>([])
    const [newOptionMaterialId, setNewOptionMaterialId] = useState("")
    const [newOptionAmount, setNewOptionAmount] = useState("1")
    const [newOptionPrice, setNewOptionPrice] = useState("")
    const [newOptionIsDefault, setNewOptionIsDefault] = useState(false)
    const [editingOptionId, setEditingOptionId] = useState<string | null>(null)
    const [editingOptionName, setEditingOptionName] = useState("")
    const [editingOptionNameAr, setEditingOptionNameAr] = useState("")
    const [editingOptionPrice, setEditingOptionPrice] = useState("")
    const [editingOptionIsDefault, setEditingOptionIsDefault] = useState(false)

    // Categories
    const [categories, setCategories] = useState<CategoryDto[]>([])
    const [selectedCategoryId, setSelectedCategoryId] = useState<string>("")
    const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<string>("")

    // Extras Library (for linking existing groups)
    const [libraryGroups, setLibraryGroups] = useState<ModifierGroupLibraryDto[]>([])
    const [linkDialogOpen, setLinkDialogOpen] = useState(false)

    // Validation state — declared up here so derived pricing error memos (below)
    // can read it without hitting a temporal-dead-zone ReferenceError.
    const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
    const [deliveryPartnerRows, setDeliveryPartnerRows] = useState<DeliveryPartnerProductMappingDto[]>([])

    // How this product is stocked. Derived from what the product already has rather than
    // stored twice: a product with its own stock record is a finished good, everything else
    // is recipe-based, which is exactly how every existing product already behaves.
    const [inventoryBehaviour, setInventoryBehaviour] = useState<ProductInventoryBehaviour>("recipe")
    const [inventoryCostingForm, setInventoryCostingForm] = useState<InventoryCostingFormState>(emptyInventoryCostingForm)
    const [retailSuppliers, setRetailSuppliers] = useState<{ id: string; name: string }[]>([])
    const [dirtyDeliveryPartnerIds, setDirtyDeliveryPartnerIds] = useState<Set<string>>(new Set())

    function resetForm() {
        setInventoryBehaviour("recipe")
        setInventoryCostingForm(emptyInventoryCostingForm)
        setProductName("")
        setProductNameAr("")
        setProductDescription("")
        setProductDescriptionAr("")
        setProductCalories("")
        setGallery([])
        setIsActive(true)
        setIsSoon(false)
        setCostPrice("")
        setBasePrice("")
        setPricingMode("manual")
        setMarkup("1")
        setProfitMargin(DEFAULT_PROFIT_MARGIN.toString())
        setDiscountPercentage("0")
        setDiscountedPrice("")
        setUseCustomPrice(false)
        setCustomPrice("")
        setAllergens(0)
        setStationRouting(StationRouting.KitchenOnly)
        setPrinterIds("")
        setKitchenId("")
        setAllKitchenPrinters(false)
        setKitchenPrinterIds([])
        setAvailabilityExpanded(false)
        setAvailableStartDate("")
        setAvailableEndDate("")
        setAvailableFrom("")
        setAvailableTo("")
        setModifierGroups([])
        setRecipeItems([])
        setSelectedMaterialId("")
        setRecipeAmount("")
        setSelectedRecipeTarget("base")
        setSelectedCategoryId("")
        setSelectedSubcategoryId("")
        setProductOptions([])
        setNewOptionMaterialId("")
        setNewOptionAmount("1")
        setNewOptionPrice("")
        setNewOptionIsDefault(false)
        setEditingOptionId(null)
        setEditingOptionName("")
        setEditingOptionNameAr("")
        setEditingOptionPrice("")
        setEditingOptionIsDefault(false)
        setExpandedAltRecipeId(null)
        setAlternativeDrafts({})
        setDeliveryPartnerRows([])
        setDirtyDeliveryPartnerIds(new Set())
    }

    function buildDraftDeliveryPartnerRows(partners: DeliveryPartnerDto[]): DeliveryPartnerProductMappingDto[] {
        return partners.map((partner) => resolveMappingEffectivePrice({
            id: null,
            partnerId: partner.id,
            partnerName: partner.name,
            partnerNameAr: partner.nameAr,
            partnerCode: partner.code,
            partnerStatus: partner.status,
            partnerDefaultPricingRuleType: partner.defaultPricingRuleType,
            partnerDefaultPricingRuleValue: partner.defaultPricingRuleValue,
            productId: "",
            productName: productName || "",
            productNameAr: productNameAr || null,
            productBasePrice: 0,
            productIsActive: true,
            partnerProductId: null,
            isEnabled: false,
            isAvailable: true,
            pricingRuleType: null,
            pricingRuleValue: null,
            customPrice: null,
            effectivePrice: 0,
            effectivePricingRuleType: partner.defaultPricingRuleType,
            effectivePricingRuleValue: partner.defaultPricingRuleValue,
            priceSource: "PartnerDefault",
            availableStartDate: null,
            availableEndDate: null,
            availableFrom: null,
            availableTo: null,
            updatedAt: null,
        }))
    }

    // Load product data when editing
    useEffect(() => {
        // Master-data lookups are fetched once per page mount, not on every
        // sheet open — re-opening the sheet repeatedly was firing 5 identical
        // requests each time (categories, raw materials, library, kitchens, printers).
        if (open && !referenceDataLoadedRef.current) {
            void Promise.all([
                getCategories(),
                getRawMaterials(),
                getModifierGroups(),
                getKitchens(),
                getPrinters()
            ]).then(([categoryData, materialData, libraryData, kitchenData, printerData]) => {
                referenceDataLoadedRef.current = true
                setCategories(categoryData)
                setRawMaterials(materialData)
                setLibraryGroups(libraryData)
                setKitchens(kitchenData)
                setPrinters(printerData)
            })
        }

        if (editProduct && open) {
            setInventoryCostingForm(inventoryCostingFormFromDetail(editProduct.retail))
            setInventoryBehaviour(editProduct.retail ? "finished" : "recipe")
            const resolvedPricingMode = editProduct.pricingMode ?? "manual"
            const resolvedCost = editProduct.costPrice ?? 0
            const resolvedProfitMargin = editProduct.profitMargin
                ?? (editProduct.basePrice > 0
                    ? ((editProduct.basePrice - resolvedCost) / editProduct.basePrice) * 100
                    : 0)
            const resolvedMultiplier = editProduct.profitMultiplier
                ?? (resolvedCost > 0 ? editProduct.basePrice / resolvedCost : 0)

            setProductName(editProduct.name)
            setProductNameAr(editProduct.nameAr || "")
            setProductDescription(editProduct.description || "")
            setProductDescriptionAr(editProduct.descriptionAr || "")
            setProductCalories(editProduct.calories?.toString() || "")
            setGallery([
                ...(editProduct.imageUrl ? [{ imageUrl: editProduct.imageUrl, imageKey: editProduct.imageKey || undefined }] : []),
                ...(editProduct.images ?? []).map(image => ({ imageUrl: image.imageUrl, imageKey: image.imageKey || undefined })),
            ])
            setIsActive(editProduct.isActive)
            setIsSoon(editProduct.isSoon ?? false)
            setCostPrice(editProduct.costPrice?.toString() || "")
            setBasePrice(editProduct.basePrice.toString())
            setPricingMode(resolvedPricingMode)
            setMarkup(formatMarkupValue(
                resolvedPricingMode === "multiplier"
                    ? (editProduct.markup ?? resolvedMultiplier)
                    : resolvedMultiplier,
                "multiplier"
            ))
            setProfitMargin(
                formatPricingValue(
                    resolvedPricingMode === "margin"
                        ? (editProduct.markup ?? resolvedProfitMargin)
                        : resolvedProfitMargin
                )
            )
            setDiscountPercentage((editProduct.discountPercentage ?? ((editProduct.discountedPrice && editProduct.basePrice > 0)
                ? (1 - (editProduct.discountedPrice / editProduct.basePrice)) * 100
                : 0)).toString())
            setDiscountedPrice(editProduct.discountedPrice?.toString() || "")
            setUseCustomPrice(editProduct.useCustomPrice ?? false)
            setCustomPrice(editProduct.customPrice != null ? editProduct.customPrice.toString() : "")
            setAllergens(editProduct.allergens || 0)
            setStationRouting(editProduct.stationRouting || StationRouting.KitchenOnly)
            setPrinterIds(editProduct.printerIds || "")
            setKitchenId(editProduct.kitchenId || "")
            setAllKitchenPrinters(editProduct.allKitchenPrinters ?? false)
            setKitchenPrinterIds(editProduct.kitchenPrinterIds ?? [])
            setAvailabilityExpanded(!!(editProduct.availableStartDate || editProduct.availableEndDate || editProduct.availableFrom || editProduct.availableTo))
            setAvailableStartDate(editProduct.availableStartDate?.slice(0, 10) || "")
            setAvailableEndDate(editProduct.availableEndDate?.slice(0, 10) || "")
            setAvailableFrom(editProduct.availableFrom?.slice(0, 5) || "")
            setAvailableTo(editProduct.availableTo?.slice(0, 5) || "")
            setModifierGroups(editProduct.modifierGroups || [])
            setRecipeItems(editProduct.recipeItems || [])
            setSelectedRecipeTarget("base")
            setSelectedCategoryId(editProduct.categoryId || "")
            setSelectedSubcategoryId(editProduct.subcategoryId || "")
            setExpandedAltRecipeId(null)
            setAlternativeDrafts({})

            // Load product options (variants) — backend exposes dedicated endpoints.
            void getProductOptions(editProduct.id)
                .then((opts) => setProductOptions(opts ?? []))
                .catch(() => setProductOptions([]))

            if (config.deliveryPartnersEnabled) {
                void getDeliveryPartnerProductMappings(editProduct.id)
                    .then((rows) => {
                        setDeliveryPartnerRows(rows)
                        setDirtyDeliveryPartnerIds(new Set())
                    })
                    .catch(() => {
                        setDeliveryPartnerRows([])
                        setDirtyDeliveryPartnerIds(new Set())
                    })
            }

        } else if (!editProduct && open) {
            resetForm()
            if (config.deliveryPartnersEnabled) {
                // Partner↔product pricing is master data: list every active partner,
                // not just those enabled for the currently selected branch.
                void getDeliveryPartners({ status: DELIVERY_PARTNER_STATUS.Active, pageSize: 200 })
                    .then((page) => {
                        setDeliveryPartnerRows(buildDraftDeliveryPartnerRows(page.items))
                        setDirtyDeliveryPartnerIds(new Set())
                    })
                    .catch(() => setDeliveryPartnerRows([]))
            }
        }
    }, [editProduct, open])

    // Supplier options for the Retail tab. Reads the shared supplier master used by
    // procurement — retail never creates its own supplier list.
    useEffect(() => {
        if (!open) return
        void ProcurementApi.getSuppliers()
            .then((suppliers: Supplier[]) =>
                setRetailSuppliers(
                    suppliers
                        .filter((supplier): supplier is Supplier & { id: string } => Boolean(supplier.id))
                        .map((supplier) => ({ id: supplier.id, name: supplier.name })),
                ))
            .catch(() => setRetailSuppliers([]))
    }, [open])

    // Product-option recipe targets come first — each option fully overrides the
    // base recipe when selected at POS time, so listing them prominently helps
    // the admin understand they are editing a replacement recipe, not an additive one.
    const optionRecipeTargets = productOptions.map((option) => ({
        value: `option:${option.id}`,
        label: locale === "ar" && option.nameAr ? option.nameAr : option.name,
        groupLabel: locale === "ar" ? "البدائل" : "Alternatives",
        isShared: false,
        isOption: true,
        optionId: option.id,
    }))

    const modifierRecipeTargets = modifierGroups.flatMap((group) =>
        (group.modifiers ?? []).map((modifier) => ({
            value: modifier.id,
            label: locale === "ar" && modifier.nameAr ? modifier.nameAr : modifier.name,
            groupLabel: locale === "ar" && group.nameAr ? group.nameAr : group.name,
            isShared: group.isShared === true,
            isOption: false,
            optionId: undefined as string | undefined,
        }))
    )

    const recipeTargetOptions = [...optionRecipeTargets, ...modifierRecipeTargets]

    const selectedRecipeTargetOption = recipeTargetOptions.find((option) => option.value === selectedRecipeTarget)
    const isOptionRecipeTarget = selectedRecipeTargetOption?.isOption === true
    const selectedOptionId = isOptionRecipeTarget ? selectedRecipeTargetOption!.optionId! : null
    const isSharedRecipeTarget = selectedRecipeTarget !== "base" && !isOptionRecipeTarget && selectedRecipeTargetOption?.isShared === true

    const optionRecipeItemsToRecipeItemDtos = (items: ProductOptionRecipeItemDto[]): RecipeItemDto[] =>
        items.map((item) => ({
            id: item.id,
            rawMaterialId: item.rawMaterialId,
            rawMaterialName: item.rawMaterialName,
            rawMaterialNameAr: item.rawMaterialNameAr,
            showInMenu: item.showInMenu,
            isPostPrice: item.isPostPrice,
            amount: item.amount,
            unit: item.unit,
            unitCost: item.unitCost ?? 0,
            totalCost: item.totalCost ?? (item.amount * (item.unitCost ?? 0)),
        }))

    const currentRecipeItems: RecipeItemDto[] = selectedRecipeTarget === "base"
        ? recipeItems
        : isOptionRecipeTarget
            ? optionRecipeItemsToRecipeItemDtos(
                productOptions.find((opt) => opt.id === selectedOptionId)?.recipeItems ?? []
            )
            : modifierGroups
                .flatMap((group) => group.modifiers)
                .find((modifier) => modifier.id === selectedRecipeTarget)
                ?.recipeItems ?? []

    const setCurrentRecipeItems = (updater: (items: RecipeItemDto[]) => RecipeItemDto[]) => {
        if (selectedRecipeTarget === "base") {
            setRecipeItems((prev) => updater(prev))
            return
        }

        if (isOptionRecipeTarget && selectedOptionId) {
            setProductOptions((prev) => prev.map((option) => {
                if (option.id !== selectedOptionId) return option
                const nextItems = updater(optionRecipeItemsToRecipeItemDtos(option.recipeItems ?? []))
                return {
                    ...option,
                    recipeItems: nextItems.map((ri) => ({
                        id: ri.id,
                        rawMaterialId: ri.rawMaterialId,
                        rawMaterialName: ri.rawMaterialName,
                        rawMaterialNameAr: ri.rawMaterialNameAr,
                        showInMenu: ri.showInMenu,
                        isPostPrice: ri.isPostPrice,
                        amount: ri.amount,
                        unit: ri.unit,
                        unitCost: ri.unitCost,
                        totalCost: ri.totalCost,
                    })),
                }
            }))
            return
        }

        setModifierGroups((prev) => prev.map((group) => ({
            ...group,
            modifiers: group.modifiers.map((modifier) =>
                modifier.id === selectedRecipeTarget
                    ? { ...modifier, recipeItems: updater(modifier.recipeItems ?? []) }
                    : modifier
            )
        })))
    }

    const getAllergenLabel = (allergen: AllergenType) => {
        switch (allergen) {
            case AllergenType.Gluten:
                return t("allergenGluten")
            case AllergenType.Dairy:
                return t("allergenDairy")
            case AllergenType.Nuts:
                return t("allergenNuts")
            case AllergenType.Eggs:
                return t("allergenEggs")
            case AllergenType.Fish:
                return t("allergenFish")
            case AllergenType.Shellfish:
                return t("allergenShellfish")
            case AllergenType.Soy:
                return t("allergenSoy")
            case AllergenType.Sesame:
                return t("allergenSesame")
            default:
                return ""
        }
    }

    const handleAddRecipeItem = async () => {
        if (!selectedMaterialId || !recipeAmount) return
        if (isSharedRecipeTarget) {
            toast.warning(locale === "ar" ? "عدّل البدائل المشتركة من مكتبة الإضافات." : "Edit shared alternatives from Extras Library.")
            return
        }

        const parsedAmount = parseFloat(recipeAmount)
        if (!parsedAmount || parsedAmount <= 0) {
            toast.warning(t("validIngredientAmount"))
            return
        }

        const material = rawMaterials.find(m => m.id === selectedMaterialId)
        if (!material) return

        const newItem: RecipeItemDto = {
            id: "temp-" + generateUUID(),
            rawMaterialId: material.id,
            rawMaterialName: material.name,
            rawMaterialNameAr: material.nameAr,
            showInMenu: material.showInMenu,
            isPostPrice: material.isPostPrice,
            amount: parsedAmount,
            unit: material.unit.toString(),
            unitCost: material.costPerUnit,
            totalCost: parsedAmount * material.costPerUnit
        }

        // Option recipe items are persisted via their own endpoint so that they
        // are available immediately — the main product save does not touch them.
        if (isOptionRecipeTarget && selectedOptionId) {
            try {
                await addProductOptionRecipeItem(selectedOptionId, {
                    productOptionId: selectedOptionId,
                    rawMaterialId: material.id,
                    amount: parsedAmount,
                })
                const refreshed = editProduct ? await getProductOptions(editProduct.id) : productOptions
                setProductOptions(refreshed)
                setSelectedMaterialId("")
                setRecipeAmount("")
                toast.success(t("ingredientAdded"))
            } catch (error: unknown) {
                console.error(error)
                toast.error(error instanceof Error ? error.message : t("anErrorOccurred"))
            }
            return
        }

        if (selectedRecipeTarget !== "base") {
            setCurrentRecipeItems((prev) => [...prev, newItem])
            setSelectedMaterialId("")
            setRecipeAmount("")
            toast.success(t("ingredientAdded"))
            return
        }

        if (!editProduct) {
            setRecipeItems(prev => [...prev, newItem])
            setSelectedMaterialId("")
            setRecipeAmount("")
            toast.success(t("ingredientAdded"))
            return
        }

        const payload = {
            productId: editProduct.id,
            rawMaterialId: selectedMaterialId,
            amount: parsedAmount
        };
        console.log("Sending Recipe Data:", payload);

        try {
            await addRecipeItem(payload)

            toast.success(t("ingredientAdded"))
            setSelectedMaterialId("")
            setRecipeAmount("")
            // Trigger refresh
            onSuccess()

            // Optimistic update
            setRecipeItems(prev => [...prev, newItem])
        } catch (error: unknown) {
            console.error(error)
            toast.error(error instanceof Error ? error.message : t("anErrorOccurred"))
        }
    }

    const handleDeleteRecipeItem = async (id: string) => {
        if (isSharedRecipeTarget) {
            toast.warning(locale === "ar" ? "عدّل البدائل المشتركة من مكتبة الإضافات." : "Edit shared alternatives from Extras Library.")
            return
        }

        if (isOptionRecipeTarget && selectedOptionId) {
            try {
                await deleteProductOptionRecipeItem(id)
                const refreshed = editProduct ? await getProductOptions(editProduct.id) : productOptions
                setProductOptions(refreshed)
                toast.success(t("ingredientRemoved"))
            } catch (error: unknown) {
                console.error(error)
                toast.error(error instanceof Error ? error.message : t("anErrorOccurred"))
            }
            return
        }

        if (selectedRecipeTarget !== "base") {
            setCurrentRecipeItems(prev => prev.filter(i => i.id !== id))
            return
        }

        // If it's a temp item, just remove from state
        if (id.startsWith("temp-")) {
            setRecipeItems(prev => prev.filter(i => i.id !== id))
            return
        }

        const success = await deleteRecipeItem(id)
        if (success) {
            toast.success(t("ingredientRemoved"))
            setRecipeItems(prev => prev.filter(i => i.id !== id))
            onSuccess()
        } else {
            toast.error(t("anErrorOccurred"))
        }
    }

    // ── Per-recipe-row ingredient alternatives ────────────────────────────
    // Mutates the alternatives array on the matching recipe row without
    // re-fetching the whole product — keeps the form snappy.
    const updateAlternativesForRow = (
        recipeItemId: string,
        updater: (alts: RecipeItemAlternativeDto[]) => RecipeItemAlternativeDto[]
    ) => {
        setRecipeItems(prev => prev.map(ri =>
            ri.id === recipeItemId
                ? { ...ri, alternatives: updater(ri.alternatives ?? []) }
                : ri
        ))
    }

    const getAlternativeDraft = (recipeItemId: string) =>
        alternativeDrafts[recipeItemId] ?? createAlternativeDraftState()

    const updateAlternativeDraft = (
        recipeItemId: string,
        updater: (draft: AlternativeDraftState) => AlternativeDraftState
    ) => {
        setAlternativeDrafts((prev) => ({
            ...prev,
            [recipeItemId]: updater(prev[recipeItemId] ?? createAlternativeDraftState()),
        }))
    }

    const clearAlternativeDraft = (recipeItemId: string) => {
        setAlternativeDrafts((prev) => {
            if (!(recipeItemId in prev)) return prev

            const next = { ...prev }
            delete next[recipeItemId]
            return next
        })
    }

    const handleToggleAltRow = (recipeItemId: string) => {
        if (expandedAltRecipeId === recipeItemId) {
            setExpandedAltRecipeId(null)
        } else {
            setExpandedAltRecipeId(recipeItemId)
            setAlternativeDrafts((prev) =>
                prev[recipeItemId]
                    ? prev
                    : { ...prev, [recipeItemId]: createAlternativeDraftState() }
            )
        }
    }

    // Drain every temp-alt-* draft sitting on a temp recipe row. Runs after
    // the product save resolves, resolves real recipe-item ids by rawMaterialId,
    // and issues the POSTs the UI couldn't issue earlier. Errors are logged
    // per-draft so a single bad row doesn't swallow the rest.
    const flushPendingAlternatives = async (savedProductName: string) => {
        const pendingByMaterialId = new Map<string, RecipeItemAlternativeDto[]>()
        for (const ri of recipeItems) {
            if (!ri.id.startsWith("temp-")) continue
            const drafts = (ri.alternatives ?? []).filter(a => a.id.startsWith("temp-alt-"))
            if (drafts.length > 0) {
                pendingByMaterialId.set(ri.rawMaterialId, drafts)
            }
        }
        if (pendingByMaterialId.size === 0) return

        try {
            const products = await getProducts()
            const saved = editProduct
                ? products.find(p => p.id === editProduct.id)
                : products.find(p => p.name === savedProductName)
            if (!saved?.recipeItems) return

            for (const ri of saved.recipeItems) {
                const drafts = pendingByMaterialId.get(ri.rawMaterialId)
                if (!drafts) continue
                for (const draft of drafts) {
                    try {
                        await createRecipeItemAlternative({
                            recipeItemId: ri.id,
                            rawMaterialId: draft.rawMaterialId,
                            amount: draft.amount,
                            priceAdjustment: draft.priceAdjustment,
                            alternativePricingType: draft.alternativePricingType,
                            customerAdditionalPrice: draft.customerAdditionalPrice,
                            fixedOverridePrice: draft.fixedOverridePrice,
                            isDefault: draft.isDefault,
                            sortOrder: draft.sortOrder,
                        })
                    } catch (err) {
                        console.error("Failed to persist draft alternative", { recipeItemId: ri.id, draft, err })
                    }
                }
            }
        } catch (err) {
            console.error("Failed to resolve saved product for alternative flush", err)
        }
    }

    const handleAddAlternative = async (recipeItemId: string) => {
        const draft = getAlternativeDraft(recipeItemId)

        if (!draft.rawMaterialId || draft.rawMaterialId === "none") {
            toast.warning(locale === "ar" ? "اختر مادة خام." : "Select a raw material.")
            return
        }
        const parsedAmount = parseFloat(draft.amount)
        if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
            toast.warning(t("validIngredientAmount"))
            return
        }
        const parsedPriceAdj = parseFloat(draft.priceAdjustment)
        const priceAdj = Number.isFinite(parsedPriceAdj) ? parsedPriceAdj : 0

        // Optimistic insert — show the draft row immediately, swap in the
        // server-assigned record once the POST resolves. Guarantees the row
        // appears the moment the user clicks "Add", independent of latency.
        const pickedMaterial = rawMaterials.find((m) => m.id === draft.rawMaterialId)
        const currentRecipeItem = recipeItems.find(r => r.id === recipeItemId)
        const replacementRowPrice = parsedAmount * (pickedMaterial?.costPerUnit ?? 0)
        const originalRowCost = currentRecipeItem ? getRecipeItemTotalCost(currentRecipeItem) : 0
        const tempAltId = `temp-alt-${generateUUID()}`
        const isDefault = draft.isDefault
        const optimisticAlt: RecipeItemAlternativeDto = {
            id: tempAltId,
            recipeItemId,
            rawMaterialId: draft.rawMaterialId,
            rawMaterialName: pickedMaterial?.name ?? "",
            rawMaterialNameAr: pickedMaterial?.nameAr,
            name: null,
            nameAr: null,
            amount: parsedAmount,
            unit: pickedMaterial ? pickedMaterial.unit.toString() : "",
            priceAdjustment: replacementRowPrice,
            alternativePricingType: RecipeItemAlternativePricingType.PriceDifference,
            customerAdditionalPrice: priceAdj,
            fixedOverridePrice: null,
            customerPriceImpact: priceAdj,
            costImpact: replacementRowPrice - originalRowCost,
            unitCost: pickedMaterial?.costPerUnit ?? 0,
            totalCost: replacementRowPrice,
            isDefault,
            isActive: true,
            sortOrder: 0,
        }
        updateAlternativesForRow(recipeItemId, (alts) => {
            const cleared = isDefault ? alts.map(a => ({ ...a, isDefault: false })) : alts
            return [...cleared, optimisticAlt]
        })
        clearAlternativeDraft(recipeItemId)

        // Draft recipe rows have no server id yet, so the dedicated POST would
        // 404. Keep the alternative in local state and flush it during the
        // product save, where real recipe-item ids become available.
        if (recipeItemId.startsWith("temp-")) {
            return
        }

        try {
            const created = await createRecipeItemAlternative({
                recipeItemId,
                rawMaterialId: optimisticAlt.rawMaterialId,
                amount: parsedAmount,
                priceAdjustment: replacementRowPrice,
                alternativePricingType: RecipeItemAlternativePricingType.PriceDifference,
                customerAdditionalPrice: priceAdj,
                fixedOverridePrice: null,
                isDefault,
                sortOrder: 0,
            })
            updateAlternativesForRow(recipeItemId, (alts) =>
                alts.map(a => a.id === tempAltId ? created : a)
            )
            toast.success(locale === "ar" ? "تمت إضافة البديل." : "Alternative added.")
        } catch (error: unknown) {
            // Rollback the optimistic row so the UI stays truthful.
            updateAlternativesForRow(recipeItemId, (alts) => alts.filter(a => a.id !== tempAltId))
            updateAlternativeDraft(recipeItemId, () => draft)
            console.error(error)
            toast.error(error instanceof Error ? error.message : t("anErrorOccurred"))
        }
    }

    const handleDeleteAlternative = async (recipeItemId: string, altId: string) => {
        // Snapshot the row being removed so we can restore it if the DELETE fails.
        const currentRow = recipeItems.find(r => r.id === recipeItemId)
        const snapshot = currentRow?.alternatives?.find(a => a.id === altId)
        updateAlternativesForRow(recipeItemId, (alts) => alts.filter(a => a.id !== altId))

        if (altId.startsWith("temp-alt-")) {
            // Optimistic row that never reached the server — nothing to delete remotely.
            return
        }

        try {
            await deleteRecipeItemAlternative(altId)
            toast.success(locale === "ar" ? "تم حذف البديل." : "Alternative removed.")
        } catch (error: unknown) {
            if (snapshot) {
                updateAlternativesForRow(recipeItemId, (alts) =>
                    alts.some(a => a.id === snapshot.id)
                        ? alts
                        : [...alts, snapshot].sort((a, b) => a.sortOrder - b.sortOrder)
                )
            }
            console.error(error)
            toast.error(error instanceof Error ? error.message : t("anErrorOccurred"))
        }
    }

    const handleUpdateAlternative = async (
        recipeItemId: string,
        alt: RecipeItemAlternativeDto,
        patch: Partial<Pick<RecipeItemAlternativeDto, "isDefault" | "isActive" | "priceAdjustment" | "amount">>
    ) => {
        // Apply the patch locally first so toggles feel instant.
        const nextIsDefault = patch.isDefault ?? alt.isDefault
        updateAlternativesForRow(recipeItemId, (alts) => {
            const cleared = nextIsDefault && patch.isDefault === true
                ? alts.map(a => ({ ...a, isDefault: a.id === alt.id }))
                : alts
            return cleared.map(a => a.id === alt.id ? { ...a, ...patch } : a)
        })

        // Drafts carry no server id — the patched values ride along with the
        // post-save flush instead of a dedicated PUT.
        if (alt.id.startsWith("temp-alt-") || recipeItemId.startsWith("temp-")) {
            return
        }

        try {
            const updated = await updateRecipeItemAlternative(alt.id, {
                rawMaterialId: alt.rawMaterialId,
                name: alt.name ?? null,
                nameAr: alt.nameAr ?? null,
                amount: patch.amount ?? alt.amount,
                priceAdjustment: patch.priceAdjustment ?? alt.priceAdjustment,
                alternativePricingType: alt.alternativePricingType,
                customerAdditionalPrice: alt.customerAdditionalPrice,
                fixedOverridePrice: alt.fixedOverridePrice,
                isDefault: nextIsDefault,
                isActive: patch.isActive ?? alt.isActive,
                sortOrder: alt.sortOrder,
            })
            updateAlternativesForRow(recipeItemId, (alts) => {
                const cleared = updated.isDefault
                    ? alts.map(a => ({ ...a, isDefault: a.id === updated.id }))
                    : alts
                return cleared.map(a => a.id === updated.id ? updated : a)
            })
        } catch (error: unknown) {
            // Revert the optimistic patch on failure.
            updateAlternativesForRow(recipeItemId, (alts) =>
                alts.map(a => a.id === alt.id ? alt : a)
            )
            console.error(error)
            toast.error(error instanceof Error ? error.message : t("anErrorOccurred"))
        }
    }

    const handleStartEditRecipeItem = (item: RecipeItemDto) => {
        if (isSharedRecipeTarget) {
            toast.warning(locale === "ar" ? "عدّل البدائل المشتركة من مكتبة الإضافات." : "Edit shared alternatives from Extras Library.")
            return
        }

        setEditingRecipeItemId(item.id)
        setEditingRecipeAmount(item.amount.toString())
    }

    const handleSaveRecipeItemEdit = async (item: RecipeItemDto) => {
        if (isSharedRecipeTarget) {
            toast.warning(locale === "ar" ? "عدّل البدائل المشتركة من مكتبة الإضافات." : "Edit shared alternatives from Extras Library.")
            return
        }

        const parsedAmount = parseFloat(editingRecipeAmount)
        if (!parsedAmount || parsedAmount <= 0) {
            toast.warning(t("validIngredientAmount"))
            return
        }

        if (isOptionRecipeTarget && selectedOptionId) {
            try {
                await updateProductOptionRecipeItem(item.id, parsedAmount)
                const refreshed = editProduct ? await getProductOptions(editProduct.id) : productOptions
                setProductOptions(refreshed)
                setEditingRecipeItemId(null)
                setEditingRecipeAmount("")
            } catch (error: unknown) {
                console.error(error)
                toast.error(error instanceof Error ? error.message : t("anErrorOccurred"))
            }
            return
        }

        if (selectedRecipeTarget !== "base") {
            setCurrentRecipeItems(prev => prev.map(i =>
                i.id === item.id ? { ...i, amount: parsedAmount, totalCost: parsedAmount * (i.unitCost ?? 0) } : i
            ))
            setEditingRecipeItemId(null)
            setEditingRecipeAmount("")
            return
        }

        if (item.id.startsWith("temp-")) {
            // Update local state only for temp items
            setRecipeItems(prev => prev.map(i =>
                i.id === item.id ? { ...i, amount: parsedAmount, totalCost: parsedAmount * (i.unitCost ?? 0) } : i
            ))
        } else {
            const success = await updateRecipeItem(item.id, parsedAmount)
            if (success) {
                setRecipeItems(prev => prev.map(i =>
                    i.id === item.id ? { ...i, amount: parsedAmount, totalCost: parsedAmount * (i.unitCost ?? 0) } : i
                ))
                onSuccess()
            } else {
                toast.error(t("anErrorOccurred"))
                return
            }
        }

        setEditingRecipeItemId(null)
        setEditingRecipeAmount("")
    }

    const handleCancelRecipeItemEdit = () => {
        setEditingRecipeItemId(null)
        setEditingRecipeAmount("")
    }

    // ── Product Options (alternatives) ──────────────────────────────────────
    // Options are persisted via /productoptions endpoints, not through the main
    // product save, because the option's recipe must be editable as soon as the
    // option exists (the dedicated recipe endpoints require an option id).
    const refreshProductOptions = async () => {
        if (!editProduct) return
        try {
            const opts = await getProductOptions(editProduct.id)
            setProductOptions(opts ?? [])
        } catch {
            // fail-silent: UI keeps last-known state, next reopen will reconcile
        }
    }

    const handleAddOption = async () => {
        if (!editProduct) {
            toast.warning(locale === "ar" ? "احفظ المنتج أولاً لإدارة البدائل." : "Save the product first to manage alternatives.")
            return
        }

        const material = rawMaterials.find((m) => m.id === newOptionMaterialId)
        if (!material) {
            toast.warning(locale === "ar" ? "اختر المكون أولاً." : "Select an ingredient first.")
            return
        }

        const parsedAmount = parseFloat(newOptionAmount)
        if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
            toast.warning(t("validIngredientAmount"))
            return
        }

        const parsedPrice = parseFloat(newOptionPrice)
        if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
            toast.warning(locale === "ar" ? "السعر يجب أن يكون رقمًا صحيحًا." : "Price must be a valid non-negative number.")
            return
        }

        // Guard against adding the same alternative ingredient twice for this product.
        const duplicate = productOptions.some((opt) =>
            (opt.recipeItems ?? []).some((ri) => ri.rawMaterialId === material.id)
        )
        if (duplicate) {
            toast.warning(locale === "ar"
                ? "هذا المكون مُستخدم بالفعل كبديل لهذا المنتج."
                : "This ingredient is already used as an alternative for this product.")
            return
        }

        try {
            const created = await createProductOption({
                productId: editProduct.id,
                name: material.name,
                nameAr: material.nameAr || undefined,
                price: parsedPrice,
                isDefault: newOptionIsDefault,
            })

            // Auto-attach the selected material as the option's recipe ingredient.
            // The backend BuildRecipeSnapshot fully overrides the base recipe with
            // this list when the option is selected on an order.
            await addProductOptionRecipeItem(created.id, {
                productOptionId: created.id,
                rawMaterialId: material.id,
                amount: parsedAmount,
            })

            await refreshProductOptions()
            setNewOptionMaterialId("")
            setNewOptionAmount("1")
            setNewOptionPrice("")
            setNewOptionIsDefault(false)
            toast.success(locale === "ar" ? "تمت إضافة البديل." : "Alternative added.")
        } catch (error: unknown) {
            console.error(error)
            toast.error(error instanceof Error ? error.message : t("anErrorOccurred"))
        }
    }

    const handleStartEditOption = (option: ProductOptionDto) => {
        setEditingOptionId(option.id)
        setEditingOptionName(option.name)
        setEditingOptionNameAr(option.nameAr ?? "")
        setEditingOptionPrice(option.price.toString())
        setEditingOptionIsDefault(option.isDefault)
    }

    const handleCancelEditOption = () => {
        setEditingOptionId(null)
        setEditingOptionName("")
        setEditingOptionNameAr("")
        setEditingOptionPrice("")
        setEditingOptionIsDefault(false)
    }

    const handleSaveOptionEdit = async (option: ProductOptionDto) => {
        const trimmedName = editingOptionName.trim()
        if (!trimmedName) {
            toast.warning(locale === "ar" ? "اسم البديل مطلوب." : "Alternative name is required.")
            return
        }

        const parsedPrice = parseFloat(editingOptionPrice)
        if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
            toast.warning(locale === "ar" ? "السعر يجب أن يكون رقمًا صحيحًا." : "Price must be a valid non-negative number.")
            return
        }

        try {
            await updateProductOption(option.id, {
                name: trimmedName,
                nameAr: editingOptionNameAr.trim() || undefined,
                price: parsedPrice,
                isDefault: editingOptionIsDefault,
                isActive: option.isActive,
                sortOrder: option.sortOrder,
            })
            await refreshProductOptions()
            handleCancelEditOption()
            toast.success(locale === "ar" ? "تم الحفظ." : "Saved.")
        } catch (error: unknown) {
            console.error(error)
            toast.error(error instanceof Error ? error.message : t("anErrorOccurred"))
        }
    }

    const handleDeleteOption = async (option: ProductOptionDto) => {
        const confirmMsg = locale === "ar"
            ? `هل تريد حذف البديل "${option.nameAr || option.name}"؟`
            : `Delete alternative "${option.name}"?`
        if (!window.confirm(confirmMsg)) return

        try {
            await deleteProductOption(option.id)
            if (selectedRecipeTarget === `option:${option.id}`) {
                setSelectedRecipeTarget("base")
            }
            await refreshProductOptions()
            toast.success(locale === "ar" ? "تم حذف البديل." : "Alternative deleted.")
        } catch (error: unknown) {
            console.error(error)
            toast.error(error instanceof Error ? error.message : t("anErrorOccurred"))
        }
    }

    const getSelectedMaterialUnit = () => {
        const m = rawMaterials.find(r => r.id === selectedMaterialId)
        return m ? getTranslatedUnit(m.unit, locale) : "-"
    }

    const handleRecipeTargetChange = (value: string) => {
        setSelectedRecipeTarget(value)
        setSelectedMaterialId("")
        setRecipeAmount("")
        setEditingRecipeItemId(null)
        setEditingRecipeAmount("")
    }

    const handleAllergenToggle = (allergenValue: number) => {
        setAllergens(prev => prev ^ allergenValue) // XOR to toggle flag
    }

    const getRecipeItemUnitCost = (item: RecipeItemDto) => {
        if (item.unitCost !== undefined) return item.unitCost
        const material = rawMaterials.find(rawMaterial => rawMaterial.id === item.rawMaterialId)
        return material?.costPerUnit || 0
    }

    const getRecipeItemTotalCost = (item: RecipeItemDto) => {
        if (item.totalCost !== undefined) return item.totalCost
        return item.amount * getRecipeItemUnitCost(item)
    }

    const getAlternativeCostImpact = (item: RecipeItemDto, materialId: string, amountValue: string) => {
        const material = rawMaterials.find((m) => m.id === materialId)
        const amount = parseFloat(amountValue)
        if (!material || !Number.isFinite(amount) || amount <= 0) return 0
        return (material.costPerUnit * amount) - getRecipeItemTotalCost(item)
    }

    const parsedManualCostPrice = parseFloat(costPrice) || 0
    const computedCostPrice = recipeItems.length > 0
        ? recipeItems.reduce((sum, item) => sum + getRecipeItemTotalCost(item), 0)
        : parsedManualCostPrice
    const parsedMarkupState = Math.max(parsePricingNumber(markup), 0)
    const parsedProfitMarginState = Math.max(parsePricingNumber(profitMargin), 0)
    const markupType: ProductMarkupType = pricingMode === "margin" ? "percentage" : "multiplier"
    const automaticPricingValue = pricingMode === "margin"
        ? parsedProfitMarginState
        : parsedMarkupState
    const calculatedBasePrice = pricingMode === "manual"
        ? 0
        : calculateBasePriceFromMarkup(computedCostPrice, automaticPricingValue, markupType)
    const parsedBasePrice = parseFloat(basePrice)
    const manualBasePrice = Number.isFinite(parsedBasePrice) ? parsedBasePrice : 0
    const effectiveBasePrice = pricingMode === "manual"
        ? manualBasePrice
        : calculatedBasePrice

    // ── What this product's inventory behaviour means for this form ──────────────────────
    const isFinishedGood = inventoryBehaviour === "finished"
    // A recipe is never hidden once it exists: a product that somehow holds both would
    // otherwise lose one of them from view without anyone deciding to.
    const showRecipeTab = !isFinishedGood || recipeItems.length > 0
    const showCalories = !isFinishedGood || productCalories.trim() !== ""
    // A product with its own stock record shows that record instead of this choice, so only the
    // recipe lock can apply here.
    const behaviourLockReason = recipeItems.length > 0
        ? (locale === "ar"
            ? "لهذا المنتج وصفة، لذا يُحضَّر من مكوّنات. احذف الوصفة أولاً لتخزينه كمنتج جاهز."
            : "This product has a recipe, so it is made from ingredients. Remove the recipe first to stock it as a finished product.")
        : undefined

    // The picked item already IS a Product, so the form switches to editing it. The create-mode
    // draft is discarded first so nothing typed before the pick leaks into that product.
    const configureExistingProduct = (product: ProductDto) => {
        resetForm()
        setValidationErrors({})
        onConfigureExistingProduct?.(product)
    }

    const visibleTabCount = 4
        + (config.deliveryPartnersEnabled ? 1 : 0)
        + (showRecipeTab ? 1 : 0)
        + (isFinishedGood ? 1 : 0)

    /** Keeps the stock record flag in step with the choice, so they can never disagree. */
    const changeInventoryBehaviour = (next: ProductInventoryBehaviour) => {
        setInventoryBehaviour(next)
        setInventoryCostingForm((current) => ({ ...current, enabled: next === "finished" }))
    }
    const marginAmount = effectiveBasePrice - computedCostPrice
    const marginPercentage = effectiveBasePrice > 0
        ? (marginAmount / effectiveBasePrice) * 100
        : 0
    const profitMultiplier = computedCostPrice > 0
        ? effectiveBasePrice / computedCostPrice
        : 0
    const effectiveMarkup = pricingMode === "margin"
        ? parsedProfitMarginState
        : pricingMode === "multiplier"
            ? parsedMarkupState
            : profitMultiplier
    const parsedDiscountPercentage = Math.max(parseFloat(discountPercentage) || 0, 0)
    const computedDiscountedPrice = effectiveBasePrice > 0 && parsedDiscountPercentage > 0
        ? roundCurrency(effectiveBasePrice * (1 - (parsedDiscountPercentage / 100)))
        : 0

    const livePricingError: { field: "profitMargin" | "markup"; message: string } | null =
        pricingMode === "margin" && parsedProfitMarginState >= MAX_MARGIN_PERCENT
            ? {
                field: "profitMargin",
                message: t("profitMarginMultiplierValidation") || "Profit margin must be less than 100%."
            }
            : pricingMode === "multiplier" && (parsedMarkupState <= 0 || parsedMarkupState > MAX_MARKUP_VALUE)
                ? {
                    field: "markup",
                    message: t("profitMultiplierValidation") || "Profit multiplier must be greater than zero and no more than 100."
                }
                : null

    const profitMarginFieldError = validationErrors.profitMargin
        || (livePricingError?.field === "profitMargin" ? livePricingError.message : undefined)
    const markupFieldError = validationErrors.markup
        || (livePricingError?.field === "markup" ? livePricingError.message : undefined)

    const clearPricingValidationError = (field: "profitMargin" | "markup") => {
        if (!validationErrors[field]) return

        setValidationErrors(prev => {
            const nextErrors = { ...prev }
            delete nextErrors[field]
            return nextErrors
        })
    }

    const handleMarkupChange = (value: string) => {
        setMarkup(normalizeNonNegativeInput(value))
        clearPricingValidationError("markup")
    }

    const handleProfitMarginChange = (value: string) => {
        setProfitMargin(normalizeNonNegativeInput(value))
        clearPricingValidationError("profitMargin")
    }

    const handlePricingModeChange = (value: string) => {
        const nextMode = value as ProductPricingMode
        if (nextMode === "manual")
            setBasePrice(effectiveBasePrice > 0 ? effectiveBasePrice.toFixed(2) : "")
        if (nextMode === "margin")
            setProfitMargin(formatPricingValue(marginPercentage))
        if (nextMode === "multiplier")
            setMarkup(formatMarkupValue(profitMultiplier || 1, "multiplier"))

        setPricingMode(nextMode)
        clearPricingValidationError("profitMargin")
        clearPricingValidationError("markup")
    }

    const handleResetProfitMargin = () => {
        setProfitMargin(DEFAULT_PROFIT_MARGIN.toString())
        clearPricingValidationError("profitMargin")
    }

    const isAllergenSelected = (allergenValue: number) => {
        return (allergens & allergenValue) !== 0
    }

    const selectedCategory = categories.find((category) => category.id === selectedCategoryId)
    const selectedCategorySubcategories = (selectedCategory?.subcategories || [])
        .filter((subcategory) => subcategory.isActive || subcategory.id === selectedSubcategoryId)
        .sort((a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name))

    const handleCategoryChange = (categoryId: string) => {
        setSelectedCategoryId(categoryId)
        const nextSubcategories = categories.find((category) => category.id === categoryId)?.subcategories || []
        if (!nextSubcategories.some((subcategory) => subcategory.id === selectedSubcategoryId)) {
            setSelectedSubcategoryId("")
        }
        if (validationErrors.categoryId) {
            setValidationErrors(prev => {
                const { categoryId: _categoryId, ...rest } = prev
                return rest
            })
        }
    }

    // Modifier Group Helpers
    const addModifierGroup = () => {
        const newGroup: ModifierGroupDto = {
            id: generateUUID(),
            name: "",
            nameAr: "",
            selectionType: 0,
            minSelection: 1,
            maxSelection: 1,
            displayType: 0,
            isRequired: false,
            availableForOrderTypes: 7,
            printOnReceipt: true,
            printInKitchen: true,
            modifiers: []
        }
        setModifierGroups([...modifierGroups, newGroup])
    }

    const linkExistingGroup = (libGroup: ModifierGroupLibraryDto) => {
        // Convert library group to ModifierGroupDto and add it
        const linked: ModifierGroupDto = {
            id: libGroup.id,
            name: libGroup.name,
            nameAr: libGroup.nameAr,
            selectionType: libGroup.selectionType,
            minSelection: libGroup.minSelection,
            maxSelection: libGroup.maxSelection,
            displayType: libGroup.displayType ?? 0,
            isRequired: libGroup.isRequired ?? false,
            availableForOrderTypes: libGroup.availableForOrderTypes ?? 7,
            printOnReceipt: libGroup.printOnReceipt ?? true,
            printInKitchen: libGroup.printInKitchen ?? true,
            isShared: true,
            modifiers: libGroup.modifiers.map(m => ({
                id: m.id,
                name: m.name,
                nameAr: m.nameAr,
                priceAdjustment: m.priceAdjustment,
                isDefault: m.isDefault,
                isActive: m.isActive,
                pricingType: m.pricingType ?? 0,
                isFree: m.isFree ?? false,
                freeQuantityLimit: m.freeQuantityLimit ?? 0,
                maxQuantity: m.maxQuantity ?? 0,
                linkedRawMaterialId: m.linkedRawMaterialId,
                linkedMaterialAmount: m.linkedMaterialAmount ?? 0,
                recipeItems: m.recipeItems ?? [],
            })),
        }
        setModifierGroups(prev => [...prev, linked])
        setLinkDialogOpen(false)
    }

    const removeModifierGroup = (id: string) => {
        setModifierGroups(modifierGroups.filter(g => g.id !== id))
    }

    const updateModifierGroup = <K extends keyof ModifierGroupDto>(id: string, field: K, value: ModifierGroupDto[K]) => {
        setModifierGroups(modifierGroups.map(g =>
            g.id === id ? { ...g, [field]: value } : g
        ))
    }

    const addModifier = (groupId: string) => {
        const newModifier: ModifierDto = {
            id: generateUUID(),
            name: "",
            nameAr: "",
            priceAdjustment: 0,
            isDefault: false,
            isActive: true,
            pricingType: 0,
            isFree: false,
            freeQuantityLimit: 0,
            maxQuantity: 0,
            linkedMaterialAmount: 0,
            recipeItems: [],
        }
        setModifierGroups(modifierGroups.map(group => {
            if (group.id === groupId) {
                return { ...group, modifiers: [...group.modifiers, newModifier] }
            }
            return group
        }))
    }

    const removeModifier = (groupId: string, modifierId: string) => {
        setModifierGroups(modifierGroups.map(group => {
            if (group.id === groupId) {
                return { ...group, modifiers: group.modifiers.filter(m => m.id !== modifierId) }
            }
            return group
        }))
    }

    const updateModifier = <K extends keyof ModifierDto>(groupId: string, modifierId: string, field: K, value: ModifierDto[K]) => {
        setModifierGroups(modifierGroups.map(group => {
            if (group.id === groupId) {
                const updatedModifiers = group.modifiers.map(m =>
                    m.id === modifierId ? { ...m, [field]: value } : m
                )
                return { ...group, modifiers: updatedModifiers }
            }
            return group
        }))
    }

    const addModifierRecipeItem = (groupId: string, modifierId: string) => {
        const fallbackMaterial = rawMaterials[0]
        if (!fallbackMaterial) return

        updateModifier(groupId, modifierId, 'recipeItems', [
            ...(modifierGroups
                .find(group => group.id === groupId)
                ?.modifiers.find(modifier => modifier.id === modifierId)
                ?.recipeItems ?? []),
            {
                id: generateUUID(),
                rawMaterialId: fallbackMaterial.id,
                rawMaterialName: fallbackMaterial.name,
                rawMaterialNameAr: fallbackMaterial.nameAr,
                amount: 1,
                unit: UnitLabels[fallbackMaterial.unit] ?? "",
            }
        ])
    }

    const updateModifierRecipeItem = (groupId: string, modifierId: string, recipeItemId: string, field: 'rawMaterialId' | 'amount', value: string | number) => {
        setModifierGroups(modifierGroups.map(group => {
            if (group.id !== groupId) return group
            return {
                ...group,
                modifiers: group.modifiers.map(modifier => {
                    if (modifier.id !== modifierId) return modifier
                    return {
                        ...modifier,
                        recipeItems: (modifier.recipeItems ?? []).map(recipeItem => {
                            if (recipeItem.id !== recipeItemId) return recipeItem
                            if (field === 'rawMaterialId') {
                                const material = rawMaterials.find(rawMaterial => rawMaterial.id === value)
                                return material
                                    ? {
                                        ...recipeItem,
                                        rawMaterialId: material.id,
                                        rawMaterialName: material.name,
                                        rawMaterialNameAr: material.nameAr,
                                        unit: UnitLabels[material.unit] ?? "",
                                    }
                                    : recipeItem
                            }

                            return {
                                ...recipeItem,
                                amount: Number(value) || 0,
                            }
                        })
                    }
                })
            }
        }))
    }

    const removeModifierRecipeItem = (groupId: string, modifierId: string, recipeItemId: string) => {
        setModifierGroups(modifierGroups.map(group => {
            if (group.id !== groupId) return group
            return {
                ...group,
                modifiers: group.modifiers.map(modifier =>
                    modifier.id === modifierId
                        ? { ...modifier, recipeItems: (modifier.recipeItems ?? []).filter(recipeItem => recipeItem.id !== recipeItemId) }
                        : modifier
                )
            }
        }))
    }

    // --- Validation Helpers ---
        const isEnglishOnly = (text: string) => /^[a-zA-Z0-9\u00BC-\u00BE\u2150-\u215E\s\-_.,!?&()'"/+%#@]*$/.test(text)
        const isArabicOnly = (text: string) => /^[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF0-9\u00BC-\u00BE\u2150-\u215E\s\-_.,!?&()'"/+%#@]*$/.test(text)

    const validateForm = (): boolean => {
        const errors: Record<string, string> = {}

        if (!productName || !productName.trim()) {
            errors.name = t("validationRequired") || "This field is required"
        } else if (!isEnglishOnly(productName.trim())) {
            errors.name = t("validationEnglishOnly") || "Only English characters allowed"
        }

        if (productNameAr && productNameAr.trim() && !isArabicOnly(productNameAr.trim())) {
            errors.nameAr = t("validationArabicOnly") || "Only Arabic characters allowed"
        }

        if (!selectedCategoryId) {
            errors.categoryId = locale === "ar" ? "الفئة مطلوبة" : "Category is required"
        }

        const parsedCalories = parseInt(productCalories, 10)
        if (productCalories.trim() && (Number.isNaN(parsedCalories) || parsedCalories < 0)) {
            errors.calories = t("caloriesValidation") || "Calories must be 0 or greater"
        }

        // Base price is optional when the promotional CustomPrice flag is on —
        // promo-only items are valid without a configured base price.
        if (!useCustomPrice && effectiveBasePrice <= 0) {
            errors.price = t("validationMinPrice") || "Price must be greater than zero"
        }

        if (pricingMode !== "manual" && computedCostPrice <= 0)
            errors.costPrice = t("automaticPricingCostValidation") || "Cost price must be greater than zero for automatic pricing."
        if (pricingMode === "margin" && parsedProfitMarginState >= MAX_MARGIN_PERCENT)
            errors.profitMargin = t("profitMarginMultiplierValidation") || "Profit margin must be less than 100%."
        if (pricingMode === "multiplier" && (parsedMarkupState <= 0 || parsedMarkupState > MAX_MARKUP_VALUE))
            errors.markup = t("profitMultiplierValidation") || "Profit multiplier must be greater than zero and no more than 100."

        setValidationErrors(errors)
        if (Object.keys(errors).length > 0) {
            toast.warning(t("productValidationWarning"))
            return false
        }
        return true
    }

    const saveDeliveryPartnerMappings = async (productId: string) => {
        if (!config.deliveryPartnersEnabled || dirtyDeliveryPartnerIds.size === 0) return

        await Promise.all(Array.from(dirtyDeliveryPartnerIds).map((partnerId) => {
            const row = deliveryPartnerRows.find((item) => item.partnerId === partnerId)
            if (!row) return Promise.resolve()
            return upsertDeliveryPartnerProductMapping(productId, partnerId, {
                partnerProductId: row.partnerProductId?.trim() || null,
                isEnabled: row.isEnabled,
                isAvailable: row.isAvailable,
                pricingRuleType: row.pricingRuleType ?? null,
                pricingRuleValue: row.pricingRuleValue ?? null,
                customPrice: row.customPrice ?? null,
                availableStartDate: row.availableStartDate ?? null,
                availableEndDate: row.availableEndDate ?? null,
                availableFrom: normalizeDeliveryPartnerTime(row.availableFrom),
                availableTo: normalizeDeliveryPartnerTime(row.availableTo),
            })
        }))
    }

    const markDeliveryPartnerDirty = (partnerId: string) => {
        setDirtyDeliveryPartnerIds((current) => new Set(current).add(partnerId))
    }

    const handleSaveProduct = async () => {
        if (!validateForm()) return

        // Images are already uploaded by the gallery editor, so the payload only has to
        // split the list: entry 0 stays the product's primary image (the field the POS,
        // receipts and QR menu read) and the rest become the storefront gallery.
        const [primaryImage, ...galleryImages] = gallery
        const resolvedImageUrl = primaryImage?.imageUrl ?? ""
        const resolvedImageKey = primaryImage?.imageKey ?? ""

        const payload = {
            categoryId: selectedCategoryId || null,
            subcategoryId: selectedSubcategoryId || null,
            tenantId: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
            name: productName,
            nameAr: productNameAr || undefined,
            description: productDescription.trim() || undefined,
            descriptionAr: productDescriptionAr.trim() || undefined,
            calories: productCalories.trim() ? parseInt(productCalories, 10) : undefined,
            basePrice: parseFloat(effectiveBasePrice.toFixed(2)),
            costPrice: computedCostPrice > 0 ? parseFloat(computedCostPrice.toFixed(2)) : undefined,
            pricingMode,
            markup: parseFloat(effectiveMarkup.toFixed(markupType === "multiplier" ? 4 : 2)),
            markupType,
            discountPercentage: parseFloat(parsedDiscountPercentage.toFixed(2)),
            discountedPrice: computedDiscountedPrice > 0 ? parseFloat(computedDiscountedPrice.toFixed(2)) : undefined,
            useCustomPrice,
            customPrice: useCustomPrice && customPrice.trim() !== "" ? parseFloat(customPrice) : undefined,
            isActive,
            isSoon,
            allergens,
            stationRouting,
            printerIds: printerIds || undefined,
            kitchenId: kitchenId || null,
            allKitchenPrinters,
            // When "All printers" is on, send an empty list — the backend
            // ignores explicit IDs in that mode but a stable shape keeps the
            // PUT payload deterministic.
            kitchenPrinterIds: allKitchenPrinters ? [] : kitchenPrinterIds,
            imageUrl: resolvedImageUrl || undefined,
            imageKey: resolvedImageKey || undefined,
            // Always sent by this screen, so the gallery is exactly what the operator
            // arranged. Other clients omit the field entirely and leave it untouched.
            images: galleryImages.map(image => ({
                imageUrl: image.imageUrl,
                imageKey: image.imageKey || undefined,
            })),
            availableStartDate: availabilityExpanded ? (availableStartDate || null) : null,
            availableEndDate: availabilityExpanded ? (availableEndDate || null) : null,
            availableFrom: availabilityExpanded ? (availableFrom ? `${availableFrom}:00` : null) : null,
            availableTo: availabilityExpanded ? (availableTo ? `${availableTo}:00` : null) : null,
            modifierGroups: modifierGroups.map(g => g.isShared
                ? { existingGroupId: g.id }
                : g
            ),
            recipeItems: recipeItems.map(item => ({
                rawMaterialId: item.rawMaterialId,
                amount: item.amount,
                alternatives: (item.alternatives ?? []).map((alt, index) => ({
                    rawMaterialId: alt.rawMaterialId,
                    name: alt.name ?? undefined,
                    nameAr: alt.nameAr ?? undefined,
                    amount: alt.amount,
                    priceAdjustment: alt.priceAdjustment,
                    alternativePricingType: alt.alternativePricingType,
                    customerAdditionalPrice: alt.customerAdditionalPrice,
                    fixedOverridePrice: alt.fixedOverridePrice,
                    isDefault: alt.isDefault,
                    isActive: alt.isActive,
                    sortOrder: alt.sortOrder ?? index,
                }))
            })),
            // Undefined for restaurant products, so nothing about retail is touched.
            retail: inventoryCostingPayloadFromForm(inventoryCostingForm)
        }

        try {
            let success;
            let savedProductId = editProduct?.id

            if (editProduct) {
                // Update existing product
                success = await updateProduct(editProduct.id, payload);
            } else {
                // Create new product
                const created = await createProduct(payload);
                savedProductId = created.id;
                success = !!created.id;
            }

            if (success) {
                if (savedProductId) {
                    await saveDeliveryPartnerMappings(savedProductId)
                }
                // Flush any alternatives that were drafted against a temp recipe
                // row. Once the product is saved, the recipe items get real ids —
                // resolve them by rawMaterialId and POST the pending drafts.
                if (editProduct) {
                    await flushPendingAlternatives(payload.name)
                }
                toast.success(editProduct ? t("productUpdatedSuccess") : t("productSavedSuccess"))
                resetForm()
                onOpenChange(false)
                onSuccess()
            } else {
                toast.error(t("saveFailedShort"))
            }
        } catch (error: unknown) {
            console.error("Save error:", error)
            const response = typeof error === "object" && error !== null && "response" in error
                ? (error as { response?: { status?: number; data?: { message?: string } } }).response
                : undefined
            // Handle 409 Conflict (duplicate name)
            if (response?.status === 409) {
                const msg = response.data?.message || t("validationDuplicateName") || "Duplicate name"
                setValidationErrors({ name: msg })
                toast.error(msg)
            } else {
                toast.error(t("anErrorOccurred"))
            }
        }
    }

    return (
        <>
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-[min(100vw,72rem)] max-w-full overflow-y-auto p-0 sm:max-w-5xl xl:max-w-6xl" dir={locale === "ar" ? "rtl" : "ltr"}>
                <div dir={locale === "ar" ? "rtl" : "ltr"} className="contents">
                <SheetHeader>
                    <SheetTitle className="flex items-center gap-2">
                        <span className="text-2xl">🏪</span>
                        {editProduct ? t("productSheetEditTitle") : t("productSheetCreateTitle")}
                    </SheetTitle>
                    <SheetDescription>
                        {t("productSheetDesc")}
                    </SheetDescription>
                </SheetHeader>

                <Tabs defaultValue="general" className="mt-6">
                    <TabsList className={`grid h-auto w-full grid-cols-2 gap-1 ${TAB_GRID_COLUMNS[visibleTabCount]}`}>
                        <TabsTrigger value="general" className="min-h-10 px-2 text-xs sm:text-sm">📋 {t("tabGeneralInfo")}</TabsTrigger>
                        <TabsTrigger value="finance" className="min-h-10 px-2 text-xs sm:text-sm">💰 {t("tabFinance")}</TabsTrigger>
                        <TabsTrigger value="operations" className="min-h-10 px-2 text-xs sm:text-sm">⚙️ {t("tabOperations")}</TabsTrigger>
                        <TabsTrigger value="branches" className="min-h-10 px-2 text-xs sm:text-sm">{locale === "ar" ? "الفروع" : "Branches"}</TabsTrigger>
                        {config.deliveryPartnersEnabled && (
                            <TabsTrigger value="delivery-partners" className="min-h-10 px-2 text-xs sm:text-sm">{locale === "ar" ? "شركاء التوصيل" : "Delivery Partners"}</TabsTrigger>
                        )}
                        {showRecipeTab && (
                            <TabsTrigger value="recipe" className="min-h-10 px-2 text-xs sm:text-sm">🍲 {t("tabRecipeIngredients")}</TabsTrigger>
                        )}
                        {isFinishedGood && (
                            <TabsTrigger value="inventory-costing" className="min-h-10 px-2 text-xs sm:text-sm">
                                📦 {locale === "ar" ? "المخزون والتكلفة" : "Inventory & Costing"}
                            </TabsTrigger>
                        )}
                    </TabsList>

                    {isFinishedGood && (
                        <TabsContent value="inventory-costing" className="space-y-4 mt-4">
                            <InventoryCostingFields
                                form={inventoryCostingForm}
                                onChange={setInventoryCostingForm}
                                suppliers={retailSuppliers}
                                costPerItem={computedCostPrice}
                                approvedPrice={effectiveBasePrice}
                                currencyFormatter={(value) => formatCurrency(value, currency)}
                                detail={editProduct?.retail}
                            />
                        </TabsContent>
                    )}

                    {/* TAB 1: Genel Bilgiler */}
                    <TabsContent value="general" className="space-y-4 mt-4">
                        {!editProduct && onConfigureExistingProduct && (
                            <ExistingInventoryItemPicker onSelect={configureExistingProduct} />
                        )}
                        {editProduct?.retail ? (
                            <LinkedInventoryItemCard detail={editProduct.retail} />
                        ) : (
                            <ProductInventoryBehaviourField
                                value={inventoryBehaviour}
                                onChange={changeInventoryBehaviour}
                                disabledReason={behaviourLockReason}
                            />
                        )}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">{t("basicProductInfoTitle")}</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name" className="flex items-center gap-1">
                                        {t("productNameEnLabel")} <span className="text-destructive">*</span>
                                    </Label>
                                    <Input
                                        id="name"
                                        value={productName}
                                        onChange={(e) => {
                                            setProductName(e.target.value)
                                            if (validationErrors.name) setValidationErrors(prev => { const { name, ...rest } = prev; return rest; })
                                        }}
                                        placeholder="e.g. Mixed Pizza"
                                        className={validationErrors.name ? "border-destructive focus-visible:ring-destructive" : ""}
                                    />
                                    {validationErrors.name && (
                                        <p className="text-destructive text-sm font-medium flex items-center gap-1">
                                            <AlertCircle className="w-3.5 h-3.5" /> {validationErrors.name}
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="nameAr" className="text-start">{t("productNameArLabel")}</Label>
                                    <Input
                                        id="nameAr"
                                        value={productNameAr}
                                        onChange={(e) => {
                                            setProductNameAr(e.target.value)
                                            if (validationErrors.nameAr) setValidationErrors(prev => { const { nameAr, ...rest } = prev; return rest; })
                                        }}
                                        placeholder="e.g. بيتزا مشكلة"
                                        dir="rtl"
                                        className={validationErrors.nameAr ? "border-destructive focus-visible:ring-destructive" : ""}
                                    />
                                    {validationErrors.nameAr && (
                                        <p className="text-destructive text-sm font-medium flex items-center gap-1">
                                            <AlertCircle className="w-3.5 h-3.5" /> {validationErrors.nameAr}
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="description" className="text-start">{t("productDescriptionEnLabel")}</Label>
                                    <Textarea
                                        id="description"
                                        value={productDescription}
                                        onChange={(e) => setProductDescription(e.target.value)}
                                        placeholder={t("productDescriptionEnPlaceholder")}
                                        rows={3}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="descriptionAr" className="text-start">{t("productDescriptionArLabel")}</Label>
                                    <Textarea
                                        id="descriptionAr"
                                        value={productDescriptionAr}
                                        onChange={(e) => setProductDescriptionAr(e.target.value)}
                                        placeholder={t("productDescriptionArPlaceholder")}
                                        rows={3}
                                        dir="rtl"
                                    />
                                </div>

                                {showCalories && (
                                    <div className="space-y-2">
                                        <Label htmlFor="calories" className="text-start">{t("productCaloriesLabel")}</Label>
                                        <Input
                                            id="calories"
                                            type="number"
                                            min={0}
                                            step={1}
                                            value={productCalories}
                                            onChange={(e) => {
                                                setProductCalories(e.target.value)
                                                if (validationErrors.calories) {
                                                    setValidationErrors(prev => {
                                                        const { calories, ...rest } = prev
                                                        return rest
                                                    })
                                                }
                                            }}
                                            placeholder="350"
                                            className={validationErrors.calories ? "border-destructive focus-visible:ring-destructive" : ""}
                                        />
                                        {validationErrors.calories && (
                                            <p className="text-destructive text-sm font-medium flex items-center gap-1">
                                                <AlertCircle className="w-3.5 h-3.5" /> {validationErrors.calories}
                                            </p>
                                        )}
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <Label htmlFor="category" className="flex items-center gap-1 text-start">
                                        {t("productCategoryLabel")} <span className="text-destructive">*</span>
                                    </Label>
                                    <Select value={selectedCategoryId} onValueChange={handleCategoryChange}>
                                        <SelectTrigger id="category">
                                            <SelectValue placeholder={t("productCategoryPlaceholder")} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {categories.map((cat) => (
                                                <SelectItem key={cat.id} value={cat.id}>
                                                    {cat.displayName || cat.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {validationErrors.categoryId && (
                                        <p className="text-destructive text-sm font-medium flex items-center gap-1">
                                            <AlertCircle className="w-3.5 h-3.5" /> {validationErrors.categoryId}
                                        </p>
                                    )}
                                    <p className="text-xs text-muted-foreground">
                                        {t("productCategoryHint")}
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="subcategory" className="text-start">
                                        {locale === "ar" ? "التصنيف الفرعي (اختياري)" : "Subcategory (Optional)"}
                                    </Label>
                                    <Select
                                        value={selectedSubcategoryId || "__none__"}
                                        onValueChange={(value) => setSelectedSubcategoryId(value === "__none__" ? "" : value)}
                                        disabled={!selectedCategoryId}
                                    >
                                        <SelectTrigger id="subcategory">
                                            <SelectValue placeholder={locale === "ar" ? "اختر تصنيفًا فرعيًا" : "Select subcategory"} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="__none__">{locale === "ar" ? "بدون" : "None"}</SelectItem>
                                            {selectedCategorySubcategories.map((subcategory) => (
                                                <SelectItem key={subcategory.id} value={subcategory.id}>
                                                    {locale === "ar" ? (subcategory.nameAr || subcategory.displayName || subcategory.name) : (subcategory.displayName || subcategory.name)}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <ProductGalleryEditor
                                    entries={gallery}
                                    onChange={setGallery}
                                    isAr={locale === "ar"}
                                    label={t("productImageUrlLabel")}
                                    hint={locale === "ar"
                                        ? "الصورة الأولى هي الصورة الرئيسية المستخدمة في نقاط البيع والفواتير. الصور الإضافية تظهر في معرض المنتج بالمتجر الإلكتروني."
                                        : "The first image is the primary one used by the POS and receipts. The rest appear in the product gallery on the online store."}
                                />

                                <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
                                    <div className="space-y-0.5">
                                        <Label htmlFor="active" className="text-base text-start">{t("productActiveLabel")}</Label>
                                        <p className="text-sm text-muted-foreground">
                                            {t("productActiveHint")}
                                        </p>
                                    </div>
                                    <Switch
                                        id="active"
                                        checked={isActive}
                                        onCheckedChange={setIsActive}
                                    />
                                </div>

                                <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
                                    <div className="space-y-0.5">
                                        <Label htmlFor="isSoon" className="text-base text-start">
                                            {locale === "ar" ? "قريباً (قائمة الموقع فقط)" : "Coming Soon (public menu only)"}
                                        </Label>
                                        <p className="text-sm text-muted-foreground">
                                            {locale === "ar"
                                                ? "يُخفي السعر والتفاصيل من قائمة /menu والموقع التعريفي. لا يؤثر على نقاط البيع أو الطلبات."
                                                : "Hides price & details on /menu and the informative site. Does not affect POS or orders."}
                                        </p>
                                    </div>
                                    <Switch
                                        id="isSoon"
                                        checked={isSoon}
                                        onCheckedChange={setIsSoon}
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        {/* Modifier Groups */}
                        <Card>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-lg">{t("productOptionGroupsTitle")}</CardTitle>
                                    <div className="flex gap-2">
                                        <Button onClick={() => setLinkDialogOpen(true)} variant="outline" size="sm">
                                            <Link2 className="w-4 h-4 me-1" />
                                            {t("linkExistingGroup")}
                                        </Button>
                                        {/* <Button onClick={addModifierGroup} variant="outline" size="sm">
                                            <Plus className="w-4 h-4 me-1" />
                                            {t("addGroup")}
                                        </Button> */}
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {modifierGroups.length === 0 ? (
                                    <div className="text-center p-6 border-2 border-dashed rounded-lg text-muted-foreground">
                                        {t("noOptionGroupsHint")}
                                    </div>
                                ) : (
                                    modifierGroups.map((group) => (
                                        <Card key={group.id} className={`relative ${group.isShared ? 'border-primary/30 bg-primary/5' : ''}`}>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="absolute top-2 end-2"
                                                onClick={() => removeModifierGroup(group.id)}
                                            >
                                                <X className="w-4 h-4" />
                                            </Button>
                                            {group.isShared && (
                                                <div className="absolute top-2 start-3">
                                                    <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/30">
                                                        <Link2 className="w-3 h-3 me-1" />
                                                        {t("sharedGroup")}
                                                    </Badge>
                                                </div>
                                            )}
                                            <CardContent className={`pt-6 space-y-3 ${group.isShared ? 'pt-10' : ''}`}>
                                                {group.isShared ? (
                                                    /* Shared group: read-only summary */
                                                    <div className="space-y-2">
                                                        <div className="font-medium">
                                                            {group.name}
                                                            {group.nameAr && <span className="text-muted-foreground ms-2">({group.nameAr})</span>}
                                                        </div>
                                                        <div className="flex flex-wrap gap-1.5">
                                                            {group.modifiers.map(m => (
                                                                <Badge key={m.id} variant="secondary" className="text-xs">
                                                                    {m.name}
                                                                    {m.priceAdjustment !== 0 && (
                                                                        <span className="opacity-70 ms-1">
                                                                            {m.priceAdjustment > 0 ? "+" : ""}{formatCurrency(m.priceAdjustment, currency)}
                                                                        </span>
                                                                    )}
                                                                </Badge>
                                                            ))}
                                                        </div>
                                                        <p className="text-[11px] text-muted-foreground">
                                                            {group.selectionType === 0 ? t("selectionSingle") : t("selectionMultiple")}
                                                            {group.minSelection > 0 && ` · Min: ${group.minSelection}`}
                                                            {group.maxSelection > 0 && ` · Max: ${group.maxSelection}`}
                                                            {' · '}Edit in {t("extrasLibrary")}
                                                        </p>
                                                    </div>
                                                ) : (
                                                    /* Inline group: full editable form */
                                                    <>
                                                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                                                    <div className="space-y-1">
                                                        <Label className="text-xs">{t("groupNameEnLabel")}</Label>
                                                        <Input
                                                            value={group.name}
                                                            onChange={(e) => updateModifierGroup(group.id, 'name', e.target.value)}
                                                            placeholder="e.g. Portion"
                                                            className="h-8"
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <Label className="text-xs">{t("groupNameArLabel")}</Label>
                                                        <Input
                                                            value={group.nameAr || ""}
                                                            onChange={(e) => updateModifierGroup(group.id, 'nameAr', e.target.value)}
                                                            placeholder="e.g. الحجم"
                                                            className="h-8"
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <Label className="text-xs">{t("selectionTypeLabel")}</Label>
                                                        <Select
                                                            value={group.selectionType.toString()}
                                                            onValueChange={(val) => {
                                                                const type = parseInt(val);
                                                                setModifierGroups(modifierGroups.map(g =>
                                                                    g.id === group.id
                                                                        ? { ...g, selectionType: type, maxSelection: type === 1 ? 0 : 1 }
                                                                        : g
                                                                ));
                                                            }}
                                                        >
                                                            <SelectTrigger className="h-8">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="0">{t("selectionSingle")}</SelectItem>
                                                                <SelectItem value="1">{t("selectionMultiple")}</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <div className="space-y-1">
                                                            <Label className="text-xs">{t("minSelectionLabel")}</Label>
                                                            <Input
                                                                type="number"
                                                                min={0}
                                                                value={group.minSelection}
                                                                onChange={(e) => updateModifierGroup(group.id, 'minSelection', Math.max(0, parseInt(e.target.value) || 0))}
                                                                className="h-8"
                                                            />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <Label className="text-xs">{t("maxSelectionLabel")}</Label>
                                                            <Input
                                                                type="number"
                                                                min={0}
                                                                value={group.maxSelection}
                                                                onChange={(e) => updateModifierGroup(group.id, 'maxSelection', Math.max(0, parseInt(e.target.value) || 0))}
                                                                className="h-8"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <Label className="text-xs">{t("optionsLabel")}</Label>
                                                        <Button
                                                            onClick={() => addModifier(group.id)}
                                                            size="sm"
                                                            variant="ghost"
                                                            className="h-6 text-xs"
                                                        >
                                                            <Plus className="w-3 h-3 me-1" />
                                                            {t("addLabel")}
                                                        </Button>
                                                    </div>
                                                    {group.modifiers.length > 0 && (
                                                        <div className="flex gap-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-1 mb-1">
                                                            <span className="flex-1">{t("modifierNameEnHeader")}</span>
                                                            <span className="flex-1">{t("modifierNameArHeader")}</span>
                                                            <span className="w-24">{t("modifierCostHeader")} ({currency})</span>
                                                            <span className="w-12 text-center">{t("modifierDefHeader")}</span>
                                                            <span className="w-12 text-center">{t("modifierActiveHeader")}</span>
                                                            <span className="w-8"></span>
                                                        </div>
                                                    )}
                                                    {group.modifiers.map((modifier) => (
                                                        <div key={modifier.id} className="space-y-2 rounded-md border border-slate-200 p-2">
                                                            <div className="flex gap-2">
                                                                <Input
                                                                    className="h-8 flex-1"
                                                                    placeholder={t("optionNamePlaceholder")}
                                                                    value={modifier.name}
                                                                    onChange={(e) => updateModifier(group.id, modifier.id, 'name', e.target.value)}
                                                                />
                                                                <Input
                                                                    className="h-8 flex-1"
                                                                    placeholder={t("optionNameArPlaceholder")}
                                                                    value={modifier.nameAr || ""}
                                                                    onChange={(e) => updateModifier(group.id, modifier.id, 'nameAr', e.target.value)}
                                                                />
                                                                <Input
                                                                    className="h-8 w-24"
                                                                    type="number"
                                                                    min={0}
                                                                    step={0.5}
                                                                    placeholder="0.00"
                                                                    value={modifier.priceAdjustment}
                                                                    onChange={(e) => updateModifier(group.id, modifier.id, 'priceAdjustment', parseFloat(e.target.value))}
                                                                />
                                                                <div className="flex items-center gap-1" title="Default">
                                                                    <Checkbox
                                                                        checked={modifier.isDefault ?? false}
                                                                        onCheckedChange={(checked) => updateModifier(group.id, modifier.id, 'isDefault', !!checked)}
                                                                        className="h-4 w-4"
                                                                    />
                                                                    <Label className="text-[10px] text-muted-foreground cursor-pointer">{t("modifierDefHeader")}</Label>
                                                                </div>
                                                                <div className="flex items-center gap-1" title="Active">
                                                                    <Switch
                                                                        checked={modifier.isActive ?? true}
                                                                        onCheckedChange={(checked) => updateModifier(group.id, modifier.id, 'isActive', checked)}
                                                                        className="h-4 w-7"
                                                                    />
                                                                </div>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-8 w-8"
                                                                    onClick={() => removeModifier(group.id, modifier.id)}
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </Button>
                                                            </div>
                                                            <div className="space-y-2 rounded-md bg-slate-50 p-2">
                                                                <div className="flex items-center justify-between">
                                                                    <Label className="text-xs font-medium">Option Recipe Override</Label>
                                                                    <Button
                                                                        type="button"
                                                                        variant="outline"
                                                                        size="sm"
                                                                        className="h-7 text-xs"
                                                                        onClick={() => addModifierRecipeItem(group.id, modifier.id)}
                                                                        disabled={rawMaterials.length === 0}
                                                                    >
                                                                        <Plus className="me-1 h-3 w-3" />
                                                                        {t("addLabel")}
                                                                    </Button>
                                                                </div>
                                                                {(modifier.recipeItems ?? []).map((recipeItem) => (
                                                                    <div key={recipeItem.id} className="flex gap-2">
                                                                        <Select
                                                                            value={recipeItem.rawMaterialId}
                                                                            onValueChange={(value) => updateModifierRecipeItem(group.id, modifier.id, recipeItem.id, 'rawMaterialId', value)}
                                                                        >
                                                                            <SelectTrigger className="h-8 flex-1">
                                                                                <SelectValue />
                                                                            </SelectTrigger>
                                                                            <SelectContent>
                                                                                {rawMaterials.map((material) => (
                                                                                    <SelectItem key={material.id} value={material.id}>
                                                                                        {locale === "ar" && material.nameAr ? material.nameAr : material.name}
                                                                                    </SelectItem>
                                                                                ))}
                                                                            </SelectContent>
                                                                        </Select>
                                                                        <Input
                                                                            className="h-8 w-24"
                                                                            type="number"
                                                                            min={0.01}
                                                                            step={0.01}
                                                                            value={recipeItem.amount}
                                                                            onChange={(e) => updateModifierRecipeItem(group.id, modifier.id, recipeItem.id, 'amount', e.target.value)}
                                                                        />
                                                                        <Button
                                                                            type="button"
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            className="h-8 w-8"
                                                                            onClick={() => removeModifierRecipeItem(group.id, modifier.id, recipeItem.id)}
                                                                        >
                                                                            <Trash2 className="w-4 h-4" />
                                                                        </Button>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                                    </>
                                                )}
                                            </CardContent>
                                        </Card>
                                    ))
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* TAB 2: Finans */}
                    <TabsContent value="finance" className="space-y-4 mt-4">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">{t("pricingStrategyTitle")}</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="costPrice" className="flex items-center gap-2">
                                        {t("costPriceLabel")}
                                        <span className="text-xs font-normal text-info bg-info/5 px-2 py-0.5 rounded">
                                            {t("internalBadge")}
                                        </span>
                                    </Label>
                                    <Input
                                        id="costPrice"
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={computedCostPrice.toFixed(2)}
                                        placeholder="0.00"
                                        readOnly
                                        className={validationErrors.costPrice ? "border-destructive focus-visible:ring-destructive" : ""}
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        {recipeItems.length > 0
                                            ? t("costPriceRecipeHint")
                                            : t("costPriceManualHint")}
                                    </p>
                                    {validationErrors.costPrice && (
                                        <p className="text-destructive text-sm font-medium flex items-center gap-1">
                                            <AlertCircle className="w-3.5 h-3.5" /> {validationErrors.costPrice}
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label>{t("pricingModeLabel")}</Label>
                                    <Select
                                        value={pricingMode}
                                        onValueChange={handlePricingModeChange}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="manual">{t("pricingModeManual")}</SelectItem>
                                            <SelectItem value="margin">{t("pricingModeMargin")}</SelectItem>
                                            <SelectItem value="multiplier">{t("pricingModeMultiplier")}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <p className="text-xs text-muted-foreground">
                                        {pricingMode === "manual"
                                            ? t("pricingModeManualHint")
                                            : t("pricingModeAutomaticHint")}
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="markup" className="text-start">{t("profitMultiplierInputLabel")}</Label>
                                    <Input
                                        id="markup"
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={pricingMode === "multiplier"
                                            ? markup
                                            : formatMarkupValue(profitMultiplier, "multiplier")}
                                        onChange={(e) => handleMarkupChange(e.target.value)}
                                        placeholder="2.00"
                                        readOnly={pricingMode !== "multiplier"}
                                        className={markupFieldError ? "border-destructive focus-visible:ring-destructive" : ""}
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        {t("markupHint")}
                                    </p>
                                    {markupFieldError && (
                                        <p className="text-destructive text-sm font-medium flex items-center gap-1">
                                            <AlertCircle className="w-3.5 h-3.5" /> {markupFieldError}
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-center justify-between gap-3">
                                        <Label htmlFor="profitMargin" className="text-start">{t("profitMarginInputLabel")}</Label>
                                        {pricingMode === "margin" && (
                                            <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={handleResetProfitMargin}>
                                                {t("resetProfitMarginLabel")}
                                            </Button>
                                        )}
                                    </div>
                                    <div className="relative">
                                        <Input
                                            id="profitMargin"
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={pricingMode === "margin"
                                                ? profitMargin
                                                : formatPricingValue(marginPercentage)}
                                            onChange={(e) => handleProfitMarginChange(e.target.value)}
                                            placeholder={DEFAULT_PROFIT_MARGIN.toString()}
                                            readOnly={pricingMode !== "margin"}
                                            className={`pe-8 ${profitMarginFieldError ? "border-destructive focus-visible:ring-destructive" : ""}`}
                                        />
                                        <span className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                                            %
                                        </span>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        {t("profitMarginHint")}
                                    </p>
                                    {profitMarginFieldError && (
                                        <p className="text-destructive text-sm font-medium flex items-center gap-1">
                                            <AlertCircle className="w-3.5 h-3.5" /> {profitMarginFieldError}
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="basePrice" className="text-start">{t("basePriceLabel")}</Label>
                                    <Input
                                        id="basePrice"
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={pricingMode === "manual"
                                            ? basePrice
                                            : (calculatedBasePrice > 0 ? calculatedBasePrice.toFixed(2) : "")}
                                        onChange={(e) => setBasePrice(e.target.value)}
                                        placeholder="0.00"
                                        readOnly={pricingMode !== "manual"}
                                        className={validationErrors.price ? "border-destructive focus-visible:ring-destructive" : ""}
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        {t("basePriceHint")}
                                    </p>
                                    {validationErrors.price && (
                                        <p className="text-destructive text-sm font-medium flex items-center gap-1">
                                            <AlertCircle className="w-3.5 h-3.5" /> {validationErrors.price}
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="discountPercentage" className="flex items-center gap-2">
                                        {t("discountLabel")}
                                        <span className="text-xs font-normal text-primary bg-primary/5 px-2 py-0.5 rounded">
                                            {t("promoBadge")}
                                        </span>
                                    </Label>
                                    <Input
                                        id="discountPercentage"
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        max="100"
                                        value={discountPercentage}
                                        onChange={(e) => setDiscountPercentage(e.target.value)}
                                        placeholder="10"
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        {t("discountHint")}
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="discountedPrice" className="flex items-center gap-2">
                                        {t("discountedPriceLabel")}
                                        <span className="text-xs font-normal text-primary bg-primary/5 px-2 py-0.5 rounded">
                                            {t("calculatedBadge")}
                                        </span>
                                    </Label>
                                    <Input
                                        id="discountedPrice"
                                        type="number"
                                        step="0.01"
                                        value={computedDiscountedPrice > 0 ? computedDiscountedPrice.toFixed(2) : ""}
                                        placeholder="0.00"
                                        readOnly
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        {t("discountedPriceHint")}
                                    </p>
                                </div>

                                {/* Public-menu-only promotional price.
                                    WHY: Lets marketing override the displayed price on the
                                    informative website + /menu without touching POS, orders,
                                    or backend pricing. Server returns DisplayPrice already
                                    resolved — POS keeps reading BasePrice from the entity. */}
                                <div className="space-y-3 p-4 border border-primary/20 rounded-lg bg-primary/5">
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="space-y-0.5">
                                            <Label htmlFor="useCustomPrice" className="flex items-center gap-2">
                                                {t("customPromoPriceTitle")}
                                                <span className="text-xs font-normal text-primary bg-primary/10 px-2 py-0.5 rounded">
                                                    {t("websiteOnlyBadge")}
                                                </span>
                                            </Label>
                                            <p className="text-xs text-muted-foreground">
                                                {t("customPromoPriceHint")}
                                            </p>
                                        </div>
                                        <Switch
                                            id="useCustomPrice"
                                            checked={useCustomPrice}
                                            onCheckedChange={setUseCustomPrice}
                                        />
                                    </div>

                                    {useCustomPrice && (
                                        <div className="space-y-2">
                                            <Label htmlFor="customPrice" className="text-start">
                                                {t("promoPriceValueLabel")}
                                            </Label>
                                            <Input
                                                id="customPrice"
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                value={customPrice}
                                                onChange={(e) => setCustomPrice(e.target.value)}
                                                placeholder="0.00"
                                            />
                                            <p className="text-xs text-muted-foreground">
                                                {t("promoPriceFallbackHint")}
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* Profit Margin Calculator */}
                                {effectiveBasePrice > 0 && computedCostPrice > 0 && (
                                    <div className="p-4 bg-success/5 dark:bg-success/5 border border-success/20 dark:border-success/20 rounded-lg">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-medium text-success dark:text-success">
                                                {t("profitMarginLabel")}
                                            </span>
                                            <span className="text-lg font-bold text-success/80 dark:text-success/80">
                                                {formatPricingValue(marginPercentage)}%
                                            </span>
                                        </div>
                                        <p className="text-xs text-success/80 dark:text-success/80 mt-1">
                                            {t("unitProfitLabel")} {formatCurrency(marginAmount, currency)}
                                        </p>
                                        <p className="text-xs text-success/70 dark:text-success/70 mt-1">
                                            {t("profitMultiplierLabel")} {formatMarkupValue(profitMultiplier, "multiplier")}×
                                        </p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* TAB 3: Operasyon & Mutfak */}
                    <TabsContent value="operations" className="space-y-4 mt-4">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <AlertCircle className="w-5 h-5 text-primary" />
                                    {t("allergenInfoTitle")}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-2 gap-3">
                                    {ALLERGEN_OPTIONS.map((allergen) => (
                                        <div key={allergen.value} className="flex items-center space-x-2">
                                            <Checkbox
                                                id={`allergen-${allergen.value}`}
                                                checked={isAllergenSelected(allergen.value)}
                                                onCheckedChange={() => handleAllergenToggle(allergen.value)}
                                            />
                                            <Label
                                                htmlFor={`allergen-${allergen.value}`}
                                                className="text-sm font-normal cursor-pointer"
                                            >
                                                {getAllergenLabel(allergen.value)}
                                            </Label>
                                        </div>
                                    ))}
                                </div>
                                <p className="text-xs text-muted-foreground mt-3">
                                    {t("allergensHint")}
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">{t("stationRoutingTitle")}</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label>{t("preparationStationLabel")}</Label>
                                    <Select
                                        value={stationRouting.toString()}
                                        onValueChange={(val) => setStationRouting(parseInt(val))}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="0">👨‍🍳 {t("stationKitchenOnly")}</SelectItem>
                                            <SelectItem value="1">🍹 {t("stationBarOnly")}</SelectItem>
                                            <SelectItem value="2">🔄 {t("stationBothLabel")}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <p className="text-xs text-muted-foreground">
                                        {t("stationRoutingHint")}
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="kitchen">{t("kitchenLabel")}</Label>
                                    <Select
                                        // "All kitchens" is just a special sentinel
                                        // on this same dropdown — picking it sets
                                        // allKitchenPrinters=true, clears kitchenId.
                                        // No second control to reconcile.
                                        value={allKitchenPrinters ? "__all__" : (kitchenId || "__default__")}
                                        onValueChange={(val) => {
                                            if (val === "__all__") {
                                                setAllKitchenPrinters(true)
                                                setKitchenId("")
                                                setKitchenPrinterIds([])
                                            } else if (val === "__default__") {
                                                setAllKitchenPrinters(false)
                                                setKitchenId("")
                                                setKitchenPrinterIds([])
                                            } else {
                                                setAllKitchenPrinters(false)
                                                setKitchenId(val)
                                                setKitchenPrinterIds([])
                                            }
                                        }}
                                        disabled={kitchens.length === 0}
                                    >
                                        <SelectTrigger id="kitchen">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="__default__">🍳 {t("kitchenDefaultOption")}</SelectItem>
                                            {kitchens
                                                .filter((k) => k.isActive)
                                                .map((k) => (
                                                    <SelectItem key={k.id} value={k.id}>
                                                        {locale === "ar" && k.nameAr ? k.nameAr : k.name}
                                                    </SelectItem>
                                                ))}
                                            <SelectItem value="__all__">
                                                🖨️ {locale === "ar" ? "كل المطابخ" : "All kitchens"}
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <p className="text-xs text-muted-foreground">
                                        {kitchens.length === 0
                                            ? t("kitchenNoneConfigured")
                                            : (allKitchenPrinters
                                                ? (locale === "ar"
                                                    ? "سيتم طباعة هذا المنتج على جميع طابعات المطابخ النشطة."
                                                    : "This product will print on every active kitchen's printers.")
                                                : t("kitchenHint"))}
                                    </p>
                                </div>

                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <button
                                    type="button"
                                    className="flex w-full items-center justify-between text-start"
                                    onClick={() => setAvailabilityExpanded(prev => !prev)}
                                >
                                    <CardTitle className="text-lg">{t("availabilityWindowTitle")}</CardTitle>
                                    <span className="text-sm text-muted-foreground">{availabilityExpanded ? "−" : "+"}</span>
                                </button>
                            </CardHeader>
                            {availabilityExpanded && (
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                        <div className="space-y-2">
                                            <Label htmlFor="availableStartDate">{t("availableStartDateLabel")}</Label>
                                            <Input
                                                id="availableStartDate"
                                                type="date"
                                                value={availableStartDate}
                                                onChange={(e) => setAvailableStartDate(e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="availableEndDate">{t("availableEndDateLabel")}</Label>
                                            <Input
                                                id="availableEndDate"
                                                type="date"
                                                value={availableEndDate}
                                                onChange={(e) => setAvailableEndDate(e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                        <div className="space-y-2">
                                            <Label htmlFor="availableFrom">{t("availableDailyFromLabel")}</Label>
                                            <Input
                                                id="availableFrom"
                                                type="time"
                                                value={availableFrom}
                                                onChange={(e) => setAvailableFrom(e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="availableTo">{t("availableDailyToLabel")}</Label>
                                            <Input
                                                id="availableTo"
                                                type="time"
                                                value={availableTo}
                                                onChange={(e) => setAvailableTo(e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    <p className="text-xs text-muted-foreground">
                                        {t("alwaysAvailableHint")}
                                    </p>
                                </CardContent>
                            )}
                        </Card>
                    </TabsContent>

                    <TabsContent value="branches" className="space-y-4 mt-4">
                        <ProductBranchAssignmentsTab productId={editProduct?.id} />
                    </TabsContent>

                    {config.deliveryPartnersEnabled && (
                        <TabsContent value="delivery-partners" className="space-y-4 mt-4">
                            <ProductDeliveryPartnersTab
                                rows={deliveryPartnerRows}
                                basePrice={effectiveBasePrice}
                                currency={currency}
                                ar={locale === "ar"}
                                onRowsChange={setDeliveryPartnerRows}
                                onDirty={markDeliveryPartnerDirty}
                            />
                        </TabsContent>
                    )}

                    {/* TAB 4: Reçete */}
                    {showRecipeTab && (
                        <TabsContent value="recipe" className="space-y-4 mt-4">
                            {/* Alternatives (Product Options) — each option overrides price + recipe */}
                            {/* <Card> */}
                                {/* <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-lg">
                                            {locale === "ar" ? "البدائل" : "Alternatives"}
                                        </CardTitle>
                                        <Badge variant="outline" className="bg-info/5 text-info">
                                            {productOptions.length} {locale === "ar" ? "بديل" : "options"}
                                        </Badge>
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        {locale === "ar"
                                            ? "اختيار البديل يستبدل سعر المنتج ومكوناته بالكامل — لا يتم دمج الوصفة الأساسية مع وصفة البديل."
                                            : "Selecting an alternative fully replaces the product price and recipe — the base recipe is NOT merged with the option recipe."}
                                    </p>
                                </CardHeader> */}
                                {/* <CardContent className="space-y-4"> */}
                                    {/* {!editProduct && (
                                        <div className="rounded-lg border border-dashed bg-muted/30 p-4 text-center text-sm text-muted-foreground">
                                            {locale === "ar"
                                                ? "احفظ المنتج أولاً لإدارة البدائل ووصفاتها."
                                                : "Save the product first to manage alternatives and their recipes."}
                                        </div>
                                    )} */}
{/* 
                                    {editProduct && ( */}
                                        <>
                                            {/* Add new option — pick the alternative from the raw materials list */}
                                            {/* <div className="grid grid-cols-1 gap-3 rounded-lg border bg-muted/30 p-4 sm:grid-cols-[1.4fr_0.7fr_0.8fr_auto_auto] sm:items-end">
                                                <div className="space-y-2">
                                                    <Label>{locale === "ar" ? "البديل (اختر من المكونات)" : "Alternative (pick from ingredients)"}</Label>
                                                    <Select
                                                        value={newOptionMaterialId}
                                                        onValueChange={(value) => {
                                                            setNewOptionMaterialId(value)
                                                            const material = rawMaterials.find((m) => m.id === value)
                                                            if (material && !newOptionPrice) {
                                                                // Default price to the material's unit cost — admin can override.
                                                                setNewOptionPrice(material.costPerUnit.toString())
                                                            }
                                                        }}
                                                    >
                                                        <SelectTrigger>
                                                            <SelectValue placeholder={t("selectIngredientPlaceholder")} />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {rawMaterials.map((m) => (
                                                                <SelectItem key={m.id} value={m.id}>
                                                                    {m.displayName || m.name} ({UnitLabels[m.unit]})
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>{t("amountLabel")}</Label>
                                                    <Input
                                                        type="number"
                                                        min="0"
                                                        step="0.01"
                                                        value={newOptionAmount}
                                                        onChange={(e) => setNewOptionAmount(e.target.value)}
                                                        placeholder="1"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>{locale === "ar" ? "السعر" : "Price"}</Label>
                                                    <Input
                                                        type="number"
                                                        min="0"
                                                        step="0.01"
                                                        value={newOptionPrice}
                                                        onChange={(e) => setNewOptionPrice(e.target.value)}
                                                        placeholder="0.00"
                                                    />
                                                </div>
                                                <div className="flex items-center gap-2 sm:pb-2">
                                                    <Checkbox
                                                        id="new-option-default"
                                                        checked={newOptionIsDefault}
                                                        onCheckedChange={(checked) => setNewOptionIsDefault(checked === true)}
                                                    />
                                                    <Label htmlFor="new-option-default" className="text-sm">
                                                        {locale === "ar" ? "افتراضي" : "Default"}
                                                    </Label>
                                                </div>
                                                <Button onClick={handleAddOption} className="w-full sm:w-auto">
                                                    <Plus className="w-4 h-4 me-2" />
                                                    {t("addLabel")}
                                                </Button>
                                            </div> */}

                                            {/* Options list */}
                                            {/* <div className="space-y-2">
                                                {productOptions.map((option) => {
                                                    const isEditing = editingOptionId === option.id
                                                    const ingredientCount = option.recipeItems?.length ?? 0
                                                    return (
                                                        <div key={option.id} className="rounded-lg border p-3 transition-colors hover:bg-muted/50">
                                                            {isEditing ? (
                                                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1.2fr_1.2fr_0.8fr_auto_auto_auto]">
                                                                    <Input
                                                                        value={editingOptionName}
                                                                        onChange={(e) => setEditingOptionName(e.target.value)}
                                                                        placeholder={locale === "ar" ? "الاسم (EN)" : "Name (EN)"}
                                                                    />
                                                                    <Input
                                                                        value={editingOptionNameAr}
                                                                        onChange={(e) => setEditingOptionNameAr(e.target.value)}
                                                                        placeholder={locale === "ar" ? "الاسم (AR)" : "Name (AR)"}
                                                                        dir="rtl"
                                                                    />
                                                                    <Input
                                                                        type="number"
                                                                        min="0"
                                                                        step="0.01"
                                                                        value={editingOptionPrice}
                                                                        onChange={(e) => setEditingOptionPrice(e.target.value)}
                                                                        placeholder="0.00"
                                                                    />
                                                                    <div className="flex items-center gap-2">
                                                                        <Checkbox
                                                                            id={`edit-option-default-${option.id}`}
                                                                            checked={editingOptionIsDefault}
                                                                            onCheckedChange={(checked) => setEditingOptionIsDefault(checked === true)}
                                                                        />
                                                                        <Label htmlFor={`edit-option-default-${option.id}`} className="text-sm">
                                                                            {locale === "ar" ? "افتراضي" : "Default"}
                                                                        </Label>
                                                                    </div>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-8 w-8 text-primary hover:text-primary/80"
                                                                        onClick={() => handleSaveOptionEdit(option)}
                                                                    >
                                                                        <Check className="w-4 h-4" />
                                                                    </Button>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-8 w-8 text-slate-400 hover:text-slate-600"
                                                                        onClick={handleCancelEditOption}
                                                                    >
                                                                        <X className="w-4 h-4" />
                                                                    </Button>
                                                                </div>
                                                            ) : (
                                                                <div className="flex flex-wrap items-center gap-3">
                                                                    <div className="flex-1 min-w-[180px]">
                                                                        <div className="font-medium">
                                                                            {locale === "ar" && option.nameAr ? option.nameAr : option.name}
                                                                            {option.isDefault && (
                                                                                <Badge variant="secondary" className="ms-2 text-[10px]">
                                                                                    {locale === "ar" ? "افتراضي" : "Default"}
                                                                                </Badge>
                                                                            )}
                                                                            {!option.isActive && (
                                                                                <Badge variant="outline" className="ms-2 text-[10px] text-muted-foreground">
                                                                                    {locale === "ar" ? "غير فعال" : "Inactive"}
                                                                                </Badge>
                                                                            )}
                                                                        </div>
                                                                        <div className="text-xs text-muted-foreground">
                                                                            {ingredientCount} {locale === "ar" ? "مكون" : "ingredients"}
                                                                        </div>
                                                                    </div>
                                                                    <div className="text-sm font-semibold">
                                                                        {formatCurrency(option.price, currency)}
                                                                    </div>
                                                                    <Button
                                                                        variant="outline"
                                                                        size="sm"
                                                                        onClick={() => handleRecipeTargetChange(`option:${option.id}`)}
                                                                    >
                                                                        {locale === "ar" ? "تعديل المكونات" : "Edit recipe"}
                                                                    </Button>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-8 w-8 text-slate-400 hover:text-primary"
                                                                        onClick={() => handleStartEditOption(option)}
                                                                    >
                                                                        <Pencil className="w-4 h-4" />
                                                                    </Button>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-8 w-8 text-slate-400 hover:text-destructive"
                                                                        onClick={() => handleDeleteOption(option)}
                                                                    >
                                                                        <Trash2 className="w-4 h-4" />
                                                                    </Button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )
                                                })}
                                                {productOptions.length === 0 && (
                                                    <div className="text-center py-6 text-sm text-muted-foreground border-2 border-dashed rounded-lg">
                                                        {locale === "ar" ? "لا توجد بدائل بعد." : "No alternatives yet."}
                                                    </div>
                                                )}
                                            </div> */}
                                        </>
                                    {/* )}
                                </CardContent>
                            </Card> */}

                            <Card>
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-lg">{t("recipeIngredientsTitle")}</CardTitle>
                                        <Badge variant="outline" className="bg-info/5 text-info">
                                            {currentRecipeItems.length} {t("ingredientsCountLabel")}
                                        </Badge>
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        {t("recipeDeductHint")}
                                    </p>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {recipeTargetOptions.length > 0 && (
                                        <div className="space-y-2">
                                            <Label>{locale === "ar" ? "وصفة" : "Recipe Target"}</Label>
                                            <Select value={selectedRecipeTarget} onValueChange={handleRecipeTargetChange}>
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="base">
                                                        {locale === "ar" ? "الوصفة الأساسية للمنتج" : "Base Product Recipe"}
                                                    </SelectItem>
                                                    {recipeTargetOptions.map((option) => (
                                                        <SelectItem key={option.value} value={option.value}>
                                                            {option.label} {option.groupLabel ? `(${option.groupLabel})` : ""}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            {selectedRecipeTarget !== "base" && (
                                                <p className="text-xs text-muted-foreground">
                                                    {selectedRecipeTargetOption?.isShared
                                                        ? (locale === "ar"
                                                            ? "هذه البديلة من مجموعة مشتركة وتُعرض هنا للقراءة فقط. عدّلها من مكتبة الإضافات."
                                                            : "This alternative belongs to a shared group and is read-only here. Edit it from Extras Library.")
                                                        : isOptionRecipeTarget
                                                            ? (locale === "ar"
                                                                ? "⚠️ هذه الوصفة تستبدل الوصفة الأساسية بالكامل عند اختيار هذا البديل في الطلب."
                                                                : "⚠️ This recipe fully replaces the base product recipe when this alternative is selected on an order.")
                                                            : (locale === "ar"
                                                                ? "أنت تعدل وصفة البديل المحدد من نفس تبويب المكونات."
                                                                : "You are editing the selected alternative recipe from the same ingredients tab.")}
                                                </p>
                                            )}
                                        </div>
                                    )}

                                    {/* Add New Item */}
                                    <div className="flex flex-col gap-3 rounded-lg border bg-muted/30 p-4 sm:flex-row sm:items-end">
                                        <div className="flex-1 space-y-2">
                                            <Label>{t("selectRawMaterialLabel")}</Label>
                                            <Select value={selectedMaterialId} onValueChange={setSelectedMaterialId}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder={t("selectIngredientPlaceholder")} />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="none">{t("selectIngredientPlaceholder")}</SelectItem>
                                                    {rawMaterials.map((m) => (
                                                        <SelectItem key={m.id} value={m.id}>
                                                            {m.displayName || m.name} ({UnitLabels[m.unit]})
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="w-full space-y-2 sm:w-24">
                                            <Label>{t("amountLabel")}</Label>
                                            <Input
                                                type="number"
                                                value={recipeAmount}
                                                onChange={(e) => setRecipeAmount(e.target.value)}
                                                placeholder="0"
                                            />
                                        </div>
                                        <div className="w-full pb-0 text-sm font-medium text-muted-foreground sm:w-20 sm:pb-2">
                                            {getSelectedMaterialUnit()}
                                        </div>
                                        <Button onClick={handleAddRecipeItem} disabled={isSharedRecipeTarget} className="w-full sm:mb-[1px] sm:w-auto">
                                            <Plus className="w-4 h-4 me-2" /> {t("addLabel")}
                                        </Button>
                                    </div>

                                    {/* List */}
                                    <div className="space-y-2">
                                        {currentRecipeItems.length > 0 && (
                                            <div className="hidden items-center gap-4 border-b px-3 pb-3 text-sm font-semibold text-slate-700 sm:grid sm:grid-cols-[2fr_1fr_1fr_1fr_auto_auto] dark:text-slate-300">
                                                <span>{t("ingredientCol")}</span>
                                                <span className="text-end">{t("qtyCol")}</span>
                                                <span className="text-end">{t("unitCostCol")}</span>
                                                <span className="text-end">{t("totalCol")}</span>
                                                <span className="w-8"></span>
                                                <span className="w-8"></span>
                                            </div>
                                        )}
                                        {currentRecipeItems.map((item) => {
                                            const ingredientName = locale === "ar" && item.rawMaterialNameAr
                                                ? item.rawMaterialNameAr
                                                : item.rawMaterialName
                                            const isEditing = editingRecipeItemId === item.id
                                            const alternatives = item.alternatives ?? []
                                            const altExpanded = expandedAltRecipeId === item.id
                                            const altDraft = getAlternativeDraft(item.id)
                                            // Per-ingredient swaps only apply to the BASE recipe — ProductOption
                                            // recipes already override the whole recipe, and shared modifier recipes
                                            // live in the Extras Library. Draft (temp) rows render the editor too;
                                            // their alternatives flush to the server during the product save.
                                            const canManageAlternatives = selectedRecipeTarget === "base"
                                            const usedMaterialIds = new Set<string>([
                                                item.rawMaterialId,
                                                ...alternatives.map((a) => a.rawMaterialId),
                                            ])
                                            const availableAltMaterials = rawMaterials.filter((m) => !usedMaterialIds.has(m.id))
                                            return (
                                                <div key={item.id} className="rounded-lg border p-3 transition-colors hover:bg-muted/50">
                                                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-[2fr_1fr_1fr_1fr_auto_auto] sm:items-center sm:gap-4">
                                                        <div className="flex flex-wrap items-center gap-2 font-medium">
                                                            <span>{ingredientName}</span>
                                                            {item.isPostPrice && (
                                                                <Badge
                                                                    variant="outline"
                                                                    className="border-amber-300 bg-amber-50 text-[10px] font-medium text-amber-700 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                                                                    title={t("postPriceHint")}
                                                                >
                                                                    {t("postPriceBadge")}
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        <div className="text-start sm:text-end">
                                                            {isEditing ? (
                                                                <Input
                                                                    type="number"
                                                                    className="h-7 w-20 text-end ms-auto"
                                                                    value={editingRecipeAmount}
                                                                    onChange={(e) => setEditingRecipeAmount(e.target.value)}
                                                                    autoFocus
                                                                />
                                                            ) : (
                                                                <span>{item.amount} {getTranslatedUnit(item.unit, locale)}</span>
                                                            )}
                                                        </div>
                                                        <div className="text-start sm:text-end">{getRecipeItemUnitCost(item).toFixed(2)}</div>
                                                        <div className="text-start sm:text-end">{getRecipeItemTotalCost(item).toFixed(3)}</div>
                                                        {isEditing ? (
                                                            <>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-8 w-8 text-primary hover:text-primary/80"
                                                                    onClick={() => handleSaveRecipeItemEdit(item)}
                                                                >
                                                                    <Check className="w-4 h-4" />
                                                                </Button>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-8 w-8 text-slate-400 hover:text-slate-600"
                                                                    onClick={handleCancelRecipeItemEdit}
                                                                >
                                                                    <X className="w-4 h-4" />
                                                                </Button>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-8 w-8 text-slate-400 hover:text-primary"
                                                                    onClick={() => handleStartEditRecipeItem(item)}
                                                                >
                                                                    <Pencil className="w-4 h-4" />
                                                                </Button>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-8 w-8 text-slate-400 hover:text-destructive"
                                                                    onClick={() => handleDeleteRecipeItem(item.id)}
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </Button>
                                                            </>
                                                        )}
                                                    </div>

                                                    {canManageAlternatives && (
                                                        <>
                                                            <button
                                                                type="button"
                                                                className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-primary"
                                                                onClick={() => handleToggleAltRow(item.id)}
                                                            >
                                                                <span className="inline-block w-3 text-center">{altExpanded ? "▾" : "▸"}</span>
                                                                {locale === "ar" ? "البدائل" : "Alternatives"}
                                                                {alternatives.length > 0 && (
                                                                    <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
                                                                        {alternatives.length}
                                                                    </Badge>
                                                                )}
                                                            </button>

                                                            {altExpanded && (
                                                                <div className="mt-3 space-y-3 rounded-md border border-dashed bg-muted/30 p-3">
                                                                    <p className="text-xs text-muted-foreground">
                                                                        {locale === "ar"
                                                                            ? "يمكن للعميل استبدال هذا المكوّن بأحد البدائل عند الطلب. اختيار بديل يتجاوز المخزون والتكلفة تلقائيًا."
                                                                            : "Customers can swap this ingredient at order time. Selecting an alternative reroutes stock deduction and cost automatically."}
                                                                    </p>

                                                                    {alternatives.length > 0 && (
                                                                        <div className="space-y-2">
                                                                            {alternatives.map((alt) => {
                                                                                const altName = locale === "ar" && (alt.nameAr || alt.rawMaterialNameAr)
                                                                                    ? (alt.nameAr || alt.rawMaterialNameAr)
                                                                                    : (alt.name || alt.rawMaterialName)
                                                                                const priceImpact = resolveRecipeAlternativePriceImpactForRow(
                                                                                    { basePrice: effectiveBasePrice, recipeItems } as ProductDto,
                                                                                    item,
                                                                                    alt
                                                                                )
                                                                                const priceLabel = resolveRecipeAlternativePriceLabel(
                                                                                    priceImpact,
                                                                                    (amount) => formatCurrency(amount, currency)
                                                                                )
                                                                                const costImpact = alt.costImpact ?? ((alt.totalCost ?? 0) - getRecipeItemTotalCost(item))
                                                                                return (
                                                                                    <div key={alt.id} className="flex flex-col gap-2 rounded-md border bg-background p-2 text-sm sm:flex-row sm:items-center sm:justify-between">
                                                                                        <div className="flex min-w-0 flex-1 items-center gap-2">
                                                                                            <span className="truncate font-medium">{altName}</span>
                                                                                            <span className="text-xs text-muted-foreground">
                                                                                                {alt.amount} {getTranslatedUnit(alt.unit, locale)}
                                                                                            </span>
                                                                                            {priceLabel && (
                                                                                                <span className={`text-xs ${priceImpact < 0 ? "text-emerald-600" : "text-primary"}`}>
                                                                                                    {priceLabel}
                                                                                                </span>
                                                                                            )}
                                                                                            <span className={`text-xs ${costImpact < 0 ? "text-emerald-600" : "text-muted-foreground"}`}>
                                                                                                {locale === "ar" ? "تكلفة" : "Cost"} {costImpact >= 0 ? "+" : ""}{formatCurrency(costImpact, currency)}
                                                                                            </span>
                                                                                            {alt.isDefault && (
                                                                                                <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
                                                                                                    {locale === "ar" ? "افتراضي" : "Default"}
                                                                                                </Badge>
                                                                                            )}
                                                                                        </div>
                                                                                        <div className="flex items-center gap-3">
                                                                                            <label className="flex items-center gap-1 text-xs text-muted-foreground">
                                                                                                <Switch
                                                                                                    checked={alt.isActive}
                                                                                                    onCheckedChange={(checked) =>
                                                                                                        handleUpdateAlternative(item.id, alt, { isActive: checked })
                                                                                                    }
                                                                                                />
                                                                                                {locale === "ar" ? "مفعّل" : "Active"}
                                                                                            </label>
                                                                                            <label className="flex items-center gap-1 text-xs text-muted-foreground">
                                                                                                <Checkbox
                                                                                                    checked={alt.isDefault}
                                                                                                    onCheckedChange={(checked) =>
                                                                                                        handleUpdateAlternative(item.id, alt, { isDefault: checked === true })
                                                                                                    }
                                                                                                />
                                                                                                {locale === "ar" ? "افتراضي" : "Default"}
                                                                                            </label>
                                                                                            <Button
                                                                                                variant="ghost"
                                                                                                size="icon"
                                                                                                className="h-7 w-7 text-slate-400 hover:text-destructive"
                                                                                                onClick={() => handleDeleteAlternative(item.id, alt.id)}
                                                                                            >
                                                                                                <Trash2 className="w-3.5 h-3.5" />
                                                                                            </Button>
                                                                                        </div>
                                                                                    </div>
                                                                                )
                                                                            })}
                                                                        </div>
                                                                    )}

                                                                    {/* Add-new form */}
                                                                    <div className="flex flex-col gap-3 rounded-md border bg-background p-3 sm:flex-row sm:flex-wrap sm:items-end">
                                                                        <div className="min-w-0 flex-1 space-y-1 sm:min-w-[200px] sm:basis-[220px]">
                                                                            <Label className="text-xs">{locale === "ar" ? "المادة الخام" : "Raw Material"}</Label>
                                                                            <Select
                                                                                value={altDraft.rawMaterialId}
                                                                                onValueChange={(val) => {
                                                                                    updateAlternativeDraft(item.id, (draft) => {
                                                                                        const nextAmount = !draft.amount || draft.amount === "0"
                                                                                            ? "1"
                                                                                            : draft.amount
                                                                                        return {
                                                                                            ...draft,
                                                                                            rawMaterialId: val,
                                                                                            amount: nextAmount,
                                                                                            priceAdjustment: formatPricingValue(
                                                                                                getAlternativeCostImpact(item, val, nextAmount)
                                                                                            ),
                                                                                        }
                                                                                    })
                                                                                }}
                                                                            >
                                                                                <SelectTrigger className="h-9 w-full">
                                                                                    <SelectValue placeholder={locale === "ar" ? "اختر مادة خام" : "Select material"} />
                                                                                </SelectTrigger>
                                                                                <SelectContent>
                                                                                    {availableAltMaterials.length === 0 ? (
                                                                                        <SelectItem value="none" disabled>
                                                                                            {locale === "ar" ? "لا توجد مواد متاحة" : "No materials available"}
                                                                                        </SelectItem>
                                                                                    ) : (
                                                                                        availableAltMaterials.map((m) => (
                                                                                            <SelectItem key={m.id} value={m.id}>
                                                                                                {(locale === "ar" && m.nameAr ? m.nameAr : (m.displayName || m.name))} ({UnitLabels[m.unit]})
                                                                                            </SelectItem>
                                                                                        ))
                                                                                    )}
                                                                                </SelectContent>
                                                                            </Select>
                                                                        </div>
                                                                        <div className="w-full space-y-1 sm:w-28">
                                                                            <Label className="text-xs">{t("amountLabel")}</Label>
                                                                            <Input
                                                                                type="number"
                                                                                className="h-9 w-full"
                                                                                value={altDraft.amount}
                                                                                onChange={(e) => {
                                                                                    const val = e.target.value
                                                                                    updateAlternativeDraft(item.id, (draft) => {
                                                                                        const nextDraft = { ...draft, amount: val }
                                                                                        const amt = parseFloat(val)

                                                                                        if (draft.rawMaterialId && Number.isFinite(amt) && amt > 0) {
                                                                                            nextDraft.priceAdjustment = formatPricingValue(
                                                                                                getAlternativeCostImpact(item, draft.rawMaterialId, val)
                                                                                            )
                                                                                        }

                                                                                        return nextDraft
                                                                                    })
                                                                                }}
                                                                                placeholder="0"
                                                                            />
                                                                        </div>
                                                                        <div className="w-full space-y-1 sm:w-32">
                                                                            <Label className="text-xs">
                                                                                {locale === "ar" ? "فرق السعر" : "Price difference"}
                                                                            </Label>
                                                                            <Input
                                                                                type="number"
                                                                                step="0.01"
                                                                                className="h-9 w-full"
                                                                                value={altDraft.priceAdjustment}
                                                                                onChange={(e) => {
                                                                                    updateAlternativeDraft(item.id, (draft) => ({
                                                                                        ...draft,
                                                                                        priceAdjustment: e.target.value,
                                                                                    }))
                                                                                }}
                                                                                placeholder="0.00"
                                                                            />
                                                                        </div>
                                                                        <div className="flex w-full items-center gap-3 sm:w-auto sm:pb-1">
                                                                            <label className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap">
                                                                                <Checkbox
                                                                                    checked={altDraft.isDefault}
                                                                                    onCheckedChange={(checked) => {
                                                                                        updateAlternativeDraft(item.id, (draft) => ({
                                                                                            ...draft,
                                                                                            isDefault: checked === true,
                                                                                        }))
                                                                                    }}
                                                                                />
                                                                                {locale === "ar" ? "افتراضي" : "Default"}
                                                                            </label>
                                                                            <Button
                                                                                size="sm"
                                                                                onClick={() => handleAddAlternative(item.id)}
                                                                                className="ms-auto h-9"
                                                                            >
                                                                                <Plus className="w-3.5 h-3.5 me-1" />
                                                                                {t("addLabel")}
                                                                            </Button>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </>
                                                    )}
                                                </div>
                                            )
                                        })}
                                        {currentRecipeItems.length === 0 && (
                                            <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                                                {t("recipeEmpty")}
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    )}
                </Tabs>

                <SheetFooter className="sticky bottom-0 mt-6 border-t bg-background/95 p-4 backdrop-blur sm:p-6">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        {t("cancel")}
                    </Button>
                    <Button onClick={handleSaveProduct} className="bg-primary text-primary-foreground hover:bg-primary/90">
                        <Save className="w-4 h-4 me-2" />
                        {t("saveAndPublish")}
                    </Button>
                </SheetFooter>
                </div>
            </SheetContent>
        </Sheet >

        {/* Link Existing Group Dialog */}
        <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
            <DialogContent className="w-[calc(100vw-2rem)] max-w-md max-h-[70vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{t("linkExistingGroup")}</DialogTitle>
                </DialogHeader>
                <div className="space-y-2 py-2">
                    {libraryGroups.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                            {t("noGroupsAvailable")}
                        </p>
                    ) : (
                        libraryGroups
                            .filter(lg => !modifierGroups.some(mg => mg.id === lg.id))
                            .map(lg => (
                                <button
                                    key={lg.id}
                                    onClick={() => linkExistingGroup(lg)}
                                    className="w-full text-start p-3 border rounded-lg hover:bg-muted/50 transition-colors space-y-1"
                                >
                                    <div className="font-medium text-sm">
                                        {lg.name}
                                        {lg.nameAr && <span className="text-muted-foreground ms-2">({lg.nameAr})</span>}
                                    </div>
                                    <div className="flex flex-wrap gap-1">
                                        {lg.modifiers.map(m => (
                                            <Badge key={m.id} variant="secondary" className="text-[10px]">
                                                {m.name}
                                                {m.priceAdjustment !== 0 && ` (${m.priceAdjustment > 0 ? '+' : ''}${formatCurrency(m.priceAdjustment, currency)})`}
                                            </Badge>
                                        ))}
                                    </div>
                                    <div className="text-[11px] text-muted-foreground">
                                        {lg.selectionType === 0 ? t("selectionSingle") : t("selectionMultiple")}
                                        {lg.usedByProducts.length > 0 && ` · ${t("usedByProducts")}: ${lg.usedByProducts.map(p => p.productName).join(', ')}`}
                                    </div>
                                </button>
                            ))
                    )}
                    {libraryGroups.length > 0 && libraryGroups.filter(lg => !modifierGroups.some(mg => mg.id === lg.id)).length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">
                            All groups already linked.
                        </p>
                    )}
                </div>
            </DialogContent>
        </Dialog>
        </>
    )
}

function normalizeDeliveryPartnerTime(value?: string | null): string | null {
    if (!value) return null
    return value.length === 5 ? `${value}:00` : value
}

"use client"

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react"
import {
    Plus, Pencil, Trash2, Search, Link2, GripVertical, CircleDot,
    CheckSquare, Star, SlidersHorizontal, Printer, Package,
    ChevronDown, AlertCircle, DollarSign, ArrowRight
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import {
    Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { useLocale } from "@/components/locale-provider"
import { ModifierGroupLibraryDto, ModifierDto, ProductDto } from "@/types/pos"
import {
    getModifierGroupsPaginated, createModifierGroup, updateModifierGroup,
    deleteModifierGroup, getRawMaterials, RawMaterial, getProducts
} from "@/lib/api"
import { PaginationControls } from "@/components/ui/pagination-controls"
import { usePosStore } from "@/store/posStore"
import { formatCurrency } from "@/lib/currencies"

// ─── Types ───────────────────────────────────────────────────

type ModifierSourceType = "rawMaterial" | "product"
type ModifierMarkupType = "multiplier" | "percentage" | "fixed"

const modifierMarkupTypeStorageKey = "ntx:modifier-markup-types:v1"

interface ModifierMarkupTypeMetadata {
    byModifierId: Record<string, ModifierMarkupType>
    bySignature: Record<string, ModifierMarkupType>
}

interface ModifierMarkupSource {
    id?: string
    name: string
    nameAr?: string
    priceAdjustment: number
    linkedRawMaterialId?: string
    linkedProductId?: string
    linkedMaterialAmount?: number
    _markupType?: ModifierMarkupType
}

interface ModifierFormItem {
    id?: string
    name: string
    nameAr: string
    priceAdjustment: number
    isDefault: boolean
    isActive: boolean
    pricingType: number
    isFree: boolean
    freeQuantityLimit: number
    maxQuantity: number
    sourceType: ModifierSourceType
    linkedRawMaterialId: string
    linkedProductId: string
    linkedMaterialAmount: number
    _markupType: ModifierMarkupType
    _markupValue: number
    _productSearch: string
}

interface GroupFormData {
    name: string
    nameAr: string
    selectionType: number
    minSelection: number
    maxSelection: number
    displayType: number
    isRequired: boolean
    availableForOrderTypes: number
    printOnReceipt: boolean
    printInKitchen: boolean
    modifiers: ModifierFormItem[]
}

interface FieldErrors {
    name?: string
    nameAr?: string
    modifiers?: Record<number, { name?: string; nameAr?: string; source?: string }>
    general?: string
}

function newModifierRow(): ModifierFormItem {
    return {
        name: "", nameAr: "", priceAdjustment: 0, isDefault: false, isActive: true,
        pricingType: 0, isFree: false, freeQuantityLimit: 0, maxQuantity: 0,
        sourceType: "rawMaterial", linkedRawMaterialId: "", linkedProductId: "", linkedMaterialAmount: 1,
        _markupType: "multiplier", _markupValue: 2, _productSearch: "",
    }
}

const emptyForm: GroupFormData = {
    name: "", nameAr: "", selectionType: 0, minSelection: 0, maxSelection: 1,
    displayType: 0, isRequired: false, availableForOrderTypes: 7,
    printOnReceipt: true, printInKitchen: true, modifiers: [],
}

// ─── Helpers ─────────────────────────────────────────────────

function getRawCost(rm: RawMaterial | undefined, amount: number): number {
    if (!rm) return 0
    return rm.costPerUnit * amount
}

function calcFinalPrice(cost: number, markupType: ModifierMarkupType, markupValue: number): number {
    if (markupType === "percentage") return cost * (1 + markupValue / 100)
    if (markupType === "fixed") return cost + markupValue
    return cost * markupValue // multiplier
}

function calcMarkupValue(price: number, cost: number, markupType: ModifierMarkupType): number {
    if (cost <= 0) return markupType === "multiplier" ? 2 : 0
    if (markupType === "fixed") return Math.max(0, parseFloat((price - cost).toFixed(2)))
    if (markupType === "percentage") return Math.max(0, parseFloat((((price / cost) - 1) * 100).toFixed(2)))
    return Math.max(0, parseFloat((price / cost).toFixed(4)))
}

function getProductPrice(product: ProductDto | undefined): number {
    if (!product) return 0
    return product.discountedPrice ?? product.basePrice
}

function isModifierMarkupType(value: unknown): value is ModifierMarkupType {
    return value === "multiplier" || value === "percentage" || value === "fixed"
}

function readModifierMarkupMetadata(): ModifierMarkupTypeMetadata {
    if (typeof window === "undefined") return { byModifierId: {}, bySignature: {} }
    try {
        const parsed = JSON.parse(window.localStorage.getItem(modifierMarkupTypeStorageKey) || "{}")
        return {
            byModifierId: parsed.byModifierId || {},
            bySignature: parsed.bySignature || {},
        }
    } catch {
        return { byModifierId: {}, bySignature: {} }
    }
}

function writeModifierMarkupMetadata(metadata: ModifierMarkupTypeMetadata) {
    if (typeof window === "undefined") return
    window.localStorage.setItem(modifierMarkupTypeStorageKey, JSON.stringify(metadata))
}

function buildModifierMarkupSignature(groupId: string | undefined, modifier: ModifierMarkupSource): string {
    const normalize = (value?: string) => (value || "").trim().toLowerCase()
    const amount = Number(modifier.linkedMaterialAmount || 0).toFixed(4)
    const price = Number(modifier.priceAdjustment || 0).toFixed(2)
    return [
        groupId || "",
        normalize(modifier.name),
        normalize(modifier.nameAr),
        normalize(modifier.linkedRawMaterialId),
        amount,
        price,
    ].join("|")
}

// ─── Component ───────────────────────────────────────────────

export default function ExtrasManager() {
    const { t, locale } = useLocale()
    const isAr = locale === "ar"
    const getText = (ar: string, en: string) => (isAr ? ar : en)
    const currency = usePosStore((s) => s.currency)

    // Data
    const [groups, setGroups] = useState<ModifierGroupLibraryDto[]>([])
    const [loading, setLoading] = useState(true)
    const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([])
    const [products, setProducts] = useState<ProductDto[]>([])

    // List UI
    const [search, setSearch] = useState("")
    const [pageNumber, setPageNumber] = useState(1)
    const [pageSize, setPageSize] = useState(10)
    const [totalCount, setTotalCount] = useState(0)

    // Dialog
    const [dialogOpen, setDialogOpen] = useState(false)
    const [editingGroup, setEditingGroup] = useState<ModifierGroupLibraryDto | null>(null)
    const [form, setForm] = useState<GroupFormData>({ ...emptyForm })
    const [saving, setSaving] = useState(false)
    const [errors, setErrors] = useState<FieldErrors>({})
    const [rulesOpen, setRulesOpen] = useState(false)

    // Option picker dropdown
    const [optionPickerOpen, setOptionPickerOpen] = useState(false)
    const [optionSearch, setOptionSearch] = useState("")
    const pickerRef = useRef<HTMLDivElement>(null)

    // ─── Data Fetching ───

    const fetchGroups = useCallback(async () => {
        setLoading(true)
        const data = await getModifierGroupsPaginated(pageNumber, pageSize, search)
        setGroups(data.items)
        setTotalCount(data.totalCount)
        setLoading(false)
    }, [pageNumber, pageSize, search])

    useEffect(() => {
        Promise.all([getRawMaterials(), getProducts()])
            .then(([materials, loadedProducts]) => {
                setRawMaterials(materials)
                setProducts(loadedProducts)
            })
            .catch(() => {})
    }, [])

    useEffect(() => {
        fetchGroups()
    }, [fetchGroups])

    // ─── Derived: All existing modifiers across all groups ───

    const allExistingModifiers = useMemo(() => {
        const seen = new Set<string>()
        const result: ModifierDto[] = []
        for (const g of groups) {
            for (const m of g.modifiers) {
                const key = m.name.toLowerCase()
                if (!seen.has(key)) {
                    seen.add(key)
                    result.push(m)
                }
            }
        }
        return result
    }, [groups])

    // Filtered options for picker (exclude already-added)
    const pickerOptions = useMemo(() => {
        const addedNames = new Set(form.modifiers.map(m => m.name.toLowerCase()))
        return allExistingModifiers.filter(m => {
            if (addedNames.has(m.name.toLowerCase())) return false
            if (!optionSearch) return true
            return m.name.toLowerCase().includes(optionSearch.toLowerCase()) ||
                (m.nameAr && m.nameAr.includes(optionSearch))
        })
    }, [allExistingModifiers, form.modifiers, optionSearch])

    // Click outside to close picker
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
                setOptionPickerOpen(false)
            }
        }
        if (optionPickerOpen) document.addEventListener("mousedown", handler)
        return () => document.removeEventListener("mousedown", handler)
    }, [optionPickerOpen])

    const getProductName = (product: ProductDto) =>
        isAr ? (product.nameAr || product.displayName || product.name) : (product.displayName || product.name || product.nameAr || "")

    const getSavedRawMaterialMarkupType = (groupId: string | undefined, modifier: ModifierMarkupSource): ModifierMarkupType | undefined => {
        if (modifier.linkedProductId || !modifier.linkedRawMaterialId) return undefined
        const metadata = readModifierMarkupMetadata()
        const signatureType = metadata.bySignature[buildModifierMarkupSignature(groupId, modifier)]
        if (isModifierMarkupType(signatureType)) return signatureType
        const modifierType = modifier.id ? metadata.byModifierId[modifier.id] : undefined
        return isModifierMarkupType(modifierType) ? modifierType : undefined
    }

    const persistRawMaterialMarkupTypes = (groupId: string, modifiers: ModifierMarkupSource[]) => {
        const metadata = readModifierMarkupMetadata()
        modifiers.forEach((modifier) => {
            if (modifier.linkedProductId || !modifier.linkedRawMaterialId || !modifier._markupType) return
            metadata.bySignature[buildModifierMarkupSignature(groupId, modifier)] = modifier._markupType
            if (modifier.id) metadata.byModifierId[modifier.id] = modifier._markupType
        })
        writeModifierMarkupMetadata(metadata)
    }

    // ─── Dialog Actions ───

    const openCreate = () => {
        setEditingGroup(null)
        setForm({ ...emptyForm })
        setErrors({})
        setRulesOpen(false)
        setDialogOpen(true)
    }

    const openEdit = (group: ModifierGroupLibraryDto) => {
        setEditingGroup(group)
        setForm({
            name: group.name,
            nameAr: group.nameAr || "",
            selectionType: group.selectionType,
            minSelection: (group.isRequired ?? false) ? group.minSelection : 0,
            maxSelection: group.maxSelection,
            displayType: group.displayType ?? 0,
            isRequired: group.isRequired ?? false,
            availableForOrderTypes: group.availableForOrderTypes ?? 7,
            printOnReceipt: group.printOnReceipt ?? true,
            printInKitchen: group.printInKitchen ?? true,
            modifiers: group.modifiers.map(m => {
                const sourceType: ModifierSourceType = m.linkedProductId ? "product" : "rawMaterial"
                const rm = sourceType === "rawMaterial" ? rawMaterials.find(r => r.id === m.linkedRawMaterialId) : undefined
                const linkedProduct = sourceType === "product" ? products.find(p => p.id === m.linkedProductId) : undefined
                const cost = getRawCost(rm, m.linkedMaterialAmount ?? 1)
                const savedMarkupType = getSavedRawMaterialMarkupType(group.id, m) || "multiplier"
                return {
                    id: m.id,
                    name: m.name,
                    nameAr: m.nameAr || "",
                    priceAdjustment: sourceType === "product" ? (linkedProduct ? getProductPrice(linkedProduct) : m.priceAdjustment) : m.priceAdjustment,
                    isDefault: m.isDefault ?? false,
                    isActive: m.isActive ?? true,
                    pricingType: 0,
                    isFree: m.isFree ?? false,
                    freeQuantityLimit: m.freeQuantityLimit ?? 0,
                    maxQuantity: m.maxQuantity ?? 0,
                    sourceType,
                    linkedRawMaterialId: sourceType === "rawMaterial" ? (m.linkedRawMaterialId || "") : "",
                    linkedProductId: m.linkedProductId || "",
                    linkedMaterialAmount: sourceType === "rawMaterial" ? (m.linkedMaterialAmount ?? 1) : 0,
                    _markupType: savedMarkupType,
                    _markupValue: calcMarkupValue(m.priceAdjustment, cost, savedMarkupType),
                    _productSearch: "",
                }
            }),
        })
        setErrors({})
        setRulesOpen(false)
        setDialogOpen(true)
    }

    const handleDelete = async (group: ModifierGroupLibraryDto) => {
        if (group.usedByProducts.length > 0) {
            toast.error(t("cannotDeleteSharedGroup"))
            return
        }
        if (!confirm(t("confirmDeleteGroup"))) return
        try {
            await deleteModifierGroup(group.id)
            toast.success(getText("تم حذف المجموعة.", "Group deleted."))
            fetchGroups()
        } catch {
            toast.error(t("anErrorOccurred"))
        }
    }

    // ─── Modifier Row Helpers ───

    const addModifierRow = () => {
        setForm(prev => ({
            ...prev,
            modifiers: [...prev.modifiers, newModifierRow()],
        }))
    }

    const addFromExisting = (existing: ModifierDto) => {
        const sourceType: ModifierSourceType = existing.linkedProductId ? "product" : "rawMaterial"
        const rm = sourceType === "rawMaterial" ? rawMaterials.find(r => r.id === existing.linkedRawMaterialId) : undefined
        const linkedProduct = sourceType === "product" ? products.find(p => p.id === existing.linkedProductId) : undefined
        const cost = getRawCost(rm, existing.linkedMaterialAmount ?? 1)
        const sourceGroup = groups.find(g => g.modifiers.some(m => m.id === existing.id))
        const savedMarkupType = getSavedRawMaterialMarkupType(sourceGroup?.id, existing) || "multiplier"
        setForm(prev => ({
            ...prev,
            modifiers: [...prev.modifiers, {
                name: existing.name,
                nameAr: existing.nameAr || "",
                priceAdjustment: sourceType === "product" ? (linkedProduct ? getProductPrice(linkedProduct) : existing.priceAdjustment) : existing.priceAdjustment,
                isDefault: false,
                isActive: existing.isActive ?? true,
                pricingType: 0,
                isFree: existing.isFree ?? false,
                freeQuantityLimit: existing.freeQuantityLimit ?? 0,
                maxQuantity: existing.maxQuantity ?? 0,
                sourceType,
                linkedRawMaterialId: sourceType === "rawMaterial" ? (existing.linkedRawMaterialId || "") : "",
                linkedProductId: existing.linkedProductId || "",
                linkedMaterialAmount: sourceType === "rawMaterial" ? (existing.linkedMaterialAmount ?? 1) : 0,
                _markupType: savedMarkupType,
                _markupValue: calcMarkupValue(existing.priceAdjustment, cost, savedMarkupType),
                _productSearch: "",
            }],
        }))
        setOptionPickerOpen(false)
        setOptionSearch("")
    }

    const removeModifierRow = (idx: number) => {
        setForm(prev => ({
            ...prev,
            modifiers: prev.modifiers.filter((_, i) => i !== idx),
        }))
    }

    const updateModifierRow = (idx: number, field: keyof ModifierFormItem, value: any) => {
        setForm(prev => ({
            ...prev,
            modifiers: prev.modifiers.map((m, i) => {
                if (i !== idx) return m
                const updated = { ...m, [field]: value }

                if (field === "sourceType") {
                    const nextSource = value as ModifierSourceType
                    const selectedProduct = products.find(p => p.id === updated.linkedProductId)
                    return {
                        ...updated,
                        linkedRawMaterialId: nextSource === "rawMaterial" ? updated.linkedRawMaterialId : "",
                        linkedProductId: nextSource === "product" ? updated.linkedProductId : "",
                        linkedMaterialAmount: nextSource === "rawMaterial" ? Math.max(0.01, updated.linkedMaterialAmount || 1) : 0,
                        pricingType: 0,
                        priceAdjustment: nextSource === "product" ? getProductPrice(selectedProduct) : updated.priceAdjustment,
                        _productSearch: nextSource === "product" ? updated._productSearch : "",
                    }
                }

                if (field === "linkedProductId") {
                    const selectedProduct = products.find(p => p.id === value)
                    updated.linkedRawMaterialId = ""
                    updated.linkedMaterialAmount = 0
                    updated.pricingType = 0
                    updated.priceAdjustment = getProductPrice(selectedProduct)
                }

                // Auto-recalculate priceAdjustment when raw material or markup changes
                if (
                    updated.sourceType === "rawMaterial" &&
                    (field === 'linkedRawMaterialId' || field === 'linkedMaterialAmount' || field === '_markupType' || field === '_markupValue')
                ) {
                    const rm = rawMaterials.find(r => r.id === updated.linkedRawMaterialId)
                    const cost = getRawCost(rm, updated.linkedMaterialAmount)
                    if (rm) {
                        updated.priceAdjustment = parseFloat(calcFinalPrice(cost, updated._markupType, updated._markupValue).toFixed(2))
                    }
                }

                return updated
            }),
        }))
        // Clear field-level errors on change
        if (field === 'name' || field === 'nameAr' || field === "sourceType" || field === "linkedProductId") {
            setErrors(prev => {
                const mods = { ...prev.modifiers }
                if (mods[idx]) {
                    if (field === "sourceType" || field === "linkedProductId") {
                        delete mods[idx].source
                    } else {
                        delete mods[idx][field]
                    }
                    if (Object.keys(mods[idx]).length === 0) delete mods[idx]
                }
                return { ...prev, modifiers: mods }
            })
        }
    }

    // ─── Validation ───

    const validate = (): boolean => {
        const errs: FieldErrors = {}

        // Group name EN
        if (!form.name.trim()) {
            errs.name = getText("اسم المجموعة بالإنجليزية مطلوب", "Name (EN) is required")
        } else {
            const dup = groups.find(g =>
                g.name.toLowerCase() === form.name.trim().toLowerCase() &&
                (!editingGroup || g.id !== editingGroup.id)
            )
            if (dup) errs.name = getText("توجد مجموعة بهذا الاسم الإنجليزي", "A group with this English name already exists")
        }

        // Group name AR
        if (!form.nameAr.trim()) {
            errs.nameAr = getText("اسم المجموعة بالعربية مطلوب", "Name (AR) is required")
        } else {
            const dup = groups.find(g =>
                g.nameAr && g.nameAr === form.nameAr.trim() &&
                (!editingGroup || g.id !== editingGroup.id)
            )
            if (dup) errs.nameAr = getText("توجد مجموعة بهذا الاسم العربي", "A group with this Arabic name already exists")
        }

        // Modifier validation
        if (form.modifiers.length === 0) {
            errs.general = getText("أضف خيارًا واحدًا على الأقل", "Add at least one option")
        } else {
            const modErrors: Record<number, { name?: string; nameAr?: string; source?: string }> = {}
            const seenEN = new Set<string>()
            const seenAR = new Set<string>()

            form.modifiers.forEach((m, idx) => {
                const err: { name?: string; nameAr?: string; source?: string } = {}

                if (!m.name.trim()) {
                    err.name = getText("مطلوب", "Required")
                } else {
                    const key = m.name.trim().toLowerCase()
                    if (seenEN.has(key)) {
                        err.name = getText("مكرر", "Duplicate")
                    }
                    seenEN.add(key)
                }

                if (!m.nameAr.trim()) {
                    err.nameAr = getText("مطلوب", "Required")
                } else {
                    if (seenAR.has(m.nameAr.trim())) {
                        err.nameAr = getText("مكرر", "Duplicate")
                    }
                    seenAR.add(m.nameAr.trim())
                }

                if (m.sourceType === "product" && !m.linkedProductId) {
                    err.source = getText("اختر منتجًا", "Select a product")
                }

                if (Object.keys(err).length > 0) modErrors[idx] = err
            })

            if (Object.keys(modErrors).length > 0) errs.modifiers = modErrors
        }

        setErrors(errs)
        return Object.keys(errs).length === 0
    }

    // ─── Save ───

    const handleSave = async () => {
        if (!validate()) {
            toast.warning(getText("أصلح أخطاء التحقق قبل الحفظ.", "Please fix validation errors before saving."))
            return
        }

        setSaving(true)
        try {
            const payload = {
                name: form.name.trim(),
                nameAr: form.nameAr.trim() || undefined,
                selectionType: form.selectionType,
                minSelection: form.minSelection,
                maxSelection: form.maxSelection,
                displayType: form.displayType,
                isRequired: form.isRequired,
                availableForOrderTypes: form.availableForOrderTypes,
                printOnReceipt: form.printOnReceipt,
                printInKitchen: form.printInKitchen,
                modifiers: form.modifiers.map(m => {
                    const linkedProduct = products.find(p => p.id === m.linkedProductId)
                    const isProductSource = m.sourceType === "product"
                    return {
                        ...(m.id ? { id: m.id } : {}),
                        name: m.name.trim(),
                        nameAr: m.nameAr.trim() || undefined,
                        priceAdjustment: isProductSource ? getProductPrice(linkedProduct) : m.priceAdjustment,
                        isDefault: m.isDefault,
                        isActive: m.isActive,
                        pricingType: 0,
                        isFree: m.isFree,
                        freeQuantityLimit: m.freeQuantityLimit,
                        maxQuantity: m.maxQuantity,
                        linkedRawMaterialId: m.sourceType === "rawMaterial" ? (m.linkedRawMaterialId || undefined) : undefined,
                        linkedProductId: isProductSource ? (m.linkedProductId || undefined) : undefined,
                        linkedMaterialAmount: m.sourceType === "rawMaterial" ? m.linkedMaterialAmount : 0,
                    }
                }),
            }

            if (editingGroup) {
                await updateModifierGroup(editingGroup.id, payload as any)
                persistRawMaterialMarkupTypes(editingGroup.id, form.modifiers)
                toast.success(getText("تم تحديث المجموعة.", "Group updated."))
            } else {
                const createdGroup = await createModifierGroup(payload as any)
                if (createdGroup) {
                    persistRawMaterialMarkupTypes(createdGroup.id, createdGroup.modifiers.map((modifier, idx) => ({
                        ...modifier,
                        _markupType: form.modifiers[idx]?._markupType,
                    })))
                }
                toast.success(getText("تم إنشاء المجموعة.", "Group created."))
            }
            setDialogOpen(false)
            fetchGroups()
        } catch {
            toast.error(t("anErrorOccurred"))
        } finally {
            setSaving(false)
        }
    }

    // ─── Render ──────────────────────────────────────────────

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold">{t("extrasLibrary")}</h1>
                    <p className="text-muted-foreground text-sm mt-1">{t("extrasLibraryDesc")}</p>
                </div>
                <Button onClick={openCreate} className="shrink-0">
                    <Plus className="w-4 h-4 me-2" />
                    {t("createGroup")}
                </Button>
            </div>

            {/* Search */}
            <div className="relative max-w-sm">
                <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder={t("searchGroups")} value={search} onChange={(e) => { setSearch(e.target.value); setPageNumber(1); }} className="ps-9" />
            </div>

            {/* Groups List */}
            {loading ? (
                <div className="text-center text-muted-foreground py-12">...</div>
            ) : totalCount === 0 && !search ? (
                <div className="text-center text-muted-foreground py-12 border-2 border-dashed rounded-lg">
                    {t("noExtrasGroupsYet")}
                </div>
            ) : groups.length === 0 ? (
                <div className="text-center text-muted-foreground py-12 border-2 border-dashed rounded-lg">
                    {t("noMatchingGroups")}
                </div>
            ) : (
                <>
                <div className="grid gap-4">
                    {groups.map((group) => (
                        <Card key={group.id}>
                            <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <CardTitle className="text-base">
                                            {group.name}
                                            {group.nameAr && <span className="text-muted-foreground font-normal ms-2">({group.nameAr})</span>}
                                        </CardTitle>
                                        <Badge variant="outline" className="text-xs">
                                            {group.selectionType === 0 ? t("singleSelection") : t("multipleSelection")}
                                        </Badge>
                                        {(group.isRequired) && <Badge variant="destructive" className="text-[10px]">{t("required")}</Badge>}
                                    </div>
                                    <div className="flex gap-1">
                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(group)}>
                                            <Pencil className="w-4 h-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"
                                            onClick={() => handleDelete(group)} disabled={group.usedByProducts.length > 0}>
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-0 space-y-3">
                                <div className="flex flex-wrap gap-2">
                                    {group.modifiers.map((mod) => (
                                        <Badge key={mod.id} variant={mod.isActive ? "default" : "secondary"} className="gap-1">
                                            {mod.name}
                                            {mod.priceAdjustment !== 0 && (
                                                <span className="opacity-70">
                                                    ({mod.priceAdjustment > 0 ? "+" : ""}{formatCurrency(mod.priceAdjustment, currency)})
                                                </span>
                                            )}
                                            {mod.isDefault && <span className="text-[10px]">★</span>}
                                        </Badge>
                                    ))}
                                </div>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <Link2 className="w-3.5 h-3.5" />
                                    <span>{t("usedByProducts")}:</span>
                                    {group.usedByProducts.length > 0
                                        ? group.usedByProducts.map((p) => <Badge key={p.productId} variant="outline" className="text-xs">{p.productName}</Badge>)
                                        : <span className="italic">{t("notUsed")}</span>}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
                <PaginationControls
                    pageNumber={pageNumber}
                    pageSize={pageSize}
                    totalCount={totalCount}
                    onPageChange={setPageNumber}
                    onPageSizeChange={(size) => { setPageSize(size); setPageNumber(1); }}
                    isLoading={loading}
                />
                </>
            )}

            {/* ═══ CREATE / EDIT DIALOG ═══ */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="w-[calc(100vw-2rem)] max-w-3xl max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0">
                    {/* Dialog Header */}
                    <div className="px-6 pt-6 pb-4 border-b border-slate-100 shrink-0">
                        <DialogHeader>
                            <DialogTitle className="text-xl font-bold text-slate-800">
                                {editingGroup ? t("editGroup") : t("createGroup")}
                            </DialogTitle>
                        </DialogHeader>
                    </div>

                    {/* Scrollable Content */}
                    <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

                        {/* ── SECTION 1: Group Name (EN / AR) ── */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                    {t("groupNameEn")} <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    value={form.name}
                                    onChange={(e) => { setForm(prev => ({ ...prev, name: e.target.value })); setErrors(prev => ({ ...prev, name: undefined })) }}
                                    placeholder={getText("مثال: Size", "e.g. Size")}
                                    className={`h-10 ${errors.name ? "border-red-400 focus-visible:ring-red-400" : ""}`}
                                />
                                {errors.name && <p className="text-[11px] text-red-500 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.name}</p>}
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                    {t("groupNameAr")} <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    value={form.nameAr}
                                    onChange={(e) => { setForm(prev => ({ ...prev, nameAr: e.target.value })); setErrors(prev => ({ ...prev, nameAr: undefined })) }}
                                    placeholder={getText("مثال: الحجم", "e.g. الحجم")}
                                    dir="rtl"
                                    className={`h-10 ${errors.nameAr ? "border-red-400 focus-visible:ring-red-400" : ""}`}
                                />
                                {errors.nameAr && <p className="text-[11px] text-red-500 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.nameAr}</p>}
                            </div>
                        </div>

                        {/* ── SECTION 2: Selection Type ── */}
                        <div className="space-y-2">
                            <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t("selectionType")}</Label>
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    { v: 0, icon: <CircleDot className="w-4 h-4" />, label: t("singleSelection"), desc: t("chooseOneOption") },
                                    { v: 1, icon: <CheckSquare className="w-4 h-4" />, label: t("multipleSelection"), desc: t("chooseMultipleOptions") },
                                ].map(st => (
                                    <button key={st.v} type="button" onClick={() => setForm(prev => ({ ...prev, selectionType: st.v, maxSelection: st.v === 1 ? 0 : 1 }))}
                                        className={`flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all text-start ${
                                            form.selectionType === st.v ? "border-primary bg-primary/5 shadow-sm" : "border-slate-200 hover:border-slate-300"}`}>
                                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                                            form.selectionType === st.v ? "bg-primary text-white" : "bg-slate-100 text-slate-400"}`}>
                                            {st.icon}
                                        </div>
                                        <div>
                                            <div className="font-semibold text-sm text-slate-700">{st.label}</div>
                                            <div className="text-[11px] text-slate-400">{st.desc}</div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Min / Max + Display Type hidden for now */}

                        {/* ── SECTION 4: Rules & Settings (Collapsible) ── */}
                        <div className="rounded-xl border border-slate-200 bg-slate-50/50 overflow-hidden">
                            <button type="button" onClick={() => setRulesOpen(!rulesOpen)}
                                className="w-full flex items-center justify-between p-4 hover:bg-slate-100/50 transition-colors">
                                <div className="flex items-center gap-2">
                                    <SlidersHorizontal className="w-4 h-4 text-slate-500" />
                                    <span className="text-sm font-semibold text-slate-600">{t("rulesAndSettings")}</span>
                                    {(form.isRequired || form.availableForOrderTypes !== 7 || !form.printOnReceipt || !form.printInKitchen) && (
                                        <Badge variant="secondary" className="text-[10px]">{t("customized")}</Badge>
                                    )}
                                </div>
                                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${rulesOpen ? "rotate-180" : ""}`} />
                            </button>

                            {rulesOpen && (
                                <div className="px-4 pb-4 space-y-4 border-t border-slate-200">
                                    <div className="flex items-center justify-between pt-3">
                                        <div>
                                            <div className="text-sm font-medium text-slate-700">{t("required")}</div>
                                            <div className="text-[11px] text-slate-400">{t("customerMustSelect")}</div>
                                        </div>
                                        <Switch checked={form.isRequired} onCheckedChange={(c) => setForm(prev => ({ ...prev, isRequired: c, minSelection: c ? Math.max(1, prev.minSelection) : 0 }))} />
                                    </div>

                                    {form.selectionType === 1 && (
                                        <div className="border-t border-slate-200 pt-3 grid grid-cols-2 gap-3">
                                            <div>
                                                <div className="text-sm font-medium text-slate-700 mb-1">{getText("الحد الأدنى للاختيار", "Min Selection")}</div>
                                                <Input
                                                    type="number" min={0}
                                                    value={form.minSelection}
                                                    onChange={(e) => setForm(prev => ({ ...prev, minSelection: Math.max(0, parseInt(e.target.value) || 0) }))}
                                                    className="h-9"
                                                />
                                            </div>
                                            <div>
                                                <div className="text-sm font-medium text-slate-700 mb-1">{getText("الحد الأقصى للاختيار", "Max Selection")} <span className="text-xs text-slate-400 font-normal">{getText("(0 = غير محدود)", "(0 = unlimited)")}</span></div>
                                                <Input
                                                    type="number" min={0}
                                                    value={form.maxSelection}
                                                    onChange={(e) => setForm(prev => ({ ...prev, maxSelection: Math.max(0, parseInt(e.target.value) || 0) }))}
                                                    className="h-9"
                                                />
                                            </div>
                                        </div>
                                    )}

                                    <div className="border-t border-slate-200 pt-3">
                                        <div className="text-sm font-medium text-slate-700 mb-2">{t("availableFor")}</div>
                                        <div className="flex flex-wrap gap-2">
                                            {[{ flag: 1, label: t("dineIn") }, { flag: 2, label: t("takeaway") }, { flag: 4, label: t("delivery") }].map(ot => (
                                                <button key={ot.flag} type="button"
                                                    onClick={() => setForm(prev => ({ ...prev, availableForOrderTypes: prev.availableForOrderTypes ^ ot.flag }))}
                                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                                                        (form.availableForOrderTypes & ot.flag) !== 0
                                                            ? "bg-primary/10 border-primary/30 text-primary" : "bg-white border-slate-200 text-slate-400"}`}>
                                                    {ot.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="border-t border-slate-200 pt-3">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Printer className="w-3.5 h-3.5 text-slate-500" />
                                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t("printing")}</span>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm text-slate-700">{t("extPrintOnReceipt")}</span>
                                                <Switch checked={form.printOnReceipt} onCheckedChange={(c) => setForm(prev => ({ ...prev, printOnReceipt: c }))} />
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm text-slate-700">{t("extPrintInKitchen")}</span>
                                                <Switch checked={form.printInKitchen} onCheckedChange={(c) => setForm(prev => ({ ...prev, printInKitchen: c }))} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* ── SECTION 5: Options / Modifiers ── */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <div>
                                    <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                        {t("optionsModifiers")} <span className="text-red-500">*</span>
                                    </Label>
                                    <p className="text-[11px] text-slate-400 mt-0.5">{t("addOptionsDesc")}</p>
                                </div>
                                <div className="relative" ref={pickerRef}>
                                    <Button
                                        onClick={() => setOptionPickerOpen(!optionPickerOpen)}
                                        size="sm" variant="outline"
                                        className="rounded-lg h-8 gap-1.5 text-xs font-semibold"
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                        {t("addOption")}
                                        <ChevronDown className="w-3 h-3 ms-0.5" />
                                    </Button>

                                    {/* Searchable Options Picker Dropdown */}
                                    {optionPickerOpen && (
                                        <div className="absolute end-0 top-full mt-1 w-72 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden">
                                            <div className="p-2 border-b border-slate-100">
                                                <div className="relative">
                                                    <Search className="absolute start-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                                                    <Input
                                                        className="h-8 text-sm ps-8"
                                                        placeholder={t("searchExistingOptions")}
                                                        value={optionSearch}
                                                        onChange={(e) => setOptionSearch(e.target.value)}
                                                        autoFocus
                                                    />
                                                </div>
                                            </div>
                                            <div className="max-h-48 overflow-y-auto">
                                                {/* Create New option */}
                                                <button type="button"
                                                    className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-primary font-medium hover:bg-primary/5 transition-colors border-b border-slate-100"
                                                    onClick={() => { addModifierRow(); setOptionPickerOpen(false); setOptionSearch("") }}>
                                                    <Plus className="w-4 h-4" />
                                                    {t("createNewOption")}
                                                </button>

                                                {pickerOptions.length > 0 ? (
                                                    pickerOptions.map(opt => (
                                                        <button key={opt.id} type="button"
                                                            className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-slate-50 transition-colors"
                                                            onClick={() => addFromExisting(opt)}>
                                                            <div className="text-start">
                                                                <div className="font-medium text-slate-700">{opt.name}</div>
                                                                {opt.nameAr && <div className="text-[11px] text-slate-400" dir="rtl">{opt.nameAr}</div>}
                                                            </div>
                                                            {opt.priceAdjustment > 0 && (
                                                                <Badge variant="secondary" className="text-[10px]">
                                                                    +{formatCurrency(opt.priceAdjustment, currency)}
                                                                </Badge>
                                                            )}
                                                        </button>
                                                    ))
                                                ) : (
                                                    <div className="px-3 py-4 text-center text-xs text-slate-400">
                                                        {optionSearch ? t("noMatchingOptions") : t("noExistingOptions")}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {errors.general && (
                                <p className="text-[11px] text-red-500 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.general}</p>
                            )}

                            {form.modifiers.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-10 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                                        <Plus className="w-5 h-5 text-slate-400" />
                                    </div>
                                    <p className="text-sm text-slate-500 font-medium">{t("noOptionsYet")}</p>
                                    <p className="text-xs text-slate-400 mt-1">{t("clickAddOptionToStart")}</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {form.modifiers.map((mod, idx) => {
                                        const rm = rawMaterials.find(r => r.id === mod.linkedRawMaterialId)
                                        const rawCost = getRawCost(rm, mod.linkedMaterialAmount)
                                        const linkedProduct = products.find(p => p.id === mod.linkedProductId)
                                        const linkedProductPrice = getProductPrice(linkedProduct)
                                        const modErr = errors.modifiers?.[idx]

                                        return (
                                            <div key={idx}
                                                className="rounded-xl border border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm transition-all overflow-hidden">

                                                {/* Card Header: Names + Actions */}
                                                <div className="flex items-start gap-2 p-3 pb-2">
                                                    <div className="text-slate-300 cursor-grab mt-2.5 shrink-0">
                                                        <GripVertical className="w-4 h-4" />
                                                    </div>

                                                    <div className="min-w-0 flex-1 grid grid-cols-1 gap-2">
                                                        <div>
                                                            <Input
                                                                className={`h-9 text-sm ${modErr?.name ? "border-red-400" : ""}`}
                                                                placeholder={getText("* الاسم (EN)", "Name (EN) *")}
                                                                value={mod.name}
                                                                onChange={(e) => updateModifierRow(idx, 'name', e.target.value)}
                                                            />
                                                            {modErr?.name && <p className="text-[10px] text-red-500 mt-0.5">{modErr.name}</p>}
                                                        </div>
                                                        <div>
                                                            <Input
                                                                className={`h-9 text-sm ${modErr?.nameAr ? "border-red-400" : ""}`}
                                                                placeholder={getText("* الاسم (AR)", "Name (AR) *")}
                                                                value={mod.nameAr}
                                                                onChange={(e) => updateModifierRow(idx, 'nameAr', e.target.value)}
                                                                dir="rtl"
                                                            />
                                                            {modErr?.nameAr && <p className="text-[10px] text-red-500 mt-0.5">{modErr.nameAr}</p>}
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-1.5 mt-1.5 shrink-0">
                                                        <button type="button" onClick={() => updateModifierRow(idx, 'isDefault', !mod.isDefault)}
                                                            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                                                                mod.isDefault ? "bg-amber-50 text-amber-500 border border-amber-200"
                                                                    : "bg-slate-50 text-slate-300 border border-slate-200 hover:text-slate-400"}`}
                                                            title={t("defaultOption")}>
                                                            <Star className="w-3.5 h-3.5" fill={mod.isDefault ? "currentColor" : "none"} />
                                                        </button>
                                                        <Switch checked={mod.isActive} onCheckedChange={(c) => updateModifierRow(idx, 'isActive', c)} className="h-4 w-7" />
                                                        <button type="button" onClick={() => removeModifierRow(idx)}
                                                            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors">
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Card Body: Pricing & Material */}
                                                <div className="px-3 pb-3 pt-1">
                                                    <div className="bg-slate-50 rounded-lg p-3 space-y-3">
                                                        <div className="space-y-2">
                                                            <Label className="text-[10px] text-slate-400 uppercase tracking-wider">
                                                                {getText("مصدر الخيار", "Option Source")}
                                                            </Label>
                                                            <div className="grid grid-cols-2 gap-2">
                                                                {([
                                                                    ["rawMaterial", getText("مادة خام", "Raw Material")],
                                                                    ["product", getText("منتج", "Product")],
                                                                ] as const).map(([value, label]) => (
                                                                    <button
                                                                        key={value}
                                                                        type="button"
                                                                        onClick={() => updateModifierRow(idx, "sourceType", value)}
                                                                        className={`h-9 min-w-0 truncate rounded-md border px-3 text-xs font-semibold transition-colors ${
                                                                            mod.sourceType === value
                                                                                ? "border-primary bg-primary/10 text-primary"
                                                                                : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
                                                                        }`}
                                                                    >
                                                                        {label}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>

                                                        {mod.sourceType === "rawMaterial" ? (
                                                            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_6rem] gap-2">
                                                                <div className="flex items-center gap-2 min-w-0">
                                                                    <Package className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                                                    <Select
                                                                        value={mod.linkedRawMaterialId || "_none"}
                                                                        onValueChange={(v) => {
                                                                            updateModifierRow(idx, 'linkedRawMaterialId', v === "_none" ? "" : v)
                                                                        }}>
                                                                        <SelectTrigger className="h-9 min-w-0 bg-white text-xs">
                                                                            <SelectValue placeholder={t("linkRawMaterial")} />
                                                                        </SelectTrigger>
                                                                        <SelectContent>
                                                                            <SelectItem value="_none">{t("noMaterialLinked")}</SelectItem>
                                                                            {rawMaterials.map(r => (
                                                                                <SelectItem key={r.id} value={r.id}>
                                                                                    {r.displayName || r.name} ({formatCurrency(r.costPerUnit, currency)}/{(["g","kg","pc","L","mL","pcs"][r.unit]) || getText("وحدة", "unit")})
                                                                                </SelectItem>
                                                                            ))}
                                                                        </SelectContent>
                                                                    </Select>
                                                                </div>
                                                                {mod.linkedRawMaterialId && (
                                                                    <div className="space-y-0.5">
                                                                        <Label className="text-[10px] text-slate-400">{t("qty")}</Label>
                                                                        <Input type="number" min={0.01} step={0.01} className="h-9 text-xs bg-white"
                                                                            value={mod.linkedMaterialAmount}
                                                                            onChange={(e) => updateModifierRow(idx, 'linkedMaterialAmount', parseFloat(e.target.value) || 0)} />
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <div className="space-y-2">
                                                                <Label className="text-[10px] text-slate-400 uppercase tracking-wider">
                                                                    {getText("المنتج المرتبط", "Linked Product")}
                                                                </Label>
                                                                <Select
                                                                    value={mod.linkedProductId || "_none"}
                                                                    onValueChange={(v) => updateModifierRow(idx, "linkedProductId", v === "_none" ? "" : v)}
                                                                >
                                                                    <SelectTrigger className={`h-10 min-w-0 bg-white text-sm ${modErr?.source ? "border-red-400" : ""}`}>
                                                                        <SelectValue placeholder={getText("اختر منتجًا", "Select product")} />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        <SelectItem value="_none">{getText("بدون منتج", "No product")}</SelectItem>
                                                                        {products.map(product => (
                                                                            <SelectItem key={product.id} value={product.id}>
                                                                                {getProductName(product)} ({formatCurrency(getProductPrice(product), currency)})
                                                                            </SelectItem>
                                                                        ))}
                                                                    </SelectContent>
                                                                </Select>
                                                            </div>
                                                        )}
                                                        {modErr?.source && <p className="text-[10px] text-red-500">{modErr.source}</p>}

                                                        {mod.sourceType === "rawMaterial" ? (
                                                            <>
                                                                {/* Pricing Row 1: Cost + Markup Type */}
                                                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                                                                    {/* Cost */}
                                                                    <div className="space-y-1">
                                                                        <Label className="text-[10px] text-slate-400 uppercase tracking-wider flex items-center gap-1">
                                                                            <DollarSign className="w-3 h-3" /> {t("costPriceLabel")}
                                                                        </Label>
                                                                        <div className={`h-8 flex items-center px-2.5 rounded-md border text-sm font-medium ${
                                                                            rm ? "bg-slate-100 border-slate-200 text-slate-600" : "bg-white border-slate-200"}`}>
                                                                            {rm ? (
                                                                                <span>{formatCurrency(rawCost, currency)}</span>
                                                                            ) : (
                                                                                <span className="text-slate-400 text-xs">{t("noMaterial")}</span>
                                                                            )}
                                                                        </div>
                                                                    </div>

                                                                    {/* Markup Type */}
                                                                    <div className="space-y-1">
                                                                        <Label className="text-[10px] text-slate-400 uppercase tracking-wider">{t("markupTypeLabel")}</Label>
                                                                        <Select value={mod._markupType} onValueChange={(v) => {
                                                                            const newType = v as "multiplier" | "percentage" | "fixed"
                                                                            const newVal = v === "multiplier" ? 2 : v === "percentage" ? 50 : 5
                                                                            setForm(prev => ({
                                                                                ...prev,
                                                                                modifiers: prev.modifiers.map((m, i) => {
                                                                                    if (i !== idx) return m
                                                                                    const updated = { ...m, _markupType: newType, _markupValue: newVal }
                                                                                    const rmm = rawMaterials.find(r => r.id === updated.linkedRawMaterialId)
                                                                                    const cost = getRawCost(rmm, updated.linkedMaterialAmount)
                                                                                    if (rmm) updated.priceAdjustment = parseFloat(calcFinalPrice(cost, newType, newVal).toFixed(2))
                                                                                    return updated
                                                                                }),
                                                                            }))
                                                                        }}>
                                                                            <SelectTrigger className="h-8 text-xs bg-white">
                                                                                <SelectValue />
                                                                            </SelectTrigger>
                                                                            <SelectContent>
                                                                                <SelectItem value="multiplier">{t("markupTypeMultiplier")}</SelectItem>
                                                                                <SelectItem value="percentage">{t("markupTypePercentage")}</SelectItem>
                                                                                <SelectItem value="fixed">{t("markupTypeFixed")}</SelectItem>
                                                                            </SelectContent>
                                                                        </Select>
                                                                    </div>
                                                                </div>

                                                                {/* Pricing Row 2: Markup Value + Final Price */}
                                                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                                                                    {/* Markup Value */}
                                                                    <div className="space-y-1">
                                                                        <Label className="text-[10px] text-slate-400 uppercase tracking-wider flex items-center gap-1">
                                                                            <ArrowRight className="rtl:-scale-x-100 w-3 h-3" /> {t("markupLabel")}
                                                                        </Label>
                                                                        <Input type="number" min={0} step={0.01}
                                                                            className="h-8 text-xs bg-white"
                                                                            placeholder={mod._markupType === "multiplier" ? "2.00" : mod._markupType === "percentage" ? "50" : "5.00"}
                                                                            value={mod._markupValue}
                                                                            onChange={(e) => updateModifierRow(idx, '_markupValue', parseFloat(e.target.value) || 0)} />
                                                                        <p className="text-[9px] text-slate-400">
                                                                            {mod._markupType === "percentage" ? t("percentAboveCostHint")
                                                                                : mod._markupType === "fixed" ? `+${currency} ${t("fixedAboveCostHint")}`
                                                                                : t("costMultiplierHint")}
                                                                        </p>
                                                                    </div>

                                                                    {/* Final Price */}
                                                                    <div className="space-y-1">
                                                                        <Label className="text-[10px] text-slate-400 uppercase tracking-wider">{t("finalPrice")}</Label>
                                                                        {rm ? (
                                                                            <div className="h-8 flex items-center px-2.5 rounded-md bg-primary/5 border border-primary/20 text-sm font-bold text-primary">
                                                                                {formatCurrency(mod.priceAdjustment, currency)}
                                                                            </div>
                                                                        ) : (
                                                                            <Input type="number" min={0} step={0.5}
                                                                                className="h-8 text-xs bg-white font-semibold"
                                                                                value={mod.priceAdjustment}
                                                                                onChange={(e) => updateModifierRow(idx, 'priceAdjustment', parseFloat(e.target.value) || 0)} />
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </>
                                                        ) : (
                                                            <div className="flex items-center justify-between rounded-md border border-primary/20 bg-primary/5 px-3 py-2">
                                                                <span className="text-xs font-medium text-slate-500">{getText("السعر النهائي", "Final Price")}</span>
                                                                <span className="text-sm font-bold text-primary">
                                                                    {linkedProduct ? formatCurrency(linkedProductPrice, currency) : "-"}
                                                                </span>
                                                            </div>
                                                        )}

                                                        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200">
                                                            <button type="button" onClick={() => updateModifierRow(idx, 'isFree', !mod.isFree)}
                                                                className={`px-2.5 py-1 rounded-md text-[10px] font-semibold border transition-colors ${
                                                                    mod.isFree ? "bg-green-50 border-green-200 text-green-600" : "bg-white border-slate-200 text-slate-400"}`}>
                                                                {mod.isFree ? t("free") : t("paid")}
                                                            </button>

                                                            {mod.isFree && (
                                                                <div className="flex items-center gap-1">
                                                                    <span className="text-[10px] text-slate-400">{t("freeLimit")}</span>
                                                                    <Input className="h-7 text-xs w-14 bg-white" type="number" min={0}
                                                                        value={mod.freeQuantityLimit}
                                                                        onChange={(e) => updateModifierRow(idx, 'freeQuantityLimit', parseInt(e.target.value) || 0)} />
                                                                </div>
                                                            )}

                                                            {mod.isFree && form.displayType === 2 && (
                                                                <div className="flex items-center gap-1">
                                                                    <span className="text-[10px] text-slate-400">{t("maxQty")}</span>
                                                                    <Input className="h-7 text-xs w-14 bg-white" type="number" min={0}
                                                                        value={mod.maxQuantity}
                                                                        onChange={(e) => updateModifierRow(idx, 'maxQuantity', parseInt(e.target.value) || 0)} />
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-3 shrink-0">
                        <Button variant="outline" onClick={() => setDialogOpen(false)} className="rounded-lg px-5">{t("cancel")}</Button>
                        <Button onClick={handleSave} disabled={saving} className="rounded-lg px-6 font-semibold">
                            {saving ? t("savingText") : editingGroup ? t("editGroup") : t("createGroup")}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}

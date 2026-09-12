"use client"

import { useEffect, useState } from "react"
import { AlertCircle, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { StandardFilter, type StandardFilterOption } from "@/components/filters/StandardFilter"
import { useLocale } from "@/components/locale-provider"
import {
    createBranchConfiguration,
    deleteBranchConfiguration,
    getBranchConfigurationOptions,
    getBranchConfigurations,
    updateBranchConfiguration,
    type BranchConfigurationOption,
    type BranchProductConfiguration,
} from "@/lib/api-branch-configurations"

interface ProductBranchAssignmentsTabProps {
    productId?: string | null
}

type ApiError = {
    response?: {
        data?: {
            message?: string
            errors?: Record<string, string[]>
        }
    }
}

export default function ProductBranchAssignmentsTab({ productId }: ProductBranchAssignmentsTabProps) {
    const { locale } = useLocale()
    const ar = locale === "ar"
    const [branches, setBranches] = useState<BranchConfigurationOption[]>([])
    const [assignments, setAssignments] = useState<BranchProductConfiguration[]>([])
    const [selectedBranchIds, setSelectedBranchIds] = useState<string[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [savingRowId, setSavingRowId] = useState<string | null>(null)
    const [isAssigning, setIsAssigning] = useState(false)
    const [reloadToken, setReloadToken] = useState(0)

    const text = (en: string, arText: string) => ar ? arText : en

    useEffect(() => {
        if (!productId) {
            setBranches([])
            setAssignments([])
            setSelectedBranchIds([])
            setError(null)
            return
        }

        const loadAssignments = async () => {
            setIsLoading(true)
            setError(null)
            try {
                const [options, page] = await Promise.all([
                    getBranchConfigurationOptions(),
                    getBranchConfigurations<BranchProductConfiguration>("products", {
                        productId,
                        page: 1,
                        pageSize: 200,
                    }),
                ])
                setBranches(options.branches)
                setAssignments(page.items)
            } catch (loadError) {
                const fallback = ar ? "تعذر تحميل فروع المنتج." : "Failed to load branch assignments."
                setError(getErrorMessage(loadError, fallback))
            } finally {
                setIsLoading(false)
            }
        }

        void loadAssignments()
    }, [productId, reloadToken, ar])

    const handleAssign = async () => {
        if (!productId || selectedBranchIds.length === 0) return

        setIsAssigning(true)
        try {
            const created = await Promise.all(selectedBranchIds.map((branchId) =>
                createBranchConfiguration<BranchProductConfiguration>("products", {
                    branchId,
                    productId,
                    isAvailable: true,
                    isVisible: true,
                    displayOrder: 0,
                })
            ))
            setAssignments((current) => [...current, ...created].sort(sortAssignments))
            setSelectedBranchIds([])
            toast.success(text("Product assigned to selected branches.", "تم ربط المنتج بالفروع المحددة."))
        } catch (assignError) {
            toast.error(getErrorMessage(assignError, text("Failed to assign branch.", "تعذر ربط الفرع.")))
        } finally {
            setIsAssigning(false)
        }
    }

    const handleUpdate = async (
        row: BranchProductConfiguration,
        patch: Partial<Pick<BranchProductConfiguration, "isAvailable" | "isVisible" | "displayOrder">>
    ) => {
        setSavingRowId(row.id)
        try {
            const updated = await updateBranchConfiguration<BranchProductConfiguration>("products", row.id, {
                branchId: row.branchId,
                productId: row.productId,
                isAvailable: patch.isAvailable ?? row.isAvailable,
                isVisible: patch.isVisible ?? row.isVisible,
                displayOrder: patch.displayOrder ?? row.displayOrder,
            })
            setAssignments((current) => current.map((item) => item.id === updated.id ? updated : item).sort(sortAssignments))
            toast.success(text("Branch product updated.", "تم تحديث إعداد الفرع."))
        } catch (updateError) {
            toast.error(getErrorMessage(updateError, text("Failed to update branch product.", "تعذر تحديث إعداد الفرع.")))
        } finally {
            setSavingRowId(null)
        }
    }

    const handleDisplayOrderBlur = async (row: BranchProductConfiguration, value: string) => {
        const nextOrder = Number.parseInt(value, 10)
        if (!Number.isFinite(nextOrder) || nextOrder < 0) {
            toast.error(text("Display order must be zero or greater.", "يجب أن يكون ترتيب العرض صفرًا أو أكثر."))
            return
        }

        if (nextOrder === row.displayOrder) return
        await handleUpdate(row, { displayOrder: nextOrder })
    }

    const handleRemove = async (row: BranchProductConfiguration) => {
        const message = text("Remove this product from the branch?", "هل تريد إزالة هذا المنتج من الفرع؟")
        if (!confirm(message)) return

        setSavingRowId(row.id)
        try {
            await deleteBranchConfiguration("products", row.id)
            setAssignments((current) => current.filter((item) => item.id !== row.id))
            toast.success(text("Product removed from branch.", "تمت إزالة المنتج من الفرع."))
        } catch (removeError) {
            toast.error(getErrorMessage(removeError, text("Failed to remove branch assignment.", "تعذرت إزالة ربط الفرع.")))
        } finally {
            setSavingRowId(null)
        }
    }

    const assignedBranchIds = new Set(assignments.map((assignment) => assignment.branchId))
    const unassignedBranches = branches.filter((branch) => !assignedBranchIds.has(branch.id))
    const branchOptions = unassignedBranches.map((branch) => branchToFilterOption(branch, ar))

    if (!productId) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">{text("Branch Availability", "توفر المنتج حسب الفرع")}</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">
                        {text("Save the product before assigning it to branches.", "احفظ المنتج قبل ربطه بالفروع.")}
                    </p>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-lg">{text("Branch Availability", "توفر المنتج حسب الفرع")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
                    </div>
                ) : error ? (
                    <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4">
                        <p className="flex items-center gap-2 text-sm font-medium text-destructive">
                            <AlertCircle className="h-4 w-4" />
                            {error}
                        </p>
                        <Button variant="outline" size="sm" className="mt-3" onClick={() => setReloadToken((current) => current + 1)}>
                            {text("Retry", "إعادة المحاولة")}
                        </Button>
                    </div>
                ) : (
                    <>
                        <div className="flex flex-col gap-2 rounded-md border bg-muted/20 p-3 sm:flex-row sm:items-end">
                            <div className="min-w-0 flex-1 space-y-1">
                                <Label>{text("Assign to Branch", "ربط بفرع")}</Label>
                                <StandardFilter
                                    multiple
                                    values={selectedBranchIds}
                                    onValuesChange={setSelectedBranchIds}
                                    options={branchOptions}
                                    placeholder={text("Select branches", "اختر الفروع")}
                                    searchPlaceholder={text("Search branches...", "ابحث عن الفروع...")}
                                    emptyText={text("No active branches available", "لا توجد فروع فعالة متاحة")}
                                    loadingText={text("Loading...", "جار التحميل...")}
                                    clearLabel={text("Clear all", "مسح الكل")}
                                    selectAllLabel={text("Select all", "تحديد الكل")}
                                    disabled={isAssigning || unassignedBranches.length === 0}
                                    maxMenuHeightClassName="max-h-72"
                                />
                            </div>
                            <Button onClick={handleAssign} disabled={selectedBranchIds.length === 0 || isAssigning}>
                                <Plus className="me-2 h-4 w-4" />
                                {text("Assign", "ربط")}
                            </Button>
                        </div>

                        {assignments.length === 0 ? (
                            <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                                {text("This product is not assigned to any branch yet.", "هذا المنتج غير مرتبط بأي فرع حتى الآن.")}
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {assignments.map((row) => {
                                    const isSaving = savingRowId === row.id
                                    return (
                                        <div key={row.id} className="rounded-md border p-3">
                                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                                <div>
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <span className="font-medium">{ar ? row.branchNameAr || row.branchName : row.branchName}</span>
                                                        <Badge variant="outline">{row.branchCode}</Badge>
                                                    </div>
                                                    <p className="text-xs text-muted-foreground">
                                                        {text("Configuration only. Product price remains global.", "إعداد فقط. يبقى سعر المنتج عامًا.")}
                                                    </p>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="self-end text-muted-foreground hover:text-destructive sm:self-auto"
                                                    disabled={isSaving}
                                                    onClick={() => handleRemove(row)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>

                                            <div className="mt-3 grid gap-3 sm:grid-cols-3">
                                                <label className="flex items-center justify-between gap-3 rounded-md border bg-background px-3 py-2 text-sm">
                                                    <span>{text("Available", "متاح")}</span>
                                                    <Switch
                                                        checked={row.isAvailable}
                                                        disabled={isSaving}
                                                        onCheckedChange={(checked) => handleUpdate(row, { isAvailable: checked })}
                                                    />
                                                </label>
                                                <label className="flex items-center justify-between gap-3 rounded-md border bg-background px-3 py-2 text-sm">
                                                    <span>{text("Visible", "ظاهر")}</span>
                                                    <Switch
                                                        checked={row.isVisible}
                                                        disabled={isSaving}
                                                        onCheckedChange={(checked) => handleUpdate(row, { isVisible: checked })}
                                                    />
                                                </label>
                                                <div className="space-y-1">
                                                    <Label className="text-xs">{text("Display Order", "ترتيب العرض")}</Label>
                                                    <Input
                                                        key={`${row.id}-${row.displayOrder}`}
                                                        type="number"
                                                        min={0}
                                                        defaultValue={row.displayOrder}
                                                        disabled={isSaving}
                                                        onBlur={(event) => handleDisplayOrderBlur(row, event.target.value)}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </>
                )}
            </CardContent>
        </Card>
    )
}

function getBranchName(branch: BranchConfigurationOption, ar: boolean): string {
    return ar ? branch.nameAr || branch.name : branch.name
}

function branchToFilterOption(branch: BranchConfigurationOption, ar: boolean): StandardFilterOption {
    return {
        value: branch.id,
        label: branch.code ? `${getBranchName(branch, ar)} · ${branch.code}` : getBranchName(branch, ar),
        description: branch.secondaryLabel,
        disabled: !branch.isActive,
        searchText: `${branch.name} ${branch.nameAr ?? ""} ${branch.code ?? ""}`,
    }
}

function sortAssignments(a: BranchProductConfiguration, b: BranchProductConfiguration): number {
    const branchCompare = a.branchName.localeCompare(b.branchName)
    if (branchCompare !== 0) return branchCompare
    return a.displayOrder - b.displayOrder
}

function getErrorMessage(error: unknown, fallback: string): string {
    const apiError = error as ApiError
    const message = apiError.response?.data?.message
    if (message) return message

    const errors = apiError.response?.data?.errors
    const firstField = errors ? Object.keys(errors)[0] : null
    if (firstField && errors?.[firstField]?.[0]) return errors[firstField][0]

    return error instanceof Error && error.message ? error.message : fallback
}

"use client"

import React, { useState, useEffect } from "react"
import { Save, Clock, Calendar, Phone, MapPin, Building2, Star, Trash2, Plus, RefreshCw } from "lucide-react"
import { toast } from "sonner"
import { usePosStore } from "@/store/posStore"
import { formatCurrency } from "@/lib/currencies"
import { HrApi } from "@/lib/api-hr"
import { getBranches, getBranchName, type BranchDto } from "@/lib/api-branches"
import {
    assignUserBranch,
    getUserBranchAssignments,
    removeUserBranch,
    setUserDefaultBranch,
    type UserBranchAssignment,
} from "@/lib/api-user-branches"
import { useLocale } from "@/components/locale-provider"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Checkbox } from "@/components/ui/checkbox"

interface StaffSheetProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess: () => void
    editStaff?: StaffSheetEditStaff | null
}

interface StaffTimeEntry {
    date: string
    clockIn: string
    clockOut?: string | null
}

interface StaffSheetEditStaff {
    employeeId?: string
    userId?: string
    username?: string | null
    fullName?: string | null
    fullNameAr?: string | null
    role?: number
    canApplyDiscount?: boolean
    staffNo?: string | null
    phone?: string | null
    address?: string | null
    photoUrl?: string | null
    bloodType?: number | null
    contractStatus?: number | null
    startDate?: string | null
    netSalary?: number | null
    sgkPremium?: number | null
    weeklyShiftPattern?: string | null
    timeEntries?: StaffTimeEntry[]
}

const BLOOD_TYPES = [
    { value: 0, labelKey: "unknownLabel" },
    { value: 1, label: "A+" },
    { value: 2, label: "A-" },
    { value: 3, label: "B+" },
    { value: 4, label: "B-" },
    { value: 5, label: "AB+" },
    { value: 6, label: "AB-" },
    { value: 7, label: "O+" },
    { value: 8, label: "O-" },
] as const

const CONTRACT_STATUS = [
    { value: 0, labelKey: "staffContractPending", color: "bg-warning/10 text-warning" },
    { value: 1, labelKey: "staffContractSigned", color: "bg-success/10 text-success" },
    { value: 2, labelKey: "staffContractTerminated", color: "bg-destructive/10 text-destructive" },
] as const

// Must mirror backend UserRole enum exactly (Admin=0, Waiter=1, Kitchen=2,
// Cashier=3, TrackerPickup=4, Manager=5). A misaligned value here made the
// dropdown render the wrong option (e.g. an Admin showing as "Manager") and
// dropped Manager entirely, so Manager employees bound to no item.
const ROLES = [
    { value: 0, labelKey: "roleAdmin" },
    { value: 8, labelKey: "roleSuperAdmin" },
    { value: 1, labelKey: "roleWaiter" },
    { value: 2, labelKey: "roleKitchen" },
    { value: 3, labelKey: "roleCashier" },
    { value: 4, labelKey: "roleTrackerPickup" },
    { value: 5, labelKey: "roleManager" },
    { value: 7, labelKey: "roleMarketing" },
] as const

const PASSWORD_MISMATCH_KEY = "passwordsDoNotMatch"

function buildStaffNoPreview(value: string) {
    const seed = value.trim()
        ? value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase()
        : "STAFF"
    const prefix = (seed || "STAFF").slice(0, 10)
    return `${prefix}-AUTO`
}

function getBranchErrorMessage(error: unknown, fallback: string) {
    const data = getErrorData(error)
    if (data) {
        const fieldMessage = getFirstFieldError(data)
        if (fieldMessage) return fieldMessage
        if (typeof data.message === "string" && data.message.trim()) return data.message
        if (typeof data.error === "string" && data.error.trim()) return data.error
    }

    if (error instanceof Error && error.message.trim()) return error.message
    return fallback
}

function getErrorData(error: unknown): { message?: unknown; error?: unknown; errors?: unknown } | null {
    if (!error || typeof error !== "object") return null
    const response = (error as { response?: { data?: unknown } }).response
    if (response?.data && typeof response.data === "object") {
        return response.data as { message?: unknown; error?: unknown; errors?: unknown }
    }

    if (error instanceof Error && error.message.trim().startsWith("{")) {
        try {
            const parsed = JSON.parse(error.message)
            return parsed && typeof parsed === "object"
                ? parsed as { message?: unknown; error?: unknown; errors?: unknown }
                : null
        } catch {
            return null
        }
    }

    return null
}

function getFirstFieldError(data: { errors?: unknown }) {
    if (!data.errors || typeof data.errors !== "object") return null
    for (const value of Object.values(data.errors)) {
        if (Array.isArray(value) && typeof value[0] === "string") return value[0]
    }
    return null
}

export default function StaffSheet({ open, onOpenChange, onSuccess, editStaff }: StaffSheetProps) {
    const currency = usePosStore((s) => s.currency)
    const { t, locale } = useLocale()
    // Tab 1: Personal Info & Contact
    const [fullName, setFullName] = useState("")
    const [fullNameAr, setFullNameAr] = useState("")
    const [photoUrl, setPhotoUrl] = useState("")
    const [phone, setPhone] = useState("")
    const [address, setAddress] = useState("")
    const [bloodType, setBloodType] = useState(0)
    const [contractStatus, setContractStatus] = useState(0)
    const [startDate, setStartDate] = useState("")

    // Tab 2: Login Details
    const [username, setUsername] = useState("")
    const [password, setPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [staffNo, setStaffNo] = useState("")
    const [role, setRole] = useState(1)
    const [canApplyDiscount, setCanApplyDiscount] = useState(false)

    // Tab 3: Salary & Timesheet
    const [netSalary, setNetSalary] = useState("")
    const [sgkPremium, setSgkPremium] = useState("")
    const [weeklyShiftPattern, setWeeklyShiftPattern] = useState("")
    const [timeEntries, setTimeEntries] = useState<StaffTimeEntry[]>([])
    const [branchAssignments, setBranchAssignments] = useState<UserBranchAssignment[]>([])
    const [activeBranches, setActiveBranches] = useState<BranchDto[]>([])
    const [selectedBranchId, setSelectedBranchId] = useState("")
    const [assignAsDefault, setAssignAsDefault] = useState(false)
    const [replacementDefaultId, setReplacementDefaultId] = useState("")
    const [branchLoading, setBranchLoading] = useState(false)
    const [branchSaving, setBranchSaving] = useState(false)
    const [branchRefreshKey, setBranchRefreshKey] = useState(0)

    function resetForm() {
        setFullName("")
        setFullNameAr("")
        setPhotoUrl("")
        setPhone("")
        setAddress("")
        setBloodType(0)
        setContractStatus(0)
        setStartDate("")
        setUsername("")
        setPassword("")
        setConfirmPassword("")
        setStaffNo("")
        setRole(1)
        setCanApplyDiscount(false)
        setNetSalary("")
        setSgkPremium("")
        setWeeklyShiftPattern("")
        setTimeEntries([])
        setBranchAssignments([])
        setActiveBranches([])
        setSelectedBranchId("")
        setAssignAsDefault(false)
        setReplacementDefaultId("")
    }

    useEffect(() => {
        if (!open) return

        let cancelled = false
        queueMicrotask(() => {
            if (cancelled) return

            if (editStaff) {
                setFullName(editStaff.fullName || "")
                setFullNameAr(editStaff.fullNameAr || "")
                setPhotoUrl(editStaff.photoUrl || "")
                setPhone(editStaff.phone || "")
                setAddress(editStaff.address || "")
                setBloodType(editStaff.bloodType || 0)
                setContractStatus(editStaff.contractStatus || 0)
                setStartDate(editStaff.startDate ? String(editStaff.startDate).slice(0, 10) : "")
                setUsername(editStaff.username || "")
                setPassword("")
                setConfirmPassword("")
                setStaffNo(editStaff.staffNo || "")
                // `?? 1` not `|| 1`: Admin's role is 0, and `0 || 1` is falsy-coerced
                // to 1 (Waiter) — that bug forced every Admin to display as Waiter.
                setRole(editStaff.role ?? 1)
                setCanApplyDiscount(editStaff.canApplyDiscount ?? false)
                setNetSalary(editStaff.netSalary?.toString() || "")
                setSgkPremium(editStaff.sgkPremium?.toString() || "")
                setWeeklyShiftPattern(editStaff.weeklyShiftPattern || "")
                setTimeEntries(editStaff.timeEntries || [])
                return
            }

            resetForm()
        })

        return () => {
            cancelled = true
        }
    }, [editStaff, open])

    useEffect(() => {
        const userId = editStaff?.userId
        if (!open || !userId) {
            queueMicrotask(() => {
                setBranchAssignments([])
                setActiveBranches([])
                setSelectedBranchId("")
                setReplacementDefaultId("")
            })
            return
        }

        let cancelled = false

        const loadBranchAccess = async () => {
            setBranchLoading(true)
            try {
                const [assignmentPage, branchPage] = await Promise.all([
                    getUserBranchAssignments(userId),
                    getBranches({ page: 1, pageSize: 200, isActive: true }),
                ])
                if (cancelled) return
                setBranchAssignments(assignmentPage.assignments ?? [])
                setActiveBranches(branchPage.items ?? [])
                setSelectedBranchId("")
                setAssignAsDefault(false)
                setReplacementDefaultId("")
            } catch (error: unknown) {
                if (!cancelled) toast.error(getBranchErrorMessage(error, locale === "ar" ? "تعذر تحميل فروع المستخدم" : "Could not load user branches"))
            } finally {
                if (!cancelled) setBranchLoading(false)
            }
        }

        void loadBranchAccess()
        return () => {
            cancelled = true
        }
    }, [branchRefreshKey, editStaff?.userId, locale, open])

    const handleSave = async () => {
        if (!fullName || !username) {
            toast.warning(t("staffFullNameUsernameRequired"))
            return
        }

        const isUpdatingPassword = !!editStaff && (!!password || !!confirmPassword)

        if (!editStaff && !password) {
            toast.warning(t("staffPasswordRequired"))
            return
        }

        if (editStaff && confirmPassword && !password) {
            toast.warning(t("staffNewPasswordRequired"))
            return
        }

        if ((!editStaff || isUpdatingPassword) && !confirmPassword) {
            toast.warning(editStaff ? t("staffConfirmNewPasswordRequired") : t("staffConfirmPasswordRequired"))
            return
        }

        if ((!editStaff || isUpdatingPassword) && password !== confirmPassword) {
            toast.error(t(PASSWORD_MISMATCH_KEY))
            return
        }

        const num = (s: string) => (s ? parseFloat(s) : 0)
        const net = num(netSalary)
        const sgk = num(sgkPremium)
        // Gross monthly cost — what the company pays — mirrored to User.MonthlySalary so payroll
        // analytics and the staff list reflect the contracted amount.
        const gross = net + sgk

        try {
            if (editStaff?.employeeId) {
                await HrApi.updateEmployee(editStaff.employeeId, {
                    fullName,
                    fullNameAr: fullNameAr || null,
                    role,
                    canApplyDiscount,
                    password: password || null,
                    staffNo: staffNo || null,
                    bloodType,
                    phone: phone || null,
                    address: address || null,
                    photoUrl: photoUrl || null,
                    startDate: startDate || null,
                    contractStatus,
                    monthlySalary: gross,
                    netSalary: net,
                    sgkPremium: sgk,
                    weeklyShiftPattern: weeklyShiftPattern || null,
                })
                toast.success(t("employeeUpdated"))
            } else {
                await HrApi.createEmployee({
                    username,
                    password: password!,
                    fullName,
                    fullNameAr: fullNameAr || null,
                    role,
                    canApplyDiscount,
                    staffNo: null,
                    bloodType,
                    phone: phone || null,
                    address: address || null,
                    photoUrl: photoUrl || null,
                    startDate: startDate || null,
                    contractStatus,
                    monthlySalary: gross,
                    netSalary: net,
                    sgkPremium: sgk,
                    hourlyWage: 0,
                    commissionRate: 0,
                    weeklyShiftPattern: weeklyShiftPattern || null,
                })
                toast.success(t("employeeHired"))
            }

            onSuccess()
            onOpenChange(false)
        } catch (error: unknown) {
            const apiError = error as { response?: { data?: { message?: string } }, message?: string }
            const msg = apiError.response?.data?.message ?? apiError.message ?? t("anErrorOccurred")
            toast.error(msg)
        }
    }

    const branchText = {
        tab: locale === "ar" ? "الفروع" : "Branches",
        title: locale === "ar" ? "وصول الفروع" : "Branch access",
        assign: locale === "ar" ? "إضافة فرع" : "Assign branch",
        assignAsDefault: locale === "ar" ? "تعيينه كافتراضي" : "Set as default",
        selectBranch: locale === "ar" ? "اختر فرعًا" : "Select branch",
        assigned: locale === "ar" ? "الفروع المسندة" : "Assigned branches",
        default: locale === "ar" ? "افتراضي" : "Default",
        inactive: locale === "ar" ? "غير فعال" : "Inactive",
        active: locale === "ar" ? "فعال" : "Active",
        setDefault: locale === "ar" ? "تعيين كافتراضي" : "Set default",
        remove: locale === "ar" ? "إزالة" : "Remove",
        replacement: locale === "ar" ? "الافتراضي البديل" : "Replacement default",
        noAssignments: locale === "ar" ? "لا توجد فروع مسندة" : "No branches assigned",
        noBranches: locale === "ar" ? "لا توجد فروع فعالة متاحة" : "No active branches available",
        saveFirst: locale === "ar" ? "احفظ المستخدم أولاً لإدارة الفروع." : "Save the user first to manage branches.",
        loadedError: locale === "ar" ? "تعذر تحميل فروع المستخدم" : "Could not load user branches",
        saved: locale === "ar" ? "تم تحديث فروع المستخدم" : "User branches updated",
        selectRequired: locale === "ar" ? "اختر فرعًا أولاً" : "Select a branch first",
        replacementRequired: locale === "ar" ? "اختر فرعًا افتراضيًا بديلًا أولاً" : "Select a replacement default branch first",
        inactiveDefault: locale === "ar" ? "لا يمكن تعيين فرع غير فعال كافتراضي" : "Inactive branches cannot become default",
        loading: locale === "ar" ? "جاري التحميل..." : "Loading...",
        refresh: locale === "ar" ? "تحديث" : "Refresh",
    }

    const assignedBranchIds = new Set(branchAssignments.map((assignment) => assignment.branchId))
    const availableBranchOptions = activeBranches.filter((branch) => !assignedBranchIds.has(branch.id))
    const replacementOptions = branchAssignments.filter((assignment) => !assignment.isDefault && assignment.branchIsActive)

    const handleAssignBranch = async () => {
        const userId = editStaff?.userId
        if (!userId) return
        if (!selectedBranchId) {
            toast.warning(branchText.selectRequired)
            return
        }

        setBranchSaving(true)
        try {
            const next = await assignUserBranch(userId, selectedBranchId, assignAsDefault)
            setBranchAssignments(next.assignments ?? [])
            setSelectedBranchId("")
            setAssignAsDefault(false)
            setReplacementDefaultId("")
            toast.success(branchText.saved)
        } catch (error: unknown) {
            toast.error(getBranchErrorMessage(error, t("anErrorOccurred")))
        } finally {
            setBranchSaving(false)
        }
    }

    const handleSetDefaultBranch = async (assignment: UserBranchAssignment) => {
        const userId = editStaff?.userId
        if (!userId || assignment.isDefault) return
        if (!assignment.branchIsActive) {
            toast.warning(branchText.inactiveDefault)
            return
        }

        setBranchSaving(true)
        try {
            const next = await setUserDefaultBranch(userId, assignment.branchId)
            setBranchAssignments(next.assignments ?? [])
            setReplacementDefaultId("")
            toast.success(branchText.saved)
        } catch (error: unknown) {
            toast.error(getBranchErrorMessage(error, t("anErrorOccurred")))
        } finally {
            setBranchSaving(false)
        }
    }

    const handleRemoveBranch = async (assignment: UserBranchAssignment) => {
        const userId = editStaff?.userId
        if (!userId) return
        if (assignment.isDefault && !replacementDefaultId) {
            toast.warning(branchText.replacementRequired)
            return
        }

        setBranchSaving(true)
        try {
            const next = await removeUserBranch(
                userId,
                assignment.branchId,
                assignment.isDefault ? replacementDefaultId : undefined
            )
            setBranchAssignments(next.assignments ?? [])
            setReplacementDefaultId("")
            toast.success(branchText.saved)
        } catch (error: unknown) {
            toast.error(getBranchErrorMessage(error, t("anErrorOccurred")))
        } finally {
            setBranchSaving(false)
        }
    }

    const getAssignmentBranchName = (assignment: UserBranchAssignment) =>
        locale === "ar" ? assignment.branchNameAr || assignment.branchName : assignment.branchName

    const formatDate = (dateString: string) => {
        if (!dateString) return "-"
        return new Intl.DateTimeFormat(locale === "ar" ? "ar" : "en-US", {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(new Date(dateString))
    }

    const calculateTotalHours = (clockIn?: string | null, clockOut?: string | null) => {
        if (!clockIn || !clockOut) return 0
        const diff = new Date(clockOut).getTime() - new Date(clockIn).getTime()
        return (diff / (1000 * 60 * 60)).toFixed(1)
    }

    const passwordMismatch = (!editStaff || !!password || !!confirmPassword) && !!confirmPassword && password !== confirmPassword
    const generatedStaffNo = staffNo || buildStaffNoPreview(username || fullName)

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-full max-w-full overflow-y-auto p-0 sm:max-w-3xl">
                <SheetHeader>
                    <SheetTitle className="flex items-center gap-2">
                        <span className="text-2xl">👤</span>
                        {editStaff ? t("editStaff") : t("hireNewStaff")}
                    </SheetTitle>
                    <SheetDescription>
                        {t("staffSheetDesc")}
                    </SheetDescription>
                </SheetHeader>

                <Tabs defaultValue="profile" className="mt-6">
                    <TabsList className="grid h-auto w-full grid-cols-1 gap-1 sm:grid-cols-4">
                        <TabsTrigger value="profile" className="min-h-10 px-2 text-xs sm:text-sm">👤 {t("tabPersonalInfoContact")}</TabsTrigger>
                        <TabsTrigger value="login" className="min-h-10 px-2 text-xs sm:text-sm">🔐 {t("tabLoginDetails")}</TabsTrigger>
                        <TabsTrigger value="payroll" className="min-h-10 px-2 text-xs sm:text-sm">💰 {t("tabSalaryTimesheet")}</TabsTrigger>
                        <TabsTrigger value="branches" disabled={!editStaff?.userId} className="min-h-10 px-2 text-xs sm:text-sm">
                            <Building2 className="me-1 h-4 w-4" /> {branchText.tab}
                        </TabsTrigger>
                    </TabsList>

                    {/* TAB 1: Personal Info & Contact */}
                    <TabsContent value="profile" className="space-y-4 mt-4">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">{t("personalInformationTitle")}</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {/* Avatar */}
                                <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                                    <Avatar className="h-20 w-20">
                                        <AvatarImage src={photoUrl} />
                                        <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-600 text-white text-2xl">
                                            {fullName.charAt(0) || "?"}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="w-full flex-1 space-y-2">
                                        <Label htmlFor="photo">{t("photoUrlLabel")}</Label>
                                        <Input
                                            id="photo"
                                            value={photoUrl}
                                            onChange={(e) => setPhotoUrl(e.target.value)}
                                            placeholder={t("photoUrlPlaceholder")}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="fullName">{t("fullNameRequiredLabel")}</Label>
                                    <Input
                                        id="fullName"
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        placeholder={t("fullNamePlaceholder")}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="fullNameAr">{t("arabicNameLabel")}</Label>
                                    <Input
                                        id="fullNameAr"
                                        value={fullNameAr}
                                        onChange={(e) => setFullNameAr(e.target.value)}
                                        placeholder={t("arabicNamePlaceholder")}
                                        dir="rtl"
                                    />
                                </div>

                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="phone">{t("phoneNumber")}</Label>
                                        <div className="relative">
                                            <Phone className="absolute start-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                id="phone"
                                                value={phone}
                                                onChange={(e) => setPhone(e.target.value)}
                                                placeholder="0555 123 45 67"
                                                className="ps-10"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="bloodType">{t("bloodTypeLabel")}</Label>
                                        <Select value={bloodType.toString()} onValueChange={(val) => setBloodType(parseInt(val))}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {BLOOD_TYPES.map((bt) => (
                                                    <SelectItem key={bt.value} value={bt.value.toString()}>
                                                        {"labelKey" in bt ? t(bt.labelKey) : bt.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3 rounded-lg border p-3">
                                    <Checkbox
                                        id="canApplyDiscount"
                                        checked={canApplyDiscount}
                                        onCheckedChange={(checked) => setCanApplyDiscount(checked === true)}
                                    />
                                    <div className="space-y-1">
                                        <Label htmlFor="canApplyDiscount">
                                            {locale === "ar" ? "السماح بتطبيق الخصم" : "Can apply discounts"}
                                        </Label>
                                        <p className="text-xs text-muted-foreground">
                                            {locale === "ar"
                                                ? "يسمح للمستخدم بإضافة الخصم أو تعديله أو إزالته أثناء الدفع."
                                                : "Allows this user to add, edit, or remove an order discount during payment."}
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="address">{t("address")}</Label>
                                    <div className="relative">
                                        <MapPin className="absolute start-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            id="address"
                                            value={address}
                                            onChange={(e) => setAddress(e.target.value)}
                                            placeholder={t("fullAddressPlaceholder")}
                                            className="ps-10"
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">{t("employmentDetailsTitle")}</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="startDate">{t("startDateLabel")}</Label>
                                        <Input
                                            id="startDate"
                                            type="date"
                                            value={startDate}
                                            onChange={(e) => setStartDate(e.target.value)}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="contractStatus">{t("contractStatusLabel")}</Label>
                                        <Select value={contractStatus.toString()} onValueChange={(val) => setContractStatus(parseInt(val))}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {CONTRACT_STATUS.map((cs) => (
                                                    <SelectItem key={cs.value} value={cs.value.toString()}>
                                                        {t(cs.labelKey)}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* TAB 2: Login Details */}
                    <TabsContent value="login" className="space-y-4 mt-4">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">{t("systemLoginDetailsTitle")}</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="username">{t("usernameRequiredLabel")}</Label>
                                    <Input
                                        id="username"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        placeholder="emre.aksoy"
                                        disabled={!!editStaff}
                                    />
                                    {editStaff && (
                                        <p className="text-xs text-muted-foreground">
                                            {t("usernameCannotBeChanged")}
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="password">{editStaff ? t("newPasswordLabel") : t("passwordRequiredLabel")}</Label>
                                        <Input
                                            id="password"
                                            type="password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder={editStaff ? t("keepCurrentPasswordPlaceholder") : t("securePasswordPlaceholder")}
                                            required={!editStaff}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="confirmPassword">
                                            {editStaff ? t("confirmNewPasswordLabel") : t("confirmPasswordRequiredLabel")}
                                        </Label>
                                        <Input
                                            id="confirmPassword"
                                            type="password"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            placeholder={editStaff ? t("confirmNewPasswordPlaceholder") : t("confirmPasswordPlaceholder")}
                                            required={!editStaff || !!password}
                                            aria-invalid={passwordMismatch}
                                            aria-describedby={passwordMismatch ? "confirmPassword-error" : undefined}
                                        />
                                        {passwordMismatch && (
                                            <p id="confirmPassword-error" className="text-xs text-destructive">
                                                {t(PASSWORD_MISMATCH_KEY)}
                                            </p>
                                        )}
                                        {editStaff && (
                                            <p className="text-xs text-muted-foreground">
                                                {t("keepPasswordHint")}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="staffNo">{t("staffNoLabel")}</Label>
                                        <Input
                                            id="staffNo"
                                            value={generatedStaffNo}
                                            readOnly
                                            placeholder={t("autoGeneratedPlaceholder")}
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            {editStaff ? t("staffNoCannotEditHint") : t("staffNoGeneratedHint")}
                                        </p>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="role">{t("roleRequiredLabel")}</Label>
                                        <Select value={role.toString()} onValueChange={(val) => setRole(parseInt(val))}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {ROLES.map((r) => (
                                                    <SelectItem key={r.value} value={r.value.toString()}>
                                                        {t(r.labelKey)}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* TAB 3: Salary & Timesheet */}
                    <TabsContent value="payroll" className="space-y-4 mt-4">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">{t("payrollDetailsTitle")}</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="netSalary">{t("netSalaryLabel")} ({currency})</Label>
                                        <Input
                                            id="netSalary"
                                            type="number"
                                            step="0.01"
                                            value={netSalary}
                                            onChange={(e) => setNetSalary(e.target.value)}
                                            placeholder="0.00"
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            {t("netSalaryHint")}
                                        </p>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="sgkPremium">{t("sgkPremiumLabel")} ({currency})</Label>
                                        <Input
                                            id="sgkPremium"
                                            type="number"
                                            step="0.01"
                                            value={sgkPremium}
                                            onChange={(e) => setSgkPremium(e.target.value)}
                                            placeholder="0.00"
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            {t("sgkPremiumHint")}
                                        </p>
                                    </div>
                                </div>

                                {netSalary && sgkPremium && (
                                    <div className="p-4 bg-info/5 dark:bg-info/5 border border-info/20 dark:border-info/20 rounded-lg">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-medium text-info dark:text-info">
                                                {t("totalCostLabel")}
                                            </span>
                                            <span className="text-lg font-bold text-info/80 dark:text-info/80">
                                                {formatCurrency(parseFloat(netSalary) + parseFloat(sgkPremium), currency)}
                                            </span>
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <Label htmlFor="shiftPattern">{t("weeklyShiftScheduleLabel")}</Label>
                                    <Input
                                        id="shiftPattern"
                                        value={weeklyShiftPattern}
                                        onChange={(e) => setWeeklyShiftPattern(e.target.value)}
                                        placeholder={t("weeklyShiftPlaceholder")}
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        {t("weeklyShiftHint")}
                                    </p>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Timesheet History */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Clock className="h-5 w-5" />
                                    {t("thisMonthsTimesheet")}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {timeEntries.length === 0 ? (
                                    <p className="text-sm text-muted-foreground text-center py-6">
                                        {t("noTimesheetRecordsYet")}
                                    </p>
                                ) : (
                                    <div className="space-y-2">
                                        {timeEntries.map((entry, index) => (
                                            <div key={index} className="flex flex-col gap-3 rounded-lg bg-muted/50 p-3 sm:flex-row sm:items-center sm:justify-between">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 text-sm">
                                                        <Calendar className="h-4 w-4 text-muted-foreground" />
                                                        <span className="font-semibold">{formatDate(entry.date)}</span>
                                                    </div>
                                                    <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                                                        <span>{t("clockInShortLabel")}: {formatDate(entry.clockIn)}</span>
                                                        {entry.clockOut && (
                                                            <span>{t("clockOutShortLabel")}: {formatDate(entry.clockOut)}</span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="text-start sm:text-end">
                                                    <div className="font-bold text-lg">
                                                        {calculateTotalHours(entry.clockIn, entry.clockOut)}h
                                                    </div>
                                                    {!entry.clockOut && (
                                                        <Badge variant="outline" className="text-xs">{t("activeStatus")}</Badge>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="branches" className="space-y-4 mt-4">
                        {!editStaff?.userId ? (
                            <Card>
                                <CardContent className="py-8 text-center text-sm text-muted-foreground">
                                    {branchText.saveFirst}
                                </CardContent>
                            </Card>
                        ) : (
                            <>
                                <Card>
                                    <CardHeader className="flex flex-row items-center justify-between">
                                        <CardTitle className="flex items-center gap-2 text-lg">
                                            <Building2 className="h-5 w-5" />
                                            {branchText.title}
                                        </CardTitle>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setBranchRefreshKey((current) => current + 1)}
                                            disabled={branchLoading || branchSaving}
                                        >
                                            <RefreshCw className={`me-2 h-4 w-4 ${branchLoading ? "animate-spin" : ""}`} />
                                            {branchText.refresh}
                                        </Button>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                                            <Select value={selectedBranchId} onValueChange={setSelectedBranchId} disabled={branchLoading || branchSaving}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder={branchText.selectBranch} />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {availableBranchOptions.length === 0 ? (
                                                        <SelectItem value="none" disabled>{branchText.noBranches}</SelectItem>
                                                    ) : availableBranchOptions.map((branch) => (
                                                        <SelectItem key={branch.id} value={branch.id}>
                                                            {getBranchName(branch, locale === "ar")} · {branch.code}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <Button
                                                type="button"
                                                onClick={handleAssignBranch}
                                                disabled={branchSaving || branchLoading || !selectedBranchId || selectedBranchId === "none"}
                                            >
                                                <Plus className="me-2 h-4 w-4" />
                                                {branchText.assign}
                                            </Button>
                                        </div>

                                        <label className="flex items-start gap-3 rounded-lg border p-3 text-sm">
                                            <Checkbox
                                                checked={assignAsDefault}
                                                onCheckedChange={(checked) => setAssignAsDefault(checked === true)}
                                                disabled={branchSaving || branchLoading}
                                            />
                                            <span>{branchText.assignAsDefault}</span>
                                        </label>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-lg">{branchText.assigned}</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        {branchLoading ? (
                                            <p className="py-6 text-center text-sm text-muted-foreground">{branchText.loading}</p>
                                        ) : branchAssignments.length === 0 ? (
                                            <p className="py-6 text-center text-sm text-muted-foreground">{branchText.noAssignments}</p>
                                        ) : (
                                            <div className="space-y-3">
                                                {branchAssignments.map((assignment) => (
                                                    <div key={assignment.id} className="rounded-lg border p-3">
                                                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                                            <div className="min-w-0">
                                                                <div className="flex flex-wrap items-center gap-2">
                                                                    <span className="font-medium">{getAssignmentBranchName(assignment)}</span>
                                                                    <Badge variant="outline">{assignment.branchCode}</Badge>
                                                                    {assignment.isDefault && (
                                                                        <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300">
                                                                            <Star className="me-1 h-3 w-3" />
                                                                            {branchText.default}
                                                                        </Badge>
                                                                    )}
                                                                    <Badge variant={assignment.branchIsActive ? "secondary" : "outline"}>
                                                                        {assignment.branchIsActive ? branchText.active : branchText.inactive}
                                                                    </Badge>
                                                                </div>
                                                            </div>
                                                            <div className="flex flex-col gap-2 sm:flex-row">
                                                                <Button
                                                                    type="button"
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => handleSetDefaultBranch(assignment)}
                                                                    disabled={branchSaving || assignment.isDefault || !assignment.branchIsActive}
                                                                >
                                                                    <Star className="me-2 h-4 w-4" />
                                                                    {branchText.setDefault}
                                                                </Button>
                                                                <Button
                                                                    type="button"
                                                                    variant="destructive"
                                                                    size="sm"
                                                                    onClick={() => handleRemoveBranch(assignment)}
                                                                    disabled={branchSaving || (assignment.isDefault && !replacementDefaultId)}
                                                                >
                                                                    <Trash2 className="me-2 h-4 w-4" />
                                                                    {branchText.remove}
                                                                </Button>
                                                            </div>
                                                        </div>

                                                        {assignment.isDefault && branchAssignments.length > 1 && (
                                                            <div className="mt-3 max-w-sm">
                                                                <Label>{branchText.replacement}</Label>
                                                                <Select value={replacementDefaultId} onValueChange={setReplacementDefaultId} disabled={branchSaving}>
                                                                    <SelectTrigger className="mt-1">
                                                                        <SelectValue placeholder={branchText.replacement} />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        {replacementOptions.map((option) => (
                                                                            <SelectItem key={option.branchId} value={option.branchId}>
                                                                                {getAssignmentBranchName(option)} · {option.branchCode}
                                                                            </SelectItem>
                                                                        ))}
                                                                    </SelectContent>
                                                                </Select>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </>
                        )}
                    </TabsContent>
                </Tabs>

                <SheetFooter className="sticky bottom-0 mt-6 border-t bg-background/95 p-4 backdrop-blur sm:p-6">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        {t("cancel")}
                    </Button>
                    <Button onClick={handleSave} className="bg-primary text-primary-foreground hover:bg-primary/90">
                        <Save className="w-4 h-4 me-2" />
                        {editStaff ? t("updateStaff") : t("hireStaff")}
                    </Button>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    )
}

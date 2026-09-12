"use client"

import * as React from "react"
import { Users, DollarSign, Clock, TrendingUp, UserPlus, Edit2, Briefcase } from "lucide-react"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { api } from "@/lib/api"
import { HrApi } from "@/lib/api-hr"
import type { HrEmployeeListResponse, HrEmployeeDetail, HrTimesheet } from "@/types/hr"
import { UserRole } from "@/types/auth"
import StaffSheet from "@/components/admin/StaffSheet"
import { toast } from "sonner"
import { useLocale } from "@/components/locale-provider"
import { usePosStore } from "@/store/posStore"

interface StaffAnalytics {
    userId: string
    username: string
    fullName: string
    fullNameAr?: string | null
    role: string
    monthlySalary: number
    netSalary: number
    sgkPremium: number
    commissionRate: number
    totalWorkingHours: number
    totalOrders: number
    totalSales: number
    commissionEarned: number
}

export default function StaffPage() {
    const { t, locale } = useLocale()
    const { currency } = usePosStore()
    const [staff, setStaff] = React.useState<StaffAnalytics[]>([])
    const [loading, setLoading] = React.useState(true)
    const [sheetOpen, setSheetOpen] = React.useState(false)
    const [selectedStaff, setSelectedStaff] = React.useState<any | null>(null)
    const [editLoadingFor, setEditLoadingFor] = React.useState<string | null>(null)

    React.useEffect(() => {
        fetchStaff()
    }, [])

    const fetchStaff = async () => {
        try {
            const response = await api.get('/staff/analytics')
            setStaff(response.data)
        } catch (error) {
            console.error('Failed to fetch staff:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleNewStaff = () => {
        setSelectedStaff(null)
        setSheetOpen(true)
    }

    const handleEditStaff = async (staffMember: StaffAnalytics) => {
        if (editLoadingFor) return
        setEditLoadingFor(staffMember.userId)
        try {
            const list: HrEmployeeListResponse = await HrApi.listEmployees({ search: staffMember.username, pageSize: 50 })
            const item = list.items.find((e) => e.username === staffMember.username)
            if (!item) {
                toast.error("Employee not found in HR records")
                return
            }
            const detail: HrEmployeeDetail = await HrApi.getEmployee(item.employeeId)
            // Resolve role name → UserRole number deterministically. Reading the async
            // HR lookups and defaulting to "1" (Waiter) made the edit dropdown show
            // Waiter before the lookups had loaded, regardless of the real role.
            const resolved = UserRole[detail.role as keyof typeof UserRole]
            const roleNumber = typeof resolved === "number" ? resolved : UserRole.Waiter

            let timeEntries: { date: string; clockIn: string; clockOut?: string | null }[] = []
            try {
                const ts: HrTimesheet = await HrApi.employeeTimesheet(detail.employeeId)
                timeEntries = ts.days
                    .filter((d) => d.checkInAt)
                    .map((d) => ({ date: d.date, clockIn: d.checkInAt as string, clockOut: d.checkOutAt }))
            } catch { /* timesheet is non-critical for editing */ }

            setSelectedStaff({
                employeeId: detail.employeeId,
                userId: detail.userId,
                username: detail.username,
                fullName: detail.fullName,
                fullNameAr: detail.fullNameAr,
                role: roleNumber,
                staffNo: detail.staffNo,
                phone: detail.phone,
                address: detail.address,
                photoUrl: detail.photoUrl,
                bloodType: detail.bloodType,
                contractStatus: detail.contractStatus,
                startDate: detail.startDate,
                netSalary: detail.netSalary,
                sgkPremium: detail.sgkPremium,
                weeklyShiftPattern: detail.weeklyShiftPattern,
                timeEntries,
            })
            setSheetOpen(true)
        } catch (e: any) {
            toast.error(e?.message ?? "Failed to load employee details")
        } finally {
            setEditLoadingFor(null)
        }
    }

    const handleSheetClose = (open: boolean) => {
        setSheetOpen(open)
        if (!open) {
            setSelectedStaff(null)
        }
    }

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 2
        }).format(amount)
    }

    const getRoleBadgeColor = (role: string) => {
        switch (role) {
            case 'Admin': return 'bg-accent/10 text-accent-foreground dark:bg-accent/10 dark:text-accent-foreground'
            case 'Waiter': return 'bg-info/10 text-info dark:bg-info/10 dark:text-info'
            case 'Kitchen': return 'bg-primary/10 text-primary dark:bg-primary/10 dark:text-primary'
            case 'Cashier': return 'bg-success/10 text-success dark:bg-success/10 dark:text-success'
            case 'TrackerPickup': return 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300'
            default: return 'bg-gray-100 text-gray-800'
        }
    }

    const getRoleLabel = (role: string) => {
        switch (role) {
            case 'Admin': return t('roleAdmin')
            case 'Waiter': return t('roleWaiter')
            case 'Kitchen': return t('roleKitchen')
            case 'Cashier': return t('roleCashier')
            case 'TrackerPickup': return t('roleTrackerPickup')
            case 'Manager': return t('roleManager')
            case 'Marketing': return t('roleMarketing')
            default: return role
        }
    }

    const getStaffDisplayName = (member: StaffAnalytics) =>
        locale === "ar" ? (member.fullNameAr || member.fullName || member.username) : (member.fullName || member.fullNameAr || member.username)

    const totalSalary = staff.reduce((sum, s) => sum + s.monthlySalary, 0)
    const totalCommission = staff.reduce((sum, s) => sum + s.commissionEarned, 0)
    const totalHours = staff.reduce((sum, s) => sum + s.totalWorkingHours, 0)

    return (
        <div className="flex flex-col gap-6 p-0 sm:p-2 lg:p-4 animate-in fade-in duration-500">
            {/* Header Section */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-3">
                        <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 text-white shadow-lg">
                            <Users className="h-6 w-6" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                                {t("staffTitle")}
                            </h1>
                            <p className="text-muted-foreground">
                                {t("staffSubtitle")}
                            </p>
                        </div>
                    </div>
                </div>

                <Button
                    onClick={handleNewStaff}
                    className="w-full gap-2 bg-primary text-primary-foreground hover:bg-primary/90 sm:w-auto"
                >
                    <UserPlus className="w-4 h-4" />
                    {t("hireNewStaff")}
                </Button>
            </div>

            {/* Summary Cards */}
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                <Card className="border-none shadow-lg bg-gradient-to-br from-info/5 to-info/10 dark:from-info/10 dark:to-info/10">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-info dark:text-info">
                            {t("totalSalaryExpense")}
                        </CardTitle>
                        <DollarSign className="h-4 w-4 text-info" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-info dark:text-info">
                            {formatCurrency(totalSalary)}
                        </div>
                        <p className="text-xs text-info/80 dark:text-info/80 mt-1">
                            {t("monthlyFixedSalaries")}
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-lg bg-gradient-to-br from-success/5 to-success/10 dark:from-success/10 dark:to-success/10">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-success dark:text-success">
                            {t("totalCommission")}
                        </CardTitle>
                        <TrendingUp className="h-4 w-4 text-success" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-success dark:text-success">
                            {formatCurrency(totalCommission)}
                        </div>
                        <p className="text-xs text-success/80 dark:text-success/80 mt-1">
                            {t("commissionsEarned")}
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-lg bg-gradient-to-br from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/10">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-primary dark:text-primary">
                            {t("totalWorkingTime")}
                        </CardTitle>
                        <Clock className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-primary dark:text-primary">
                            {totalHours.toFixed(1)} {t("hoursUnit")}
                        </div>
                        <p className="text-xs text-primary/80 dark:text-primary/80 mt-1">
                            {t("totalAcrossAllStaff")}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Staff Table */}
            <Card className="border-none shadow-xl bg-white/50 backdrop-blur-sm dark:bg-zinc-900/50">
                <CardHeader>
                    <CardTitle>{t("staffList")}</CardTitle>
                    <CardDescription>{t("staffListDesc")}</CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                        </div>
                    ) : staff.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <Briefcase className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>{t("noStaffRecords")}</p>
                            <Button
                                onClick={handleNewStaff}
                                variant="outline"
                                className="mt-4"
                            >
                                {t("hireFirstStaff")}
                            </Button>
                        </div>
                    ) : (
                        <div className="overflow-x-auto rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/50">
                                        <TableHead className="font-bold">{t("staffCol")}</TableHead>
                                        <TableHead className="font-bold">{t("roleCol")}</TableHead>
                                        <TableHead className="text-end font-bold">{t("monthlySalaryCol")}</TableHead>
                                        <TableHead className="text-center font-bold">{t("totalOrdersCol")}</TableHead>
                                        <TableHead className="text-end font-bold">{t("commissionEarnedCol")}</TableHead>
                                        <TableHead className="text-center font-bold">{t("workingHoursCol")}</TableHead>
                                        <TableHead className="text-center font-bold">{t("actions")}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {staff.map((member) => {
                                        const displayName = getStaffDisplayName(member)

                                        return (
                                        <TableRow
                                            key={member.userId}
                                            className="hover:bg-muted/50 transition-colors"
                                        >
                                            <TableCell className="font-medium">
                                                <div className="flex items-center gap-3">
                                                    <Avatar className="h-10 w-10">
                                                        <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${displayName}`} />
                                                        <AvatarFallback className="bg-gradient-to-br from-purple-400 to-pink-600 text-white font-bold">
                                                            {displayName.charAt(0).toUpperCase()}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div>
                                                        <div className="font-semibold">{displayName}</div>
                                                        <div className="text-xs text-muted-foreground">@{member.username}</div>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge className={getRoleBadgeColor(member.role)}>
                                                    {getRoleLabel(member.role)}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-end font-semibold">
                                                {formatCurrency(member.monthlySalary)}
                                                {member.netSalary > 0 && member.netSalary !== member.monthlySalary && (
                                                    <div className="text-xs text-muted-foreground font-normal">
                                                        Net: {formatCurrency(member.netSalary)}
                                                    </div>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <span className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-info/10 dark:bg-info/10 text-info dark:text-info text-sm font-semibold">
                                                    {member.totalOrders}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-end">
                                                <span className="font-bold text-success dark:text-success">
                                                    {formatCurrency(member.commissionEarned)}
                                                </span>
                                                <div className="text-xs text-muted-foreground">
                                                    {member.commissionRate}% {t("commissionRateLabel")}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <div className="flex items-center justify-center gap-1">
                                                    <Clock className="h-4 w-4 text-primary" />
                                                    <span className="font-semibold">{member.totalWorkingHours.toFixed(1)}h</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Button
                                                    onClick={() => handleEditStaff(member)}
                                                    disabled={editLoadingFor === member.userId}
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-primary hover:text-primary/80 hover:bg-primary/5"
                                                >
                                                    <Edit2 className={`h-4 w-4 ${editLoadingFor === member.userId ? "animate-pulse" : ""}`} />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                        )
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Staff Sheet */}
            <StaffSheet
                open={sheetOpen}
                onOpenChange={handleSheetClose}
                onSuccess={fetchStaff}
                editStaff={selectedStaff}
            />
        </div>
    )
}

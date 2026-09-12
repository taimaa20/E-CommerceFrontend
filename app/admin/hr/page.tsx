"use client";

import * as React from "react";
import Link from "next/link";
import { Users, UserPlus, Search, Bell, Gift, ChevronRight, CalendarDays, Banknote, ClipboardCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import StaffSheet from "@/components/admin/StaffSheet";
import CheckInOutButton from "@/components/admin/CheckInOutButton";
import { useHrEmployees, useHrLookups } from "@/lib/hooks/useHr";
import { useLocale } from "@/components/locale-provider";
import { formatCurrency } from "@/lib/currencies";
import { usePosStore } from "@/store/posStore";
import type { HrEmployeeListItem } from "@/types/hr";

const PAGE_SIZE = 25;

export default function HrPage() {
    const { locale } = useLocale();
    const isAr = locale === "ar";
    const currency = usePosStore((s) => s.currency);

    const [search, setSearch] = React.useState("");
    const [debounced, setDebounced] = React.useState("");
    const [role, setRole] = React.useState<string>("all");
    const [contractStatus, setContractStatus] = React.useState<string>("all");
    const [page, setPage] = React.useState(1);
    const [sheetOpen, setSheetOpen] = React.useState(false);
    const [editStaff, setEditStaff] = React.useState<any | null>(null);

    React.useEffect(() => {
        const id = setTimeout(() => { setDebounced(search.trim()); setPage(1); }, 300);
        return () => clearTimeout(id);
    }, [search]);

    const lookups = useHrLookups();
    const employees = useHrEmployees({
        search: debounced || undefined,
        role: role === "all" ? undefined : Number(role),
        contractStatus: contractStatus === "all" ? undefined : Number(contractStatus),
        page,
        pageSize: PAGE_SIZE,
    });

    const labelOf = (list: { code: string; label: string; labelAr?: string | null }[] | undefined, code: string) => {
        const hit = list?.find((x) => x.code === code);
        if (!hit) return code;
        return isAr && hit.labelAr ? hit.labelAr : hit.label;
    };

    const employeeName = (fullName?: string | null, fullNameAr?: string | null, username?: string | null) =>
        isAr ? (fullNameAr || fullName || username || "") : (fullName || fullNameAr || username || "");

    const onCreate = () => { setEditStaff(null); setSheetOpen(true); };
    const onEdit = (e: HrEmployeeListItem) => {
        setEditStaff({
            employeeId: e.employeeId,
            userId: e.userId,
            username: e.username,
            fullName: e.fullName,
            fullNameAr: e.fullNameAr,
            role: lookupsRoleNumber(lookups.data?.roles, e.role),
            staffNo: e.staffNo,
            phone: e.phone,
            photoUrl: e.photoUrl,
            contractStatus: e.contractStatus,
            startDate: e.startDate,
            netSalary: e.netSalary,
        });
        setSheetOpen(true);
    };

    const total = employees.data?.total ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

    return (
        <div className="flex flex-col gap-6 p-0 sm:p-2 lg:p-4 animate-in fade-in duration-500">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 text-white shadow-lg">
                        <Users className="h-6 w-6" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">{isAr ? "الموارد البشرية" : "HR"}</h1>
                        <p className="text-muted-foreground">
                            {isAr ? "الموظفون والمكافآت والطلبات" : "Employees, bonuses and requests"}
                        </p>
                    </div>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                    <CheckInOutButton />
                    <Link href="/ntxadminpos/hr/leaves">
                        <Button variant="outline" className="w-full gap-2 sm:w-auto">
                            <CalendarDays className="h-4 w-4" /> {isAr ? "الإجازات" : "Leaves"}
                        </Button>
                    </Link>
                    <Link href="/ntxadminpos/hr/loans">
                        <Button variant="outline" className="w-full gap-2 sm:w-auto">
                            <Banknote className="h-4 w-4" /> {isAr ? "السلف" : "Loans"}
                        </Button>
                    </Link>
                    <Link href="/ntxadminpos/hr/permissions">
                        <Button variant="outline" className="w-full gap-2 sm:w-auto">
                            <ClipboardCheck className="h-4 w-4" /> {isAr ? "الاستئذان" : "Permissions"}
                        </Button>
                    </Link>
                    <Link href="/ntxadminpos/hr/bonuses">
                        <Button variant="outline" className="w-full gap-2 sm:w-auto">
                            <Gift className="h-4 w-4" /> {isAr ? "المكافآت" : "Bonuses"}
                        </Button>
                    </Link>
                    <Button onClick={onCreate} className="w-full gap-2 sm:w-auto">
                        <UserPlus className="h-4 w-4" /> {isAr ? "توظيف موظف جديد" : "Hire new employee"}
                    </Button>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base">{isAr ? "بحث وتصفية" : "Search & filter"}</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-3 sm:grid-cols-3">
                        <div className="relative">
                            <Search className="absolute start-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder={isAr ? "بحث بالاسم، اسم المستخدم، رقم الموظف..." : "Search name, username, staff #..."}
                                className="ps-9"
                            />
                        </div>
                        <Select value={role} onValueChange={(v) => { setRole(v); setPage(1); }}>
                            <SelectTrigger><SelectValue placeholder={isAr ? "الدور" : "Role"} /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{isAr ? "كل الأدوار" : "All roles"}</SelectItem>
                                {lookups.data?.roles?.map((r) => (
                                    <SelectItem key={r.code} value={r.code}>{r.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select value={contractStatus} onValueChange={(v) => { setContractStatus(v); setPage(1); }}>
                            <SelectTrigger><SelectValue placeholder={isAr ? "حالة العقد" : "Contract"} /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{isAr ? "كل الحالات" : "All statuses"}</SelectItem>
                                {lookups.data?.contractStatuses?.map((c) => (
                                    <SelectItem key={c.code} value={c.code}>
                                        {isAr && c.labelAr ? c.labelAr : c.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-base">
                        {isAr ? "الموظفون" : "Employees"} ({total})
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {employees.loading ? (
                        <p className="text-sm text-muted-foreground py-8 text-center">{isAr ? "جاري التحميل..." : "Loading..."}</p>
                    ) : employees.error ? (
                        <p className="text-sm text-destructive py-8 text-center">{employees.error}</p>
                    ) : (employees.data?.items.length ?? 0) === 0 ? (
                        <p className="text-sm text-muted-foreground py-8 text-center">{isAr ? "لا يوجد موظفون" : "No employees"}</p>
                    ) : (
                        <div className="space-y-2">
                            {employees.data!.items.map((e) => (
                                <Link
                                    key={e.employeeId}
                                    href={`/ntxadminpos/hr/employees/${e.employeeId}`}
                                    className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/40 transition-colors"
                                >
                                    <Avatar className="h-10 w-10">
                                        <AvatarImage src={e.photoUrl ?? undefined} />
                                        <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-600 text-white">
                                            {employeeName(e.fullName, e.fullNameAr, e.username).charAt(0).toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="font-medium truncate">{employeeName(e.fullName, e.fullNameAr, e.username)}</span>
                                            <Badge variant="secondary" className="text-xs">{e.role}</Badge>
                                            <Badge variant="outline" className="text-xs">
                                                {labelOf(lookups.data?.contractStatuses, String(e.contractStatus))}
                                            </Badge>
                                        </div>
                                        <div className="text-xs text-muted-foreground mt-0.5 flex flex-wrap gap-3">
                                            <span>#{e.staffNo}</span>
                                            <span>@{e.username}</span>
                                            {e.phone && <span>{e.phone}</span>}
                                        </div>
                                    </div>
                                    <div className="hidden sm:flex flex-col items-end text-end text-xs">
                                        <span className="font-semibold">{formatCurrency(e.monthlySalary, currency)}</span>
                                        <span className="text-muted-foreground">{isAr ? "صافي" : "Net"}: {formatCurrency(e.netSalary, currency)}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        {e.openRequestsCount > 0 && (
                                            <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300">
                                                <Bell className="h-3 w-3 me-1" />{e.openRequestsCount}
                                            </Badge>
                                        )}
                                        {e.pendingBonusesCount > 0 && (
                                            <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300">
                                                <Gift className="h-3 w-3 me-1" />{e.pendingBonusesCount}
                                            </Badge>
                                        )}
                                        <ChevronRight className="rtl:-scale-x-100 h-4 w-4 text-muted-foreground" />
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}

                    {totalPages > 1 && (
                        <div className="flex items-center justify-between pt-4">
                            <span className="text-xs text-muted-foreground">
                                {isAr ? "صفحة" : "Page"} {page} / {totalPages}
                            </span>
                            <div className="flex gap-2">
                                <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                                    {isAr ? "السابق" : "Previous"}
                                </Button>
                                <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                                    {isAr ? "التالي" : "Next"}
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            <StaffSheet
                open={sheetOpen}
                onOpenChange={(o) => { setSheetOpen(o); if (!o) setEditStaff(null); }}
                onSuccess={() => employees.reload()}
                editStaff={editStaff}
            />
        </div>
    );
}

function lookupsRoleNumber(roles: { code: string; label: string }[] | undefined, label: string): number {
    const hit = roles?.find((r) => r.label === label);
    return hit ? Number(hit.code) : 1;
}

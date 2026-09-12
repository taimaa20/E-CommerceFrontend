"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, CalendarDays } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useHrLookups, useHrLeaveRequests } from "@/lib/hooks/useHr";
import { HrApi } from "@/lib/api-hr";
import { useLocale } from "@/components/locale-provider";
import { RequestStatusActions, STATUS_BADGE_CLASS } from "@/components/admin/RequestStatusActions";

const PAGE_SIZE = 25;

export default function LeaveRequestsPage() {
    const { locale } = useLocale();
    const isAr = locale === "ar";

    const [status, setStatus] = React.useState<string>("all");
    const [type, setType] = React.useState<string>("all");
    const [from, setFrom] = React.useState<string>("");
    const [to, setTo] = React.useState<string>("");
    const [page, setPage] = React.useState(1);

    const lookups = useHrLookups();
    const list = useHrLeaveRequests({
        status: status === "all" ? undefined : status,
        type: type === "all" ? undefined : type,
        from: from || undefined,
        to: to || undefined,
        page,
        pageSize: PAGE_SIZE,
    });

    const total = list.data?.total ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const counts = list.data?.statusCounts ?? {};

    return (
        <div className="flex flex-col gap-6 p-0 sm:p-2 lg:p-4 animate-in fade-in duration-500">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <Link href="/ntxadminpos/hr">
                        <Button variant="ghost" size="sm" className="gap-2 mb-2">
                            <ArrowLeft className="rtl:-scale-x-100 h-4 w-4" /> {isAr ? "العودة" : "Back"}
                        </Button>
                    </Link>
                    <div className="flex items-center gap-3">
                        <div className="p-3 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 text-white shadow-lg">
                            <CalendarDays className="h-6 w-6" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight">{isAr ? "طلبات الإجازة" : "Leave requests"}</h1>
                            <p className="text-muted-foreground">{isAr ? "متابعة وموافقة طلبات إجازات الموظفين" : "Follow up and review staff leave requests"}</p>
                        </div>
                    </div>
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                    {["pending", "approved", "rejected", "cancelled"].map((s) => (
                        <Badge key={s} className={STATUS_BADGE_CLASS[s]}>
                            {labelOf(lookups.data?.requestStatuses, s, isAr)} · {counts[s] ?? 0}
                        </Badge>
                    ))}
                </div>
            </div>

            <Card>
                <CardHeader><CardTitle className="text-base">{isAr ? "تصفية" : "Filter"}</CardTitle></CardHeader>
                <CardContent>
                    <div className="grid gap-3 sm:grid-cols-4">
                        <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
                            <SelectTrigger><SelectValue placeholder={isAr ? "الحالة" : "Status"} /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{isAr ? "كل الحالات" : "All statuses"}</SelectItem>
                                {lookups.data?.requestStatuses?.map((s) => (
                                    <SelectItem key={s.code} value={s.code}>{isAr && s.labelAr ? s.labelAr : s.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select value={type} onValueChange={(v) => { setType(v); setPage(1); }}>
                            <SelectTrigger><SelectValue placeholder={isAr ? "النوع" : "Type"} /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{isAr ? "كل الأنواع" : "All types"}</SelectItem>
                                {lookups.data?.leaveTypes?.map((b) => (
                                    <SelectItem key={b.code} value={b.code}>{isAr && b.labelAr ? b.labelAr : b.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} />
                        <Input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} />
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardContent className="pt-4">
                    {list.loading ? (
                        <p className="text-sm text-muted-foreground py-8 text-center">{isAr ? "جاري التحميل..." : "Loading..."}</p>
                    ) : list.error ? (
                        <p className="text-sm text-destructive py-8 text-center">{list.error}</p>
                    ) : (list.data?.items.length ?? 0) === 0 ? (
                        <p className="text-sm text-muted-foreground py-8 text-center">{isAr ? "لا توجد طلبات" : "No requests"}</p>
                    ) : (
                        <div className="space-y-2">
                            {list.data!.items.map((r) => (
                                <div key={r.id} className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <Avatar className="h-9 w-9 shrink-0">
                                            <AvatarImage src={r.employee.photoUrl ?? undefined} />
                                            <AvatarFallback className="bg-gradient-to-br from-sky-500 to-indigo-600 text-white text-sm">
                                                {employeeName(r.employee.fullName, r.employee.fullNameAr, r.employee.username, isAr).charAt(0).toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <Link href={`/ntxadminpos/hr/employees/${r.employee.employeeId}`} className="font-medium hover:underline">
                                                    {employeeName(r.employee.fullName, r.employee.fullNameAr, r.employee.username, isAr)}
                                                </Link>
                                                <Badge variant="secondary" className="text-xs">{r.typeLabel}</Badge>
                                                <Badge variant="outline" className="text-xs">{r.durationInDays} {isAr ? "يوم" : "day(s)"}</Badge>
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                {r.startDate} → {r.endDate}{r.notes ? ` · ${r.notes}` : ""}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Badge className={`text-xs ${STATUS_BADGE_CLASS[r.status] ?? ""}`}>{r.statusLabel}</Badge>
                                        <RequestStatusActions
                                            kind="leave"
                                            requestId={r.id}
                                            status={r.status}
                                            update={HrApi.updateLeaveStatus}
                                            onChanged={list.reload}
                                            isAr={isAr}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {totalPages > 1 && (
                        <div className="flex items-center justify-between pt-4">
                            <span className="text-xs text-muted-foreground">{isAr ? "صفحة" : "Page"} {page} / {totalPages}</span>
                            <div className="flex gap-2">
                                <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>{isAr ? "السابق" : "Previous"}</Button>
                                <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>{isAr ? "التالي" : "Next"}</Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

function labelOf(list: { code: string; label: string; labelAr?: string | null }[] | undefined, code: string, isAr: boolean) {
    const hit = list?.find((x) => x.code === code);
    if (!hit) return code;
    return isAr && hit.labelAr ? hit.labelAr : hit.label;
}

function employeeName(fullName: string | null | undefined, fullNameAr: string | null | undefined, username: string, isAr: boolean) {
    return isAr ? (fullNameAr || fullName || username) : (fullName || fullNameAr || username);
}

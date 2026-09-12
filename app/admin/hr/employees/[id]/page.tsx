"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import {
    ArrowLeft, ArrowRight, Pencil, Mail, Phone, MapPin, Calendar, Clock, Gift, Plus,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
    Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import StaffSheet from "@/components/admin/StaffSheet";
import {
    useHrEmployee, useHrEmployeeRequests, useHrEmployeeBonuses, useHrLookups, useHrMutations,
    useHrEmployeeTimesheet,
} from "@/lib/hooks/useHr";
import { HrApi } from "@/lib/api-hr";
import { useLocale } from "@/components/locale-provider";
import { formatCurrency } from "@/lib/currencies";
import { usePosStore } from "@/store/posStore";
import type { HrEmployeeRequestItem } from "@/types/hr";
import { UserRole } from "@/types/auth";
import { RequestStatusActions, STATUS_BADGE_CLASS, type HrRequestKind } from "@/components/admin/RequestStatusActions";

export default function EmployeeProfilePage() {
    const params = useParams<{ id: string }>();
    const router = useRouter();
    const employeeId = params?.id ?? null;
    const { locale } = useLocale();
    const isAr = locale === "ar";
    const currency = usePosStore((s) => s.currency);

    const lookups = useHrLookups();
    const employee = useHrEmployee(employeeId);
    const requests = useHrEmployeeRequests(employeeId);
    const bonuses = useHrEmployeeBonuses(employeeId);
    const [editOpen, setEditOpen] = React.useState(false);
    const [bonusOpen, setBonusOpen] = React.useState(false);

    const reloadAll = () => { employee.reload(); requests.reload(); bonuses.reload(); };

    if (employee.loading) {
        return <div className="p-6 text-sm text-muted-foreground">{isAr ? "جاري التحميل..." : "Loading..."}</div>;
    }
    if (employee.error || !employee.data) {
        return <div className="p-6 text-sm text-destructive">{employee.error ?? (isAr ? "غير موجود" : "Not found")}</div>;
    }
    const e = employee.data;
    const displayName = isAr ? (e.fullNameAr || e.fullName || e.username) : (e.fullName || e.fullNameAr || e.username);

    return (
        <div dir={isAr ? "rtl" : "ltr"} className="flex flex-col gap-6 p-0 sm:p-2 lg:p-4 animate-in fade-in duration-500">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <Button variant="ghost" size="sm" className="w-fit gap-2" onClick={() => router.push("/ntxadminpos/hr")}>
                    <ArrowLeft className="rtl:-scale-x-100 h-4 w-4" />
                    {isAr ? "العودة" : "Back"}
                </Button>
                <Button variant="outline" className="gap-2" onClick={() => setEditOpen(true)}>
                    <Pencil className="h-4 w-4" />
                    {isAr ? "تعديل" : "Edit"}
                </Button>
            </div>

            <Card>
                <CardContent className="pt-6">
                    <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                        <Avatar className="h-20 w-20">
                            <AvatarImage src={e.photoUrl ?? undefined} />
                            <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-600 text-white text-2xl">
                                {displayName.charAt(0).toUpperCase()}
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                                <h2 className="text-2xl font-bold">{displayName}</h2>
                                <Badge variant="secondary">{e.role}</Badge>
                                <Badge variant="outline">#{e.staffNo}</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">@{e.username}</p>
                            <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                                {e.phone && <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />{e.phone}</span>}
                                {e.address && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{e.address}</span>}
                                {e.startDate && <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" />{formatDate(e.startDate)}</span>}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard label={isAr ? "إجمالي ساعات العمل" : "Total hours"} value={`${e.stats.totalWorkingHours.toFixed(1)} h`} icon={<Clock className="h-4 w-4" />} />
                <StatCard label={isAr ? "المكافآت المتراكمة" : "Total bonuses"} value={formatCurrency(e.stats.totalBonusAmount, currency)} icon={<Gift className="h-4 w-4" />} sub={`${e.stats.totalBonuses} ${isAr ? "مكافأة" : "bonuses"}`} />
                <StatCard label={isAr ? "الإجازات المعلقة" : "Open leaves"} value={String(e.stats.openLeaveRequests)} sub={`${e.stats.openLoanRequests} ${isAr ? "قروض" : "loans"} · ${e.stats.openPermissionRequests} ${isAr ? "أذونات" : "perms"}`} />
                <StatCard label={isAr ? "الراتب الشهري" : "Monthly salary"} value={formatCurrency(e.monthlySalary, currency)} sub={`${isAr ? "صافي" : "Net"}: ${formatCurrency(e.netSalary, currency)}`} />
            </div>

            <Tabs defaultValue="info" className="w-full" dir={isAr ? "rtl" : "ltr"}>
                <TabsList className="grid w-full grid-cols-2 sm:grid-cols-6">
                    <TabsTrigger value="info">{isAr ? "المعلومات" : "Info"}</TabsTrigger>
                    <TabsTrigger value="timesheet">{isAr ? "كشف الدوام" : "Timesheet"}</TabsTrigger>
                    <TabsTrigger value="bonuses">{isAr ? "المكافآت" : "Bonuses"}</TabsTrigger>
                    <TabsTrigger value="leaves">{isAr ? "الإجازات" : "Leaves"}</TabsTrigger>
                    <TabsTrigger value="loans">{isAr ? "السلف" : "Loans"}</TabsTrigger>
                    <TabsTrigger value="permissions">{isAr ? "الأذونات" : "Permissions"}</TabsTrigger>
                </TabsList>

                <TabsContent value="info" className="space-y-4 mt-4">
                    <Card>
                        <CardHeader><CardTitle className="text-base">{isAr ? "تفاصيل التوظيف" : "Employment details"}</CardTitle></CardHeader>
                        <CardContent className="grid gap-4 md:grid-cols-2">
                            <Field label={isAr ? "حالة العقد" : "Contract status"} value={labelOf(lookups.data?.contractStatuses, String(e.contractStatus), isAr)} />
                            <Field label={isAr ? "تاريخ البدء" : "Start date"} value={e.startDate ? formatDate(e.startDate) : "-"} />
                            <Field label={isAr ? "أجر الساعة" : "Hourly wage"} value={formatCurrency(e.hourlyWage, currency)} />
                            <Field label={isAr ? "العمولة" : "Commission rate"} value={`${e.commissionRate}%`} />
                            <Field label={isAr ? "تأمين اجتماعي" : "SGK premium"} value={formatCurrency(e.sgkPremium, currency)} />
                            <Field label={isAr ? "النمط الأسبوعي" : "Weekly pattern"} value={e.weeklyShiftPattern ?? "-"} />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="timesheet" className="space-y-4 mt-4">
                    <TimesheetPanel employeeId={e.employeeId} isAr={isAr} />
                </TabsContent>

                <TabsContent value="bonuses" className="space-y-4 mt-4">
                    <div className="flex justify-end">
                        <Button onClick={() => setBonusOpen(true)} className="gap-2">
                            <Plus className="h-4 w-4" /> {isAr ? "إضافة مكافأة" : "Add bonus"}
                        </Button>
                    </div>
                    <Card>
                        <CardContent className="pt-4">
                            {bonuses.loading ? (
                                <p className="text-sm text-muted-foreground py-6 text-center">{isAr ? "جاري التحميل..." : "Loading..."}</p>
                            ) : (bonuses.data?.items.length ?? 0) === 0 ? (
                                <p className="text-sm text-muted-foreground py-6 text-center">{isAr ? "لا توجد مكافآت" : "No bonuses yet"}</p>
                            ) : (
                                <div className="space-y-2">
                                    {bonuses.data!.items.map((b) => (
                                        <div key={b.id} className="flex items-center justify-between rounded-lg border p-3">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium">{b.bonusTypeLabel}</span>
                                                    <Badge variant="outline" className="text-xs">{b.statusLabel}</Badge>
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                    {b.awardDate} · {b.reason ?? "-"}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold">{formatCurrency(b.amount, b.currency || currency)}</span>
                                                <BonusStatusActions bonusId={b.id} status={b.status} reload={reloadAll} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="leaves" className="mt-4">
                    <RequestList kind="leave" items={requests.data?.leaves} loading={requests.loading} isAr={isAr} reload={requests.reload} />
                </TabsContent>
                <TabsContent value="loans" className="mt-4">
                    <RequestList kind="loan" items={requests.data?.loans} loading={requests.loading} isAr={isAr} reload={requests.reload} />
                </TabsContent>
                <TabsContent value="permissions" className="mt-4">
                    <RequestList kind="permission" items={requests.data?.permissions} loading={requests.loading} isAr={isAr} reload={requests.reload} />
                </TabsContent>
            </Tabs>

            <StaffSheet
                open={editOpen}
                onOpenChange={(o) => { setEditOpen(o); if (!o) reloadAll(); }}
                onSuccess={reloadAll}
                editStaff={{ ...e, role: lookupsRoleNumber(e.role) }}
            />

            <CreateBonusDialog
                open={bonusOpen}
                onOpenChange={setBonusOpen}
                employeeId={e.employeeId}
                bonusTypes={lookups.data?.bonusTypes ?? []}
                onCreated={reloadAll}
                isAr={isAr}
            />
        </div>
    );
}

function StatCard({ label, value, sub, icon }: { label: string; value: string; sub?: string; icon?: React.ReactNode }) {
    return (
        <Card>
            <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{label}</span>
                    {icon}
                </div>
                <div className="text-2xl font-bold mt-1">{value}</div>
                {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
            </CardContent>
        </Card>
    );
}

function Field({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <div className="text-xs text-muted-foreground">{label}</div>
            <div className="text-sm font-medium">{value}</div>
        </div>
    );
}

function RequestList({ kind, items, loading, isAr, reload }: {
    kind: HrRequestKind;
    items?: HrEmployeeRequestItem[];
    loading: boolean;
    isAr: boolean;
    reload: () => void;
}) {
    if (loading) return <Card><CardContent className="pt-6 text-sm text-muted-foreground text-center">{isAr ? "جاري التحميل..." : "Loading..."}</CardContent></Card>;
    if (!items || items.length === 0) return <Card><CardContent className="pt-6 text-sm text-muted-foreground text-center">{isAr ? "لا توجد طلبات" : "No requests"}</CardContent></Card>;

    const update = kind === "leave" ? HrApi.updateLeaveStatus
        : kind === "loan" ? HrApi.updateLoanStatus
            : HrApi.updatePermissionStatus;

    return (
        <Card><CardContent className="pt-4 space-y-2">
            {items.map((r) => (
                <div key={r.id} className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium">{r.title}</span>
                            <Badge variant="outline" className="text-xs">{r.typeLabel}</Badge>
                        </div>
                        <div className="text-xs text-muted-foreground">{r.subtitle}</div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Badge className={`text-xs ${STATUS_BADGE_CLASS[r.status] ?? ""}`}>{r.statusLabel}</Badge>
                        <RequestStatusActions
                            kind={kind}
                            requestId={r.id}
                            status={r.status}
                            update={update}
                            onChanged={reload}
                            isAr={isAr}
                        />
                    </div>
                </div>
            ))}
        </CardContent></Card>
    );
}

const BONUS_STATUS_LABEL: Record<string, string> = {
    pending: "Pending",
    approved: "Approved",
    paid: "Paid",
    cancelled: "Cancelled",
};

function BonusStatusActions({ bonusId, status, reload }: { bonusId: string; status: string; reload: () => void }) {
    const m = useHrMutations(reload);
    // Backend canonical codes are lowercase — keep transitions in sync.
    const next: Record<string, string[]> = {
        pending: ["approved", "cancelled"],
        approved: ["paid", "cancelled"],
    };
    const options = next[status] ?? [];
    if (options.length === 0) return null;
    return (
        <Select onValueChange={async (v) => {
            try { await m.wrap(() => HrApi.updateBonusStatus(bonusId, v)); toast.success("Updated"); }
            catch (e: any) { toast.error(e?.message ?? "Failed"); }
        }}>
            <SelectTrigger className="h-8 w-28 text-xs"><SelectValue placeholder="…" /></SelectTrigger>
            <SelectContent>
                {options.map((o) => <SelectItem key={o} value={o}>{BONUS_STATUS_LABEL[o] ?? o}</SelectItem>)}
            </SelectContent>
        </Select>
    );
}

function CreateBonusDialog({
    open, onOpenChange, employeeId, bonusTypes, onCreated, isAr,
}: {
    open: boolean; onOpenChange: (o: boolean) => void; employeeId: string;
    bonusTypes: { code: string; label: string }[]; onCreated: () => void; isAr: boolean;
}) {
    const currency = usePosStore((s) => s.currency);
    const [bonusType, setBonusType] = React.useState(bonusTypes[0]?.code ?? "Performance");
    const [amount, setAmount] = React.useState("");
    const [awardDate, setAwardDate] = React.useState(() => new Date().toISOString().slice(0, 10));
    const [reason, setReason] = React.useState("");
    const [busy, setBusy] = React.useState(false);

    const reset = () => { setAmount(""); setReason(""); setAwardDate(new Date().toISOString().slice(0, 10)); };

    const submit = async () => {
        const n = parseFloat(amount);
        if (!n || n <= 0) { toast.error(isAr ? "أدخل مبلغًا صحيحًا" : "Enter a valid amount"); return; }
        setBusy(true);
        try {
            await HrApi.createEmployeeBonus(employeeId, {
                employeeId, bonusType, amount: n, currency, awardDate, reason: reason || null,
            });
            toast.success(isAr ? "تمت الإضافة" : "Bonus added");
            reset(); onOpenChange(false); onCreated();
        } catch (e: any) {
            toast.error(e?.message ?? (isAr ? "فشل" : "Failed"));
        } finally { setBusy(false); }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader><DialogTitle>{isAr ? "إضافة مكافأة" : "Add bonus"}</DialogTitle></DialogHeader>
                <div className="space-y-3">
                    <div className="space-y-1">
                        <Label>{isAr ? "النوع" : "Type"}</Label>
                        <Select value={bonusType} onValueChange={setBonusType}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>{bonusTypes.map((b) => <SelectItem key={b.code} value={b.code}>{b.label}</SelectItem>)}</SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1">
                        <Label>{isAr ? "المبلغ" : "Amount"} ({currency})</Label>
                        <Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                        <Label>{isAr ? "التاريخ" : "Award date"}</Label>
                        <Input type="date" value={awardDate} onChange={(e) => setAwardDate(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                        <Label>{isAr ? "السبب" : "Reason"}</Label>
                        <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>{isAr ? "إلغاء" : "Cancel"}</Button>
                    <Button onClick={submit} disabled={busy}>{busy ? "..." : (isAr ? "حفظ" : "Save")}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function labelOf(list: { code: string; label: string; labelAr?: string | null }[] | undefined, code: string, isAr: boolean) {
    const hit = list?.find((x) => x.code === code);
    if (!hit) return code;
    return isAr && hit.labelAr ? hit.labelAr : hit.label;
}

// Resolve the employee's role name ("Admin", "Waiter", ...) to its UserRole
// number deterministically. The old version read the async HR lookups and fell
// back to 1 (Waiter) whenever they hadn't loaded yet or a label didn't match —
// which is why the edit dropdown showed "Waiter" regardless of the real role.
function lookupsRoleNumber(label: string): number {
    const n = UserRole[label as keyof typeof UserRole];
    return typeof n === "number" ? n : UserRole.Waiter;
}

function formatDate(d: string) {
    try { return new Intl.DateTimeFormat("en-US", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(d)); }
    catch { return d; }
}

function currentMonth(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function TimesheetPanel({ employeeId, isAr }: { employeeId: string; isAr: boolean }) {
    const [month, setMonth] = React.useState<string>(currentMonth());
    const ts = useHrEmployeeTimesheet(employeeId, month);

    const fmt = (mins: number) => {
        const h = Math.floor(mins / 60);
        const m = mins % 60;
        return `${h}h ${m}m`;
    };
    const fmtTime = (iso?: string | null) =>
        iso ? new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "-";

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
                <CardTitle className="text-base">{isAr ? "كشف الدوام الشهري" : "Monthly timesheet"}</CardTitle>
                <Input type="month" value={month} onChange={(e) => setMonth(e.target.value || currentMonth())} className="w-40" />
            </CardHeader>
            <CardContent className="space-y-4">
                {ts.loading ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">{isAr ? "جاري التحميل..." : "Loading..."}</p>
                ) : ts.error ? (
                    <p className="text-sm text-destructive py-4 text-center">{ts.error}</p>
                ) : !ts.data || ts.data.days.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">{isAr ? "لا توجد سجلات" : "No timesheet records"}</p>
                ) : (
                    <>
                        <div className="grid gap-3 sm:grid-cols-3">
                            <div className="rounded-lg border p-3">
                                <div className="text-xs text-muted-foreground">{isAr ? "إجمالي الساعات" : "Total hours"}</div>
                                <div className="text-2xl font-bold">{ts.data.totalHours.toFixed(2)} h</div>
                            </div>
                            <div className="rounded-lg border p-3">
                                <div className="text-xs text-muted-foreground">{isAr ? "أيام العمل" : "Days worked"}</div>
                                <div className="text-2xl font-bold">{ts.data.daysWorked}</div>
                            </div>
                            <div className="rounded-lg border p-3">
                                <div className="text-xs text-muted-foreground">{isAr ? "جلسات مفتوحة" : "Open sessions"}</div>
                                <div className="text-2xl font-bold">{ts.data.openSessions}</div>
                            </div>
                        </div>

                        <div className="rounded-lg border overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-muted/50">
                                    <tr>
                                        <th className="text-start p-2 font-medium">{isAr ? "التاريخ" : "Date"}</th>
                                        <th className="text-start p-2 font-medium">{isAr ? "دخول" : "Check-in"}</th>
                                        <th className="text-start p-2 font-medium">{isAr ? "خروج" : "Check-out"}</th>
                                        <th className="text-start p-2 font-medium">{isAr ? "المدة" : "Duration"}</th>
                                        <th className="text-start p-2 font-medium">{isAr ? "الحالة" : "Status"}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {ts.data.days.map((d) => (
                                        <tr key={d.date} className="border-t">
                                            <td className="p-2">{d.date}</td>
                                            <td className="p-2">{fmtTime(d.checkInAt)}</td>
                                            <td className="p-2">{fmtTime(d.checkOutAt)}</td>
                                            <td className="p-2">{fmt(d.durationMinutes)}</td>
                                            <td className="p-2">
                                                <Badge variant={d.status === "CheckedIn" ? "default" : d.status === "Absent" ? "destructive" : "secondary"} className="text-xs">
                                                    {d.status}
                                                </Badge>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </CardContent>
        </Card>
    );
}

"use client";

import { useEffect, useRef, useState } from "react";
import type React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Download, Edit, FileText, Loader2, Plus, Trash2, Upload, Wrench } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLocale } from "@/components/locale-provider";
import { AssetAttachmentType, AssetMaintenancePayload, AssetMaintenanceStatus, assetsApi } from "@/lib/api-assets";
import { useAssetDetailsStore } from "@/store/assetsStore";
import {
    ASSET_ATTACHMENT_TYPES,
    AssetAuditChangeView,
    AssetConditionBadge,
    AssetQrPreview,
    AssetStatusBadge,
    assetActionLabel,
    attachmentTypeLabel,
    formatDate,
    formatMoney,
    maintenanceStatusLabel,
    MAINTENANCE_STATUSES,
    normalizeAssetDownloadUrl,
    tx,
    useAssetCurrency,
} from "@/components/assets/asset-shared";

export default function AssetDetailsPage() {
    const router = useRouter();
    const params = useParams<{ id: string }>();
    const id = params?.id;
    const { isRtl } = useLocale();
    const { current, loading, error, load, clear } = useAssetDetailsStore();
    const currency = useAssetCurrency();
    const [uploading, setUploading] = useState(false);
    const [attachmentType, setAttachmentType] = useState<AssetAttachmentType>("Photo");
    const [maintenanceOpen, setMaintenanceOpen] = useState(false);
    const [deleteAttachmentId, setDeleteAttachmentId] = useState<string | null>(null);
    const [downloadingId, setDownloadingId] = useState<string | null>(null);
    const fileInput = useRef<HTMLInputElement>(null);

    const downloadAttachment = async (attachmentId: string, fileName: string) => {
        if (!id || downloadingId) return;
        setDownloadingId(attachmentId);
        try {
            await assetsApi.downloadAttachment(id, attachmentId, fileName);
        } catch (err: any) {
            toast.error(err?.message || (isRtl ? "فشل التنزيل" : "Download failed"));
        } finally {
            setDownloadingId(null);
        }
    };

    useEffect(() => {
        if (id) void load(id);
        return () => clear();
    }, [id, load, clear]);

    const uploadFiles = async (files: FileList | File[]) => {
        if (!id) return;
        setUploading(true);
        try {
            for (const file of Array.from(files)) {
                await assetsApi.uploadAttachment(id, file, attachmentType);
            }
            await load(id);
            toast.success(isRtl ? "تم رفع المرفقات" : "Attachments uploaded");
        } catch (err: any) {
            toast.error(err?.message || (isRtl ? "فشل الرفع" : "Upload failed"));
        } finally {
            setUploading(false);
            if (fileInput.current) fileInput.current.value = "";
        }
    };

    const deleteAttachment = async () => {
        if (!id || !deleteAttachmentId) return;
        try {
            await assetsApi.deleteAttachment(id, deleteAttachmentId);
            setDeleteAttachmentId(null);
            await load(id);
            toast.success(isRtl ? "تم حذف المرفق" : "Attachment deleted");
        } catch (err: any) {
            toast.error(err?.message || (isRtl ? "فشل الحذف" : "Delete failed"));
        }
    };

    if (loading && !current) return <div className="p-8 text-slate-500">{tx(isRtl, "loading")}...</div>;
    if (error) return <div className="p-8 text-destructive">{error}</div>;
    if (!current) return null;

    return (
        <div className="space-y-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => router.push("/ntxadminpos/assets/list")} className="gap-1">
                        <ArrowLeft className="size-4 rtl:-scale-x-100" />
                        {tx(isRtl, "back")}
                    </Button>
                    <div>
                        <h1 className="text-2xl font-semibold">{current.assetName}</h1>
                        <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
                            <span className="font-mono">{current.assetCode}</span>
                            <AssetStatusBadge status={current.status} isRtl={isRtl} />
                            <AssetConditionBadge condition={current.condition} isRtl={isRtl} />
                        </div>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setMaintenanceOpen(true)} className="gap-2"><Wrench className="size-4" />{tx(isRtl, "addMaintenance")}</Button>
                    <Link href={`/ntxadminpos/assets/${current.id}/edit`}>
                        <Button className="gap-2"><Edit className="size-4" />{tx(isRtl, "edit")}</Button>
                    </Link>
                </div>
            </div>

            <Tabs defaultValue="details" className="space-y-4">
                <TabsList className="grid w-full grid-cols-4 md:w-auto">
                    <TabsTrigger value="details">{tx(isRtl, "details")}</TabsTrigger>
                    <TabsTrigger value="attachments">{tx(isRtl, "attachments")}</TabsTrigger>
                    <TabsTrigger value="maintenance">{tx(isRtl, "maintenance")}</TabsTrigger>
                    <TabsTrigger value="logs">{tx(isRtl, "logs")}</TabsTrigger>
                </TabsList>

                <TabsContent value="details" className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                        <div className="space-y-4 xl:col-span-2">
                            <InfoCard title={tx(isRtl, "general")} rows={[
                                [isRtl ? "الإنجليزية" : "English", current.assetNameEn],
                                [isRtl ? "العربية" : "Arabic", current.assetNameAr],
                                [tx(isRtl, "category"), current.categoryName],
                                [tx(isRtl, "assetType"), current.assetType || "-"],
                                [tx(isRtl, "brandModel"), [current.brand, current.model].filter(Boolean).join(" ") || "-"],
                                [tx(isRtl, "serialNumber"), current.serialNumber || "-"],
                                [tx(isRtl, "description"), (isRtl ? current.descriptionAr : current.descriptionEn) || "-"],
                            ]} />
                            <InfoCard title={tx(isRtl, "financial")} rows={[
                                [tx(isRtl, "purchaseDate"), formatDate(current.purchaseDate)],
                                [tx(isRtl, "purchaseCost"), formatMoney(current.purchaseCost, currency)],
                                [tx(isRtl, "currentValue"), formatMoney(current.currentValue, currency)],
                                [tx(isRtl, "supplier"), current.supplierName || "-"],
                            ]} />
                            <InfoCard title={tx(isRtl, "warrantyInfo")} rows={[
                                [tx(isRtl, "start"), formatDate(current.warrantyStartDate)],
                                [tx(isRtl, "end"), formatDate(current.warrantyEndDate)],
                            ]} />
                            <InfoCard title={tx(isRtl, "assignment")} rows={[
                                [tx(isRtl, "employee"), current.assignedToEmployeeName || "-"],
                                [tx(isRtl, "location"), current.assignedLocation || "-"],
                                [tx(isRtl, "department"), current.department || "-"],
                                [tx(isRtl, "notes"), current.notes || "-"],
                            ]} />
                        </div>
                        <div className="space-y-4">
                            <AssetQrPreview value={current.qrCode} label={tx(isRtl, "qrCode")} />
                            <Card className="rounded-md">
                                <CardHeader><CardTitle className="text-base">{tx(isRtl, "barcode")}</CardTitle></CardHeader>
                                <CardContent>
                                    <div className="font-mono text-sm">{current.barcode || current.assetCode}</div>
                                    <div className="mt-3 h-12 overflow-hidden rounded bg-[repeating-linear-gradient(90deg,#0f172a_0_2px,transparent_2px_4px,#0f172a_4px_6px,transparent_6px_10px)]" />
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="attachments">
                    <Card className="rounded-md">
                        <CardHeader>
                            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                                <CardTitle className="text-base">{tx(isRtl, "attachments")}</CardTitle>
                                <div className="flex gap-2">
                                    <Select value={attachmentType} onValueChange={(v) => setAttachmentType(v as AssetAttachmentType)}>
                                        <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {ASSET_ATTACHMENT_TYPES.map((type) => <SelectItem key={type} value={type}>{attachmentTypeLabel(type, isRtl)}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                    <Button variant="outline" onClick={() => fileInput.current?.click()} disabled={uploading} className="gap-2">
                                        {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
                                        {tx(isRtl, "upload")}
                                    </Button>
                                    <input ref={fileInput} type="file" multiple className="hidden" onChange={(e) => e.target.files && uploadFiles(e.target.files)} />
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                            {current.attachments.length === 0 ? (
                                <div className="col-span-full p-8 text-center text-slate-500">-</div>
                            ) : current.attachments.map((attachment) => (
                                <div key={attachment.id} className="flex gap-3 rounded-md border p-3">
                                    <div className="flex size-14 items-center justify-center overflow-hidden rounded bg-slate-100">
                                        {attachment.mimeType.startsWith("image/") && attachment.fileUrl
                                            ? <img src={attachment.fileUrl} alt={attachment.originalFileName} className="size-full object-cover" />
                                            : <FileText className="size-6 text-slate-500" />}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="truncate text-sm font-medium">{attachment.originalFileName}</div>
                                        <div className="text-xs text-slate-500">{attachmentTypeLabel(attachment.attachmentType, isRtl)} · {(attachment.fileSize / 1024).toFixed(0)} KB</div>
                                        <div className="mt-2 flex gap-1">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => downloadAttachment(attachment.id, attachment.originalFileName)}
                                                disabled={downloadingId === attachment.id}
                                            >
                                                {downloadingId === attachment.id
                                                    ? <Loader2 className="size-4 animate-spin" />
                                                    : <Download className="size-4" />}
                                            </Button>
                                            <Button size="sm" variant="ghost" onClick={() => setDeleteAttachmentId(attachment.id)}>
                                                <Trash2 className="size-4 text-destructive" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="maintenance">
                    <Card className="rounded-md">
                        <CardContent className="p-0">
                            <div className="divide-y">
                                {current.maintenanceHistory.length === 0 ? (
                                    <div className="p-8 text-center text-slate-500">-</div>
                                ) : current.maintenanceHistory.map((record) => (
                                    <div key={record.id} className="p-4">
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <div className="font-medium">{record.maintenanceType}</div>
                                            <Badge variant="outline">{maintenanceStatusLabel(record.status, isRtl)}</Badge>
                                        </div>
                                        <div className="mt-1 text-sm text-slate-600">{record.description}</div>
                                        <div className="mt-2 text-xs text-slate-500">
                                            {formatDate(record.maintenanceDate)} · {formatMoney(record.cost, currency)} · {record.vendor || record.performedBy || "-"}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="logs">
                    <Card className="rounded-md">
                        <CardContent className="p-0">
                            <div className="divide-y">
                                {current.activityTimeline.length === 0 ? (
                                    <div className="p-8 text-center text-slate-500">-</div>
                                ) : current.activityTimeline.map((log) => (
                                    <div key={log.id} className="flex gap-3 p-4">
                                        <div className="mt-1 size-2 rounded-full bg-slate-400" />
                                        <div className="min-w-0 flex-1">
                                            <div className="font-medium">{assetActionLabel(log.actionType, isRtl)}</div>
                                            <div className="text-xs text-slate-500">{new Date(log.timestamp).toLocaleString()} · {log.performedBy || "-"}</div>
                                            {(log.oldValue || log.newValue) && (
                                                <div className="mt-2">
                                                    <AssetAuditChangeView oldValue={log.oldValue} newValue={log.newValue} isRtl={isRtl} />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            <MaintenanceDialog
                open={maintenanceOpen}
                assetId={current.id}
                isRtl={isRtl}
                onClose={() => setMaintenanceOpen(false)}
                onSaved={async () => {
                    setMaintenanceOpen(false);
                    await load(current.id);
                }}
            />

            <Dialog open={!!deleteAttachmentId} onOpenChange={(open) => !open && setDeleteAttachmentId(null)}>
                <DialogContent>
                    <DialogHeader><DialogTitle>{tx(isRtl, "delete")}</DialogTitle></DialogHeader>
                    <p className="text-sm text-slate-600">{isRtl ? "حذف المرفق؟" : "Delete this attachment?"}</p>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteAttachmentId(null)}>{tx(isRtl, "cancel")}</Button>
                        <Button variant="destructive" onClick={deleteAttachment}>{tx(isRtl, "confirm")}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function InfoCard({ title, rows }: { title: string; rows: Array<[string, string]> }) {
    return (
        <Card className="rounded-md">
            <CardHeader><CardTitle className="text-base">{title}</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {rows.map(([label, value]) => (
                    <div key={label}>
                        <div className="text-xs font-medium text-slate-500">{label}</div>
                        <div className="mt-1 whitespace-pre-wrap text-sm text-slate-900">{value}</div>
                    </div>
                ))}
            </CardContent>
        </Card>
    );
}

function MaintenanceDialog({ open, assetId, isRtl, onClose, onSaved }: {
    open: boolean;
    assetId: string;
    isRtl: boolean;
    onClose: () => void;
    onSaved: () => Promise<void>;
}) {
    const [busy, setBusy] = useState(false);
    const [form, setForm] = useState<AssetMaintenancePayload>({
        maintenanceType: "",
        description: "",
        cost: 0,
        performedBy: "",
        vendor: "",
        maintenanceDate: new Date().toISOString().slice(0, 10),
        nextMaintenanceDate: null,
        status: "Completed",
        notes: "",
    });

    const save = async () => {
        if (!form.maintenanceType.trim() || !form.description.trim()) {
            toast.error(isRtl ? "أكمل نوع ووصف الصيانة" : "Maintenance type and description are required");
            return;
        }
        setBusy(true);
        try {
            await assetsApi.addMaintenance(assetId, normalizeMaintenance(form));
            toast.success(isRtl ? "تمت إضافة الصيانة" : "Maintenance added");
            await onSaved();
        } catch (err: any) {
            toast.error(err?.message || (isRtl ? "فشل الحفظ" : "Save failed"));
        } finally {
            setBusy(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
            <DialogContent className="max-w-2xl">
                <DialogHeader><DialogTitle>{tx(isRtl, "addMaintenance")}</DialogTitle></DialogHeader>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <Field label={tx(isRtl, "type")}><Input value={form.maintenanceType} onChange={(e) => setForm({ ...form, maintenanceType: e.target.value })} /></Field>
                    <Field label={tx(isRtl, "status")}>
                        <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as AssetMaintenanceStatus })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {MAINTENANCE_STATUSES.map((status) => <SelectItem key={status} value={status}>{maintenanceStatusLabel(status, isRtl)}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </Field>
                    <Field label={tx(isRtl, "cost")}><Input type="number" min="0" step="0.01" value={form.cost} onChange={(e) => setForm({ ...form, cost: Number(e.target.value) || 0 })} /></Field>
                    <Field label={tx(isRtl, "vendor")}><Input value={form.vendor ?? ""} onChange={(e) => setForm({ ...form, vendor: e.target.value })} /></Field>
                    <Field label={tx(isRtl, "performedBy")}><Input value={form.performedBy ?? ""} onChange={(e) => setForm({ ...form, performedBy: e.target.value })} /></Field>
                    <Field label={tx(isRtl, "date")}><Input type="date" value={form.maintenanceDate} onChange={(e) => setForm({ ...form, maintenanceDate: e.target.value })} /></Field>
                    <Field label={tx(isRtl, "nextDate")}><Input type="date" value={form.nextMaintenanceDate ?? ""} onChange={(e) => setForm({ ...form, nextMaintenanceDate: e.target.value || null })} /></Field>
                    <div className="md:col-span-2">
                        <Field label={tx(isRtl, "description")}><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
                    </div>
                    <div className="md:col-span-2">
                        <Field label={tx(isRtl, "notes")}><Textarea value={form.notes ?? ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={busy}>{tx(isRtl, "cancel")}</Button>
                    <Button onClick={save} disabled={busy}>{busy ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}{tx(isRtl, "save")}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div>
            <Label className="text-xs">{label}</Label>
            <div className="mt-1">{children}</div>
        </div>
    );
}

function normalizeMaintenance(form: AssetMaintenancePayload): AssetMaintenancePayload {
    return {
        ...form,
        performedBy: nullIfEmpty(form.performedBy),
        vendor: nullIfEmpty(form.vendor),
        notes: nullIfEmpty(form.notes),
        nextMaintenanceDate: form.nextMaintenanceDate || null,
    };
}

function nullIfEmpty(value?: string | null) {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
}

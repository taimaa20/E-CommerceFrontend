"use client";

import { useEffect, useState } from "react";
import type React from "react";
import { Loader2, Paperclip, Save, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useLocale } from "@/components/locale-provider";
import { HrApi } from "@/lib/api-hr";
import type { HrEmployeeListItem } from "@/types/hr";
import {
    AssetCategory,
    AssetAttachmentType,
    AssetDetails,
    AssetPayload,
    assetCategoriesApi,
} from "@/lib/api-assets";
import {
    ASSET_ATTACHMENT_TYPES,
    ASSET_CONDITIONS,
    ASSET_STATUSES,
    attachmentTypeLabel,
    conditionLabel,
    statusLabel,
    tx,
} from "@/components/assets/asset-shared";

export interface PendingAssetAttachment {
    file: File;
    attachmentType: AssetAttachmentType;
}

interface AssetFormProps {
    initial?: AssetDetails | null;
    busy: boolean;
    allowAttachments?: boolean;
    onSubmit: (payload: AssetPayload, attachments: PendingAssetAttachment[]) => Promise<void>;
}

const emptyPayload: AssetPayload = {
    assetNameEn: "",
    assetNameAr: "",
    descriptionEn: "",
    descriptionAr: "",
    assetCategoryId: "",
    assetType: "",
    brand: "",
    model: "",
    serialNumber: "",
    barcode: "",
    purchaseDate: null,
    purchaseCost: null,
    currentValue: null,
    warrantyStartDate: null,
    warrantyEndDate: null,
    supplierName: "",
    status: "Active",
    condition: "Good",
    assignedToEmployeeId: null,
    assignedLocation: "",
    department: "",
    notes: "",
    isActive: true,
};

export function AssetForm({ initial, busy, allowAttachments = false, onSubmit }: AssetFormProps) {
    const { isRtl } = useLocale();
    const [form, setForm] = useState<AssetPayload>(emptyPayload);
    const [categories, setCategories] = useState<AssetCategory[]>([]);
    const [employees, setEmployees] = useState<HrEmployeeListItem[]>([]);
    const [loadingLookups, setLoadingLookups] = useState(false);
    const [attachmentType, setAttachmentType] = useState<AssetAttachmentType>("Photo");
    const [attachments, setAttachments] = useState<PendingAssetAttachment[]>([]);

    useEffect(() => {
        if (!initial) {
            setForm({ ...emptyPayload });
            setAttachments([]);
            return;
        }

        setForm({
            assetNameEn: initial.assetNameEn,
            assetNameAr: initial.assetNameAr,
            descriptionEn: initial.descriptionEn ?? "",
            descriptionAr: initial.descriptionAr ?? "",
            assetCategoryId: initial.assetCategoryId,
            assetType: initial.assetType ?? "",
            brand: initial.brand ?? "",
            model: initial.model ?? "",
            serialNumber: initial.serialNumber ?? "",
            barcode: initial.barcode ?? "",
            purchaseDate: initial.purchaseDate ? initial.purchaseDate.slice(0, 10) : null,
            purchaseCost: initial.purchaseCost ?? null,
            currentValue: initial.currentValue ?? null,
            warrantyStartDate: initial.warrantyStartDate ? initial.warrantyStartDate.slice(0, 10) : null,
            warrantyEndDate: initial.warrantyEndDate ? initial.warrantyEndDate.slice(0, 10) : null,
            supplierName: initial.supplierName ?? "",
            status: initial.status,
            condition: initial.condition,
            assignedToEmployeeId: initial.assignedToEmployeeId ?? null,
            assignedLocation: initial.assignedLocation ?? "",
            department: initial.department ?? "",
            notes: initial.notes ?? "",
            isActive: initial.isActive,
        });
    }, [initial]);

    useEffect(() => {
        let cancelled = false;
        setLoadingLookups(true);
        Promise.all([
            assetCategoriesApi.list(true).catch(() => [] as AssetCategory[]),
            HrApi.listEmployees({ page: 1, pageSize: 200 }).catch(() => ({ items: [] as HrEmployeeListItem[], total: 0, page: 1, pageSize: 200 })),
        ]).then(([categoryRows, employeeRows]) => {
            if (cancelled) return;
            setCategories(categoryRows);
            setEmployees(employeeRows.items || []);
        }).finally(() => {
            if (!cancelled) setLoadingLookups(false);
        });
        return () => { cancelled = true; };
    }, []);

    const submit = async () => {
        if (!form.assetNameEn.trim() || !form.assetNameAr.trim() || !form.assetCategoryId) {
            toast.error(isRtl ? "أكمل الاسم والفئة" : "Asset name and category are required");
            return;
        }
        await onSubmit(normalizePayload(form), attachments);
    };

    const addAttachments = (files: FileList | null) => {
        if (!files?.length) return;
        const next = Array.from(files).map((file) => ({ file, attachmentType }));
        setAttachments((current) => [...current, ...next]);
    };

    const removeAttachment = (index: number) => {
        setAttachments((current) => current.filter((_, itemIndex) => itemIndex !== index));
    };

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">{tx(isRtl, "general")}</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <Field label={tx(isRtl, "assetNameEn")} required>
                        <Input value={form.assetNameEn} maxLength={200} onChange={(e) => setForm({ ...form, assetNameEn: e.target.value })} />
                    </Field>
                    <Field label={tx(isRtl, "assetNameAr")} required>
                        <Input dir="rtl" value={form.assetNameAr} maxLength={200} onChange={(e) => setForm({ ...form, assetNameAr: e.target.value })} />
                    </Field>
                    <Field label={tx(isRtl, "category")} required>
                        <Select value={form.assetCategoryId || "NONE"} onValueChange={(v) => setForm({ ...form, assetCategoryId: v === "NONE" ? "" : v })}>
                            <SelectTrigger><SelectValue placeholder={tx(isRtl, "category")} /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="NONE">{loadingLookups ? "..." : tx(isRtl, "none")}</SelectItem>
                                {categories.map((category) => (
                                    <SelectItem key={category.id} value={category.id}>{category.displayName}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </Field>
                    <Field label={tx(isRtl, "assetType")}>
                        <Input value={form.assetType ?? ""} maxLength={100} onChange={(e) => setForm({ ...form, assetType: e.target.value })} />
                    </Field>
                    <Field label={tx(isRtl, "brand")}>
                        <Input value={form.brand ?? ""} maxLength={120} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
                    </Field>
                    <Field label={tx(isRtl, "model")}>
                        <Input value={form.model ?? ""} maxLength={120} onChange={(e) => setForm({ ...form, model: e.target.value })} />
                    </Field>
                    <Field label={tx(isRtl, "serialNumber")}>
                        <Input value={form.serialNumber ?? ""} maxLength={120} onChange={(e) => setForm({ ...form, serialNumber: e.target.value })} />
                    </Field>
                    <Field label={tx(isRtl, "barcode")}>
                        <Input value={form.barcode ?? ""} maxLength={120} onChange={(e) => setForm({ ...form, barcode: e.target.value })} />
                    </Field>
                    <Field label={tx(isRtl, "descriptionEn")}>
                        <Textarea value={form.descriptionEn ?? ""} maxLength={2000} onChange={(e) => setForm({ ...form, descriptionEn: e.target.value })} />
                    </Field>
                    <Field label={tx(isRtl, "descriptionAr")}>
                        <Textarea dir="rtl" value={form.descriptionAr ?? ""} maxLength={2000} onChange={(e) => setForm({ ...form, descriptionAr: e.target.value })} />
                    </Field>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base">{tx(isRtl, "financial")}</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-3">
                    <Field label={tx(isRtl, "purchaseDate")}>
                        <Input type="date" value={form.purchaseDate ?? ""} onChange={(e) => setForm({ ...form, purchaseDate: e.target.value || null })} />
                    </Field>
                    <Field label={tx(isRtl, "purchaseCost")}>
                        <Input type="number" min="0" step="0.01" value={form.purchaseCost ?? ""} onChange={(e) => setForm({ ...form, purchaseCost: toNumber(e.target.value) })} />
                    </Field>
                    <Field label={tx(isRtl, "currentValue")}>
                        <Input type="number" min="0" step="0.01" value={form.currentValue ?? ""} onChange={(e) => setForm({ ...form, currentValue: toNumber(e.target.value) })} />
                    </Field>
                    <Field label={tx(isRtl, "supplier")}>
                        <Input value={form.supplierName ?? ""} maxLength={200} onChange={(e) => setForm({ ...form, supplierName: e.target.value })} />
                    </Field>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base">{tx(isRtl, "warrantyInfo")}</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <Field label={tx(isRtl, "warrantyStart")}>
                        <Input type="date" value={form.warrantyStartDate ?? ""} onChange={(e) => setForm({ ...form, warrantyStartDate: e.target.value || null })} />
                    </Field>
                    <Field label={tx(isRtl, "warrantyEnd")}>
                        <Input type="date" value={form.warrantyEndDate ?? ""} onChange={(e) => setForm({ ...form, warrantyEndDate: e.target.value || null })} />
                    </Field>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base">{tx(isRtl, "assignment")}</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <Field label={tx(isRtl, "employee")}>
                        <Select value={form.assignedToEmployeeId ?? "NONE"} onValueChange={(v) => setForm({ ...form, assignedToEmployeeId: v === "NONE" ? null : v })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="NONE">{tx(isRtl, "none")}</SelectItem>
                                {employees.map((employee) => (
                                    <SelectItem key={employee.employeeId} value={employee.employeeId}>
                                        {(isRtl ? employee.fullNameAr : employee.fullName) || employee.username}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </Field>
                    <Field label={tx(isRtl, "location")}>
                        <Input value={form.assignedLocation ?? ""} maxLength={200} onChange={(e) => setForm({ ...form, assignedLocation: e.target.value })} />
                    </Field>
                    <Field label={tx(isRtl, "department")}>
                        <Input value={form.department ?? ""} maxLength={120} onChange={(e) => setForm({ ...form, department: e.target.value })} />
                    </Field>
                    <Field label={tx(isRtl, "status")}>
                        <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as AssetPayload["status"] })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {ASSET_STATUSES.map((status) => (
                                    <SelectItem key={status} value={status}>{statusLabel(status, isRtl)}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </Field>
                    <Field label={tx(isRtl, "condition")}>
                        <Select value={form.condition} onValueChange={(v) => setForm({ ...form, condition: v as AssetPayload["condition"] })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {ASSET_CONDITIONS.map((condition) => (
                                    <SelectItem key={condition} value={condition}>{conditionLabel(condition, isRtl)}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </Field>
                    <div className="flex items-center gap-2 pt-6">
                        <Switch checked={form.isActive} onCheckedChange={(checked) => setForm({ ...form, isActive: checked })} />
                        <Label>{tx(isRtl, "active")}</Label>
                    </div>
                    <div className="md:col-span-2">
                        <Field label={tx(isRtl, "notes")}>
                            <Textarea value={form.notes ?? ""} maxLength={2000} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                        </Field>
                    </div>
                </CardContent>
            </Card>

            {allowAttachments && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">{tx(isRtl, "attachments")}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="flex flex-col gap-2 sm:flex-row">
                            <Select value={attachmentType} onValueChange={(v) => setAttachmentType(v as AssetAttachmentType)}>
                                <SelectTrigger className="sm:w-56"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {ASSET_ATTACHMENT_TYPES.map((type) => (
                                        <SelectItem key={type} value={type}>{attachmentTypeLabel(type, isRtl)}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Button variant="outline" asChild className="gap-2">
                                <label>
                                    <Upload className="size-4" />
                                    {tx(isRtl, "chooseFiles")}
                                    <input type="file" multiple className="hidden" onChange={(e) => {
                                        addAttachments(e.target.files);
                                        e.currentTarget.value = "";
                                    }} />
                                </label>
                            </Button>
                        </div>
                        {attachments.length > 0 && (
                            <div className="space-y-2">
                                <div className="text-xs font-medium text-slate-500">{tx(isRtl, "selectedFiles")}</div>
                                {attachments.map((attachment, index) => (
                                    <div key={`${attachment.file.name}-${index}`} className="flex items-center justify-between gap-3 rounded-md border bg-slate-50 px-3 py-2">
                                        <div className="flex min-w-0 items-center gap-2">
                                            <Paperclip className="size-4 shrink-0 text-slate-500" />
                                            <div className="min-w-0">
                                                <div className="truncate text-sm font-medium">{attachment.file.name}</div>
                                                <div className="text-xs text-slate-500">{attachmentTypeLabel(attachment.attachmentType, isRtl)} · {(attachment.file.size / 1024).toFixed(0)} KB</div>
                                            </div>
                                        </div>
                                        <Button type="button" variant="ghost" size="sm" onClick={() => removeAttachment(index)}>
                                            <X className="size-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            <div className="flex justify-end">
                <Button onClick={submit} disabled={busy} className="gap-2">
                    {busy ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                    {busy ? tx(isRtl, "saving") : tx(isRtl, "save")}
                </Button>
            </div>
        </div>
    );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
    return (
        <div>
            <Label className="text-xs">{label}{required && <span className="ms-1 text-destructive">*</span>}</Label>
            <div className="mt-1">{children}</div>
        </div>
    );
}

function toNumber(value: string) {
    if (value.trim() === "") return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
}

function normalizePayload(payload: AssetPayload): AssetPayload {
    return {
        ...payload,
        descriptionEn: nullIfEmpty(payload.descriptionEn),
        descriptionAr: nullIfEmpty(payload.descriptionAr),
        assetType: nullIfEmpty(payload.assetType),
        brand: nullIfEmpty(payload.brand),
        model: nullIfEmpty(payload.model),
        serialNumber: nullIfEmpty(payload.serialNumber),
        barcode: nullIfEmpty(payload.barcode),
        supplierName: nullIfEmpty(payload.supplierName),
        assignedLocation: nullIfEmpty(payload.assignedLocation),
        department: nullIfEmpty(payload.department),
        notes: nullIfEmpty(payload.notes),
    };
}

function nullIfEmpty(value?: string | null) {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
}

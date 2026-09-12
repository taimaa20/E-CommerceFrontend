"use client";

import { useEffect, useState } from "react";
import type React from "react";
import Link from "next/link";
import { ArrowLeft, Edit, Loader2, Plus, Tag, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useLocale } from "@/components/locale-provider";
import { AssetCategory, AssetCategoryPayload, assetCategoriesApi } from "@/lib/api-assets";
import { AssetIcon, tx } from "@/components/assets/asset-shared";

const emptyForm: AssetCategoryPayload = {
    nameEn: "",
    nameAr: "",
    icon: "Package",
    color: "#64748b",
    isActive: true,
    sortOrder: 0,
};

export default function AssetCategoriesPage() {
    const { isRtl } = useLocale();
    const [items, setItems] = useState<AssetCategory[]>([]);
    const [loading, setLoading] = useState(false);
    const [busy, setBusy] = useState(false);
    const [editing, setEditing] = useState<AssetCategory | null>(null);
    const [creating, setCreating] = useState(false);
    const [deleteId, setDeleteId] = useState<string | null>(null);

    const load = async () => {
        setLoading(true);
        try {
            setItems(await assetCategoriesApi.list(false));
        } catch (err: any) {
            toast.error(err?.message || (isRtl ? "فشل التحميل" : "Failed to load"));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void load();
    }, []);

    const save = async (payload: AssetCategoryPayload) => {
        setBusy(true);
        try {
            if (editing) {
                await assetCategoriesApi.update(editing.id, payload);
            } else {
                await assetCategoriesApi.create(payload);
            }
            toast.success(isRtl ? "تم الحفظ" : "Saved");
            setEditing(null);
            setCreating(false);
            await load();
        } catch (err: any) {
            toast.error(err?.message || (isRtl ? "فشل الحفظ" : "Save failed"));
        } finally {
            setBusy(false);
        }
    };

    const remove = async () => {
        if (!deleteId) return;
        setBusy(true);
        try {
            await assetCategoriesApi.remove(deleteId);
            setDeleteId(null);
            toast.success(isRtl ? "تم الحذف" : "Deleted");
            await load();
        } catch (err: any) {
            toast.error(err?.message || (isRtl ? "فشل الحذف" : "Delete failed"));
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
                <Link href="/ntxadminpos/assets">
                    <Button variant="ghost" size="sm" className="gap-1">
                        <ArrowLeft className="size-4 rtl:-scale-x-100" />
                        {tx(isRtl, "back")}
                    </Button>
                </Link>
                <Button onClick={() => setCreating(true)} className="gap-2"><Plus className="size-4" />{isRtl ? "إضافة فئة" : "Add Category"}</Button>
            </div>
            <div>
                <h1 className="flex items-center gap-2 text-2xl font-semibold">
                    <Tag className="size-6" />
                    {tx(isRtl, "categories")}
                </h1>
                <p className="text-sm text-slate-500">{isRtl ? "تصنيف الأصول مع لون وأيقونة لكل فئة." : "Govern asset taxonomy with icons, colors, and active state."}</p>
            </div>

            <Card className="rounded-md">
                <CardContent className="p-0">
                    {loading && items.length === 0 ? (
                        <div className="space-y-2 p-4">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-10 animate-pulse rounded bg-slate-100" />)}</div>
                    ) : items.length === 0 ? (
                        <div className="p-12 text-center text-slate-500">-</div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-12" />
                                    <TableHead>Name</TableHead>
                                    <TableHead>الاسم</TableHead>
                                    <TableHead>Icon</TableHead>
                                    <TableHead className="text-center">Assets</TableHead>
                                    <TableHead className="text-center">Active</TableHead>
                                    <TableHead className="text-end">{tx(isRtl, "actions")}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {items.map((category) => (
                                    <TableRow key={category.id}>
                                        <TableCell><span className="block size-4 rounded-full" style={{ backgroundColor: category.color || "#64748b" }} /></TableCell>
                                        <TableCell className="font-medium">{category.nameEn}</TableCell>
                                        <TableCell>{category.nameAr}</TableCell>
                                        <TableCell><AssetIcon name={category.icon} /></TableCell>
                                        <TableCell className="text-center"><Badge variant="secondary">{category.assetCount}</Badge></TableCell>
                                        <TableCell className="text-center">{category.isActive ? <Badge>Active</Badge> : <Badge variant="outline">Inactive</Badge>}</TableCell>
                                        <TableCell className="text-end">
                                            <Button size="sm" variant="ghost" onClick={() => setEditing(category)}><Edit className="size-4" /></Button>
                                            <Button size="sm" variant="ghost" onClick={() => setDeleteId(category.id)} disabled={category.assetCount > 0}><Trash2 className="size-4 text-destructive" /></Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            <CategoryDialog
                open={creating || !!editing}
                initial={editing ? {
                    nameEn: editing.nameEn,
                    nameAr: editing.nameAr,
                    icon: editing.icon ?? "Package",
                    color: editing.color ?? "#64748b",
                    isActive: editing.isActive,
                    sortOrder: editing.sortOrder,
                } : emptyForm}
                busy={busy}
                isRtl={isRtl}
                onClose={() => { setCreating(false); setEditing(null); }}
                onSubmit={save}
            />

            <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
                <DialogContent>
                    <DialogHeader><DialogTitle>{tx(isRtl, "delete")}</DialogTitle></DialogHeader>
                    <p className="text-sm text-slate-600">{isRtl ? "لا يمكن حذف فئة مرتبطة بأصول." : "Categories assigned to assets cannot be deleted."}</p>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteId(null)} disabled={busy}>{tx(isRtl, "cancel")}</Button>
                        <Button variant="destructive" onClick={remove} disabled={busy}>{busy ? <Loader2 className="size-4 animate-spin" /> : tx(isRtl, "confirm")}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function CategoryDialog({ open, initial, busy, isRtl, onClose, onSubmit }: {
    open: boolean;
    initial: AssetCategoryPayload;
    busy: boolean;
    isRtl: boolean;
    onClose: () => void;
    onSubmit: (payload: AssetCategoryPayload) => void;
}) {
    const [form, setForm] = useState<AssetCategoryPayload>(initial);

    useEffect(() => {
        setForm(initial);
    }, [initial, open]);

    const save = () => {
        if (!form.nameEn.trim() || !form.nameAr.trim()) {
            toast.error(isRtl ? "الاسم مطلوب باللغتين" : "English and Arabic names are required");
            return;
        }
        onSubmit({
            ...form,
            nameEn: form.nameEn.trim(),
            nameAr: form.nameAr.trim(),
            icon: form.icon?.trim() || "Package",
            color: form.color?.trim() || null,
        });
    };

    return (
        <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
            <DialogContent>
                <DialogHeader><DialogTitle>{tx(isRtl, "categories")}</DialogTitle></DialogHeader>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <Field label="Name (EN)"><Input value={form.nameEn} maxLength={120} onChange={(e) => setForm({ ...form, nameEn: e.target.value })} /></Field>
                    <Field label="Name (AR)"><Input dir="rtl" value={form.nameAr} maxLength={120} onChange={(e) => setForm({ ...form, nameAr: e.target.value })} /></Field>
                    <Field label="Icon"><Input value={form.icon ?? ""} maxLength={80} onChange={(e) => setForm({ ...form, icon: e.target.value })} /></Field>
                    <Field label="Color">
                        <div className="flex gap-2">
                            <input type="color" className="size-9 rounded border" value={form.color || "#64748b"} onChange={(e) => setForm({ ...form, color: e.target.value })} />
                            <Input value={form.color ?? ""} maxLength={20} onChange={(e) => setForm({ ...form, color: e.target.value })} />
                        </div>
                    </Field>
                    <Field label="Sort Order"><Input type="number" min="0" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) || 0 })} /></Field>
                    <div className="flex items-center gap-2 pt-6">
                        <Switch checked={form.isActive} onCheckedChange={(checked) => setForm({ ...form, isActive: checked })} />
                        <Label>Active</Label>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={busy}>{tx(isRtl, "cancel")}</Button>
                    <Button onClick={save} disabled={busy}>{busy ? <Loader2 className="size-4 animate-spin" /> : tx(isRtl, "save")}</Button>
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

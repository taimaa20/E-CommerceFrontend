"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Boxes } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/components/locale-provider";
import { AssetForm } from "@/components/assets/AssetForm";
import { tx } from "@/components/assets/asset-shared";
import { AssetPayload, assetsApi } from "@/lib/api-assets";
import { useAssetDetailsStore } from "@/store/assetsStore";

export default function EditAssetPage() {
    const router = useRouter();
    const params = useParams<{ id: string }>();
    const id = params?.id;
    const { isRtl } = useLocale();
    const { current, loading, error, load, clear } = useAssetDetailsStore();
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (id) void load(id);
        return () => clear();
    }, [id, load, clear]);

    const save = async (payload: AssetPayload) => {
        if (!id) return;
        setBusy(true);
        try {
            const updated = await assetsApi.update(id, payload);
            toast.success(isRtl ? "تم حفظ الأصل" : "Asset saved");
            router.push(`/ntxadminpos/assets/${updated.id}`);
        } catch (err: any) {
            toast.error(err?.message || (isRtl ? "فشل الحفظ" : "Save failed"));
        } finally {
            setBusy(false);
        }
    };

    if (loading && !current) return <div className="p-8 text-slate-500">{tx(isRtl, "loading")}...</div>;
    if (error) return <div className="p-8 text-destructive">{error}</div>;

    return (
        <div className="space-y-4">
            <Button variant="ghost" onClick={() => router.push(`/ntxadminpos/assets/${id}`)} className="gap-1">
                <ArrowLeft className="size-4 rtl:-scale-x-100" />
                {tx(isRtl, "back")}
            </Button>
            <div>
                <h1 className="flex items-center gap-2 text-2xl font-semibold">
                    <Boxes className="size-6" />
                    {tx(isRtl, "edit")}
                </h1>
            </div>
            <AssetForm initial={current} busy={busy} onSubmit={save} />
        </div>
    );
}

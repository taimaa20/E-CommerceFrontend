"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Boxes } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/components/locale-provider";
import { AssetForm, type PendingAssetAttachment } from "@/components/assets/AssetForm";
import { tx } from "@/components/assets/asset-shared";
import { AssetPayload, assetsApi } from "@/lib/api-assets";

export default function CreateAssetPage() {
    const router = useRouter();
    const { isRtl } = useLocale();
    const [busy, setBusy] = useState(false);

    const save = async (payload: AssetPayload, attachments: PendingAssetAttachment[]) => {
        setBusy(true);
        try {
            const created = await assetsApi.create(payload);

            try {
                for (const attachment of attachments) {
                    await assetsApi.uploadAttachment(created.id, attachment.file, attachment.attachmentType);
                }
            } catch (uploadError: any) {
                toast.error(uploadError?.message || (isRtl ? "تم إنشاء الأصل، لكن فشل رفع بعض المرفقات" : "Asset created, but some attachments failed"));
                router.push(`/ntxadminpos/assets/${created.id}`);
                return;
            }

            toast.success(attachments.length > 0
                ? (isRtl ? "تم إنشاء الأصل ورفع المرفقات" : "Asset created with attachments")
                : (isRtl ? "تم إنشاء الأصل" : "Asset created"));
            router.push(`/ntxadminpos/assets/${created.id}`);
        } catch (err: any) {
            toast.error(err?.message || (isRtl ? "فشل الإنشاء" : "Create failed"));
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="space-y-4">
            <Button variant="ghost" onClick={() => router.push("/ntxadminpos/assets/list")} className="gap-1">
                <ArrowLeft className="size-4 rtl:-scale-x-100" />
                {tx(isRtl, "back")}
            </Button>
            <div>
                <h1 className="flex items-center gap-2 text-2xl font-semibold">
                    <Boxes className="size-6" />
                    {tx(isRtl, "create")}
                </h1>
            </div>
            <AssetForm busy={busy} allowAttachments onSubmit={save} />
        </div>
    );
}

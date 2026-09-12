"use client";

import { useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Loader2, Plus, Star, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { uploadImage } from "@/lib/api";
import { productImage } from "@/lib/product-image";
import { toast } from "sonner";

/** Keeps the storefront gallery a gallery, not a media library. */
export const MAX_GALLERY_IMAGES = 8;

export interface GalleryEntry {
    imageUrl: string;
    imageKey?: string;
}

/**
 * Storefront gallery management for the product sheet.
 *
 * The FIRST entry is the product's primary image — the one the POS, receipts and the QR
 * menu already read. Promoting a gallery image simply moves it to the front, so nothing
 * downstream has to learn a new field. The parent owns the list and decides how it maps
 * onto `imageUrl` / `imageKey` plus the `images` collection on save.
 */
export default function ProductGalleryEditor({
    entries,
    onChange,
    label,
    hint,
    isAr,
}: {
    entries: GalleryEntry[];
    onChange: (entries: GalleryEntry[]) => void;
    label: string;
    hint: string;
    isAr: boolean;
}) {
    const input = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);

    const move = (from: number, to: number) => {
        if (to < 0 || to >= entries.length) return;
        const next = [...entries];
        const [row] = next.splice(from, 1);
        next.splice(to, 0, row);
        onChange(next);
    };

    const addFiles = async (files: FileList) => {
        const room = MAX_GALLERY_IMAGES - entries.length;
        if (room <= 0) {
            toast.error(isAr
                ? `الحد الأقصى ${MAX_GALLERY_IMAGES} صور`
                : `Up to ${MAX_GALLERY_IMAGES} images`);
            return;
        }

        setUploading(true);
        try {
            const added: GalleryEntry[] = [];
            for (const file of Array.from(files).slice(0, room)) {
                const uploaded = await uploadImage(file, { detailed: true });
                if (!uploaded) {
                    toast.error(isAr ? "تعذر رفع الصورة" : "Could not upload the image");
                    continue;
                }
                added.push({ imageUrl: uploaded.url, imageKey: uploaded.imageKey ?? undefined });
            }
            if (added.length > 0) onChange([...entries, ...added]);
        } finally {
            setUploading(false);
            if (input.current) input.current.value = "";
        }
    };

    return (
        <div className="space-y-2">
            <Label className="text-start">{label}</Label>
            <p className="text-sm text-muted-foreground">{hint}</p>

            <div className="flex flex-wrap gap-3">
                {entries.map((entry, index) => (
                    <figure
                        key={`${entry.imageUrl}-${index}`}
                        className="relative w-28 overflow-hidden rounded-lg border bg-muted/40"
                    >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={productImage(entry.imageKey, entry.imageUrl, "thumb") ?? entry.imageUrl}
                            alt=""
                            className="h-28 w-full object-cover"
                        />
                        {index === 0 && (
                            <figcaption className="absolute inset-x-0 top-0 flex items-center gap-1 bg-foreground/80 px-1.5 py-0.5 text-[10px] font-semibold text-background">
                                <Star className="size-3 fill-current" />
                                {isAr ? "الصورة الرئيسية" : "Primary"}
                            </figcaption>
                        )}
                        <div className="flex items-center justify-between border-t bg-background p-1">
                            <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="size-7"
                                disabled={index === 0}
                                aria-label={isAr ? "تحريك لليمين" : "Move earlier"}
                                onClick={() => move(index, index - 1)}
                            >
                                <ArrowLeft className="size-3.5 rtl:rotate-180" />
                            </Button>
                            <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="size-7"
                                disabled={index === entries.length - 1}
                                aria-label={isAr ? "تحريك لليسار" : "Move later"}
                                onClick={() => move(index, index + 1)}
                            >
                                <ArrowRight className="size-3.5 rtl:rotate-180" />
                            </Button>
                            <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="size-7 text-destructive"
                                aria-label={isAr ? "حذف الصورة" : "Remove image"}
                                onClick={() => onChange(entries.filter((_, position) => position !== index))}
                            >
                                <Trash2 className="size-3.5" />
                            </Button>
                        </div>
                    </figure>
                ))}

                <button
                    type="button"
                    onClick={() => input.current?.click()}
                    disabled={uploading || entries.length >= MAX_GALLERY_IMAGES}
                    className="flex h-[9.25rem] w-28 flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed text-sm text-muted-foreground transition-colors hover:bg-muted/50 disabled:pointer-events-none disabled:opacity-50"
                >
                    {uploading
                        ? <Loader2 className="size-5 animate-spin" />
                        : <Plus className="size-5" />}
                    {isAr ? "إضافة صورة" : "Add image"}
                </button>
            </div>

            <input
                ref={input}
                type="file"
                multiple
                accept="image/jpeg,image/png,image/gif,image/webp"
                className="hidden"
                onChange={event => {
                    const files = event.target.files;
                    if (files && files.length > 0) void addFiles(files);
                }}
            />
        </div>
    );
}

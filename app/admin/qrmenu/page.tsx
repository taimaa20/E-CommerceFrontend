"use client";

import { useEffect, useState } from "react";
import { useLocale } from "@/components/locale-provider";
import { QrCodeComponent } from "@/components/qrmenu/QrCodeComponent";

export default function QrMenuSettingsPage() {
    const { t, locale } = useLocale();
    const [menuUrl, setMenuUrl] = useState("");

    useEffect(() => {
        const baseUrl = window.location.origin;
        const langParam = locale === "ar" ? "?lang=ar" : "";
        setMenuUrl(`${baseUrl}/menu${langParam}`);
    }, [locale]);

    return (
        <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center pb-20">
            {menuUrl && (
                <QrCodeComponent
                    url={menuUrl}
                    size={280}
                    title={t("menuQrCode") || "Menu QR Code"}
                    subtitle={t("scanToView") || "Scan to view our menu"}
                    showDownload={true}
                    showShare={true}
                    showCopyLink={true}
                />
            )}
        </div>
    );
}

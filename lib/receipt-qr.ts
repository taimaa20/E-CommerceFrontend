import type { SystemSettings } from "@/store/settingsStore";

const RECEIPT_QR_SIZE = 512;
const QR_CODE_API_URL = "https://api.qrserver.com/v1/create-qr-code/";
const REVIEW_QR_TITLE = "Scan to Review / امسح للتقييم";
const MENU_QR_TITLE = "Scan for Menu / امسح للقائمة";
const REVIEW_QR_ALT = "Review QR";
const MENU_QR_ALT = "Menu QR";

export interface ReceiptQr {
    url: string;
    title: string;
    alt: string;
}

function cleanUrl(url: string | null | undefined): string | null {
    const value = url
        ?.trim()
        .replace(/^["']|["']$/g, "")
        .replace(/&amp;/g, "&");
    return value ? value : null;
}

export function getReceiptQr(settings: Pick<SystemSettings, "googleReviewUrl" | "qrMenuUrl">): ReceiptQr | null {
    const googleReviewUrl = cleanUrl(settings.googleReviewUrl);
    if (googleReviewUrl) {
        return {
            url: googleReviewUrl,
            title: REVIEW_QR_TITLE,
            alt: REVIEW_QR_ALT,
        };
    }

    const qrMenuUrl = cleanUrl(settings.qrMenuUrl);
    if (qrMenuUrl) {
        return {
            url: qrMenuUrl,
            title: MENU_QR_TITLE,
            alt: MENU_QR_ALT,
        };
    }

    return null;
}

export function getReceiptQrImageUrl(url: string): string {
    const params = new URLSearchParams({
        size: `${RECEIPT_QR_SIZE}x${RECEIPT_QR_SIZE}`,
        data: url,
        ecc: "M",
        qzone: "4",
        format: "png",
    });

    return `${QR_CODE_API_URL}?${params.toString()}`;
}

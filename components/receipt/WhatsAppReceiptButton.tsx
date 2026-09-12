"use client";

import { useEffect, useState } from "react";
import { Loader2, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/components/locale-provider";
import { createWhatsAppReceiptShare } from "@/lib/api";
import { getConnectivityState, subscribeConnectivity, type ConnectivityState } from "@/lib/offline/connectivity";
import type { OrderDto } from "@/types/order";

interface WhatsAppReceiptButtonProps {
    order: OrderDto | null | undefined;
    variant?: "default" | "outline" | "ghost" | "destructive" | "secondary";
    size?: "sm" | "default" | "lg" | "icon";
    className?: string;
}

const WHATSAPP_BASE_URL = "https://wa.me";
const PHONE_MISSING_ERROR_FRAGMENT = "phone missing";
const INVALID_PHONE_ERROR_FRAGMENT = "invalid customer phone";

function buildWhatsAppUrl(phone: string, message: string): string {
    return `${WHATSAPP_BASE_URL}/${encodeURIComponent(phone)}?text=${encodeURIComponent(message)}`;
}

function getErrorKey(error: unknown): "customerPhoneMissing" | "invalidPhoneNumber" | "anErrorOccurred" {
    const message = error instanceof Error ? error.message.toLowerCase() : "";
    if (message.includes(PHONE_MISSING_ERROR_FRAGMENT)) return "customerPhoneMissing";
    if (message.includes(INVALID_PHONE_ERROR_FRAGMENT)) return "invalidPhoneNumber";
    return "anErrorOccurred";
}

export function WhatsAppReceiptButton({
    order,
    variant = "outline",
    size = "default",
    className,
}: WhatsAppReceiptButtonProps) {
    const { t } = useLocale();
    const [isSending, setIsSending] = useState(false);
    const [connectivity, setConnectivity] = useState<ConnectivityState>(() => getConnectivityState());
    const customerPhone = order?.customerPhone?.trim();
    const isOnline = connectivity === "online";

    useEffect(() => {
        const unsubscribe = subscribeConnectivity(setConnectivity);
        return () => {
            unsubscribe();
        };
    }, []);

    const handleClick = async () => {
        if (!order || !customerPhone) {
            toast.error(t("customerPhoneMissing"));
            return;
        }

        if (!isOnline) {
            toast.error(t("whatsAppOfflineUnavailable"));
            return;
        }

        const popup = window.open("about:blank", "_blank");
        if (!popup) {
            toast.error(t("whatsAppPopupBlocked"));
            return;
        }

        setIsSending(true);
        try {
            const share = await createWhatsAppReceiptShare(order.id);
            popup.opener = null;
            popup.location.href = buildWhatsAppUrl(share.customerPhone, share.message);
            toast.success(t("receiptReady"));
        } catch (error) {
            popup.close();
            toast.error(t(getErrorKey(error)));
        } finally {
            setIsSending(false);
        }
    };

    if (!order || !customerPhone) return null;

    return (
        <Button
            variant={variant}
            size={size}
            className={className}
            onClick={handleClick}
            disabled={isSending || !isOnline}
            aria-label={t("sendWhatsApp")}
            title={!isOnline ? t("whatsAppOfflineUnavailable") : t("sendWhatsApp")}
        >
            {isSending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
                <MessageCircle className="h-4 w-4" />
            )}
            <span>{t("sendWhatsApp")}</span>
        </Button>
    );
}

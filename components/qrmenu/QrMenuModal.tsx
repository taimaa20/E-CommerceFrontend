"use client";

import React, { useMemo } from "react";
import { QrCode } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocale } from "@/components/locale-provider";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { QrCodeComponent } from "./QrCodeComponent";

interface QrMenuModalProps {
  /**
   * Whether the modal is open
   */
  isOpen: boolean;

  /**
   * Callback to close the modal
   */
  onClose: () => void;

  /**
   * Title for the modal
   */
  title?: string;

  /**
   * Menu URL (defaults to current app domain + /menu)
   */
  menuUrl?: string;

  /**
   * Description/subtitle
   */
  description?: string;

  /**
   * Show print button
   */
  showPrint?: boolean;

  /**
   * Custom className
   */
  className?: string;
}

/**
 * QR Menu Modal - Modal dialog to display Menu QR code
 * Used by Waiter/Cashier to show customers the QR code
 */
export function QrMenuModal({
  isOpen,
  onClose,
  title,
  menuUrl,
  description,
  showPrint = true,
  className,
}: QrMenuModalProps) {
  const { t, locale } = useLocale();
  const qrUrl = useMemo(() => {
    if (menuUrl) return menuUrl;
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
    const langParam = locale === "ar" ? "?lang=ar" : "";
    return `${baseUrl}/menu${langParam}`;
  }, [menuUrl, locale]);

  const handlePrint = () => {
    window.print();
  };

  const displayTitle =
    title || (locale === "ar" ? "متجرنا الإلكتروني" : "Online Store");
  const displayDescription =
    description ||
    (locale === "ar"
      ? "امسح الرمز للتسوق من متجرنا"
      : "Scan the QR code to shop our store");

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        data-dialog-content-print
        dir={locale === "ar" ? "rtl" : "ltr"}
        className={cn(
          "w-full max-w-[min(100vw-1rem,32rem)] max-h-[calc(100dvh-1rem)] overflow-y-auto p-4 sm:max-w-md sm:p-6",
          className
        )}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="w-5 h-5" />
            {displayTitle}
          </DialogTitle>
          <DialogDescription>{displayDescription}</DialogDescription>
        </DialogHeader>

        {/* QR Code Component */}
        <div className="mt-4">
          {qrUrl && (
            <QrCodeComponent
              url={qrUrl}
              size={280}
              title={displayTitle}
              subtitle={displayDescription}
              showDownload={true}
              showShare={true}
              showCopyLink={true}
            />
          )}
        </div>

        {/* Print Button */}
        {showPrint && (
          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            <button
              onClick={handlePrint}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              {t("print") || "Print"}
            </button>
            <DialogClose asChild>
              <button className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-medium transition-colors">
                {t("close") || "Close"}
              </button>
            </DialogClose>
          </div>
        )}

        {/* Print Styles */}
        <style>{`
          @media print {
            body * {
              visibility: hidden;
            }
            [data-dialog-content-print] {
              visibility: visible;
              position: absolute;
              left: 0;
              top: 0;
            }
          }
        `}</style>
      </DialogContent>
    </Dialog>
  );
}

export default QrMenuModal;

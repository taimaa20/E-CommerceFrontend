"use client";

import React, { useRef } from "react";
import { Download, Share2, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/components/locale-provider";
import { cn } from "@/lib/utils";

interface QrCodeComponentProps {
  /**
   * URL to encode in QR code
   */
  url: string;

  /**
   * Size of QR code in pixels (default: 256)
   */
  size?: number;

  /**
   * Title for the QR code display
   */
  title?: string;

  /**
   * Subtitle/description
   */
  subtitle?: string;

  /**
   * Show download button (default: true)
   */
  showDownload?: boolean;

  /**
   * Show share button (default: true)
   */
  showShare?: boolean;

  /**
   * Show copy link button (default: true)
   */
  showCopyLink?: boolean;

  /**
   * Custom CSS class
   */
  className?: string;

  /**
   * Callback when download is clicked
   */
  onDownload?: () => void;
}

/**
 * QR Code Component - Displays QR code with actions
 * Uses qrcode.react library (must be installed: npm install qrcode.react)
 */
export function QrCodeComponent({
  url,
  size = 256,
  title,
  subtitle,
  showDownload = true,
  showShare = true,
  showCopyLink = true,
  className,
  onDownload,
}: QrCodeComponentProps) {
  const { t } = useLocale();
  const qrRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = React.useState(false);

  // Generate QR code dynamically without importing the library
  // Using QR code API as fallback if library is not installed
  const generateQrImageUrl = (dataUrl: string) => {
    // Using QR server API as fallback
    return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(dataUrl)}`;
  };

  const handleDownload = async () => {
    try {
      const qrImageUrl = generateQrImageUrl(url);
      const response = await fetch(qrImageUrl);
      const blob = await response.blob();
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `menu-qr-${Date.now()}.png`;
      link.click();
      
      toast.success(t("downloaded") || "Downloaded successfully");
      onDownload?.();
    } catch (error) {
      toast.error(t("downloadFailed") || "Failed to download QR code");
      console.error("Download failed:", error);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success(t("copiedToClipboard") || "Copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t("copyFailed") || "Failed to copy");
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: title || "Menu",
          text: subtitle || "Scan to view our menu",
          url: url,
        });
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          console.error("Share failed:", error);
        }
      }
    } else {
      handleCopyLink();
    }
  };

  const qrImageUrl = generateQrImageUrl(url);

  return (
    <div
      className={cn(
        "flex flex-col items-center gap-4 rounded-2xl border border-gray-200 bg-gradient-to-br from-white to-gray-50 p-4 sm:gap-6 sm:p-6",
        className
      )}
    >
      {/* Title */}
      {title && (
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          {subtitle && <p className="text-sm text-gray-600 mt-1">{subtitle}</p>}
        </div>
      )}

      {/* QR Code Display */}
      <div
        ref={qrRef}
        className="max-w-full rounded-xl border-2 border-gray-100 bg-white p-3 shadow-sm sm:p-4"
      >
        <img
          src={qrImageUrl}
          alt="QR Code"
          width={size}
          height={size}
          className="h-auto w-[min(70vw,280px)] max-w-full rounded-lg sm:w-[min(100%,280px)]"
        />
      </div>

      {/* URL Display */}
      <div className="w-full">
        <p className="text-xs text-gray-500 text-center mb-2">Menu URL:</p>
        <div className="px-3 py-2 bg-gray-100 rounded-lg break-all text-xs text-gray-700 select-all">
          {url}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2 w-full justify-center">
        {showCopyLink && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleCopyLink}
            className="gap-2"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4" />
                {t("copied") || "Copied"}
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                {t("copy") || "Copy"}
              </>
            )}
          </Button>
        )}

        {showDownload && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleDownload}
            className="gap-2"
          >
            <Download className="w-4 h-4" />
            {t("download") || "Download"}
          </Button>
        )}

        {showShare && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleShare}
            className="gap-2"
          >
            <Share2 className="w-4 h-4" />
            {t("share") || "Share"}
          </Button>
        )}
      </div>
    </div>
  );
}

export default QrCodeComponent;

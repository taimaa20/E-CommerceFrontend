"use client";

import React, { useState } from "react";
import { QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/components/locale-provider";
import { QrMenuModal } from "./QrMenuModal";

interface QrMenuButtonProps {
  /**
   * Button text (optional, defaults to QR label)
   */
  label?: string;

  /**
   * Button variant
   */
  variant?: "default" | "outline" | "ghost" | "secondary";

  /**
   * Button size
   */
  size?: "default" | "sm" | "lg";

  /**
   * Show text label (default: true)
   */
  showLabel?: boolean;

  /**
   * Menu URL (optional, defaults to /menu)
   */
  menuUrl?: string;

  /**
   * Custom className
   */
  className?: string;

  /**
   * Callback when modal opens
   */
  onOpen?: () => void;

  /**
   * Callback when modal closes
   */
  onClose?: () => void;
}

/**
 * QR Menu Button - Quick access button to open QR menu modal
 * Used in Cashier, Waiter, Kitchen, and other staff views
 */
export function QrMenuButton({
  label,
  variant = "outline",
  size = "default",
  showLabel = true,
  menuUrl,
  className,
  onOpen,
  onClose,
}: QrMenuButtonProps) {
  const { locale } = useLocale();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleOpen = () => {
    setIsModalOpen(true);
    onOpen?.();
  };

  const handleClose = () => {
    setIsModalOpen(false);
    onClose?.();
  };

  const buttonLabel =
    label || (locale === "ar" ? "قائمة QR" : "QR Menu");

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={handleOpen}
        className={className}
      >
        <QrCode className="w-4 h-4" />
        {showLabel && <span className="ms-1 hidden sm:inline">{buttonLabel}</span>}
      </Button>

      <QrMenuModal
        isOpen={isModalOpen}
        onClose={handleClose}
        menuUrl={menuUrl}
        showPrint={true}
      />
    </>
  );
}

export default QrMenuButton;

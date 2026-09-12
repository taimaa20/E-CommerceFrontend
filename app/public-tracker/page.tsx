"use client";

import { redirect } from "next/navigation";
import { useEffect } from "react";

/**
 * Public Customer View for Order Tracker
 * 
 * This page automatically redirects to the staff tracker in customer view mode.
 * The `?mode=customer` query parameter:
 * - Hides all action buttons (Served, Picked Up)
 * - Hides staff-only stats and controls
 * - Shows only order number, status, and order type
 * 
 * Usage:
 * - Direct URL: https://your-app.com/public-tracker
 * - QR code target: /public-tracker
 * - Safe for customers to see
 */
export default function PublicTrackerPage() {
    useEffect(() => {
        // Redirect to staff tracker with customer view mode enabled
        redirect("/tracker?mode=customer");
    }, []);

    // This component will redirect before rendering
    return null;
}

"use client";

/**
 * Public Tracker Page (Customer View)
 * 
 * URL: /tracker/public OR /tracker?mode=customer
 * 
 * This page displays the order tracker in READ-ONLY customer mode:
 * - No action buttons (Served, Picked Up)
 * - No internal stats
 * - No refresh controls
 * - Clean, simple display of order status only
 * 
 * For secure access, this can be wrapped with:
 * - QR code tokens
 * - Email links with short-lived tokens
 * - Room/table tokens
 */

import { redirect } from "next/navigation";

export default function PublicTrackerPage() {
    // Redirect to the same tracker page with customer view mode enabled
    redirect("/tracker?mode=customer");
}

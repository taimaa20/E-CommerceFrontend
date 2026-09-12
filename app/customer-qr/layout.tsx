import type { Metadata, Viewport } from "next";
import "./customer-qr.css";

export const metadata: Metadata = {
  title: "Scan & Order",
  description: "Order and pay from your table — no apps, no signup.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0f172a",
};

/**
 * Module-scoped layout. The root layout still wraps this segment, but
 * everything inside uses its own state namespace (cqr:* localStorage)
 * so the diner-facing experience never collides with operator surfaces.
 */
export default function CustomerQrLayout({ children }: { children: React.ReactNode }) {
  return <div data-feature="customer-qr">{children}</div>;
}

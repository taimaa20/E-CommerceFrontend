import type { Metadata, Viewport } from "next";
import "@/app/website/website.css";
import WebsiteScope from "@/app/website/components/WebsiteScope";

export const metadata: Metadata = {
  title: "Terms & Policies — Sando Box",
  description:
    "Terms, refund, privacy, security, service, and shipping policies for Sando Box.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#e8332a",
};

// Standalone informative route. Reuses the website's scoped tokens and
// RTL handling so it stays visually consistent with /website without
// nesting under it.
export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return <WebsiteScope>{children}</WebsiteScope>;
}

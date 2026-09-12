import type { Metadata, Viewport } from "next";
import "./website.css";
import WebsiteScope from "./components/WebsiteScope";

export const metadata: Metadata = {
  title: "Sando Box — Crafted Sandos. Bold Flavors.",
  description:
    "Sando Box — handcrafted signature sandos, premium ingredients, served fresh in our signature box. Downtown Cairo.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#e8332a",
};

// Isolated layout: the /website route does NOT inherit the POS AppHeader,
// providers, or any of its UI. It stands alone as a mini-app.
export default function WebsiteLayout({ children }: { children: React.ReactNode }) {
  return <WebsiteScope>{children}</WebsiteScope>;
}

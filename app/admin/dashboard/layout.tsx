"use client";

import * as React from "react";
import { useLocale } from "@/components/locale-provider";
import "@/styles/dashboard.css";

/**
 * Dashboard layout — just the shared `.dash` design-system shell. Navigation
 * between dashboards is provided by the admin sidebar (each dashboard lives
 * under its own category there), so the in-page scope-tab bar was redundant
 * and has been removed.
 */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const { dir } = useLocale();
    return (
        <div className="dash" dir={dir} style={{ minHeight: "100%", background: "#ffffff" }}>
            {children}
        </div>
    );
}

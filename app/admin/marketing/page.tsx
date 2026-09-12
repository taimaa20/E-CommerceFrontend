import { redirect } from "next/navigation";

// The Marketing section's landing route — sends operators to the loyalty dashboard.
// Individual areas (settings, wallets, rules, tiers, segments, merge) have their own pages.
export default function MarketingIndexPage() {
    redirect("/ntxadminpos/marketing/dashboard");
}

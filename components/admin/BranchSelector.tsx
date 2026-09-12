"use client";

import { useEffect } from "react";
import { Building2 } from "lucide-react";
import { toast } from "sonner";
import { StandardFilter, type StandardFilterOption } from "@/components/filters/StandardFilter";
import { useLocale } from "@/components/locale-provider";
import { useAuthStore } from "@/store/authStore";
import { useBranchContextStore } from "@/store/branchContextStore";

export default function BranchSelector() {
    const { locale } = useLocale();
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const context = useBranchContextStore((state) => state.context);
    const loading = useBranchContextStore((state) => state.loading);
    const loadContext = useBranchContextStore((state) => state.loadContext);
    const switchBranch = useBranchContextStore((state) => state.switchBranch);
    const resetBranchContext = useBranchContextStore((state) => state.resetBranchContext);
    const ar = locale === "ar";

    useEffect(() => {
        if (!isAuthenticated) {
            resetBranchContext();
            return;
        }

        void loadContext();
    }, [isAuthenticated, loadContext, resetBranchContext]);

    if (!isAuthenticated || loading || !context?.requiresBranchSelector) {
        return null;
    }

    const label = ar ? "الفرع الحالي" : "Current branch";
    const branchOptions = context.assignedBranches.map((branch): StandardFilterOption => ({
        value: branch.id,
        label: `${getBranchName(branch, ar)} · ${branch.code}`,
        disabled: !branch.isActive,
        searchText: `${branch.name} ${branch.nameAr ?? ""} ${branch.code}`,
    }));

    const handleChange = async (branchId: string) => {
        try {
            const next = await switchBranch(branchId);
            toast.success(ar ? "تم تغيير الفرع" : "Branch switched", {
                description: getBranchName(next.currentBranch, ar),
            });
        } catch (error) {
            toast.error(getErrorMessage(error, ar));
        }
    };

    return (
        <div className="flex min-w-0 items-center gap-2">
            <Building2 className="hidden h-4 w-4 text-slate-500 sm:block" />
            <StandardFilter
                value={context.currentBranch.id}
                onValueChange={(branchId) => {
                    if (branchId) void handleChange(branchId);
                }}
                options={branchOptions}
                placeholder={label}
                searchPlaceholder={ar ? "ابحث عن فرع..." : "Search branches..."}
                emptyText={ar ? "لا توجد فروع" : "No branches found"}
                loadingText={ar ? "جار التحميل..." : "Loading..."}
                clearLabel={ar ? "مسح" : "Clear"}
                clearable={false}
                align="end"
                disabled={loading}
                triggerClassName="h-9 min-h-9 w-36 border-slate-200 px-3 py-1 text-sm sm:w-48"
                contentClassName="min-w-64"
            />
        </div>
    );
}

function getBranchName(branch: { name: string; nameAr?: string | null }, ar: boolean): string {
    return ar ? branch.nameAr || branch.name : branch.name;
}

function getErrorMessage(error: unknown, ar: boolean): string {
    return error instanceof Error && error.message.trim()
        ? error.message
        : ar
        ? "تعذر تغيير الفرع"
        : "Could not switch branch";
}

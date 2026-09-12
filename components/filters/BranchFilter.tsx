"use client";

import * as React from "react";
import { Building2 } from "lucide-react";
import { StandardFilter, type StandardFilterOption } from "@/components/filters/StandardFilter";
import { useLocale } from "@/components/locale-provider";
import { DASHBOARD_ALL_BRANCHES_ID } from "@/lib/dashboard/filter-types";
import { useAuthStore } from "@/store/authStore";
import { useBranchContextStore } from "@/store/branchContextStore";
import { UserRole } from "@/types/auth";
import { isAdminRole } from "@/lib/authorization";

export const BRANCH_FILTER_CURRENT = "";
export const BRANCH_FILTER_ALL = DASHBOARD_ALL_BRANCHES_ID;

interface BranchFilterProps {
    value: string | null | undefined;
    onValueChange: (value: string) => void;
    allValue?: string;
    currentValue?: string;
    includeAll?: boolean;
    includeCurrent?: boolean;
    hideWhenSingleBranch?: boolean;
    label?: string;
    placeholder?: string;
    disabled?: boolean;
    className?: string;
    triggerClassName?: string;
    contentClassName?: string;
    align?: "start" | "center" | "end";
    icon?: React.ReactNode;
    clearable?: boolean;
}

export function BranchFilter({
    value,
    onValueChange,
    allValue = BRANCH_FILTER_ALL,
    currentValue = BRANCH_FILTER_CURRENT,
    includeAll = true,
    includeCurrent = true,
    hideWhenSingleBranch = true,
    label,
    placeholder,
    disabled,
    className,
    triggerClassName,
    contentClassName,
    align,
    icon = <Building2 className="h-4 w-4" />,
    clearable = false,
}: BranchFilterProps) {
    const { locale, t } = useLocale();
    const ar = locale === "ar";
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const user = useAuthStore((state) => state.user);
    const context = useBranchContextStore((state) => state.context);
    const loading = useBranchContextStore((state) => state.loading);
    const loadContext = useBranchContextStore((state) => state.loadContext);
    const canViewAllBranches = isAdminRole(user?.role) || user?.role === UserRole.Manager;
    const branchLabel = label ?? t("branchFilterLabel");

    React.useEffect(() => {
        if (!isAuthenticated || context || loading) return;
        void loadContext();
    }, [context, isAuthenticated, loadContext, loading]);

    const branches = context?.assignedBranches.filter((branch) => branch.isActive) ?? [];
    const showAll = includeAll && canViewAllBranches;

    if (hideWhenSingleBranch && branches.length <= 1 && !showAll) {
        return null;
    }

    const currentBranch = context?.currentBranch;
    const options: StandardFilterOption[] = [
        ...(includeCurrent && currentBranch
            ? [{
                value: currentValue,
                label: `${t("currentBranchFilter")}: ${branchName(currentBranch, ar)}`,
                description: currentBranch.code,
                searchText: `${currentBranch.name} ${currentBranch.nameAr ?? ""} ${currentBranch.code}`,
            }]
            : []),
        ...branches.map((branch) => ({
            value: branch.id,
            label: branchName(branch, ar),
            description: branch.code,
            searchText: `${branch.name} ${branch.nameAr ?? ""} ${branch.code}`,
        })),
        ...(showAll
            ? [{ value: allValue, label: t("allBranchesFilter") }]
            : []),
    ];

    return (
        <StandardFilter
            value={value ?? currentValue}
            onValueChange={(next) => onValueChange(next ?? currentValue)}
            options={options}
            icon={icon}
            label={branchLabel}
            placeholder={placeholder ?? branchLabel}
            searchPlaceholder={t("searchBranchesFilter")}
            emptyText={t("noBranchesFilter")}
            loadingText={t("loadingText")}
            clearLabel={t("filterClear")}
            clearable={clearable}
            loading={loading}
            disabled={disabled || loading || !isAuthenticated}
            align={align}
            className={className}
            triggerClassName={triggerClassName}
            contentClassName={contentClassName}
        />
    );
}

function branchName(branch: { name: string; nameAr?: string | null }, ar: boolean): string {
    return ar ? branch.nameAr || branch.name : branch.name;
}

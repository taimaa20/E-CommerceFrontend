import { api } from "@/lib/api";

export interface BranchContextBranchDto {
    id: string;
    name: string;
    nameAr?: string | null;
    code: string;
    isMainBranch: boolean;
    isActive: boolean;
    isDefault: boolean;
    isCurrent: boolean;
}

export interface BranchContextDto {
    tenantId: string;
    userId: string;
    currentBranch: BranchContextBranchDto;
    assignedBranches: BranchContextBranchDto[];
    requiresBranchSelector: boolean;
}

export async function getBranchContext(): Promise<BranchContextDto> {
    const response = await api.get<BranchContextDto>("/branch-context");
    return response.data;
}

export async function switchBranch(branchId: string): Promise<BranchContextDto> {
    const response = await api.post<BranchContextDto>("/branch-context/switch", { branchId });
    return response.data;
}

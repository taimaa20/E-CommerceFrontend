import { api } from "@/lib/api";

export interface UserBranchAssignment {
    id: string;
    userId: string;
    branchId: string;
    branchName: string;
    branchNameAr?: string | null;
    branchCode: string;
    branchIsActive: boolean;
    isDefault: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface UserBranchAssignments {
    userId: string;
    username: string;
    fullName?: string | null;
    fullNameAr?: string | null;
    assignments: UserBranchAssignment[];
}

export async function getUserBranchAssignments(userId: string): Promise<UserBranchAssignments> {
    const response = await api.get<UserBranchAssignments>(`/users/${userId}/branches`);
    return response.data;
}

export async function assignUserBranch(
    userId: string,
    branchId: string,
    isDefault = false
): Promise<UserBranchAssignments> {
    const response = await api.post<UserBranchAssignments>(
        `/users/${userId}/branches`,
        { branchId, isDefault }
    );
    return response.data;
}

export async function setUserDefaultBranch(
    userId: string,
    branchId: string
): Promise<UserBranchAssignments> {
    const response = await api.post<UserBranchAssignments>(
        `/users/${userId}/branches/${branchId}/default`,
        {}
    );
    return response.data;
}

export async function removeUserBranch(
    userId: string,
    branchId: string,
    newDefaultBranchId?: string
): Promise<UserBranchAssignments> {
    const query = newDefaultBranchId
        ? `?newDefaultBranchId=${encodeURIComponent(newDefaultBranchId)}`
        : "";
    const response = await api.delete<UserBranchAssignments>(
        `/users/${userId}/branches/${branchId}${query}`
    );
    return response.data;
}

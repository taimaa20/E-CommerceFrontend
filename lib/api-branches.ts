import { api } from "@/lib/api";

const BRANCHES_ENDPOINT = "/branches";

export interface BranchDto {
    id: string;
    tenantId: string;
    name: string;
    nameAr?: string | null;
    code: string;
    description?: string | null;
    address?: string | null;
    phone?: string | null;
    email?: string | null;
    isMainBranch: boolean;
    isActive: boolean;
    createdById?: string | null;
    createdBy?: string | null;
    updatedById?: string | null;
    updatedBy?: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface BranchPayload {
    name: string;
    nameAr?: string | null;
    code: string;
    description?: string | null;
    address?: string | null;
    phone?: string | null;
    email?: string | null;
    isMainBranch: boolean;
    isActive: boolean;
}

export interface BranchPagedResult {
    items: BranchDto[];
    totalCount: number;
    pageNumber: number;
    pageSize: number;
    totalPages: number;
}

interface BranchPagedApiResult {
    items?: BranchDto[];
    totalCount?: number;
    page?: number;
    pageNumber?: number;
    pageSize?: number;
    totalPages?: number;
}

export interface BranchQuery {
    page?: number;
    pageSize?: number;
    search?: string;
    isActive?: boolean;
}

export function getBranchName(branch: Pick<BranchDto, "name" | "nameAr">, ar: boolean): string {
    return ar ? branch.nameAr || branch.name : branch.name;
}

export async function getBranches(query: BranchQuery = {}): Promise<BranchPagedResult> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const response = await api.get<BranchPagedApiResult>(BRANCHES_ENDPOINT, {
        params: {
            page,
            pageSize,
            search: query.search?.trim() || undefined,
            isActive: query.isActive,
        },
    });
    const data = response.data ?? {};
    return {
        items: data.items ?? [],
        totalCount: data.totalCount ?? 0,
        pageNumber: data.page ?? data.pageNumber ?? page,
        pageSize: data.pageSize ?? pageSize,
        totalPages: data.totalPages ?? Math.max(1, Math.ceil((data.totalCount ?? 0) / pageSize)),
    };
}

export async function createBranch(payload: BranchPayload): Promise<BranchDto> {
    const response = await api.post<BranchDto>(BRANCHES_ENDPOINT, payload);
    return response.data;
}

export async function updateBranch(id: string, payload: BranchPayload): Promise<BranchDto> {
    const response = await api.put<BranchDto>(`${BRANCHES_ENDPOINT}/${id}`, payload);
    return response.data;
}

export async function activateBranch(id: string): Promise<BranchDto> {
    const response = await api.post<BranchDto>(`${BRANCHES_ENDPOINT}/${id}/activate`, {});
    return response.data;
}

export async function deactivateBranch(id: string): Promise<BranchDto> {
    const response = await api.post<BranchDto>(`${BRANCHES_ENDPOINT}/${id}/deactivate`, {});
    return response.data;
}

export async function setMainBranch(id: string): Promise<BranchDto> {
    const response = await api.post<BranchDto>(`${BRANCHES_ENDPOINT}/${id}/set-main`, {});
    return response.data;
}

export async function deleteBranch(id: string): Promise<void> {
    await api.delete(`${BRANCHES_ENDPOINT}/${id}`);
}

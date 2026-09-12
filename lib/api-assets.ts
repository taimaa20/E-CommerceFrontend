import { api } from "@/lib/api";
import { config } from "@/lib/config";
import { useAuthStore } from "@/store/authStore";

export type AssetStatus = "Active" | "InMaintenance" | "Damaged" | "Lost" | "Retired" | "Disposed" | "InStorage";
export type AssetCondition = "Excellent" | "Good" | "Fair" | "Damaged" | "Critical";
export type AssetAttachmentType = "Invoice" | "WarrantyDocument" | "Manual" | "Photo" | "MaintenanceReport" | "Receipt" | "Video" | "Other";
export type AssetMaintenanceStatus = "Scheduled" | "InProgress" | "Completed" | "Cancelled" | "Overdue";

export interface PaginatedResponse<T> {
    items: T[];
    totalCount: number;
    pageNumber: number;
    pageSize: number;
}

export interface AssetQuery {
    page?: number;
    pageSize?: number;
    search?: string;
    categoryId?: string;
    status?: AssetStatus | "";
    condition?: AssetCondition | "";
    assignedEmployeeId?: string;
    dateFrom?: string;
    dateTo?: string;
    maintenanceStatus?: AssetMaintenanceStatus | "";
    warrantyExpiry?: string;
    sortBy?: string;
    sortDirection?: "asc" | "desc";
}

export interface AssetPayload {
    assetNameEn: string;
    assetNameAr: string;
    descriptionEn?: string | null;
    descriptionAr?: string | null;
    assetCategoryId: string;
    assetType?: string | null;
    brand?: string | null;
    model?: string | null;
    serialNumber?: string | null;
    barcode?: string | null;
    purchaseDate?: string | null;
    purchaseCost?: number | null;
    currentValue?: number | null;
    warrantyStartDate?: string | null;
    warrantyEndDate?: string | null;
    supplierName?: string | null;
    status?: AssetStatus;
    condition?: AssetCondition;
    assignedToEmployeeId?: string | null;
    assignedLocation?: string | null;
    department?: string | null;
    notes?: string | null;
    isActive: boolean;
}

export interface AssetListItem {
    id: string;
    assetCode: string;
    assetName: string;
    assetNameEn: string;
    assetNameAr: string;
    assetCategoryId: string;
    categoryName: string;
    categoryColor?: string | null;
    categoryIcon?: string | null;
    assetType?: string | null;
    brand?: string | null;
    model?: string | null;
    serialNumber?: string | null;
    barcode?: string | null;
    qrCode?: string | null;
    purchaseCost?: number | null;
    currentValue?: number | null;
    warrantyEndDate?: string | null;
    status: AssetStatus;
    condition: AssetCondition;
    assignedToEmployeeId?: string | null;
    assignedToEmployeeName?: string | null;
    assignedLocation?: string | null;
    department?: string | null;
    isActive: boolean;
    attachmentsCount: number;
    maintenanceCount: number;
    createdAt: string;
    updatedAt: string;
}

export interface AssetDetails extends AssetListItem {
    descriptionEn?: string | null;
    descriptionAr?: string | null;
    purchaseDate?: string | null;
    warrantyStartDate?: string | null;
    supplierName?: string | null;
    notes?: string | null;
    createdById?: string | null;
    createdBy?: string | null;
    updatedById?: string | null;
    updatedBy?: string | null;
    attachments: AssetAttachment[];
    maintenanceHistory: AssetMaintenanceRecord[];
    activityTimeline: AssetActivityLog[];
}

export interface AssetCategory {
    id: string;
    nameEn: string;
    nameAr: string;
    displayName: string;
    icon?: string | null;
    color?: string | null;
    isActive: boolean;
    sortOrder: number;
    assetCount: number;
}

export interface AssetCategoryPayload {
    nameEn: string;
    nameAr: string;
    icon?: string | null;
    color?: string | null;
    isActive: boolean;
    sortOrder: number;
}

export interface AssetAttachment {
    id: string;
    assetId: string;
    maintenanceRecordId?: string | null;
    fileName: string;
    originalFileName: string;
    fileExtension: string;
    fileSize: number;
    mimeType: string;
    filePath: string;
    fileUrl: string;
    downloadUrl: string;
    attachmentType: AssetAttachmentType;
    uploadedAt: string;
    uploadedById?: string | null;
    uploadedBy?: string | null;
}

export interface AssetMaintenanceQuery {
    page?: number;
    pageSize?: number;
    assetId?: string;
    status?: AssetMaintenanceStatus | "";
    dateFrom?: string;
    dateTo?: string;
    dueOnly?: boolean;
}

export interface AssetMaintenancePayload {
    maintenanceType: string;
    description: string;
    cost: number;
    performedBy?: string | null;
    vendor?: string | null;
    maintenanceDate: string;
    nextMaintenanceDate?: string | null;
    status?: AssetMaintenanceStatus;
    notes?: string | null;
}

export interface AssetMaintenanceRecord {
    id: string;
    assetId: string;
    assetCode: string;
    assetName: string;
    maintenanceType: string;
    description: string;
    cost: number;
    performedBy?: string | null;
    vendor?: string | null;
    maintenanceDate: string;
    nextMaintenanceDate?: string | null;
    status: AssetMaintenanceStatus;
    notes?: string | null;
    createdBy?: string | null;
    createdAt: string;
    attachmentsCount: number;
}

export interface AssetActivityLogQuery {
    page?: number;
    pageSize?: number;
    assetId?: string;
    actionType?: string;
    dateFrom?: string;
    dateTo?: string;
}

export interface AssetActivityLog {
    id: string;
    assetId: string;
    assetCode: string;
    assetName: string;
    actionType: string;
    oldValue?: string | null;
    newValue?: string | null;
    performedById?: string | null;
    performedBy?: string | null;
    timestamp: string;
    ipAddress?: string | null;
    deviceInfo?: string | null;
}

export interface AssetChartPoint {
    label: string;
    value: number;
    color?: string | null;
}

export interface AssetTrendPoint {
    period: string;
    value: number;
}

export interface AssetDashboard {
    totalAssets: number;
    activeAssets: number;
    assetsInMaintenance: number;
    damagedAssets: number;
    expiringWarranties: number;
    assetValue: number;
    maintenanceCostThisMonth: number;
    assetsByCategory: AssetChartPoint[];
    assetsByStatus: AssetChartPoint[];
    maintenanceTrend: AssetTrendPoint[];
    assetCostTrend: AssetTrendPoint[];
}

const ASSETS_ROOT = "/assets";
const CATEGORIES_ROOT = "/asset-categories";

function paramsFrom(query: object = {}) {
    const params: Record<string, string | number | boolean> = {};
    Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
            params[key] = value as string | number | boolean;
        }
    });
    return params;
}

export const assetsApi = {
    list: async (query: AssetQuery): Promise<PaginatedResponse<AssetListItem>> => {
        const res = await api.get<PaginatedResponse<AssetListItem>>(ASSETS_ROOT, { params: paramsFrom(query) });
        return res.data;
    },
    exportUrl: (query: AssetQuery): string => {
        const params = new URLSearchParams();
        Object.entries(paramsFrom(query)).forEach(([key, value]) => params.set(key, String(value)));
        return `/api/api-proxy/assets/export${params.toString() ? `?${params.toString()}` : ""}`;
    },
    exportCsv: async (query: AssetQuery): Promise<Blob> => {
        const token = useAuthStore.getState().user?.token;
        const response = await fetch(assetsApi.exportUrl(query), {
            headers: {
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
                ...(config.tenantId ? { "X-Tenant-ID": config.tenantId } : {}),
            },
        });
        if (!response.ok) throw new Error(await response.text());
        return response.blob();
    },
    dashboard: async (): Promise<AssetDashboard> => {
        const res = await api.get<AssetDashboard>(`${ASSETS_ROOT}/dashboard`);
        return res.data;
    },
    details: async (id: string): Promise<AssetDetails> => {
        const res = await api.get<AssetDetails>(`${ASSETS_ROOT}/${id}`);
        return res.data;
    },
    create: async (payload: AssetPayload): Promise<AssetDetails> => {
        const res = await api.post<AssetDetails>(ASSETS_ROOT, payload);
        return res.data;
    },
    update: async (id: string, payload: AssetPayload): Promise<AssetDetails> => {
        const res = await api.put<AssetDetails>(`${ASSETS_ROOT}/${id}`, payload);
        return res.data;
    },
    remove: async (id: string): Promise<void> => {
        await api.delete(`${ASSETS_ROOT}/${id}`);
    },
    restore: async (id: string): Promise<void> => {
        await api.post(`${ASSETS_ROOT}/${id}/restore`, {});
    },
    uploadAttachment: async (
        id: string,
        file: File,
        attachmentType: AssetAttachmentType,
        maintenanceRecordId?: string | null,
    ): Promise<AssetAttachment> => {
        const form = new FormData();
        form.append("file", file);
        form.append("attachmentType", attachmentType);
        if (maintenanceRecordId) form.append("maintenanceRecordId", maintenanceRecordId);
        const res = await api.post<AssetAttachment>(`${ASSETS_ROOT}/${id}/attachments`, form, {
            headers: { "Content-Type": "multipart/form-data" },
        });
        return res.data;
    },
    deleteAttachment: async (assetId: string, attachmentId: string): Promise<void> => {
        await api.delete(`${ASSETS_ROOT}/${assetId}/attachments/${attachmentId}`);
    },
    // Streams the attachment through the BFF proxy with the user's JWT, then
    // triggers a browser download. The backend's DownloadUrl is a relative
    // `/api/...` path that would resolve against the frontend origin, and the
    // endpoint is `[Authorize]` so a plain `<a href>` click would 401.
    downloadAttachment: async (assetId: string, attachmentId: string, fileName: string): Promise<void> => {
        const token = useAuthStore.getState().user?.token;
        const tenantId =
            useAuthStore.getState().user?.tenantId
            || (typeof window !== "undefined" ? localStorage.getItem("tenantId") : null)
            || config.tenantId;

        const response = await fetch(
            `/api/api-proxy/assets/${assetId}/attachments/${attachmentId}/download`,
            {
                headers: {
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                    ...(tenantId ? { "X-Tenant-ID": tenantId } : {}),
                },
            },
        );
        if (!response.ok) throw new Error(await response.text());

        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = blobUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(blobUrl);
    },
    maintenance: async (query: AssetMaintenanceQuery): Promise<PaginatedResponse<AssetMaintenanceRecord>> => {
        const res = await api.get<PaginatedResponse<AssetMaintenanceRecord>>(`${ASSETS_ROOT}/maintenance`, { params: paramsFrom(query) });
        return res.data;
    },
    addMaintenance: async (assetId: string, payload: AssetMaintenancePayload): Promise<AssetMaintenanceRecord> => {
        const res = await api.post<AssetMaintenanceRecord>(`${ASSETS_ROOT}/${assetId}/maintenance`, payload);
        return res.data;
    },
    logs: async (query: AssetActivityLogQuery): Promise<PaginatedResponse<AssetActivityLog>> => {
        const res = await api.get<PaginatedResponse<AssetActivityLog>>(`${ASSETS_ROOT}/logs`, { params: paramsFrom(query) });
        return res.data;
    },
    assetLogs: async (assetId: string, query: AssetActivityLogQuery): Promise<PaginatedResponse<AssetActivityLog>> => {
        const res = await api.get<PaginatedResponse<AssetActivityLog>>(`${ASSETS_ROOT}/${assetId}/logs`, { params: paramsFrom(query) });
        return res.data;
    },
};

export const assetCategoriesApi = {
    list: async (activeOnly = false): Promise<AssetCategory[]> => {
        const res = await api.get<AssetCategory[]>(CATEGORIES_ROOT, { params: { activeOnly } });
        return res.data || [];
    },
    create: async (payload: AssetCategoryPayload): Promise<AssetCategory> => {
        const res = await api.post<AssetCategory>(CATEGORIES_ROOT, payload);
        return res.data;
    },
    update: async (id: string, payload: AssetCategoryPayload): Promise<AssetCategory> => {
        const res = await api.put<AssetCategory>(`${CATEGORIES_ROOT}/${id}`, payload);
        return res.data;
    },
    remove: async (id: string): Promise<void> => {
        await api.delete(`${CATEGORIES_ROOT}/${id}`);
    },
};

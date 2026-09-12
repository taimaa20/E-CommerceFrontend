import { api } from "@/lib/api";

export interface RawMaterialConsumptionQuery {
    rawMaterialId: string;
    fromUtc: string;
    toUtc: string;
    branchId?: string;
    categoryId?: string;
    productId?: string;
    orderChannel?: string;
    orderStatus?: string;
    search?: string;
    sortBy?: string;
    sortDirection?: "asc" | "desc";
    timelineGrouping?: "hour" | "day" | "week" | "month";
    page: number;
    pageSize: number;
    detailPage?: number;
    detailPageSize?: number;
}

export interface ConsumptionLeader {
    id?: string | null;
    name: string;
    nameAr?: string | null;
    consumed: number;
}

export interface CategoryConsumption {
    categoryId?: string | null;
    categoryName: string;
    categoryNameAr?: string | null;
    totalConsumed: number;
    percentage: number;
    orderCount: number;
}

export interface ProductConsumption {
    productId: string;
    productName: string;
    productNameAr?: string | null;
    categoryId?: string | null;
    categoryName: string;
    categoryNameAr?: string | null;
    quantitySold: number;
    recipeQuantityPerProduct: number;
    totalConsumed: number;
    percentage: number;
    orderCount: number;
}

export interface RawMaterialConsumptionReport {
    rawMaterialId: string;
    rawMaterialName: string;
    rawMaterialNameAr?: string | null;
    unit: string;
    fromUtc: string;
    toUtc: string;
    branchName: string;
    branchNameAr?: string | null;
    totalConsumed: number;
    productCount: number;
    categoryCount: number;
    orderCount: number;
    totalSalesQuantity: number;
    averageDailyConsumption: number;
    averageConsumptionPerOrder: number;
    highestConsumingProduct?: ConsumptionLeader | null;
    highestConsumingCategory?: ConsumptionLeader | null;
    categories: CategoryConsumption[];
    products: ProductConsumption[];
    details: ConsumptionDetail[];
    timeline: ConsumptionTimeline[];
    page: number;
    pageSize: number;
    totalPages: number;
    detailPage: number;
    detailPageSize: number;
    detailTotalCount: number;
    detailTotalPages: number;
}

export interface ConsumptionDetail {
    snapshotId: string; deductedAtUtc: string; orderId: string; orderNumber: string;
    productId: string; productName: string; productNameAr?: string | null;
    categoryName: string; categoryNameAr?: string | null; rawMaterialName: string;
    rawMaterialNameAr?: string | null; recipeQuantity: number; soldQuantity: number;
    totalConsumed: number; branchName: string; branchNameAr?: string | null;
    orderType: string; orderStatus: string;
}

export interface ConsumptionTimeline { bucketStartUtc: string; totalConsumed: number; orderCount: number; }

export async function getRawMaterialConsumption(query: RawMaterialConsumptionQuery) {
    const response = await api.get<RawMaterialConsumptionReport>(
        "/inventory/raw-material-consumption",
        { params: query },
    );
    return response.data;
}

export async function exportRawMaterialConsumption(format: "xlsx" | "csv", query: RawMaterialConsumptionQuery) {
    const response = await api.getBlob(`/inventory/raw-material-consumption/export/${format}`, { params: { ...query } });
    return response.data;
}

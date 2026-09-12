import { api } from "@/lib/api";

export enum CustomerManagementType {
    Direct = 0,
    Partner = 1,
}

export enum CustomerSortField {
    CustomerId = 0,
    Name = 1,
    Phone = 2,
    CustomerType = 3,
    PartnerName = 4,
    TotalOrders = 5,
    LastOrderDate = 6,
    Status = 7,
}

export enum CustomerOrderSortField {
    OrderDate = 0,
    OrderNumber = 1,
    TotalAmount = 2,
    Status = 3,
}

export enum CustomerSortDirection {
    Ascending = 0,
    Descending = 1,
}

export enum CustomerOrderStatus {
    New = 0,
    Preparing = 1,
    Ready = 2,
    Served = 3,
    Paid = 4,
    Cancelled = 5,
    Completed = 6,
}

export enum CustomerOrderType {
    DineIn = 0,
    Takeaway = 1,
    Delivery = 2,
}

export enum CustomerOrderSource {
    Pos = 0,
    Talabat = 1,
    DeliveryPartner = 2,
    Mobile = 3,
}

export interface PaginatedResponse<T> {
    items: T[];
    totalCount: number;
    pageNumber: number;
    pageSize: number;
}

export interface CustomerManagementQuery {
    pageNumber: number;
    pageSize: number;
    name?: string;
    phone?: string;
    partner?: string;
    customerType?: CustomerManagementType;
    isActive?: boolean;
    dateFrom?: string;
    dateTo?: string;
    branchId?: string;
    sortBy: CustomerSortField;
    sortDirection: CustomerSortDirection;
}

export interface CustomerOrdersQuery {
    pageNumber: number;
    pageSize: number;
    search?: string;
    status?: CustomerOrderStatus;
    dateFrom?: string;
    dateTo?: string;
    branchId?: string;
    sortBy: CustomerOrderSortField;
    sortDirection: CustomerSortDirection;
}

export interface CustomerAnalyticsQuery {
    dateFrom?: string;
    dateTo?: string;
    branchId?: string;
    customerType?: CustomerManagementType;
    partner?: string;
    isActive?: boolean;
    minOrders?: number;
    maxOrders?: number;
    minSpending?: number;
    maxSpending?: number;
    name?: string;
    phone?: string;
}

export interface CustomerManagementListItem {
    id: string;
    name: string;
    nameAr?: string | null;
    displayName: string;
    phoneNumber: string;
    email?: string | null;
    customerType: CustomerManagementType;
    partnerName?: string | null;
    partnerNameAr?: string | null;
    totalOrders: number;
    lastOrderDate?: string | null;
    createdAt?: string | null;
    isActive: boolean;
}

export interface CustomerOrderStatistics {
    totalOrders: number;
    completedOrders: number;
    cancelledOrders: number;
    totalSpend: number;
    averageOrderValue: number;
    firstOrderDate?: string | null;
    lastOrderDate?: string | null;
}

export interface CustomerPartnerInfo {
    partnerId?: string | null;
    name: string;
    nameAr?: string | null;
    code?: string | null;
    lastPartnerOrderNumber?: string | null;
    lastPartnerOrderDate: string;
}

export interface CustomerManagementDetails {
    id: string;
    name: string;
    nameAr?: string | null;
    displayName: string;
    phoneNumber: string;
    email?: string | null;
    birthDate?: string | null;
    customerType: CustomerManagementType;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    orderStatistics: CustomerOrderStatistics;
    partner?: CustomerPartnerInfo | null;
}

export interface CustomerManagementOrder {
    id: string;
    orderNumber: string;
    orderType: CustomerOrderType;
    orderSource: CustomerOrderSource;
    partnerName?: string | null;
    partnerNameAr?: string | null;
    itemCount: number;
    totalAmount: number;
    status: CustomerOrderStatus;
    orderDate: string;
}

export interface CustomerAnalyticsSummary {
    totalCustomers: number;
    activeCustomers: number;
    newCustomers: number;
    returningCustomers: number;
    inactiveCustomers: number;
    lostCustomers: number;
    directCustomers: number;
    partnerCustomers: number;
    totalOrders: number;
    totalRevenue: number;
    averageOrderValue: number;
    averageCustomerSpend: number;
    averageOrdersPerCustomer: number;
    customerGrowthPercent: number;
    retentionRatePercent: number;
}

export interface CustomerAnalyticsPoint {
    date: string;
    value: number;
}

export interface CustomerAnalyticsBreakdown {
    label: string;
    labelAr?: string | null;
    value: number;
    percent: number;
}

export interface CustomerAnalyticsPartnerBreakdown {
    name: string;
    nameAr?: string | null;
    customers: number;
    orders: number;
    revenue: number;
}

export interface CustomerAnalyticsCustomer {
    id: string;
    displayName: string;
    phoneNumber: string;
    customerType: CustomerManagementType;
    partnerName?: string | null;
    partnerNameAr?: string | null;
    totalOrders: number;
    totalSpending: number;
    averageOrderValue: number;
    firstOrderDate?: string | null;
    lastOrderDate?: string | null;
    createdAt?: string | null;
    isActive: boolean;
}

export interface CustomerAnalyticsActivity {
    customerId: string;
    customerName: string;
    phoneNumber: string;
    activityType: string;
    activityTypeAr: string;
    description: string;
    descriptionAr: string;
    orderNumber?: string | null;
    occurredAt: string;
}

export interface CustomerAnalyticsSegment {
    key: string;
    label: string;
    labelAr: string;
    count: number;
    percent: number;
    customers: CustomerAnalyticsCustomer[];
}

export interface CustomerAnalyticsPartnerOption {
    name: string;
    nameAr?: string | null;
}

export interface CustomerAnalyticsInsights {
    highestSpendingCustomer?: CustomerAnalyticsCustomer | null;
    mostFrequentCustomer?: CustomerAnalyticsCustomer | null;
    mostActivePartner?: CustomerAnalyticsPartnerOption | null;
    mostActiveDay?: string | null;
    mostActiveMonth?: string | null;
    averageCustomerLifetimeDays: number;
    averageDaysBetweenOrders: number;
}

export interface CustomerAnalyticsSnapshot {
    summary: CustomerAnalyticsSummary;
    insights: CustomerAnalyticsInsights;
    customerGrowth: CustomerAnalyticsPoint[];
    ordersTrend: CustomerAnalyticsPoint[];
    revenueTrend: CustomerAnalyticsPoint[];
    customerActivity: CustomerAnalyticsPoint[];
    customerDistribution: CustomerAnalyticsBreakdown[];
    customerStatus: CustomerAnalyticsBreakdown[];
    partnerDistribution: CustomerAnalyticsPartnerBreakdown[];
    customerRetention: CustomerAnalyticsPoint[];
    topCustomers: CustomerAnalyticsCustomer[];
    recentCustomers: CustomerAnalyticsCustomer[];
    recentActivity: CustomerAnalyticsActivity[];
    segments: CustomerAnalyticsSegment[];
    partnerOptions: CustomerAnalyticsPartnerOption[];
    branchesEnabled: boolean;
    generatedAtUtc: string;
}

export const customerManagementApi = {
    list: async (query: CustomerManagementQuery): Promise<PaginatedResponse<CustomerManagementListItem>> => {
        const response = await api.get<PaginatedResponse<CustomerManagementListItem>>("/customers", {
            params: query,
        });
        return response.data;
    },

    details: async (customerId: string, branchId?: string): Promise<CustomerManagementDetails> => {
        const response = await api.get<CustomerManagementDetails>(`/customers/${customerId}`, {
            params: branchId !== undefined ? { branchId } : undefined,
        });
        return response.data;
    },

    orders: async (
        customerId: string,
        query: CustomerOrdersQuery,
    ): Promise<PaginatedResponse<CustomerManagementOrder>> => {
        const response = await api.get<PaginatedResponse<CustomerManagementOrder>>(
            `/customers/${customerId}/orders`,
            { params: query },
        );
        return response.data;
    },

    dashboard: async (query: CustomerAnalyticsQuery): Promise<CustomerAnalyticsSnapshot> => {
        const response = await api.get<CustomerAnalyticsSnapshot>("/customer-analytics/dashboard", {
            params: query,
        });
        return response.data;
    },
};

import { api } from "./api";

export interface ProfitLossReportDto {
    startDate: string;
    endDate: string;
    productPerformance: ProductProfitabilityDto[];
    dailyStats: DailyProfitLossDto[];
    totalRevenue: number;
    totalInfoCost: number;
    totalNetProfit: number;
    totalMarginPercentage: number;
}

export interface ProductProfitabilityDto {
    productId: string;
    productName: string;
    totalSalesCount: number;
    totalRevenue: number;
    unitCost: number;
    totalCost: number;
    netProfit: number;
    marginPercentage: number;
}

export interface DailyProfitLossDto {
    date: string;
    revenue: number;
    cost: number;
    netProfit: number;
    margin: number;
}

export async function getProfitLossReport(startDate?: string, endDate?: string): Promise<ProfitLossReportDto | null> {
    try {
        const queryParams = new URLSearchParams();
        if (startDate) queryParams.append("startDate", startDate);
        if (endDate) queryParams.append("endDate", endDate);

        const response = await api.get(`/reports/profit-loss?${queryParams.toString()}`);
        return response.data;
    } catch (error) {
        console.error("Failed to fetch profit loss report:", error);
        return null;
    }
}

export interface DetailedReportResponse {
    currentPeriod: ProfitLossReportDto;
    previousPeriod: ProfitLossReportDto;
    comparison: ComparisonSummary;
}

export interface ComparisonSummary {
    revenueChangePercentage: number;
    netProfitChangePercentage: number;
    marginChangePercentage: number;
    costChangePercentage: number;
}

export async function getDetailedAnalysis(startDate?: string, endDate?: string): Promise<DetailedReportResponse | null> {
    try {
        const queryParams = new URLSearchParams();
        if (startDate) queryParams.append("startDate", startDate);
        if (endDate) queryParams.append("endDate", endDate);

        const response = await api.get(`/reports/detailed-analysis?${queryParams.toString()}`);
        return response.data;
    } catch (error) {
        console.error("Failed to fetch detailed analysis:", error);
        return null;
    }
}

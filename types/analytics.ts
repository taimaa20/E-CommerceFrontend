// Menu Engineering - BCG Matrix Categories
export enum MenuEngineeringCategory {
    Star = 0,       // Star: High Sales + High Profit
    Plow = 1,       // Plow Horse: High Sales + Low Profit
    Puzzle = 2,     // Puzzle: Low Sales + High Profit
    Dog = 3         // Dog: Low Sales + Low Profit
}

// Menu Engineering DTO
export interface MenuEngineeringDto {
    productId: string;
    productName: string;
    salesVolume: number;           // Sales Volume
    profitMargin: number;          // Profit Margin (%)
    revenue: number;               // Total Revenue
    totalProfit: number;           // Total Profit
    category: MenuEngineeringCategory;
}

// Intensity Heatmap - Hourly Data
export interface HeatmapDataDto {
    dayOfWeek: string;             // Monday, Tuesday, etc.
    dayIndex: number;              // 0 = Monday, 6 = Sunday
    hour: number;                  // 0-23
    averageRevenue: number;        // Average revenue for that hour
    averageWaiters: number;        // Average waiter count for that hour
    orderCount: number;            // Order count for that hour
    intensity: number;             // Normalized intensity between 0-1
}

// Özet İstatistikler
export interface AnalyticsSummaryDto {
    totalRevenue: number;
    totalProfit: number;
    averageProfitMargin: number;
    totalOrders: number;
    totalProductsSold: number;
    bestSellingProduct: string;
    mostProfitableProduct: string;
    peakHour: string;              // Peak hour
    peakDay: string;               // Peak day
}

// Genel Analytics Response
export interface AnalyticsResponseDto {
    menuEngineering: MenuEngineeringDto[];
    heatmapData: HeatmapDataDto[];
    summary: AnalyticsSummaryDto;
}

export const COST_SHARING_MODE = {
    RestaurantBearsAll: 0,
    CounterpartyBearsAll: 1,
    Shared: 2,
} as const;

export const COST_SHARING_SCOPE = {
    AllOrders: 0,
    PerPartnerOrCard: 1,
    PerOrder: 2,
} as const;

export type CostSharingMode = typeof COST_SHARING_MODE[keyof typeof COST_SHARING_MODE];
export type CostSharingScope = typeof COST_SHARING_SCOPE[keyof typeof COST_SHARING_SCOPE];

export interface CostSharingConfig {
    costSharingMode: CostSharingMode;
    costSharingScope: CostSharingScope;
    costSharingCommissionPercentage: number;
    costSharingRestaurantPercentage: number;
    costSharingCounterpartyPercentage: number;
}

export function getCostSharingModeLabel(mode: CostSharingMode | null | undefined, ar: boolean): string {
    if (mode === COST_SHARING_MODE.CounterpartyBearsAll) {
        return ar ? "يتحملها الشريك/البطاقة" : "Partner/card bears 100%";
    }
    if (mode === COST_SHARING_MODE.Shared) {
        return ar ? "مشتركة" : "Shared";
    }
    return ar ? "يتحملها المطعم" : "Restaurant bears 100%";
}

export function getCostSharingScopeLabel(scope: CostSharingScope | null | undefined, ar: boolean): string {
    if (scope === COST_SHARING_SCOPE.AllOrders) {
        return ar ? "كل الطلبات" : "All orders";
    }
    if (scope === COST_SHARING_SCOPE.PerOrder) {
        return ar ? "حسب الطلب" : "Per order";
    }
    return ar ? "حسب الشريك/البطاقة" : "Per partner/card";
}

export function formatCostSharingSummary(config: CostSharingConfig, ar: boolean): string {
    const commission = config.costSharingCommissionPercentage ?? 0;
    if (commission <= 0) return ar ? "بدون عمولة" : "No commission";
    if (config.costSharingMode === COST_SHARING_MODE.Shared) {
        return `${commission}% · ${config.costSharingRestaurantPercentage}% / ${config.costSharingCounterpartyPercentage}%`;
    }
    return `${commission}% · ${getCostSharingModeLabel(config.costSharingMode, ar)}`;
}

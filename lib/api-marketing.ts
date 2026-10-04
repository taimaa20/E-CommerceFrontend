import { api } from "@/lib/api";
import type { PaginatedResponse } from "@/lib/api-customer-management";

// Numeric enums mirror the C# enum order (System.Text.Json serializes enums as numbers).

export enum PointsExpirationMode {
    Never = 0,
    Days = 1,
    Months = 2,
    Years = 3,
}

export enum EarningRuleType {
    FixedPerOrder = 0,
    PerAmount = 1,
    PerCategory = 2,
    PerProduct = 3,
    ChannelBonus = 4,
    FirstOrder = 5,
    Birthday = 6,
    Campaign = 7,
}

export enum PointsApprovalMode {
    Immediate = 0,
    OnOrderCompleted = 1,
    OnPaymentConfirmed = 2,
    Delayed = 3,
}

export enum MarketingOrderSource {
    Pos = 0,
    Talabat = 1,
    DeliveryPartner = 2,
    Mobile = 3,
}

export enum LegacyTier {
    Standard = 0,
    Bronze = 1,
    Silver = 2,
    Gold = 3,
    VIP = 4,
}

export enum TierBenefitType {
    Multiplier = 0,
    FreeDelivery = 1,
    ExclusiveReward = 2,
    DiscountPercentage = 3,
    Custom = 4,
}

export enum WalletAdjustmentDirection {
    Add = 0,
    Deduct = 1,
}

// ── Settings ──────────────────────────────────────────────────────────────

export interface MarketingSettings {
    baseCurrencyCode: string;
    loyaltyEnabled: boolean;
    rewardsEnabled: boolean;
    promosEnabled: boolean;
    vouchersEnabled: boolean;
    referralsEnabled: boolean;
    influencersEnabled: boolean;
    campaignsEnabled: boolean;
    defaultPointValue: number;
    defaultExpirationMode: PointsExpirationMode;
    defaultExpirationValue?: number | null;
    minRedeemPoints?: number | null;
    maxRedeemPoints?: number | null;
    maxStackedDiscount?: number | null;
    earnDelegationEnabled: boolean;
    tierDemotionEnabled: boolean;
}

export interface MarketingSeedResult {
    settingsCreated: boolean;
    tiersCreated: number;
    earningRuleCreated: boolean;
    message: string;
}

// ── Wallets ───────────────────────────────────────────────────────────────

export interface WalletSearchItem {
    customerId: string;
    name: string;
    phoneNumber?: string | null;
    loyaltyCustomerCode?: string | null;
    tier: string;
    availablePoints: number;
    status: string;
    hasWallet: boolean;
}

export interface Wallet {
    customerId: string;
    availablePoints: number;
    pendingPoints: number;
    expiredPoints: number;
    redeemedPoints: number;
    lifetimePoints: number;
    lifetimeSpend: number;
    currencyCode: string;
    totalOrders: number;
    totalVisits: number;
    status: string;
    currentTierId?: string | null;
    lastRecalculatedAt?: string | null;
}

export interface LoyaltyProfile {
    customerId: string;
    loyaltyCustomerCode?: string | null;
    name: string;
    phoneNumber?: string | null;
    tier: string;
    availablePoints: number;
    lifetimePoints: number;
    status: string;
}

export interface WalletTransaction {
    id: string;
    type: string;
    points: number;
    balanceAfter: number;
    status: string;
    source: string;
    orderId?: string | null;
    reason?: string | null;
    createdAt: string;
    expiresAt?: string | null;
}

export interface WalletAdjustRequest {
    direction: WalletAdjustmentDirection;
    points: number;
    reason: string;
    reasonAr?: string | null;
}

// ── Earning rules ─────────────────────────────────────────────────────────

export interface EarningRule {
    id: string;
    ruleGroupId: string;
    ruleVersion: number;
    isCurrent: boolean;
    isActive: boolean;
    branchId?: string | null;
    name: string;
    nameAr?: string | null;
    ruleType: EarningRuleType;
    pointsValue?: number | null;
    pointsPerCurrencyUnit?: number | null;
    multiplier?: number | null;
    targetCategoryId?: string | null;
    targetProductId?: string | null;
    channelScope?: MarketingOrderSource | null;
    approvalMode: PointsApprovalMode;
    approvalDelayDays?: number | null;
    expirationMode: PointsExpirationMode;
    expirationValue?: number | null;
    priority: number;
    effectiveFrom: string;
    effectiveTo?: string | null;
    createdAt: string;
}

export interface EarningRuleUpsert {
    name: string;
    nameAr?: string | null;
    ruleType: EarningRuleType;
    pointsValue?: number | null;
    pointsPerCurrencyUnit?: number | null;
    multiplier?: number | null;
    targetCategoryId?: string | null;
    targetProductId?: string | null;
    channelScope?: MarketingOrderSource | null;
    approvalMode: PointsApprovalMode;
    approvalDelayDays?: number | null;
    expirationMode: PointsExpirationMode;
    expirationValue?: number | null;
    priority: number;
    branchId?: string | null;
    isActive: boolean;
}

// ── Tiers ─────────────────────────────────────────────────────────────────

export interface TierBenefit {
    id: string;
    benefitType: TierBenefitType;
    value?: number | null;
    refId?: string | null;
    description?: string | null;
    descriptionAr?: string | null;
    enforced?: boolean;
}

export interface LoyaltyTier {
    id: string;
    name: string;
    nameAr?: string | null;
    legacyTierEnum: LegacyTier;
    minPoints: number;
    minSpend: number;
    earnMultiplier: number;
    sortOrder: number;
    isActive: boolean;
    benefits: TierBenefit[];
}

export interface TierBenefitUpsert {
    benefitType: TierBenefitType;
    value?: number | null;
    refId?: string | null;
    description?: string | null;
    descriptionAr?: string | null;
}

export interface LoyaltyTierUpsert {
    name: string;
    nameAr?: string | null;
    legacyTierEnum: LegacyTier;
    minPoints: number;
    minSpend: number;
    earnMultiplier: number;
    sortOrder: number;
    isActive: boolean;
    benefits: TierBenefitUpsert[];
}

const BASE = "/v1/marketing";

export const marketingSettingsApi = {
    get: async (): Promise<MarketingSettings> =>
        (await api.get<MarketingSettings>(`${BASE}/settings`)).data,

    update: async (dto: MarketingSettings): Promise<MarketingSettings> =>
        (await api.put<MarketingSettings>(`${BASE}/settings`, dto)).data,

    seedDefaults: async (): Promise<MarketingSeedResult> =>
        (await api.post<MarketingSeedResult>(`${BASE}/settings/seed-defaults`, {})).data,
};

export const marketingWalletApi = {
    search: async (term: string, page: number, pageSize: number): Promise<PaginatedResponse<WalletSearchItem>> =>
        (await api.get<PaginatedResponse<WalletSearchItem>>(`${BASE}/wallets/search`, {
            params: { term: term || undefined, page, pageSize },
        })).data,

    get: async (customerId: string): Promise<Wallet> =>
        (await api.get<Wallet>(`${BASE}/wallets/${customerId}`)).data,

    profile: async (customerId: string): Promise<LoyaltyProfile> =>
        (await api.get<LoyaltyProfile>(`${BASE}/wallets/${customerId}/profile`)).data,

    history: async (
        customerId: string,
        page: number,
        pageSize: number,
    ): Promise<PaginatedResponse<WalletTransaction>> =>
        (await api.get<PaginatedResponse<WalletTransaction>>(`${BASE}/wallets/${customerId}/history`, {
            params: { page, pageSize },
        })).data,

    freeze: async (customerId: string, reason: string): Promise<void> => {
        await api.post(`${BASE}/wallets/${customerId}/freeze`, { reason });
    },

    unfreeze: async (customerId: string): Promise<void> => {
        await api.post(`${BASE}/wallets/${customerId}/unfreeze`, {});
    },

    adjust: async (customerId: string, dto: WalletAdjustRequest): Promise<Wallet> =>
        (await api.post<Wallet>(`${BASE}/wallets/${customerId}/adjust`, dto)).data,
};

export const earningRulesApi = {
    list: async (includeInactive: boolean): Promise<EarningRule[]> =>
        (await api.get<EarningRule[]>(`${BASE}/earning-rules`, { params: { includeInactive } })).data,

    versions: async (ruleGroupId: string): Promise<EarningRule[]> =>
        (await api.get<EarningRule[]>(`${BASE}/earning-rules/groups/${ruleGroupId}/versions`)).data,

    create: async (dto: EarningRuleUpsert): Promise<EarningRule> =>
        (await api.post<EarningRule>(`${BASE}/earning-rules`, dto)).data,

    update: async (ruleGroupId: string, dto: EarningRuleUpsert): Promise<EarningRule> =>
        (await api.put<EarningRule>(`${BASE}/earning-rules/${ruleGroupId}`, dto)).data,

    deactivate: async (ruleGroupId: string): Promise<void> => {
        await api.delete(`${BASE}/earning-rules/${ruleGroupId}`);
    },
};

export const tiersApi = {
    list: async (includeInactive: boolean): Promise<LoyaltyTier[]> =>
        (await api.get<LoyaltyTier[]>(`${BASE}/tiers`, { params: { includeInactive } })).data,

    create: async (dto: LoyaltyTierUpsert): Promise<LoyaltyTier> =>
        (await api.post<LoyaltyTier>(`${BASE}/tiers`, dto)).data,

    update: async (id: string, dto: LoyaltyTierUpsert): Promise<LoyaltyTier> =>
        (await api.put<LoyaltyTier>(`${BASE}/tiers/${id}`, dto)).data,

    deactivate: async (id: string): Promise<void> => {
        await api.delete(`${BASE}/tiers/${id}`);
    },
};

// ── Dashboard ─────────────────────────────────────────────────────────────

export interface LoyaltyKpis {
    totalMembers: number;
    activeMembers: number;
    newMembers: number;
    frozenWallets: number;
    adjustmentCount: number;
    totalWalletBalance: number;
    totalPointsEarned: number;
    totalPointsRedeemed: number;
    totalPointsExpired: number;
    outstandingPoints: number;
    averagePointsPerCustomer: number;
}

export interface TierCount {
    tier: string;
    count: number;
}

export interface TopCustomer {
    customerId: string;
    name: string;
    phoneNumber?: string | null;
    value: number;
}

export interface LoyaltyTrendPoint {
    date: string;
    earned: number;
    redeemed: number;
    expired: number;
}

export interface LoyaltyDashboard {
    kpis: LoyaltyKpis;
    tiers: TierCount[];
    topEarners: TopCustomer[];
    topRedeemers: TopCustomer[];
    mostActive: TopCustomer[];
    trends: LoyaltyTrendPoint[];
}

export type LoyaltyDashboardPeriod = "today" | "week" | "month" | "year" | "all" | "custom";

export const loyaltyDashboardApi = {
    get: async (
        period: LoyaltyDashboardPeriod = "all",
        opts?: { from?: string; to?: string; trendDays?: number; topN?: number },
    ): Promise<LoyaltyDashboard> =>
        (await api.get<LoyaltyDashboard>(`${BASE}/dashboard`, {
            params: {
                period,
                from: opts?.from,
                to: opts?.to,
                trendDays: opts?.trendDays ?? 30,
                topN: opts?.topN ?? 10,
            },
        })).data,
};

// ── Customer merge ────────────────────────────────────────────────────────

export interface MergeCustomerSide {
    customerId: string;
    name: string;
    phoneNumber?: string | null;
    availablePoints: number;
    lifetimePoints: number;
    tier: string;
    transactionCount: number;
    orderCount: number;
    hasWallet: boolean;
}

export interface CustomerMergePreview {
    survivor: MergeCustomerSide;
    merged: MergeCustomerSide;
    projectedAvailablePoints: number;
    projectedLifetimePoints: number;
    projectedTransactionCount: number;
    projectedOrderCount: number;
    alreadyMerged: boolean;
    canMerge: boolean;
    warnings: string[];
}

export interface CustomerMergeHistory {
    id: string;
    survivorCustomerId: string;
    mergedCustomerId: string;
    pointsTransferred: number;
    mergedAt: string;
    status: string;
}

export const marketingCustomersApi = {
    preview: async (survivorCustomerId: string, mergedCustomerId: string): Promise<CustomerMergePreview> =>
        (await api.get<CustomerMergePreview>(`${BASE}/customers/merge/preview`, {
            params: { survivorCustomerId, mergedCustomerId },
        })).data,

    merge: async (survivorCustomerId: string, mergedCustomerId: string): Promise<CustomerMergeHistory> =>
        (await api.post<CustomerMergeHistory>(`${BASE}/customers/merge`, { survivorCustomerId, mergedCustomerId })).data,
};

// ── Segments ──────────────────────────────────────────────────────────────

export enum CustomerSegmentType {
    Dynamic = 0,
    Static = 1,
}

export enum SegmentField {
    LifetimeSpend = 0,
    TotalOrders = 1,
    TotalVisits = 2,
    LastVisitDaysAgo = 3,
    AvailablePoints = 4,
    TierId = 5,
    PreferredChannel = 6,
}

export enum SegmentOperator {
    Equals = 0,
    NotEquals = 1,
    GreaterThan = 2,
    GreaterThanOrEqual = 3,
    LessThan = 4,
    LessThanOrEqual = 5,
    In = 6,
    NotIn = 7,
}

export enum SegmentMemberSource {
    Manual = 0,
    Computed = 1,
    Import = 2,
}

export interface SegmentRule {
    id: string;
    field: SegmentField;
    operator: SegmentOperator;
    value: string;
    logicGroup: number;
}

export interface Segment {
    id: string;
    name: string;
    nameAr?: string | null;
    type: CustomerSegmentType;
    isActive: boolean;
    lastComputedAt?: string | null;
    memberCount: number;
    rules: SegmentRule[];
}

export interface SegmentRuleUpsert {
    field: SegmentField;
    operator: SegmentOperator;
    value: string;
    logicGroup: number;
}

export interface SegmentUpsert {
    name: string;
    nameAr?: string | null;
    type: CustomerSegmentType;
    isActive: boolean;
    rules: SegmentRuleUpsert[];
}

export interface SegmentMember {
    customerId: string;
    name: string;
    phoneNumber?: string | null;
    addedAt: string;
    source: SegmentMemberSource;
}

export interface SegmentComputeResult {
    segmentId: string;
    matched: number;
    added: number;
    removed: number;
}

export const segmentsApi = {
    list: async (includeInactive: boolean): Promise<Segment[]> =>
        (await api.get<Segment[]>(`${BASE}/segments`, { params: { includeInactive } })).data,

    get: async (id: string): Promise<Segment> =>
        (await api.get<Segment>(`${BASE}/segments/${id}`)).data,

    create: async (dto: SegmentUpsert): Promise<Segment> =>
        (await api.post<Segment>(`${BASE}/segments`, dto)).data,

    update: async (id: string, dto: SegmentUpsert): Promise<Segment> =>
        (await api.put<Segment>(`${BASE}/segments/${id}`, dto)).data,

    deactivate: async (id: string): Promise<void> => {
        await api.delete(`${BASE}/segments/${id}`);
    },

    members: async (id: string, page: number, pageSize: number): Promise<PaginatedResponse<SegmentMember>> =>
        (await api.get<PaginatedResponse<SegmentMember>>(`${BASE}/segments/${id}/members`, {
            params: { page, pageSize },
        })).data,

    addMember: async (id: string, customerId: string): Promise<void> => {
        await api.post(`${BASE}/segments/${id}/members`, { customerId });
    },

    removeMember: async (id: string, customerId: string): Promise<void> => {
        await api.delete(`${BASE}/segments/${id}/members/${customerId}`);
    },

    compute: async (id: string): Promise<SegmentComputeResult> =>
        (await api.post<SegmentComputeResult>(`${BASE}/segments/${id}/compute`, {})).data,
};

// ── Campaigns ─────────────────────────────────────────────────────────────

export enum CampaignStatus {
    Draft = 0,
    Scheduled = 1,
    Active = 2,
    Paused = 3,
    Expired = 4,
    Archived = 5,
}

export enum CampaignType {
    BonusPoints = 0,
    Multiplier = 1,
    FixedReward = 2,
}

export enum CampaignTargetType {
    All = 0,
    Segment = 1,
    Tier = 2,
    CustomerList = 3,
}

export interface Campaign {
    id: string;
    name: string;
    nameAr?: string | null;
    description?: string | null;
    descriptionAr?: string | null;
    startDate: string;
    endDate: string;
    status: CampaignStatus;
    priority: number;
    isActive: boolean;
    type: CampaignType;
    targetType: CampaignTargetType;
    targetSegmentId?: string | null;
    targetTierId?: string | null;
    bonusPoints?: number | null;
    spendThreshold?: number | null;
    multiplier?: number | null;
    pointsPerCurrencyUnit?: number | null;
    orderCountThreshold?: number | null;
    expirationMode: PointsExpirationMode;
    expirationValue?: number | null;
    targetCustomerIds: string[];
    createdAt: string;
    /** Multiplier campaigns: bonus points per currency unit (ppu × (multiplier−1)); null otherwise. */
    effectiveBonusRate?: number | null;
}

export interface CampaignUpsert {
    name: string;
    nameAr?: string | null;
    description?: string | null;
    descriptionAr?: string | null;
    startDate: string;
    endDate: string;
    priority: number;
    isActive: boolean;
    type: CampaignType;
    targetType: CampaignTargetType;
    targetSegmentId?: string | null;
    targetTierId?: string | null;
    bonusPoints?: number | null;
    spendThreshold?: number | null;
    multiplier?: number | null;
    pointsPerCurrencyUnit?: number | null;
    orderCountThreshold?: number | null;
    expirationMode: PointsExpirationMode;
    expirationValue?: number | null;
    targetCustomerIds: string[];
}

export interface CampaignDashboardItem {
    id: string;
    name: string;
    status: CampaignStatus;
    type: CampaignType;
    startDate: string;
    endDate: string;
    targetType: CampaignTargetType;
    audienceSize: number;
    participants: number;
    pointsIssued: number;
    conversionRate: number;
}

export interface CampaignKpis {
    totalCampaigns: number;
    activeCampaigns: number;
    scheduledCampaigns: number;
    expiredCampaigns: number;
    totalParticipants: number;
    totalPointsIssued: number;
    averageParticipantsPerCampaign: number;
    averagePointsPerCampaign: number;
    eligibleCustomers: number;
    participatingCustomers: number;
    participationRate: number;
}

export interface CampaignDashboard {
    summary: CampaignKpis;
    campaigns: CampaignDashboardItem[];
}

export const campaignsApi = {
    list: async (includeArchived: boolean): Promise<Campaign[]> =>
        (await api.get<Campaign[]>(`${BASE}/campaigns`, { params: { includeArchived } })).data,

    dashboard: async (): Promise<CampaignDashboard> =>
        (await api.get<CampaignDashboard>(`${BASE}/campaigns/dashboard`)).data,

    get: async (id: string): Promise<Campaign> =>
        (await api.get<Campaign>(`${BASE}/campaigns/${id}`)).data,

    create: async (dto: CampaignUpsert): Promise<Campaign> =>
        (await api.post<Campaign>(`${BASE}/campaigns`, dto)).data,

    update: async (id: string, dto: CampaignUpsert): Promise<Campaign> =>
        (await api.put<Campaign>(`${BASE}/campaigns/${id}`, dto)).data,

    changeStatus: async (id: string, status: CampaignStatus): Promise<Campaign> =>
        (await api.post<Campaign>(`${BASE}/campaigns/${id}/status`, { status })).data,
};

// ── Rewards ───────────────────────────────────────────────────────────────

export enum RewardType {
    FixedDiscount = 0,
    PercentageDiscount = 1,
    FreeProduct = 2,
    FreeDelivery = 3,
}

export interface Reward {
    id: string;
    name: string;
    nameAr?: string | null;
    description?: string | null;
    descriptionAr?: string | null;
    pointsRequired: number;
    type: RewardType;
    rewardValue?: number | null;
    maxDiscountAmount?: number | null;
    productId?: string | null;
    productName?: string | null;
    isActive: boolean;
    startDate: string;
    endDate: string;
}

export interface RewardUpsert {
    name: string;
    nameAr?: string | null;
    description?: string | null;
    descriptionAr?: string | null;
    pointsRequired: number;
    type: RewardType;
    rewardValue?: number | null;
    maxDiscountAmount?: number | null;
    productId?: string | null;
    isActive: boolean;
    startDate: string;
    endDate: string;
}

export interface RewardRedeemRequest {
    customerId: string;
    orderId?: string | null;
    orderTotal?: number | null;
    idempotencyKey?: string | null;
}

export interface RewardRedemptionResult {
    redemptionId: string;
    rewardId: string;
    rewardName: string;
    type: RewardType;
    pointsUsed: number;
    discountAmount: number;
    freeProductId?: string | null;
    freeDelivery: boolean;
    remainingPoints: number;
    message: string;
}

export interface RewardRedemption {
    id: string;
    rewardId: string;
    rewardName: string;
    type: RewardType;
    pointsUsed: number;
    discountAmount: number;
    redeemedAt: string;
    status: string;
}

export interface RewardTopItem {
    rewardId: string;
    name: string;
    redemptions: number;
    pointsRedeemed: number;
}

export interface RewardDashboard {
    activeRewards: number;
    totalRedemptions: number;
    pointsRedeemed: number;
    mostRedeemed: RewardTopItem[];
}

export const rewardsApi = {
    list: async (includeInactive: boolean): Promise<Reward[]> =>
        (await api.get<Reward[]>(`${BASE}/rewards`, { params: { includeInactive } })).data,

    dashboard: async (): Promise<RewardDashboard> =>
        (await api.get<RewardDashboard>(`${BASE}/rewards/dashboard`)).data,

    get: async (id: string): Promise<Reward> =>
        (await api.get<Reward>(`${BASE}/rewards/${id}`)).data,

    create: async (dto: RewardUpsert): Promise<Reward> =>
        (await api.post<Reward>(`${BASE}/rewards`, dto)).data,

    update: async (id: string, dto: RewardUpsert): Promise<Reward> =>
        (await api.put<Reward>(`${BASE}/rewards/${id}`, dto)).data,

    setActive: async (id: string, active: boolean): Promise<void> => {
        await api.post(`${BASE}/rewards/${id}/${active ? "activate" : "deactivate"}`, {});
    },

    catalog: async (): Promise<Reward[]> =>
        (await api.get<Reward[]>(`${BASE}/rewards/catalog`)).data,

    redeem: async (id: string, dto: RewardRedeemRequest): Promise<RewardRedemptionResult> =>
        (await api.post<RewardRedemptionResult>(`${BASE}/rewards/${id}/redeem`, dto)).data,

    redemptions: async (customerId: string, page: number, pageSize: number): Promise<PaginatedResponse<RewardRedemption>> =>
        (await api.get<PaginatedResponse<RewardRedemption>>(`${BASE}/rewards/redemptions`, {
            params: { customerId, page, pageSize },
        })).data,
};

// ── Promo codes ───────────────────────────────────────────────────────────

export enum PromoDiscountType {
    Percentage = 0,
    FixedAmount = 1,
}

export enum PromoAudience {
    Everyone = 0,
    SignedInCustomers = 1,
    SpecificCustomers = 2,
    Segment = 3,
}

export enum PromoTargetType {
    Product = 0,
    Category = 1,
    Subcategory = 2,
}

export type PromoCodeStatus = "Active" | "Scheduled" | "Expired" | "Inactive" | "Exhausted";

export interface PromoCodeTarget {
    targetType: PromoTargetType;
    targetId: string;
    isExclusion: boolean;
    name?: string | null;
}

export interface PromoCodeCustomer {
    customerId: string;
    name?: string | null;
    phoneNumber?: string | null;
}

export interface PromoCode {
    id: string;
    code: string;
    name: string;
    nameAr?: string | null;
    description?: string | null;
    descriptionAr?: string | null;
    discountType: PromoDiscountType;
    discountValue: number;
    maxDiscountAmount?: number | null;
    minOrderAmount?: number | null;
    startsAt: string;
    endsAt?: string | null;
    isActive: boolean;
    status: PromoCodeStatus;
    usageLimit?: number | null;
    perCustomerLimit?: number | null;
    audience: PromoAudience;
    segmentId?: string | null;
    segmentName?: string | null;
    firstOrderOnly: boolean;
    combineWithProductOffers: boolean;
    branchId?: string | null;
    targets: PromoCodeTarget[];
    customers: PromoCodeCustomer[];
    usageCount: number;
    completedCount: number;
    cancelledCount: number;
    totalDiscountGranted: number;
    createdAt: string;
    updatedAt: string;
}

export interface PromoCodeUpsert {
    code: string;
    name: string;
    nameAr?: string | null;
    description?: string | null;
    descriptionAr?: string | null;
    discountType: PromoDiscountType;
    discountValue: number;
    maxDiscountAmount?: number | null;
    minOrderAmount?: number | null;
    startsAt: string;
    endsAt?: string | null;
    isActive: boolean;
    usageLimit?: number | null;
    perCustomerLimit?: number | null;
    audience: PromoAudience;
    segmentId?: string | null;
    firstOrderOnly: boolean;
    combineWithProductOffers: boolean;
    branchId?: string | null;
    targets: PromoCodeTarget[];
    customerIds: string[];
}

export interface PromoCodeRedemption {
    id: string;
    orderId: string;
    orderNumber: string;
    customerId?: string | null;
    customerName?: string | null;
    customerPhone?: string | null;
    orderSubtotal: number;
    discountAmount: number;
    orderTotal: number;
    orderStatus: string;
    status: "Pending" | "Completed" | "Cancelled";
    redeemedAt: string;
}

export const promoCodesApi = {
    list: async (params: { search?: string; status?: PromoCodeStatus; page: number; pageSize: number }): Promise<PaginatedResponse<PromoCode>> =>
        (await api.get<PaginatedResponse<PromoCode>>(`${BASE}/promo-codes`, { params })).data,

    get: async (id: string): Promise<PromoCode> =>
        (await api.get<PromoCode>(`${BASE}/promo-codes/${id}`)).data,

    create: async (dto: PromoCodeUpsert): Promise<PromoCode> =>
        (await api.post<PromoCode>(`${BASE}/promo-codes`, dto)).data,

    update: async (id: string, dto: PromoCodeUpsert): Promise<PromoCode> =>
        (await api.put<PromoCode>(`${BASE}/promo-codes/${id}`, dto)).data,

    setActive: async (id: string, active: boolean): Promise<void> => {
        await api.post(`${BASE}/promo-codes/${id}/${active ? "activate" : "deactivate"}`, {});
    },

    /** Admin/SuperAdmin only. Soft delete — historical usage is preserved server-side. */
    remove: async (id: string): Promise<void> => {
        await api.delete(`${BASE}/promo-codes/${id}`);
    },

    redemptions: async (id: string, page: number, pageSize: number): Promise<PaginatedResponse<PromoCodeRedemption>> =>
        (await api.get<PaginatedResponse<PromoCodeRedemption>>(`${BASE}/promo-codes/${id}/redemptions`, {
            params: { page, pageSize },
        })).data,
};

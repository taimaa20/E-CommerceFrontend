import { api } from "@/lib/api";

/** Order statuses a customer may be allowed to cancel in. Sent by name, never by ordinal. */
export const CANCELLABLE_ORDER_STATUSES = [
    "New",
    "PendingPayment",
    "Preparing",
    "Ready",
    "Served",
] as const;

export interface OrderCancellationPolicyTierRuleDto {
    tierId: string;
    tierName?: string | null;
    cancellationEnabled: boolean;
    cancellationWindowMinutes?: number | null;
}

export interface OrderCancellationPolicyDto {
    id: string;
    branchId?: string | null;
    branchName?: string | null;
    /** True for the tenant-wide row, or for the built-in defaults when nothing is configured yet. */
    isDefault: boolean;

    customerCancellationEnabled: boolean;
    customerFullOrderCancellationEnabled: boolean;
    customerItemCancellationEnabled: boolean;
    customerQuantityReductionEnabled: boolean;
    customerCancellationWindowMinutes?: number | null;
    customerReasonRequired: boolean;
    paidOrderRequiresStaffApproval: boolean;
    staffCancellationEnabled: boolean;
    staffReasonRequired: boolean;
    adminOverrideEnabled: boolean;
    tierRulesEnabled: boolean;

    allowedCustomerStatuses: string[];
    tierRules: OrderCancellationPolicyTierRuleDto[];
}

export type OrderCancellationPolicyUpsertDto =
    Omit<OrderCancellationPolicyDto, "id" | "branchName" | "isDefault">;

export async function listOrderCancellationPolicies(): Promise<OrderCancellationPolicyDto[]> {
    const { data } = await api.get<OrderCancellationPolicyDto[]>("/order-cancellation-policy");
    return data;
}

/** The rules actually in force for the active branch, defaults included. */
export async function getEffectiveOrderCancellationPolicy(): Promise<OrderCancellationPolicyDto> {
    const { data } = await api.get<OrderCancellationPolicyDto>("/order-cancellation-policy/effective");
    return data;
}

export async function saveOrderCancellationPolicy(
    dto: OrderCancellationPolicyUpsertDto,
): Promise<OrderCancellationPolicyDto> {
    const { data } = await api.put<OrderCancellationPolicyDto>("/order-cancellation-policy", dto);
    return data;
}

export async function deleteOrderCancellationBranchOverride(branchId: string): Promise<void> {
    await api.delete(`/order-cancellation-policy/branch/${encodeURIComponent(branchId)}`);
}

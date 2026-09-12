import { api } from "@/lib/api";

export enum ActiveShiftRule {
    Unlimited = 0,
    SinglePerBranch = 1,
    SinglePerPosDevice = 2,
    SinglePerCashier = 3,
}

export interface ShiftRulesConfigDto {
    activeShiftRule: ActiveShiftRule;

    requireAllOrdersPaid: boolean;
    requireAllOrdersReady: boolean;
    requireAllOrdersServed: boolean;
    requireAllOrdersCompleted: boolean;

    allowPendingOrders: boolean;
    allowPreparingOrders: boolean;
    allowReadyOrders: boolean;
    allowPendingDeliveryOrders: boolean;
    allowPendingCancellationRequests: boolean;

    allowForcedShiftClose: boolean;
    allowShiftCloseWithOpenOrders: boolean;
}

export async function getShiftRulesConfig(): Promise<ShiftRulesConfigDto> {
    const { data } = await api.get<ShiftRulesConfigDto>("/shift-rules-config");
    return data;
}

export async function updateShiftRulesConfig(
    dto: ShiftRulesConfigDto,
): Promise<ShiftRulesConfigDto> {
    const { data } = await api.put<ShiftRulesConfigDto>("/shift-rules-config", dto);
    return data;
}

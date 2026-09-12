import { api } from "@/lib/api";
import { EMPTY_SHIFT_EXPENSE_SUMMARY, type ShiftExpenseSummary } from "@/types/shift-expense";

export interface ShiftCloseBlockerDto {
    code: string;
    count: number;
}

export interface ShiftCloseValidationDto {
    isAllowed: boolean;
    blockers: ShiftCloseBlockerDto[];
    forceCloseAllowed: boolean;
}

export interface ShiftSummaryDto {
    shiftId: string;
    openedAtUtc: string;
    closedAtUtc?: string | null;
    cashierName: string;
    shiftNumber?: number | null;

    totalOrders: number;
    totalRevenue: number;
    completedOrders: number;
    servedOrders: number;
    readyOrders: number;
    preparingOrders: number;
    pendingOrders: number;
    paidOrders: number;
    cancelledOrders: number;
    refundedOrders: number;

    deliveryOrders: number;
    partnerOrders: number;
    takeawayOrders: number;
    dineInOrders: number;
    qrOrders: number;

    /** Documented expenses paid during the shift. Cancelled ones are excluded. */
    expenses: ShiftExpenseSummary;

    closeStatus: ShiftCloseValidationDto;
}

/** Older API builds omit the block entirely — never let the Z-report crash on it. */
export function shiftExpenseSummaryOf(summary: ShiftSummaryDto): ShiftExpenseSummary {
    return summary.expenses ?? EMPTY_SHIFT_EXPENSE_SUMMARY;
}

export async function getCurrentShiftSummary(): Promise<ShiftSummaryDto> {
    const { data } = await api.get<ShiftSummaryDto>("/shift-summary");
    return data;
}

export async function getShiftSummaryById(shiftId: string): Promise<ShiftSummaryDto> {
    const { data } = await api.get<ShiftSummaryDto>(`/shift-summary/${shiftId}`);
    return data;
}

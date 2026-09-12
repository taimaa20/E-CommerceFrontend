import { api } from "@/lib/api";

export enum OrderNumberResetStrategy {
    Never = 0,
    Daily = 1,
    Monthly = 2,
    Yearly = 3,
    ShiftOpen = 4,
    ShiftClose = 5,
}

export enum OrderNumberSequenceScope {
    Global = 0,
    PerOrderType = 1,
}

export interface OrderNumberingConfigDto {
    resetStrategy: OrderNumberResetStrategy;
    scope: OrderNumberSequenceScope;
    prefix?: string | null;
    includeDate: boolean;
    includeMonth: boolean;
    includeYear: boolean;
    includeShiftNumber: boolean;
    includeBranchCode: boolean;
    branchCode?: string | null;
    /** Server-rendered sample like "TA-1". Read-only. */
    previewExample?: string | null;
}

export async function getOrderNumberingConfig(): Promise<OrderNumberingConfigDto> {
    const { data } = await api.get<OrderNumberingConfigDto>("/order-numbering-config");
    return data;
}

export async function updateOrderNumberingConfig(
    dto: OrderNumberingConfigDto,
): Promise<OrderNumberingConfigDto> {
    const { data } = await api.put<OrderNumberingConfigDto>("/order-numbering-config", dto);
    return data;
}

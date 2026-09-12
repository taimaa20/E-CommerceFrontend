import { api } from "@/lib/api";

const PAYMENT_ENGINE_PAYMENTS_ENDPOINT = "/v1/payment-engine/payments";
const PAYMENT_ENGINE_ORDERS_ENDPOINT = "/v1/payment-engine/orders";

export enum PaymentEngineMethod {
    Card = 0,
    Wallet = 1,
    Cash = 2,
    BankTransfer = 3,
    Other = 4,
}

export interface CreatePaymentBillingData {
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber: string;
    country: string;
    city?: string | null;
    state?: string | null;
    postalCode?: string | null;
    street?: string | null;
    building?: string | null;
    floor?: string | null;
    apartment?: string | null;
}

export interface CreatePaymentCustomerData {
    firstName: string;
    lastName: string;
    email: string;
}

export interface CreatePaymentLineItem {
    name: string;
    amount: number;
    quantity: number;
    description?: string | null;
    imageUrl?: string | null;
}

export interface CreatePaymentRequest {
    orderId: string;
    merchantReference: string;
    amount: number;
    currency: string;
    method: PaymentEngineMethod;
    providerCode: string;
    idempotencyKey: string;
    billingData: CreatePaymentBillingData;
    customer?: CreatePaymentCustomerData | null;
    items: CreatePaymentLineItem[];
    correlationId?: string | null;
}

export interface CreatePaymentResponse {
    paymentId: string;
    sessionId: string;
    merchantReference: string;
    providerCode: string;
    gatewayReference: string;
    checkoutUrl: string | null;
    checkoutClientSecret: string | null;
    amount: number;
    currency: string;
    paymentStatus: number;
    sessionStatus: number;
    expiresAtUtc: string | null;
    correlationId: string;
    isDuplicate: boolean;
}

export class PaymentEngineError extends Error {
    constructor(message: string, public readonly status?: number, public readonly details?: unknown) {
        super(message);
        this.name = "PaymentEngineError";
    }
}

export async function createPayment(request: CreatePaymentRequest): Promise<CreatePaymentResponse> {
    try {
        const response = await api.post<CreatePaymentResponse>(PAYMENT_ENGINE_PAYMENTS_ENDPOINT, request);
        return response.data;
    } catch (error) {
        throw toPaymentEngineError(error);
    }
}

// Mirrors backend PaymentStatus (Modules/Payments/Domain/Enums/PaymentStatus.cs).
// Enums serialize as numbers (no JsonStringEnumConverter registered).
export enum PaymentEngineStatus {
    Pending = 0,
    RequiresAction = 1,
    Authorized = 2,
    Captured = 3,
    PartiallyRefunded = 4,
    Refunded = 5,
    Voided = 6,
    Failed = 7,
    Cancelled = 8,
    Expired = 9,
}

// Mirrors backend PaymentSessionStatus.
export enum PaymentEngineSessionStatus {
    Created = 0,
    Pending = 1,
    RequiresAction = 2,
    Completed = 3,
    Failed = 4,
    Cancelled = 5,
    Expired = 6,
}

export interface PaymentEngineAttemptDto {
    attemptId: string;
    attemptNumber: number;
    operation: number;
    status: number;
    amount: number;
    currency: string;
    gatewayProvider: string | null;
    gatewayReference: string | null;
    failureCode: string | null;
    failureReason: number;
    createdAt: string;
    updatedAt: string;
    startedAtUtc: string;
    completedAtUtc: string | null;
}

export interface PaymentEngineSessionDto {
    sessionId: string;
    status: PaymentEngineSessionStatus;
    providerCode: string;
    gatewayProvider: string | null;
    gatewayReference: string | null;
    checkoutUrl: string | null;
    createdAt: string;
    updatedAt: string;
    createdAtUtc: string;
    expiresAtUtc: string | null;
    completedAtUtc: string | null;
}

export interface PaymentEnginePaymentDetails {
    paymentId: string;
    orderId: string;
    branchId: string;
    merchantReference: string;
    providerCode: string;
    gatewayReference: string | null;
    status: PaymentEngineStatus;
    method: PaymentEngineMethod;
    amount: number;
    currency: string;
    capturedAmount: number;
    createdAt: string;
    updatedAt: string;
    expiresAtUtc: string | null;
    completedAtUtc: string | null;
    activeCheckoutUrl: string | null;
    attempts: PaymentEngineAttemptDto[];
    sessions: PaymentEngineSessionDto[];
}

export interface PaymentEngineOrderPayment {
    orderId: string;
    payments: PaymentEnginePaymentDetails[];
    currentPayment: PaymentEnginePaymentDetails | null;
}

const TERMINAL_PAYMENT_STATUSES = new Set<PaymentEngineStatus>([
    PaymentEngineStatus.Captured,
    PaymentEngineStatus.PartiallyRefunded,
    PaymentEngineStatus.Refunded,
    PaymentEngineStatus.Voided,
    PaymentEngineStatus.Failed,
    PaymentEngineStatus.Cancelled,
    PaymentEngineStatus.Expired,
]);

const PAYMENT_STATUS_LABELS: Record<PaymentEngineStatus, string> = {
    [PaymentEngineStatus.Pending]: "Pending",
    [PaymentEngineStatus.RequiresAction]: "Requires Action",
    [PaymentEngineStatus.Authorized]: "Authorized",
    [PaymentEngineStatus.Captured]: "Paid",
    [PaymentEngineStatus.PartiallyRefunded]: "Partially Refunded",
    [PaymentEngineStatus.Refunded]: "Refunded",
    [PaymentEngineStatus.Voided]: "Voided",
    [PaymentEngineStatus.Failed]: "Failed",
    [PaymentEngineStatus.Cancelled]: "Cancelled",
    [PaymentEngineStatus.Expired]: "Expired",
};

export function isTerminalPaymentStatus(status: PaymentEngineStatus): boolean {
    return TERMINAL_PAYMENT_STATUSES.has(status);
}

export function getPaymentStatusLabel(status: PaymentEngineStatus | null | undefined): string {
    if (status === null || status === undefined) return "Unknown";
    return PAYMENT_STATUS_LABELS[status] ?? `Unknown (${status})`;
}

export async function getOrderPayment(orderId: string): Promise<PaymentEngineOrderPayment> {
    try {
        const response = await api.get<PaymentEngineOrderPayment>(`${PAYMENT_ENGINE_ORDERS_ENDPOINT}/${orderId}/payment`);
        return response.data;
    } catch (error) {
        throw toPaymentEngineError(error);
    }
}

function toPaymentEngineError(error: unknown): PaymentEngineError {
    const response = getErrorResponse(error);
    const message = getErrorMessage(response?.data)
        ?? (error instanceof Error && error.message.trim() ? error.message : null)
        ?? "Unable to start the payment. Please try again.";
    return new PaymentEngineError(message, response?.status, response?.data);
}

function getErrorResponse(error: unknown): { status: number; data?: unknown } | undefined {
    if (!error || typeof error !== "object" || !("response" in error)) return undefined;
    const response = error.response;
    if (!response || typeof response !== "object" || !("status" in response) || typeof response.status !== "number") return undefined;
    return { status: response.status, data: "data" in response ? response.data : undefined };
}

function getErrorMessage(data: unknown): string | null {
    if (!data || typeof data !== "object") return null;
    if ("message" in data && typeof data.message === "string" && data.message.trim()) return data.message;
    if ("error" in data && typeof data.error === "string" && data.error.trim()) return data.error;
    if ("errors" in data && data.errors && typeof data.errors === "object") {
        const messages = Object.values(data.errors).flatMap((value) => Array.isArray(value) ? value : []).filter((value): value is string => typeof value === "string");
        if (messages.length > 0) return messages.join(" ");
    }
    if ("title" in data && typeof data.title === "string" && data.title.trim()) return data.title;
    return null;
}

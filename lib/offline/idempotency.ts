export const IDEMPOTENCY_HEADER = "X-Idempotency-Key";

export function getIdempotencyHeaders(key?: string | null): Record<string, string> {
    return key ? { [IDEMPOTENCY_HEADER]: key } : {};
}

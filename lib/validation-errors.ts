/**
 * Flatten an ASP.NET Core ValidationProblemDetails body into a readable
 * one-liner, e.g.
 *   { errors: { "$.tenantId": ["The JSON value could not be converted…"] } }
 *   → "tenantId: The JSON value could not be converted…"
 * Returns null when the payload has no usable field errors or detail.
 */
export function formatValidationProblem(data: unknown): string | null {
    if (!data || typeof data !== "object") return null;
    const d = data as Record<string, unknown>;
    const parts: string[] = [];
    if (d.errors && typeof d.errors === "object") {
        for (const [field, messages] of Object.entries(d.errors as Record<string, unknown>)) {
            const list = Array.isArray(messages)
                ? messages.filter((m): m is string => typeof m === "string")
                : [];
            if (list.length > 0) {
                const cleanField = field.replace(/^\$\.?/, "") || "request";
                parts.push(`${cleanField}: ${list.join(" ")}`);
            }
        }
    }
    if (parts.length > 0) return parts.join(" | ");
    if (typeof d.detail === "string" && d.detail.trim()) return d.detail;
    return null;
}

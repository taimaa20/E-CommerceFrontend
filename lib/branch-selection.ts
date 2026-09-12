export const BRANCH_HEADER = "X-Branch-ID";

const SELECTED_BRANCH_KEY = "branch-context:selected-branch-id";
const DEFAULT_BRANCH_CACHE_KEY = "default";

export function readSelectedBranchId(): string | null {
    if (typeof window === "undefined") return null;
    const branchId = localStorage.getItem(SELECTED_BRANCH_KEY);
    return branchId?.trim() || null;
}

export function writeSelectedBranchId(branchId: string): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(SELECTED_BRANCH_KEY, branchId);
}

export function clearSelectedBranchId(): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem(SELECTED_BRANCH_KEY);
}

export function getBranchHeaders(): Record<string, string> {
    const branchId = readSelectedBranchId();
    return branchId ? { [BRANCH_HEADER]: branchId } : {};
}

export function getSelectedBranchCacheKey(): string {
    return readSelectedBranchId() ?? DEFAULT_BRANCH_CACHE_KEY;
}

export function appendBranchQuery(url: string): string {
    const branchId = readSelectedBranchId();
    if (!branchId) return url;

    const separator = url.includes("?") ? "&" : "?";
    return `${url}${separator}branchId=${encodeURIComponent(branchId)}`;
}

import { clearSelectedBranchId } from "@/lib/branch-selection";

export function clearAuthSession(logout: () => void): void {
    clearSelectedBranchId();
    logout();
    document.cookie = "auth_token=; path=/; max-age=0";
    document.cookie = "auth_role=; path=/; max-age=0";
}

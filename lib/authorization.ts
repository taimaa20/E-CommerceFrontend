import { UserRole } from "@/types/auth";

export type ProtectedArea =
    | "admin"
    | "pos"
    | "kitchen"
    | "cashier"
    | "takeaway"
    | "display";

// SuperAdmin is a strict superset of Admin — it shares every area, route and
// action Admin has today. It is listed alongside Admin everywhere below, and
// isAdminRole() centralises the "admin-level" predicate for scattered checks.
const AREA_ACCESS: Record<ProtectedArea, readonly UserRole[]> = {
    admin: [UserRole.Admin, UserRole.SuperAdmin, UserRole.Owner],
    pos: [UserRole.Admin, UserRole.SuperAdmin, UserRole.Waiter, UserRole.Cashier],
    kitchen: [UserRole.Admin, UserRole.SuperAdmin, UserRole.Kitchen],
    cashier: [UserRole.Admin, UserRole.SuperAdmin, UserRole.Cashier],
    takeaway: [UserRole.Admin, UserRole.SuperAdmin, UserRole.Waiter, UserRole.Cashier],
    display: [UserRole.Admin, UserRole.SuperAdmin, UserRole.Waiter, UserRole.Cashier, UserRole.TrackerPickup],
};

const DEFAULT_ROLE_ROUTES: Record<UserRole, string> = {
    [UserRole.Admin]: "/ntxadminpos",
    [UserRole.SuperAdmin]: "/ntxadminpos",
    [UserRole.Waiter]: "/ntxdineinpos",
    [UserRole.Kitchen]: "/ntxkitchenpos",
    [UserRole.Cashier]: "/ntxcashierpos",
    [UserRole.TrackerPickup]: "/display",
    [UserRole.Manager]: "/ntxadminpos/waste-log",
    [UserRole.Owner]: "/ntxadminpos",
    [UserRole.Marketing]: "/ntxadminpos/dashboard/home",
};

const ROLE_NAMES: Record<UserRole, string> = {
    [UserRole.Admin]: "Admin",
    [UserRole.SuperAdmin]: "SuperAdmin",
    [UserRole.Waiter]: "Waiter",
    [UserRole.Kitchen]: "Kitchen",
    [UserRole.Cashier]: "Cashier",
    [UserRole.TrackerPickup]: "TrackerPickup",
    [UserRole.Manager]: "Manager",
    [UserRole.Owner]: "Owner",
    [UserRole.Marketing]: "Marketing",
};

/** True for admin-level roles (Admin and its superset SuperAdmin). Use for
 *  scattered "is this user an Admin?" checks so SuperAdmin inherits Admin. */
export function isAdminRole(role: number | null | undefined): boolean {
    return role === UserRole.Admin || role === UserRole.SuperAdmin;
}

/** True only for SuperAdmin. Use to gate SuperAdmin-exclusive actions (e.g.
 *  manual stock adjustment). Backend must enforce the same — this only hides UI. */
export function isSuperAdminRole(role: number | null | undefined): boolean {
    return role === UserRole.SuperAdmin;
}

export function getDefaultRouteForRole(role?: number | null): string {
    if (role === undefined || role === null) {
        return "/";
    }

    return DEFAULT_ROLE_ROUTES[role as UserRole] ?? "/";
}

export function canAccessArea(role: number | null | undefined, area: ProtectedArea): boolean {
    if (role === undefined || role === null) {
        return false;
    }

    return AREA_ACCESS[area].includes(role as UserRole);
}

export function getUnauthorizedRedirect(isAuthenticated: boolean, role?: number | null): string {
    return isAuthenticated ? getDefaultRouteForRole(role) : "/login";
}

export function getRoleName(role: number | null | undefined): string {
    if (role === undefined || role === null) {
        return "";
    }

    return ROLE_NAMES[role as UserRole] ?? "";
}

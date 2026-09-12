export interface UserDto {
    id: string;           // User GUID from backend
    tenantId?: string;
    username: string;
    fullName?: string | null;
    fullNameAr?: string | null;
    role: number; // 0=Admin, 1=Waiter, 2=Kitchen, 3=Cashier, 4=TrackerPickup, 5=Manager, 6=Owner, 7=Marketing, 8=SuperAdmin
    roleName: string;
    token: string;
    canApplyDiscount: boolean;
}

export enum UserRole {
    Admin = 0,
    Waiter = 1,
    Kitchen = 2,
    Cashier = 3,
    TrackerPickup = 4,
    Manager = 5,
    Owner = 6,
    Marketing = 7,
    SuperAdmin = 8,
}

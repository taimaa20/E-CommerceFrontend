// HR module DTO mirrors. Source of truth: POS-Backend/DTOs/Hr/HrDtos.cs.
// EmployeeId is the StaffProfile.Id (canonical) — same key used by mobile FKs.

export interface HrEmployeeListItem {
    employeeId: string;
    userId: string;
    username: string;
    fullName?: string | null;
    fullNameAr?: string | null;
    role: string;
    canApplyDiscount: boolean;
    staffNo: string;
    phone?: string | null;
    photoUrl?: string | null;
    contractStatus: number;
    startDate?: string | null;
    monthlySalary: number;
    netSalary: number;
    openRequestsCount: number;
    pendingBonusesCount: number;
}

export interface HrEmployeeListResponse {
    items: HrEmployeeListItem[];
    total: number;
    page: number;
    pageSize: number;
}

export interface HrEmployeeStats {
    totalBonuses: number;
    totalBonusAmount: number;
    openLeaveRequests: number;
    openLoanRequests: number;
    openPermissionRequests: number;
    totalWorkingHours: number;
}

export interface HrEmployeeDetail {
    employeeId: string;
    userId: string;
    username: string;
    fullName?: string | null;
    fullNameAr?: string | null;
    role: string;
    canApplyDiscount: boolean;
    staffNo: string;
    pinCode?: string | null;
    bloodType: number;
    phone?: string | null;
    address?: string | null;
    photoUrl?: string | null;
    startDate?: string | null;
    contractStatus: number;
    monthlySalary: number;
    netSalary: number;
    sgkPremium: number;
    hourlyWage: number;
    commissionRate: number;
    weeklyShiftPattern?: string | null;
    stats: HrEmployeeStats;
}

export interface HrEmployeeCreate {
    username: string;
    password: string;
    fullName: string;
    fullNameAr?: string | null;
    role: number;
    canApplyDiscount: boolean;
    staffNo?: string | null;
    pinCode?: string | null;
    bloodType: number;
    phone?: string | null;
    address?: string | null;
    photoUrl?: string | null;
    startDate?: string | null;
    contractStatus: number;
    monthlySalary: number;
    netSalary: number;
    sgkPremium: number;
    hourlyWage: number;
    commissionRate: number;
    weeklyShiftPattern?: string | null;
}

export interface HrEmployeeUpdate {
    fullName?: string | null;
    fullNameAr?: string | null;
    role?: number | null;
    canApplyDiscount?: boolean | null;
    password?: string | null;
    staffNo?: string | null;
    pinCode?: string | null;
    bloodType?: number | null;
    phone?: string | null;
    address?: string | null;
    photoUrl?: string | null;
    startDate?: string | null;
    contractStatus?: number | null;
    monthlySalary?: number | null;
    netSalary?: number | null;
    sgkPremium?: number | null;
    hourlyWage?: number | null;
    commissionRate?: number | null;
    weeklyShiftPattern?: string | null;
}

export interface HrBonus {
    id: string;
    employeeId: string;
    employeeName: string;
    bonusType: string;
    bonusTypeLabel: string;
    amount: number;
    currency: string;
    awardDate: string;
    reason?: string | null;
    notes?: string | null;
    status: string;
    statusLabel: string;
    createdByUserId: string;
    createdByUserName: string;
    createdAt: string;
    approvedByUserId?: string | null;
    approvedAt?: string | null;
    paidAt?: string | null;
}

export interface HrBonusCreate {
    employeeId: string;
    bonusType: string;
    amount: number;
    currency?: string | null;
    awardDate: string;
    reason?: string | null;
    notes?: string | null;
}

export interface HrBonusUpdateStatus {
    status: string;
}

export interface HrBonusListResponse {
    items: HrBonus[];
    total: number;
    totalAmount: number;
    page: number;
    pageSize: number;
}

export interface HrEmployeeRequestItem {
    id: string;
    kind: "leave" | "loan" | "permission";
    typeCode: string;
    typeLabel: string;
    title: string;
    subtitle: string;
    status: string;        // canonical lowercase code (pending|approved|rejected|cancelled)
    statusLabel: string;
    createdAt: string;
    date: string;
}

export interface HrEmployeeRequests {
    leaves: HrEmployeeRequestItem[];
    loans: HrEmployeeRequestItem[];
    permissions: HrEmployeeRequestItem[];
}

// ===== Mobile request follow-up (admin) =====

export type HrRequestStatus = "pending" | "approved" | "rejected" | "cancelled";

export interface HrRequestEmployee {
    employeeId: string;
    userId: string;
    username: string;
    fullName?: string | null;
    fullNameAr?: string | null;
    staffNo?: string | null;
    photoUrl?: string | null;
}

export interface HrRequestBase {
    id: string;
    employee: HrRequestEmployee;
    status: HrRequestStatus | string;
    statusLabel: string;
    createdAt: string;
    reviewedAt?: string | null;
    reviewedByUserId?: string | null;
}

export interface HrLeaveRequest extends HrRequestBase {
    type: string;
    typeLabel: string;
    startDate: string;
    endDate: string;
    durationInDays: number;
    notes?: string | null;
}

export interface HrLoanRequest extends HrRequestBase {
    loanType: string;
    loanTypeLabel: string;
    owner: string;
    ownerLabel?: string | null;
    dependentName?: string | null;
    requestDate: string;
    requestedAmount: number;
    monthlyInstallment: number;
    currency: string;
    paymentPeriodMonths: number;
    installmentStartDate: string;
    installmentEndDate?: string | null;
    marriageDate?: string | null;
    basicSalary: number;
}

export interface HrPermissionRequest extends HrRequestBase {
    permissionType: string;
    permissionTypeLabel: string;
    date: string;
    timeFrom: string;
    timeTo: string;
    durationMinutes: number;
    reason?: string | null;
    hasAttachment: boolean;
    attachmentFileName?: string | null;
    attachmentContentType?: string | null;
    attachmentSizeBytes?: number | null;
}

export interface HrRequestPagedResponse<T> {
    items: T[];
    total: number;
    page: number;
    pageSize: number;
    statusCounts: Record<string, number>;
}

export interface HrCodeLabel {
    code: string;
    label: string;
    labelAr?: string | null;
}

export interface HrLookups {
    leaveTypes: HrCodeLabel[];
    loanTypes: HrCodeLabel[];
    permissionTypes: HrCodeLabel[];
    bonusTypes: HrCodeLabel[];
    requestStatuses: HrCodeLabel[];
    bonusStatuses: HrCodeLabel[];
    contractStatuses: HrCodeLabel[];
    roles: HrCodeLabel[];
}

// ===== Attendance / Timesheet =====

export interface HrAttendanceRecord {
    id: string;
    userId: string;
    userFullName: string;
    checkInAt: string;
    checkOutAt?: string | null;
    durationMinutes?: number | null;
    checkInNote?: string | null;
    checkOutNote?: string | null;
    checkInLatitude?: number | null;
    checkInLongitude?: number | null;
    checkInDistanceMeters?: number | null;
    checkOutLatitude?: number | null;
    checkOutLongitude?: number | null;
    checkOutDistanceMeters?: number | null;
    status: "CheckedIn" | "CheckedOut" | string;
}

export interface HrAttendancePagedResponse {
    items: HrAttendanceRecord[];
    totalCount: number;
    page: number;
    pageSize: number;
    totalPages: number;
}

export interface HrTimesheetDay {
    date: string;
    checkInAt?: string | null;
    checkOutAt?: string | null;
    durationMinutes: number;
    status: "CheckedIn" | "CheckedOut" | "Absent" | string;
}

export interface HrTimesheet {
    employeeId: string;
    month: string;
    totalMinutes: number;
    totalHours: number;
    daysWorked: number;
    openSessions: number;
    days: HrTimesheetDay[];
}

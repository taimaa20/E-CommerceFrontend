import { api } from "./api";
import { useAuthStore } from "@/store/authStore";
import type {
    HrEmployeeListResponse,
    HrEmployeeDetail,
    HrEmployeeCreate,
    HrEmployeeUpdate,
    HrBonus,
    HrBonusCreate,
    HrBonusListResponse,
    HrEmployeeRequests,
    HrLookups,
    HrAttendanceRecord,
    HrAttendancePagedResponse,
    HrTimesheet,
    HrLeaveRequest,
    HrLoanRequest,
    HrPermissionRequest,
    HrRequestPagedResponse,
} from "@/types/hr";

export interface HrRequestsQuery {
    employeeId?: string;
    status?: string;
    type?: string;
    from?: string;
    to?: string;
    page?: number;
    pageSize?: number;
}

export interface HrEmployeesQuery {
    search?: string;
    role?: number;
    contractStatus?: number;
    page?: number;
    pageSize?: number;
}

export interface HrBonusesQuery {
    employeeId?: string;
    status?: string;
    bonusType?: string;
    from?: string;
    to?: string;
    page?: number;
    pageSize?: number;
}

export interface AttendanceLocationPayload {
    latitude: number;
    longitude: number;
}

export const HrApi = {
    lookups: async () => {
        const res = await api.get<HrLookups>("/hr/lookups");
        return res.data;
    },
    me: async () => {
        const res = await api.get<HrEmployeeDetail>("/hr/me");
        return res.data;
    },
    listEmployees: async (q: HrEmployeesQuery = {}) => {
        const res = await api.get<HrEmployeeListResponse>("/hr/employees", { params: q });
        return res.data;
    },
    getEmployee: async (employeeId: string) => {
        const res = await api.get<HrEmployeeDetail>(`/hr/employees/${employeeId}`);
        return res.data;
    },
    createEmployee: async (payload: HrEmployeeCreate) => {
        const res = await api.post<HrEmployeeDetail>("/hr/employees", payload);
        return res.data;
    },
    updateEmployee: async (employeeId: string, payload: HrEmployeeUpdate) => {
        const res = await api.put<HrEmployeeDetail>(`/hr/employees/${employeeId}`, payload);
        return res.data;
    },
    employeeRequests: async (employeeId: string) => {
        const res = await api.get<HrEmployeeRequests>(`/hr/employees/${employeeId}/requests`);
        return res.data;
    },
    employeeBonuses: async (employeeId: string, q: { status?: string; page?: number; pageSize?: number } = {}) => {
        const res = await api.get<HrBonusListResponse>(`/hr/employees/${employeeId}/bonuses`, { params: q });
        return res.data;
    },
    createEmployeeBonus: async (employeeId: string, payload: HrBonusCreate) => {
        const res = await api.post<HrBonus>(`/hr/employees/${employeeId}/bonuses`, payload);
        return res.data;
    },
    listBonuses: async (q: HrBonusesQuery = {}) => {
        const res = await api.get<HrBonusListResponse>("/hr/bonuses", { params: q });
        return res.data;
    },
    createBonus: async (payload: HrBonusCreate) => {
        const res = await api.post<HrBonus>("/hr/bonuses", payload);
        return res.data;
    },
    updateBonusStatus: async (bonusId: string, status: string) => {
        const res = await api.put<HrBonus>(`/hr/bonuses/${bonusId}/status`, { status });
        return res.data;
    },

    // ===== Attendance / Timesheet =====
    checkIn: async (note?: string, location?: AttendanceLocationPayload) => {
        const res = await api.post<HrAttendanceRecord>("/hr/check-in", buildAttendancePayload(note, location));
        return res.data;
    },
    checkOut: async (note?: string, location?: AttendanceLocationPayload) => {
        const res = await api.post<HrAttendanceRecord>("/hr/check-out", buildAttendancePayload(note, location));
        return res.data;
    },
    myActiveAttendance: async () => {
        const res = await api.get<{ active: HrAttendanceRecord | null }>("/hr/me/attendance/active");
        return res.data?.active ?? null;
    },
    listAttendance: async (q: {
        userId?: string;
        fromDate?: string;
        toDate?: string;
        status?: "CheckedIn" | "CheckedOut" | string;
        sortOrder?: "asc" | "desc";
        page?: number;
        pageSize?: number;
    } = {}) => {
        const res = await api.get<HrAttendancePagedResponse>("/hr/attendance", { params: q });
        return res.data;
    },
    employeeTimesheet: async (employeeId: string, month?: string) => {
        const res = await api.get<HrTimesheet>(`/hr/employees/${employeeId}/timesheet`, {
            params: month ? { month } : undefined,
        });
        return res.data;
    },

    // ===== Mobile request follow-up =====
    listLeaveRequests: async (q: HrRequestsQuery = {}) => {
        const res = await api.get<HrRequestPagedResponse<HrLeaveRequest>>("/hr/leave-requests", { params: q });
        return res.data;
    },
    listLoanRequests: async (q: HrRequestsQuery = {}) => {
        const res = await api.get<HrRequestPagedResponse<HrLoanRequest>>("/hr/loan-requests", { params: q });
        return res.data;
    },
    listPermissionRequests: async (q: HrRequestsQuery = {}) => {
        const res = await api.get<HrRequestPagedResponse<HrPermissionRequest>>("/hr/permission-requests", { params: q });
        return res.data;
    },
    updateLeaveStatus: async (id: string, status: string) => {
        const res = await api.put<HrLeaveRequest>(`/hr/leave-requests/${id}/status`, { status });
        return res.data;
    },
    updateLoanStatus: async (id: string, status: string) => {
        const res = await api.put<HrLoanRequest>(`/hr/loan-requests/${id}/status`, { status });
        return res.data;
    },
    updatePermissionStatus: async (id: string, status: string) => {
        const res = await api.put<HrPermissionRequest>(`/hr/permission-requests/${id}/status`, { status });
        return res.data;
    },
    downloadPermissionAttachment: async (id: string, suggestedFileName?: string) => {
        const url = `/api/api-proxy/hr/permission-requests/${id}/attachment`;
        const token = useAuthStore.getState().user?.token ?? "";
        const res = await fetch(url, {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        if (!res.ok) throw new Error(`Download failed (${res.status})`);
        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = blobUrl;
        a.download = suggestedFileName || `permission-${id}`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    },
};

function buildAttendancePayload(note?: string, location?: AttendanceLocationPayload) {
    return {
        note: note ?? null,
        latitude: location?.latitude ?? null,
        longitude: location?.longitude ?? null,
    };
}

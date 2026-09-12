"use client";

import { useCallback, useEffect, useState } from "react";
import { HrApi, type HrEmployeesQuery, type HrBonusesQuery, type HrRequestsQuery } from "@/lib/api-hr";
import type {
    HrEmployeeDetail,
    HrEmployeeListItem,
    HrEmployeeListResponse,
    HrEmployeeRequests,
    HrBonus,
    HrBonusListResponse,
    HrLookups,
    HrAttendanceRecord,
    HrTimesheet,
    HrLeaveRequest,
    HrLoanRequest,
    HrPermissionRequest,
    HrRequestPagedResponse,
} from "@/types/hr";

interface AsyncState<T> {
    data: T | null;
    loading: boolean;
    error: string | null;
}

function useAsync<T>(loader: () => Promise<T>, deps: any[]): AsyncState<T> & { reload: () => void } {
    const [state, setState] = useState<AsyncState<T>>({ data: null, loading: true, error: null });
    const [tick, setTick] = useState(0);

    useEffect(() => {
        let cancelled = false;
        setState((s) => ({ ...s, loading: true, error: null }));
        loader()
            .then((data) => { if (!cancelled) setState({ data, loading: false, error: null }); })
            .catch((e) => { if (!cancelled) setState({ data: null, loading: false, error: e?.message ?? "Failed" }); });
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [...deps, tick]);

    return { ...state, reload: () => setTick((n) => n + 1) };
}

export function useHrLookups() {
    return useAsync<HrLookups>(() => HrApi.lookups(), []);
}

export function useHrEmployees(query: HrEmployeesQuery) {
    const key = JSON.stringify(query);
    return useAsync<HrEmployeeListResponse>(() => HrApi.listEmployees(query), [key]);
}

export function useHrEmployee(employeeId: string | null) {
    return useAsync<HrEmployeeDetail | null>(
        async () => (employeeId ? await HrApi.getEmployee(employeeId) : null),
        [employeeId]
    );
}

export function useHrEmployeeRequests(employeeId: string | null) {
    return useAsync<HrEmployeeRequests | null>(
        async () => (employeeId ? await HrApi.employeeRequests(employeeId) : null),
        [employeeId]
    );
}

export function useHrEmployeeBonuses(employeeId: string | null, status?: string) {
    return useAsync<HrBonusListResponse | null>(
        async () => (employeeId ? await HrApi.employeeBonuses(employeeId, { status }) : null),
        [employeeId, status]
    );
}

export function useHrBonuses(query: HrBonusesQuery) {
    const key = JSON.stringify(query);
    return useAsync<HrBonusListResponse>(() => HrApi.listBonuses(query), [key]);
}

export function useHrMutations(reload?: () => void) {
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const wrap = useCallback(async <T,>(op: () => Promise<T>): Promise<T | null> => {
        setBusy(true); setError(null);
        try {
            const result = await op();
            reload?.();
            return result;
        } catch (e: any) {
            setError(e?.message ?? "Failed");
            throw e;
        } finally {
            setBusy(false);
        }
    }, [reload]);

    return { busy, error, wrap };
}

export function useHrEmployeeTimesheet(employeeId: string | null, month?: string) {
    return useAsync<HrTimesheet | null>(
        async () => (employeeId ? await HrApi.employeeTimesheet(employeeId, month) : null),
        [employeeId, month ?? ""]
    );
}

export function useHrMyAttendance() {
    return useAsync<HrAttendanceRecord | null>(() => HrApi.myActiveAttendance(), []);
}

export function useHrLeaveRequests(query: HrRequestsQuery) {
    const key = JSON.stringify(query);
    return useAsync<HrRequestPagedResponse<HrLeaveRequest>>(() => HrApi.listLeaveRequests(query), [key]);
}

export function useHrLoanRequests(query: HrRequestsQuery) {
    const key = JSON.stringify(query);
    return useAsync<HrRequestPagedResponse<HrLoanRequest>>(() => HrApi.listLoanRequests(query), [key]);
}

export function useHrPermissionRequests(query: HrRequestsQuery) {
    const key = JSON.stringify(query);
    return useAsync<HrRequestPagedResponse<HrPermissionRequest>>(() => HrApi.listPermissionRequests(query), [key]);
}

export type { HrEmployeeListItem, HrEmployeeDetail, HrBonus };

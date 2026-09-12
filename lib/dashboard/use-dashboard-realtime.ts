"use client";

import { useEffect, useRef } from "react";
import { HubConnection, HubConnectionBuilder, HubConnectionState, LogLevel } from "@microsoft/signalr";
import { useAuthStore } from "@/store/authStore";
import { config } from "@/lib/config";
import { appendBranchQuery } from "@/lib/branch-selection";
import type { DashboardScope } from "./filter-types";

const EVENT_BY_SCOPE: Record<DashboardScope, string> = {
    Operations: "OperationsInvalidated",
    Financial:  "FinancialInvalidated",
    Inventory:  "InventoryInvalidated",
    Audit:      "AuditInvalidated",
};

/**
 * Joins the dashboard SignalR group for the given scope and invokes
 * `onInvalidate` when the backend reports the underlying data has changed.
 *
 * Designed to fail silently — if the hub is unreachable, the dashboard
 * still works (the user simply has to refresh manually). No console noise,
 * no thrown errors. Realtime is observability, not business-critical.
 */
export function useDashboardRealtime(scope: DashboardScope, onInvalidate: () => void) {
    const connectionRef = useRef<HubConnection | null>(null);
    const callbackRef   = useRef(onInvalidate);
    callbackRef.current = onInvalidate;

    useEffect(() => {
        const token = useAuthStore.getState().user?.token;
        if (!token) return;

        // Tenant id is required server-side for group routing. Pull from
        // localStorage (where the auth bootstrap stores it) and bail
        // gracefully if it's not present.
        const tenantId = typeof window !== "undefined"
            ? (localStorage.getItem("tenantId") ?? "")
            : "";
        if (!tenantId) return;

        const hubUrl = appendBranchQuery(config.signalRUrl.replace(/\/kitchenHub$/, "/dashboardHub"));
        const connection = new HubConnectionBuilder()
            .withUrl(hubUrl, { accessTokenFactory: () => token })
            .withAutomaticReconnect()
            .configureLogging(LogLevel.None) // suppress library noise
            .build();

        connectionRef.current = connection;
        connection.on(EVENT_BY_SCOPE[scope], () => callbackRef.current());

        let cancelled = false;
        (async () => {
            try {
                await connection.start();
                if (cancelled) {
                    connection.stop().catch(() => { /* swallow */ });
                    return;
                }
                await connection.invoke("JoinScope", tenantId, scope);
            } catch {
                // Realtime is optional — periodic manual refresh + filter-change
                // refetch keep the dashboard fresh. Swallow connection errors.
            }
        })();

        return () => {
            cancelled = true;
            connection.off(EVENT_BY_SCOPE[scope]);
            if (connection.state === HubConnectionState.Connected) {
                connection.invoke("LeaveScope", tenantId, scope).catch(() => { /* swallow */ });
                connection.stop().catch(() => { /* swallow */ });
            }
            connectionRef.current = null;
        };
    }, [scope]);
}

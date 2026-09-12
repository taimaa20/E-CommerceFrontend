"use client";

import { useOrder } from "../store/orderStore";
import { useOrderTrackingSimulator } from "../hooks/useOrderTracking";

/**
 * Headless. Mounted once in the table layout so the kitchen status simulator
 * advances no matter which sub-page the diner is on (menu, order, tracking…).
 * Swap useOrderTrackingSimulator for a live KDS/SignalR subscription later
 * with zero consumer changes.
 */
export function OrderLifecycleDriver({ tableId }: { tableId: string }) {
  const order = useOrder(tableId, (s) => s.order);
  useOrderTrackingSimulator(tableId, order);
  return null;
}

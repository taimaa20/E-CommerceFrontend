"use client";

import { useEffect } from "react";
import type { CustomerOrder } from "../types";
import { useOrder } from "../store/orderStore";
import { orderService } from "../services";

/**
 * Walks the order through its statuses using simulated timings — runs as
 * long as the component using this hook stays mounted on the tracking screen.
 * Designed for the demo; swap to a SignalR/WebSocket subscription later
 * without changing the consumer.
 */
export function useOrderTrackingSimulator(tableId: string, order: CustomerOrder | null) {
  const setStatus = useOrder(tableId, (s) => s.setStatus);

  useEffect(() => {
    if (!order) return;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const tick = (status: CustomerOrder["status"]) => {
      const next = orderService.nextStatusAfter(status);
      if (!next) return;
      const delay = orderService.delayFor(status);
      timer = setTimeout(() => {
        setStatus(next);
        tick(next);
      }, delay);
    };

    tick(order.status);
    return () => {
      if (timer) clearTimeout(timer);
    };
    // Re-run only when the order id changes — status flips come from inside.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order?.id]);
}

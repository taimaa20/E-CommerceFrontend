import { api } from "@/lib/api";
import { buildReceiptBodyHtml, getReceiptCss } from "@/lib/print-receipt";
import type { PrintReceiptOptions } from "@/lib/print-receipt";
import { getConnectivityState } from "@/lib/offline/connectivity";
import { getIdempotencyHeaders } from "@/lib/offline/idempotency";
import { isOfflineOrderId } from "@/lib/offline/id";
import { printReceiptViaLocalAgent } from "@/lib/print-receipt-local";

function buildFullReceiptHtml(options: PrintReceiptOptions): string {
    const bodyHtml = buildReceiptBodyHtml(options);
    const css = getReceiptCss();
    return `<!DOCTYPE html>
<html lang='en'>
<head>
  <meta charset='UTF-8' />
  <style>
    ${css}
    html, body { margin: 0; padding: 0; width: 80mm; background: #fff; }
    @page { size: 80mm auto; margin: 0; }
  </style>
</head>
<body dir='ltr'>
  ${bodyHtml}
</body>
</html>`;
}

export async function printReceiptViaHtml(options: PrintReceiptOptions): Promise<boolean> {
    const fullHtml = buildFullReceiptHtml(options);

    // Online: hand off to the cloud. The cashier's resolved printer is picked
    // there, the agent claims the job and prints. This is the canonical path.
    // Skip when the order id is still the offline synthetic ("offline-order-…")
    // — the server endpoint validates orderId as a Guid and rejects synthetic
    // ids with a 400. The queue replay will reissue the print request against
    // the real server id once the create-order action syncs.
    const connectivity = getConnectivityState();
    const orderIsSynced = !isOfflineOrderId(options.order.id);
    if (connectivity === "online" && orderIsSynced) {
        try {
            const idempotencyKey =
                options.receiptTransactionId ?? `receipt:${options.order.id}`;
            const response = await api.post<{ enqueued: boolean }>(
                `/printing/orders/${options.order.id}/receipt-html`,
                { htmlContent: fullHtml },
                { headers: getIdempotencyHeaders(idempotencyKey) },
            );
            if (response.data?.enqueued === true) return true;
        } catch {
            // Cloud just went down between the connectivity check and the call.
            // Fall through to the loopback path so the receipt still prints.
        }
    }

    // Offline / degraded — POST directly to the in-store agent on 127.0.0.1.
    // Uses the cashier's cached printer config; works only when the browser is
    // on the same PC as the agent, which is by design for the cashier station.
    return await printReceiptViaLocalAgent(fullHtml);
}

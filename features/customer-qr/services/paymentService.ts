import type {
  CustomerOrder,
  PaymentMethod,
  PaymentMethodId,
  PaymentTransaction,
} from "../types";
import { PAYMENT_METHODS } from "../constants";
import { SOURCE, simulateLatency } from "./source";

async function listMethodsMock(): Promise<PaymentMethod[]> {
  await simulateLatency(80);
  return PAYMENT_METHODS;
}

async function chargeMock(
  order: CustomerOrder,
  method: PaymentMethodId,
): Promise<PaymentTransaction> {
  await simulateLatency(1800);
  return {
    id: `pay_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    orderId: order.id,
    method,
    amount: order.totals.grandTotal,
    tipAmount: order.totals.tipAmount,
    taxAmount: order.totals.taxAmount,
    serviceAmount: order.totals.serviceAmount,
    status: "succeeded",
    createdAtIso: new Date().toISOString(),
    reference:
      method === "visa" || method === "mastercard" || method === "card" || method === "debit"
        ? `•••• ${Math.floor(1000 + Math.random() * 9000)}`
        : undefined,
  };
}

export const paymentService = {
  listMethods: (): Promise<PaymentMethod[]> =>
    SOURCE === "mock" ? listMethodsMock() : Promise.reject(new Error("api adapter not wired")),
  charge: (order: CustomerOrder, method: PaymentMethodId): Promise<PaymentTransaction> =>
    SOURCE === "mock" ? chargeMock(order, method) : Promise.reject(new Error("api adapter not wired")),
};

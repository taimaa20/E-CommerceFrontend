import type { CustomerTable } from "../types";
import { mockTables } from "../mock/tables";
import { SOURCE, simulateLatency } from "./source";

async function listTablesMock(): Promise<CustomerTable[]> {
  await simulateLatency(150);
  return mockTables;
}

async function getTableMock(id: string): Promise<CustomerTable | null> {
  await simulateLatency(120);
  return mockTables.find((t) => t.id === id) ?? null;
}

export const tableService = {
  list: (): Promise<CustomerTable[]> =>
    SOURCE === "mock" ? listTablesMock() : Promise.reject(new Error("api adapter not wired")),
  get: (id: string): Promise<CustomerTable | null> =>
    SOURCE === "mock" ? getTableMock(id) : Promise.reject(new Error("api adapter not wired")),
};

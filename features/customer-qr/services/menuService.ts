import type { MenuItem, MenuSnapshot } from "../types";
import { mockMenu } from "../mock/menu";
import { SOURCE, simulateLatency } from "./source";

async function snapshotMock(): Promise<MenuSnapshot> {
  await simulateLatency(280);
  return mockMenu;
}

async function getItemMock(id: string): Promise<MenuItem | null> {
  await simulateLatency(120);
  return mockMenu.items.find((i) => i.id === id) ?? null;
}

export const menuService = {
  snapshot: (): Promise<MenuSnapshot> =>
    SOURCE === "mock" ? snapshotMock() : Promise.reject(new Error("api adapter not wired")),
  getItem: (id: string): Promise<MenuItem | null> =>
    SOURCE === "mock" ? getItemMock(id) : Promise.reject(new Error("api adapter not wired")),
};

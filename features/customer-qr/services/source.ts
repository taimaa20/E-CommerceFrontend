/**
 * Single switch that decides where every service reads from.
 *
 * Future: change to "api" and add the matching adapter files in
 * services/api/* — UI, hooks, stores, and types stay untouched.
 */
export type SourceKind = "mock" | "api";

export const SOURCE: SourceKind = "mock";

/** Simulate realistic network latency for the demo. */
export const simulateLatency = async (ms = 250): Promise<void> => {
  if (SOURCE !== "mock") return;
  await new Promise<void>((r) => setTimeout(r, ms));
};

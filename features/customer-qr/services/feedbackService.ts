import type { FeedbackSubmission } from "../types";
import { SOURCE, simulateLatency } from "./source";

async function submitMock(input: Omit<FeedbackSubmission, "createdAtIso">): Promise<FeedbackSubmission> {
  await simulateLatency(400);
  return { ...input, createdAtIso: new Date().toISOString() };
}

export const feedbackService = {
  submit: (input: Omit<FeedbackSubmission, "createdAtIso">): Promise<FeedbackSubmission> =>
    SOURCE === "mock" ? submitMock(input) : Promise.reject(new Error("api adapter not wired")),
};

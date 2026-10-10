import type { Profile } from "./filter";

export type ChatMessage = { role: "user" | "assistant"; content: string };
export type ExtractResponse =
  | { status: "needs_more"; question: string; chips: string[] }
  | { status: "complete"; profile: Profile };

export const FIRST_QUESTION = {
  question: "What are you saving for, and roughly when will you need the money?",
  chips: ["Emergency cushion, 6 months", "A trip in 1 year", "Bike in 3 years", "Long-term, 5+ years"],
};

const SECOND = {
  question: "How much could you put in each month, and how would a 10% dip make you feel?",
  chips: ["₹2,000, I'd be nervous", "₹5,000, I'd be okay", "₹10,000, I'd stay calm"],
};

// Stub for the extract-profile function. Receives the FULL history each call.
export async function extractProfile(history: ChatMessage[]): Promise<ExtractResponse> {
  await new Promise((r) => setTimeout(r, 600));
  const answers = history.filter((m) => m.role === "user").map((m) => m.content);
  if (answers.some((a) => a.toLowerCase().includes("fail"))) throw new Error("stub failure");
  if (answers.length < 2) return { status: "needs_more", ...SECOND };
  return { status: "complete", profile: guess(answers.join(" ").toLowerCase(), answers[0]) };
}

function guess(t: string, goal: string): Profile {
  let horizon = 12;
  const y = t.match(/(\d+)\s*\+?\s*year/);
  const m = t.match(/(\d+)\s*month/);
  if (y) horizon = Number(y[1]) * 12;
  else if (m) horizon = Number(m[1]);
  const amt = t.match(/₹?\s?([\d,]{3,})/);
  return {
    goal: goal.split(",")[0].trim() || "Saving",
    horizon_months: horizon,
    monthly_amount: amt ? Number(amt[1].replace(/,/g, "")) : 2000,
    income_type: /freelance|irregular|gig/.test(t) ? "irregular" : "regular",
    emergency_fund: /emergency/.test(t) ? "no" : "yes",
    risk_feeling: /nervous|scared|worried/.test(t) ? "nervous" : /calm/.test(t) ? "calm" : "okay",
  };
}

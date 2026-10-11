import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import sheets from "@/data/factsheets.json";

const SYSTEM = `You answer a first-time investor's question about ONE investment type, using ONLY the facts provided below. Reply in simple, friendly language, in the user's language (English, Hindi or Hinglish), in 2-4 short sentences. Every number or claim must come from the facts. If the facts do not contain the answer, say you don't have that in this demo and suggest what to check on a real fund page. NEVER predict future performance, never say or imply that something will go up, never tell the user to buy, sell or choose, and never mention specific real funds or companies. If asked 'should I buy this', explain how to think about fit using the facts instead. End answers about past behaviour with: 'Past behaviour does not predict the future.'`;

const Input = z.object({
  categoryId: z.string().max(40),
  question: z.string().min(1).transform((s) => s.slice(0, 300)),
  history: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(2000) })).max(50).default([]),
});

export const askCategory = createServerFn({ method: "POST" })
  .inputValidator((d) => Input.parse(d))
  .handler(async ({ data }): Promise<{ answer: string; grounded: boolean }> => {
    const sheet = sheets.types.find((t) => t.id === data.categoryId);
    const fail = { answer: "Couldn't answer right now. Try one of the suggested questions.", grounded: false };
    if (!sheet) return fail;
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) return fail;
    const instructions = `${SYSTEM}\n\nInvestment type: ${sheet.name}\nFacts (mock demo data):\n${sheet.facts.map((f) => `- ${f}`).join("\n")}`;
    const input = [...data.history.slice(-6), { role: "user", content: data.question }].map((m) => ({ role: m.role, content: m.content }));
    try {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "fetch" },
        body: JSON.stringify({ model: "openai/gpt-6-astra", instructions, input, stream: true, store: false, reasoning: { effort: "low" } }),
      });
      if (!res.ok || !res.body) { console.error("ask-category", res.status, await res.text().catch(() => "")); return fail; }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "", answer = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const l of lines) {
          if (!l.startsWith("data:")) continue;
          const p = l.slice(5).trim();
          if (!p || p === "[DONE]") continue;
          try { const ev = JSON.parse(p); if (ev.type === "response.output_text.delta") answer += ev.delta; } catch { /* ignore */ }
        }
      }
      answer = answer.trim();
      return answer ? { answer, grounded: true } : fail;
    } catch (e) {
      console.error("ask-category", e);
      return fail;
    }
  });

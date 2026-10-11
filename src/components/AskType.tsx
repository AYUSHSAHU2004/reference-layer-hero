import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import sheets from "@/data/factsheets.json";
import { askCategory } from "@/lib/ask-category.functions";

export type AskMsg = { role: "user" | "assistant"; content: string; grounded?: boolean };
export const categoryIdFor = (type: string) => sheets.types.find((t) => t.name === type)?.id ?? "";
const SUGGESTED = ["Can I withdraw anytime?", "How badly can it fall?", "Who is this not for?"];

export function AskType({ categoryId, msgs, setMsgs }: { categoryId: string; msgs: AskMsg[]; setMsgs: (m: AskMsg[]) => void }) {
  const ask = useServerFn(askCategory);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  async function send(q: string) {
    const text = q.trim().slice(0, 300);
    if (!text || busy) return;
    const history = msgs.map(({ role, content }) => ({ role, content }));
    const next: AskMsg[] = [...msgs, { role: "user", content: text }];
    setMsgs(next); setInput(""); setBusy(true); setFailed(false);
    try {
      const r = await ask({ data: { categoryId, question: text, history } });
      setMsgs([...next, { role: "assistant", content: r.answer, grounded: r.grounded }]);
      if (!r.grounded) setFailed(true);
    } catch {
      setMsgs([...next, { role: "assistant", content: "Couldn't answer right now. Try one of the suggested questions.", grounded: false }]);
      setFailed(true);
    } finally { setBusy(false); }
  }

  return (
    <section className="space-y-3 rounded-2xl border bg-card p-4">
      <h2 className="text-base">Ask about this type</h2>
      {msgs.map((m, i) => (
        <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
          <div className={m.role === "user" ? "max-w-[85%] rounded-2xl rounded-br-md bg-primary px-3.5 py-2 text-sm text-primary-foreground" : "max-w-[90%] rounded-2xl rounded-bl-md bg-secondary px-3.5 py-2 text-sm text-secondary-foreground"}>
            <p>{m.content}</p>
            {m.role === "assistant" && m.grounded && <p className="mt-1 text-[11px] opacity-70">From demo fact sheet</p>}
          </div>
        </div>
      ))}
      {busy && <p className="animate-pulse text-sm text-muted-foreground">Looking at the fact sheet…</p>}
      {(msgs.length === 0 || failed) && !busy && (
        <div className="flex flex-wrap gap-2">
          {SUGGESTED.map((s) => <button key={s} type="button" onClick={() => send(s)} className="rounded-full border bg-background px-3 py-1.5 text-xs hover:bg-secondary">{s}</button>)}
        </div>
      )}
      <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="flex gap-2">
        <input aria-label="Ask about this type" value={input} maxLength={300} onChange={(e) => setInput(e.target.value)} placeholder="Ask in English, Hindi or Hinglish…" className="min-w-0 flex-1 rounded-full border bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring" />
        <button type="submit" disabled={busy || !input.trim()} className="rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50">Ask</button>
      </form>
      <p className="text-[11px] text-muted-foreground">Educational demo using mock data. Not investment advice.</p>
    </section>
  );
}

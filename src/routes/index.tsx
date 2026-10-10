import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState, type ReactNode } from "react";
import fundsData from "@/data/funds.json";
import { filterFunds, whyItFits, type Fund, type Profile } from "@/lib/filter";
import { extractProfile, FIRST_QUESTION, type ChatMessage } from "@/lib/extract-profile";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "First Step — Find the investment type that fits you" },
      { name: "description", content: "A calm guide for first-time investors in India to learn which type of fund suits their situation. Educational demo." },
      { property: "og:title", content: "First Step — Find the investment type that fits you" },
      { property: "og:description", content: "Answer a few questions and learn which fund types fit your goal and timeline." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: App,
});

const funds = fundsData as Fund[];
type Screen = "welcome" | "chat" | "form" | "confirm" | "results" | "detail";
const MAX_Q = 4;

const DEFAULT: Profile = { goal: "", horizon_months: 12, monthly_amount: 2000, income_type: "regular", emergency_fund: "yes", risk_feeling: "okay" };

function App() {
  const [screen, setScreen] = useState<Screen>("welcome");
  const [profile, setProfile] = useState<Profile>(DEFAULT);
  const [fund, setFund] = useState<Fund | null>(null);

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col px-5">
      <main className="flex flex-1 flex-col py-6">
        {screen === "welcome" && <Welcome onStart={() => setScreen("chat")} />}
        {screen === "chat" && (
          <Chat
            onComplete={(p) => { setProfile(p); setScreen("confirm"); }}
            onFail={() => setScreen("form")}
          />
        )}
        {screen === "form" && (
          <ProfileForm title="Tell us a little about you" note="The chat isn't available right now, so here's a short form instead." initial={DEFAULT} cta="See my matches" onSubmit={(p) => { setProfile(p); setScreen("results"); }} />
        )}
        {screen === "confirm" && (
          <ProfileForm title="Here's what I understood" note="Change anything that's not right, then confirm." initial={profile} cta="Looks right" onSubmit={(p) => { setProfile(p); setScreen("results"); }} />
        )}
        {screen === "results" && (
          <Results profile={profile} onOpen={(f) => { setFund(f); setScreen("detail"); }} onEdit={() => setScreen("confirm")} />
        )}
        {screen === "detail" && fund && <Detail fund={fund} profile={profile} onBack={() => setScreen("results")} />}
      </main>
      <footer className="border-t py-4 text-center text-xs text-muted-foreground">Educational demo. Not investment advice.</footer>
    </div>
  );
}

function Btn({ children, variant = "primary", ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" }) {
  const cls = variant === "primary"
    ? "bg-primary text-primary-foreground hover:opacity-90"
    : "bg-transparent text-primary underline-offset-4 hover:underline";
  return <button {...rest} className={`rounded-full px-5 py-3 text-sm font-semibold transition disabled:opacity-50 ${cls} ${rest.className ?? ""}`}>{children}</button>;
}

function Welcome({ onStart }: { onStart: () => void }) {
  return (
    <div className="fade-up flex flex-1 flex-col justify-center gap-8">
      <div className="h-14 w-14 rounded-2xl bg-accent" aria-hidden>
        <svg viewBox="0 0 56 56" className="h-full w-full text-primary"><path d="M14 40h10v-8h10v-8h10" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </div>
      <div className="space-y-3">
        <p className="text-sm font-semibold uppercase tracking-widest text-primary">First Step</p>
        <h1 className="text-4xl leading-tight">Find which type of investment fits your life right now.</h1>
      </div>
      <Btn onClick={onStart} className="w-full">Start</Btn>
      <p className="rounded-xl bg-muted p-3 text-xs text-muted-foreground">All funds shown are made-up demo data, not real products.</p>
    </div>
  );
}

type UiMsg = ChatMessage & { chips?: string[] };

function Chat({ onComplete, onFail }: { onComplete: (p: Profile) => void; onFail: () => void }) {
  const [msgs, setMsgs] = useState<UiMsg[]>([{ role: "assistant", content: FIRST_QUESTION.question, chips: FIRST_QUESTION.chips }]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => end.current?.scrollIntoView({ behavior: "smooth" }), [msgs, busy]);

  async function send(text: string) {
    if (!text.trim() || busy) return;
    const next: UiMsg[] = [...msgs, { role: "user", content: text.trim() }];
    setMsgs(next); setInput(""); setBusy(true);
    try {
      const res = await extractProfile(next.map(({ role, content }) => ({ role, content })));
      const asked = next.filter((m) => m.role === "assistant").length;
      if (res.status === "complete") return onComplete(res.profile);
      if (asked >= MAX_Q) throw new Error("too many questions");
      setMsgs([...next, { role: "assistant", content: res.question, chips: res.chips }]);
    } catch {
      onFail();
    } finally { setBusy(false); }
  }

  const last = msgs[msgs.length - 1]!;
  return (
    <div className="flex flex-1 flex-col">
      <div className="flex-1 space-y-4">
        {msgs.map((m, i) => (
          <div key={i} className={`fade-up flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <p className={m.role === "user" ? "max-w-[80%] rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-sm text-primary-foreground" : "max-w-[90%] text-[15px] leading-relaxed"}>{m.content}</p>
          </div>
        ))}
        {busy && <p className="animate-pulse text-sm text-muted-foreground">Thinking…</p>}
        {!busy && last.role === "assistant" && last.chips && (
          <div className="fade-up flex flex-wrap gap-2">
            {last.chips.map((c) => (
              <button key={c} onClick={() => send(c)} className="rounded-full border bg-card px-3.5 py-2 text-sm hover:bg-secondary">{c}</button>
            ))}
          </div>
        )}
        <div ref={end} />
      </div>
      <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="sticky bottom-0 mt-6 flex gap-2 bg-background pt-2">
        <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Type your answer…" className="flex-1 rounded-full border bg-card px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
        <Btn type="submit" disabled={busy || !input.trim()}>Send</Btn>
      </form>
      <button onClick={onFail} className="mt-3 text-xs text-muted-foreground underline">Prefer a short form?</button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block space-y-1.5"><span className="text-sm font-medium">{label}</span>{children}</label>;
}
const inputCls = "w-full rounded-xl border bg-card px-3.5 py-3 text-sm outline-none focus:ring-2 focus:ring-ring";

function Choice<T extends string>({ value, options, onChange }: { value: T; options: { v: T; l: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="flex gap-2">
      {options.map((o) => (
        <button type="button" key={o.v} onClick={() => onChange(o.v)} className={`flex-1 rounded-xl border px-3 py-2.5 text-sm ${value === o.v ? "border-primary bg-secondary font-semibold" : "bg-card"}`}>{o.l}</button>
      ))}
    </div>
  );
}

function ProfileForm({ title, note, initial, cta, onSubmit }: { title: string; note: string; initial: Profile; cta: string; onSubmit: (p: Profile) => void }) {
  const [p, setP] = useState(initial);
  const set = <K extends keyof Profile>(k: K, v: Profile[K]) => setP({ ...p, [k]: v });
  return (
    <form className="fade-up space-y-5" onSubmit={(e) => { e.preventDefault(); onSubmit({ ...p, goal: p.goal || "Saving" }); }}>
      <div className="space-y-1"><h1 className="text-2xl">{title}</h1><p className="text-sm text-muted-foreground">{note}</p></div>
      <Field label="Goal"><input className={inputCls} value={p.goal} onChange={(e) => set("goal", e.target.value)} placeholder="e.g. A trip" /></Field>
      <Field label="When you'll need the money (months)"><input type="number" min={1} className={inputCls} value={p.horizon_months} onChange={(e) => set("horizon_months", Math.max(1, Number(e.target.value)))} /></Field>
      <Field label="Monthly amount (₹)"><input type="number" min={100} className={inputCls} value={p.monthly_amount} onChange={(e) => set("monthly_amount", Number(e.target.value))} /></Field>
      <Field label="Your income"><Choice value={p.income_type} onChange={(v) => set("income_type", v)} options={[{ v: "regular", l: "Steady" }, { v: "irregular", l: "Changes month to month" }]} /></Field>
      <Field label="Savings for emergencies (3+ months of costs)?"><Choice value={p.emergency_fund} onChange={(v) => set("emergency_fund", v)} options={[{ v: "yes", l: "Yes" }, { v: "no", l: "Not yet" }]} /></Field>
      <Field label="If it dropped 10% for a while, you'd feel"><Choice value={p.risk_feeling} onChange={(v) => set("risk_feeling", v)} options={[{ v: "nervous", l: "Nervous" }, { v: "okay", l: "Okay" }, { v: "calm", l: "Calm" }]} /></Field>
      <Btn type="submit" className="w-full">{cta}</Btn>
    </form>
  );
}

function Results({ profile, onOpen, onEdit }: { profile: Profile; onOpen: (f: Fund) => void; onEdit: () => void }) {
  const r = filterFunds(funds, profile);
  return (
    <div className="fade-up space-y-4">
      <div className="space-y-1"><h1 className="text-2xl">Types that fit you</h1><p className="text-sm text-muted-foreground">Based on: {profile.goal}, in {profile.horizon_months} months, ₹{profile.monthly_amount.toLocaleString("en-IN")}/month.</p></div>
      {r.showEmergencyCard && (
        <div className="rounded-2xl bg-warn p-4 text-sm text-warn-foreground"><p className="font-semibold">Build an emergency fund first</p><p className="mt-1">Before investing, try to keep 3–6 months of costs somewhere easy to reach, like a savings account or liquid fund.</p></div>
      )}
      {r.showIrregularNote && (
        <div className="rounded-2xl bg-secondary p-4 text-sm text-secondary-foreground">Your income changes, so it's okay to skip or reduce a month. Most monthly plans (<Term t="SIP" />) let you pause.</div>
      )}
      {r.matches.length === 0 && <p className="rounded-2xl bg-muted p-4 text-sm">No fund in this demo fits that timeline. A savings account or fixed deposit may suit very short goals.</p>}
      {r.matches.map((f) => (
        <button key={f.id} onClick={() => onOpen(f)} className="block w-full rounded-2xl border bg-card p-4 text-left transition hover:border-primary">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">{f.type}</p>
          <p className="mt-1 font-semibold">{f.name}</p>
          <p className="mt-1.5 text-sm text-muted-foreground">{f.reason}</p>
        </button>
      ))}
      {r.hidden.length > 0 && (
        <details className="rounded-2xl border bg-card p-4">
          <summary className="cursor-pointer text-sm font-semibold">Why not the others</summary>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">{r.hidden.map((h) => <li key={h.type}>{h.reason}</li>)}</ul>
        </details>
      )}
      <Btn variant="ghost" onClick={onEdit}>Change my answers</Btn>
    </div>
  );
}

const JARGON: Record<string, string> = {
  SIP: "A plan where a fixed amount is invested for you every month.",
  NAV: "The price of one unit of the fund on a given day.",
  "lock-in": "A period when you can't take your money out at all.",
  "exit load": "A small fee if you withdraw before a set time.",
};

function Term({ t }: { t: keyof typeof JARGON | string }) {
  const [open, setOpen] = useState(false);
  return (
    <span>
      <button type="button" onClick={() => setOpen(!open)} className="font-semibold text-primary underline decoration-dotted underline-offset-4">{t}</button>
      {open && <span className="mt-1 block rounded-lg bg-accent px-2.5 py-1.5 text-xs text-accent-foreground">{JARGON[t]}</span>}
    </span>
  );
}

function Detail({ fund: f, profile, onBack }: { fund: Fund; profile: Profile; onBack: () => void }) {
  const months = (m: number) => (m === 0 ? "None" : m >= 12 && m % 12 === 0 ? `${m / 12} yr` : `${m} months`);
  const risky = f.risk === "high" || f.risk === "medium-high";
  return (
    <div className="fade-up space-y-5">
      <button onClick={onBack} className="text-sm text-muted-foreground">← Back</button>
      <div><p className="text-xs font-semibold uppercase tracking-wide text-primary">{f.type}</p><h1 className="mt-1 text-2xl">{f.name}</h1></div>
      <p className="text-[15px] leading-relaxed">{f.summary}</p>
      <section className="rounded-2xl bg-secondary p-4 text-sm text-secondary-foreground"><h2 className="mb-1 text-base">Why it fits you</h2>{whyItFits(f, profile)}</section>
      <section className="rounded-2xl border bg-card p-4">
        <h2 className="mb-3 text-base">The basics</h2>
        <dl className="grid grid-cols-2 gap-y-3 text-sm">
          <dt className="text-muted-foreground">Risk</dt><dd className="capitalize">{f.risk}</dd>
          <dt className="text-muted-foreground">Stay invested at least</dt><dd>{months(f.min_horizon_months)}</dd>
          <dt className="text-muted-foreground"><Term t="lock-in" /></dt><dd>{months(f.lock_in_months)}</dd>
          <dt className="text-muted-foreground"><Term t="exit load" /></dt><dd>{f.exit_charge === 0 ? "None" : `${f.exit_charge}% if you leave within a year`}</dd>
          <dt className="text-muted-foreground">Yearly cost</dt><dd>{f.cost_pct}% of your money</dd>
        </dl>
        <p className="mt-3 text-xs text-muted-foreground">You'd usually invest monthly through a <Term t="SIP" />. Each unit's price is its <Term t="NAV" />.</p>
      </section>
      <section className="rounded-2xl border bg-card p-4 text-sm">
        <h2 className="mb-2 text-base">What can go wrong</h2>
        <ul className="list-disc space-y-1.5 pl-5 text-muted-foreground">
          <li>{risky ? "Your money can drop by a third or more in a bad year, and take years to recover." : "The value can still dip a little, especially if interest rates jump."}</li>
          {f.lock_in_months > 0 && <li>You can't take the money out for {months(f.lock_in_months)}, even in an emergency.</li>}
          {f.exit_charge > 0 && <li>Leaving early costs you a small fee.</li>}
          <li>Costs are taken every year, whether the fund goes up or down.</li>
        </ul>
      </section>
    </div>
  );
}

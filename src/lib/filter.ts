export type Risk = "low" | "medium" | "medium-high" | "high";
export type Fund = {
  id: string;
  name: string;
  type: string;
  risk: Risk;
  min_horizon_months: number;
  lock_in_months: number;
  exit_charge: number;
  cost_pct: number;
  summary: string;
};
export type Profile = {
  goal: string;
  horizon_months: number;
  monthly_amount: number;
  income_type: "regular" | "irregular";
  emergency_fund: "yes" | "no";
  risk_feeling: "nervous" | "okay" | "calm";
};
export type FilterResult = {
  matches: (Fund & { reason: string })[];
  hidden: { type: string; reason: string }[];
  showEmergencyCard: boolean;
  showIrregularNote: boolean;
};

const fmtMonths = (m: number) =>
  m >= 12 && m % 12 === 0 ? `${m / 12} year${m === 12 ? "" : "s"}` : `${m} months`;

export function whyItFits(f: Fund, p: Profile): string {
  const parts = [`you need this money in ${fmtMonths(p.horizon_months)} and it asks for at least ${fmtMonths(f.min_horizon_months)}`];
  if (p.risk_feeling === "nervous") parts.push(`its ups and downs are ${f.risk}, which suits feeling nervous about dips`);
  else parts.push(`you said dips feel ${p.risk_feeling}, and its risk is ${f.risk}`);
  return `Fits because ${parts.join(", and ")}.`;
}

export function filterFunds(funds: Fund[], p: Profile): FilterResult {
  const hiddenReasons = new Map<string, string>();
  const kept: Fund[] = [];
  for (const f of funds) {
    if (f.min_horizon_months > p.horizon_months) {
      if (!hiddenReasons.has(f.type))
        hiddenReasons.set(f.type, `${f.type} hidden because you need this money in ${fmtMonths(p.horizon_months)}, and these need at least ${fmtMonths(f.min_horizon_months)}.`);
      continue;
    }
    if (p.risk_feeling === "nervous" && (f.risk === "medium-high" || f.risk === "high")) {
      if (!hiddenReasons.has(f.type))
        hiddenReasons.set(f.type, `${f.type} hidden because you said dips make you nervous, and these can swing a lot.`);
      continue;
    }
    kept.push(f);
  }
  const keptTypes = new Set(kept.map((f) => f.type));
  const hidden = [...hiddenReasons.entries()]
    .filter(([t]) => !keptTypes.has(t))
    .map(([type, reason]) => ({ type, reason }));
  const matches = kept
    .sort((a, b) => a.exit_charge - b.exit_charge || a.cost_pct - b.cost_pct)
    .slice(0, 3)
    .map((f) => ({ ...f, reason: whyItFits(f, p) }));
  return {
    matches,
    hidden,
    showEmergencyCard: p.emergency_fund === "no",
    showIrregularNote: p.income_type === "irregular",
  };
}
